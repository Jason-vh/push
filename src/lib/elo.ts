export const STARTING_RATING = 1000;
export const K_FACTOR = 24;

export function expectedScore(teamRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / 400));
}

export function doublesEloDelta(args: {
  teamARating: number;
  teamBRating: number;
  winnerTeam: "A" | "B";
  kFactor?: number;
}) {
  const k = args.kFactor ?? K_FACTOR;
  const expectedA = expectedScore(args.teamARating, args.teamBRating);
  const actualA = args.winnerTeam === "A" ? 1 : 0;
  const deltaA = k * (actualA - expectedA);

  return {
    deltaA,
    deltaB: -deltaA,
    expectedA,
    expectedB: 1 - expectedA,
  };
}

export function displayRating(rating: number) {
  return Math.round(rating);
}

export function displayDelta(delta: number) {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
