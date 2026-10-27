import type { RatingChange, Winner } from "@/lib/ratings";

export type SessionMatch = {
  id: string;
  winnerTeam: Winner;
  teamAScore: number | null;
  teamBScore: number | null;
  teamAPlayerIds: [string, string];
  teamBPlayerIds: [string, string];
};

export type StandingsRow = {
  userId: string;
  won: number;
  lost: number;
  gamesFor: number;
  gamesAgainst: number;
  /** Older matches were logged without a score, which makes the game totals meaningless. */
  allScored: boolean;
  delta: number;
};

export type PersonalSession = {
  won: number;
  lost: number;
  before: number;
  after: number;
  delta: number;
  trail: number[];
};

function sideOf(match: SessionMatch, userId: string): "A" | "B" | null {
  if (match.teamAPlayerIds.includes(userId)) return "A";
  if (match.teamBPlayerIds.includes(userId)) return "B";
  return null;
}

export function ratingChange(
  byMatch: Map<string, RatingChange[]>,
  matchId: string,
  userId: string,
): RatingChange | null {
  return byMatch.get(matchId)?.find((change) => change.userId === userId) ?? null;
}

/** Everyone in the session, ordered by rating gained across its matches (oldest match first). */
export function sessionStandings(
  playerIds: string[],
  matches: SessionMatch[],
  byMatch: Map<string, RatingChange[]>,
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  const rowFor = (userId: string) => {
    let row = rows.get(userId);
    if (!row) {
      row = { userId, won: 0, lost: 0, gamesFor: 0, gamesAgainst: 0, allScored: true, delta: 0 };
      rows.set(userId, row);
    }
    return row;
  };

  for (const userId of playerIds) rowFor(userId);
  for (const match of matches) {
    for (const userId of [...match.teamAPlayerIds, ...match.teamBPlayerIds]) {
      const row = rowFor(userId);
      const side = sideOf(match, userId);
      if (match.winnerTeam === side) row.won += 1;
      else row.lost += 1;
      if (match.teamAScore === null || match.teamBScore === null) {
        row.allScored = false;
      } else {
        row.gamesFor += side === "A" ? match.teamAScore : match.teamBScore;
        row.gamesAgainst += side === "A" ? match.teamBScore : match.teamAScore;
      }
      row.delta += ratingChange(byMatch, match.id, userId)?.delta ?? 0;
    }
  }

  return [...rows.values()].sort((a, b) => b.delta - a.delta);
}

/** The viewer's own result, or null when they didn't play a match in this session. */
export function personalSession(
  userId: string,
  matches: SessionMatch[],
  byMatch: Map<string, RatingChange[]>,
): PersonalSession | null {
  const changes = matches.flatMap((match) => {
    const change = ratingChange(byMatch, match.id, userId);
    return change ? [{ match, change }] : [];
  });
  if (changes.length === 0) return null;

  const won = changes.filter(({ match }) => match.winnerTeam === sideOf(match, userId)).length;
  const before = changes[0].change.before;
  const after = changes[changes.length - 1].change.after;
  return {
    won,
    lost: changes.length - won,
    before,
    after,
    delta: after - before,
    trail: [before, ...changes.map(({ change }) => change.after)],
  };
}
