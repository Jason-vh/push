import type { PrismaClient } from "@prisma/client";
import { STARTING_RATING, doublesEloDelta } from "@/lib/elo";

export type Winner = "A" | "B";

export type MatchInput = {
  id: string;
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
  winnerTeam: Winner;
};

export type RatingChange = {
  matchId: string;
  userId: string;
  before: number;
  after: number;
  delta: number;
};

export type PlayerStats = {
  userId: string;
  rating: number;
  wins: number;
  losses: number;
};

export type RatingsResult = {
  stats: Map<string, PlayerStats>;
  byMatch: Map<string, RatingChange[]>;
};

export function computeRatings(matches: MatchInput[]): RatingsResult {
  const stats = new Map<string, PlayerStats>();
  const byMatch = new Map<string, RatingChange[]>();

  function get(userId: string): PlayerStats {
    let player = stats.get(userId);
    if (!player) {
      player = { userId, rating: STARTING_RATING, wins: 0, losses: 0 };
      stats.set(userId, player);
    }
    return player;
  }

  for (const match of matches) {
    const a1 = get(match.teamAPlayer1Id);
    const a2 = get(match.teamAPlayer2Id);
    const b1 = get(match.teamBPlayer1Id);
    const b2 = get(match.teamBPlayer2Id);

    const teamARating = (a1.rating + a2.rating) / 2;
    const teamBRating = (b1.rating + b2.rating) / 2;
    const { deltaA, deltaB } = doublesEloDelta({
      teamARating,
      teamBRating,
      winnerTeam: match.winnerTeam,
    });

    const changes: RatingChange[] = [];
    const updates: Array<{ player: PlayerStats; delta: number; won: boolean }> = [
      { player: a1, delta: deltaA, won: match.winnerTeam === "A" },
      { player: a2, delta: deltaA, won: match.winnerTeam === "A" },
      { player: b1, delta: deltaB, won: match.winnerTeam === "B" },
      { player: b2, delta: deltaB, won: match.winnerTeam === "B" },
    ];

    for (const { player, delta, won } of updates) {
      const before = player.rating;
      const after = before + delta;
      player.rating = after;
      if (won) player.wins += 1;
      else player.losses += 1;
      changes.push({
        matchId: match.id,
        userId: player.userId,
        before,
        after,
        delta,
      });
    }

    byMatch.set(match.id, changes);
  }

  return { stats, byMatch };
}

export function statsFor(stats: Map<string, PlayerStats>, userId: string): PlayerStats {
  return stats.get(userId) ?? { userId, rating: STARTING_RATING, wins: 0, losses: 0 };
}

export type PairRecord = {
  otherUserId: string;
  wins: number;
  losses: number;
  winRate: number;
  results: boolean[];
};

function emptyRecord(otherUserId: string): PairRecord {
  return { otherUserId, wins: 0, losses: 0, winRate: 0, results: [] };
}

function finalize(records: Map<string, PairRecord>): PairRecord[] {
  return Array.from(records.values())
    .map((record) => ({
      ...record,
      winRate:
        record.wins + record.losses === 0
          ? 0
          : Math.round((record.wins * 100) / (record.wins + record.losses)),
    }))
    // Highest winRate first; ties broken by total games played (more = stronger signal).
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins + b.losses - (a.wins + a.losses);
    });
}

export function partnerRecords(matches: MatchInput[], userId: string): PairRecord[] {
  const records = new Map<string, PairRecord>();
  for (const match of matches) {
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id];
    let myTeam: string[] | null = null;
    let won = false;
    if (teamA.includes(userId)) {
      myTeam = teamA;
      won = match.winnerTeam === "A";
    } else if (teamB.includes(userId)) {
      myTeam = teamB;
      won = match.winnerTeam === "B";
    }
    if (!myTeam) continue;
    const partner = myTeam.find((id) => id !== userId);
    if (!partner) continue;
    const record = records.get(partner) ?? emptyRecord(partner);
    if (won) record.wins += 1;
    else record.losses += 1;
    record.results.push(won);
    records.set(partner, record);
  }
  return finalize(records);
}

export function opponentRecords(matches: MatchInput[], userId: string): PairRecord[] {
  const records = new Map<string, PairRecord>();
  for (const match of matches) {
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id];
    let opponents: string[] | null = null;
    let won = false;
    if (teamA.includes(userId)) {
      opponents = teamB;
      won = match.winnerTeam === "A";
    } else if (teamB.includes(userId)) {
      opponents = teamA;
      won = match.winnerTeam === "B";
    }
    if (!opponents) continue;
    for (const opponentId of opponents) {
      const record = records.get(opponentId) ?? emptyRecord(opponentId);
      if (won) record.wins += 1;
      else record.losses += 1;
      record.results.push(won);
      records.set(opponentId, record);
    }
  }
  return finalize(records);
}

export function bestTeammate(matches: MatchInput[], userId: string): PairRecord | null {
  const eligible = partnerRecords(matches, userId).filter((r) => r.wins + r.losses > 0);
  return eligible[0] ?? null;
}

export function toughestOpponent(matches: MatchInput[], userId: string): PairRecord | null {
  // Toughest = opponent with the highest win rate AGAINST me (i.e. my lowest win rate vs them).
  const eligible = opponentRecords(matches, userId).filter((r) => r.wins + r.losses > 0);
  if (eligible.length === 0) return null;
  return eligible
    .slice()
    .sort((a, b) => {
      if (a.winRate !== b.winRate) return a.winRate - b.winRate;
      return b.wins + b.losses - (a.wins + a.losses);
    })[0];
}

export async function loadAllMatchesOrdered(prisma: PrismaClient): Promise<MatchInput[]> {
  const matches = await prisma.match.findMany({
    orderBy: [{ session: { playedAt: "asc" } }, { orderIndex: "asc" }],
    select: {
      id: true,
      teamAPlayer1Id: true,
      teamAPlayer2Id: true,
      teamBPlayer1Id: true,
      teamBPlayer2Id: true,
      winnerTeam: true,
    },
  });
  return matches.map((match) => ({
    id: match.id,
    teamAPlayer1Id: match.teamAPlayer1Id,
    teamAPlayer2Id: match.teamAPlayer2Id,
    teamBPlayer1Id: match.teamBPlayer1Id,
    teamBPlayer2Id: match.teamBPlayer2Id,
    winnerTeam: match.winnerTeam as Winner,
  }));
}
