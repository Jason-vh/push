import type { PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { STARTING_RATING, displayRating, doublesEloDelta } from "@/lib/elo";

export const RATINGS_CACHE_TAG = "ratings";

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

export type RankedPlayer = {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  rank: number;
};

/** Leaderboard order with dense ranking: ties share a rank and the next group is rank + 1. */
export function rankPlayers(
  users: Array<{ id: string; name: string }>,
  stats: Map<string, PlayerStats>,
): RankedPlayer[] {
  const ranked = users
    .map((user) => {
      const playerStats = statsFor(stats, user.id);
      return {
        id: user.id,
        name: user.name,
        rating: playerStats.rating,
        wins: playerStats.wins,
        losses: playerStats.losses,
        rank: 0,
      };
    })
    .sort((a, b) => {
      const ar = displayRating(a.rating);
      const br = displayRating(b.rating);
      if (ar !== br) return br - ar;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name);
    });

  let lastDisplay: number | null = null;
  let lastRank = 0;
  for (const entry of ranked) {
    const display = displayRating(entry.rating);
    if (display !== lastDisplay) {
      lastRank += 1;
      lastDisplay = display;
    }
    entry.rank = lastRank;
  }

  return ranked;
}

function teamOf(match: MatchInput, userId: string): Winner | null {
  if (match.teamAPlayer1Id === userId || match.teamAPlayer2Id === userId) return "A";
  if (match.teamBPlayer1Id === userId || match.teamBPlayer2Id === userId) return "B";
  return null;
}

/** One entry per match the player featured in, oldest first; true = won. */
export function playerResults(matches: MatchInput[], userId: string): boolean[] {
  const results: boolean[] = [];
  for (const match of matches) {
    const team = teamOf(match, userId);
    if (team) results.push(match.winnerTeam === team);
  }
  return results;
}

/** Rating after every match the player featured in, starting from their first rating. */
export function ratingHistory(
  matches: MatchInput[],
  byMatch: Map<string, RatingChange[]>,
  userId: string,
): number[] {
  const history = [STARTING_RATING];
  for (const match of matches) {
    const change = byMatch.get(match.id)?.find((entry) => entry.userId === userId);
    if (change) history.push(change.after);
  }
  return history;
}

export type SessionSummary = { won: number; lost: number; total: number; delta: number };

/** A player's result and rating swing across one session's matches. */
export function summarizeSession(
  matches: MatchInput[],
  byMatch: Map<string, RatingChange[]>,
  userId: string,
): SessionSummary {
  let won = 0;
  let lost = 0;
  let delta = 0;
  for (const match of matches) {
    const team = teamOf(match, userId);
    if (!team) continue;
    if (match.winnerTeam === team) won += 1;
    else lost += 1;
    const change = byMatch.get(match.id)?.find((entry) => entry.userId === userId);
    if (change) delta += change.delta;
  }
  return { won, lost, total: matches.length, delta: Math.round(delta) };
}

/** Positive = current winning streak, negative = losing streak. */
export function currentStreak(results: boolean[]): number {
  const last = results.at(-1);
  if (last === undefined) return 0;
  let length = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i -= 1) length += 1;
  return last ? length : -length;
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

/** `eligible`, when given, limits the counterparts a record is kept for. */
export function partnerRecords(
  matches: MatchInput[],
  userId: string,
  eligible?: ReadonlySet<string>,
): PairRecord[] {
  const records = new Map<string, PairRecord>();
  for (const match of matches) {
    const team = teamOf(match, userId);
    if (!team) continue;
    const myTeam =
      team === "A"
        ? [match.teamAPlayer1Id, match.teamAPlayer2Id]
        : [match.teamBPlayer1Id, match.teamBPlayer2Id];
    const won = match.winnerTeam === team;
    const partner = myTeam.find((id) => id !== userId);
    if (!partner || (eligible && !eligible.has(partner))) continue;
    const record = records.get(partner) ?? emptyRecord(partner);
    if (won) record.wins += 1;
    else record.losses += 1;
    record.results.push(won);
    records.set(partner, record);
  }
  return finalize(records);
}

export function opponentRecords(
  matches: MatchInput[],
  userId: string,
  eligible?: ReadonlySet<string>,
): PairRecord[] {
  const records = new Map<string, PairRecord>();
  for (const match of matches) {
    const team = teamOf(match, userId);
    if (!team) continue;
    const opponents =
      team === "A"
        ? [match.teamBPlayer1Id, match.teamBPlayer2Id]
        : [match.teamAPlayer1Id, match.teamAPlayer2Id];
    const won = match.winnerTeam === team;
    for (const opponentId of opponents) {
      if (eligible && !eligible.has(opponentId)) continue;
      const record = records.get(opponentId) ?? emptyRecord(opponentId);
      if (won) record.wins += 1;
      else record.losses += 1;
      record.results.push(won);
      records.set(opponentId, record);
    }
  }
  return finalize(records);
}

export function bestTeammate(
  matches: MatchInput[],
  userId: string,
  eligible?: ReadonlySet<string>,
): PairRecord | null {
  const played = partnerRecords(matches, userId, eligible).filter((r) => r.wins + r.losses > 0);
  return played[0] ?? null;
}

export function toughestOpponent(
  matches: MatchInput[],
  userId: string,
  eligible?: ReadonlySet<string>,
): PairRecord | null {
  // Toughest = opponent with the highest win rate AGAINST me (i.e. my lowest win rate vs them).
  const played = opponentRecords(matches, userId, eligible).filter((r) => r.wins + r.losses > 0);
  if (played.length === 0) return null;
  return played.slice().sort((a, b) => {
    if (a.winRate !== b.winRate) return a.winRate - b.winRate;
    return b.wins + b.losses - (a.wins + a.losses);
  })[0];
}

export async function loadAllMatchesOrdered(prisma: PrismaClient): Promise<MatchInput[]> {
  const matches = await prisma.match.findMany({
    where: { session: { deletedAt: null } },
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

export const getCachedOrderedMatches = unstable_cache(
  () => loadAllMatchesOrdered(prisma),
  ["all-matches-ordered"],
  { tags: [RATINGS_CACHE_TAG] },
);
