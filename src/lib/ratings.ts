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
