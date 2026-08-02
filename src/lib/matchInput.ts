import { z } from "zod";

/** Two digits is far beyond any padel format, but keeps stored scores sane. */
export const MAX_SCORE = 99;

const scoreSchema = z.number().int().min(0).max(MAX_SCORE);

/** Shared payload for creating and editing a match. */
export const matchInputSchema = z
  .object({
    teamAPlayer1Id: z.string().min(1),
    teamAPlayer2Id: z.string().min(1),
    teamBPlayer1Id: z.string().min(1),
    teamBPlayer2Id: z.string().min(1),
    teamAScore: scoreSchema,
    teamBScore: scoreSchema,
  })
  .refine((input) => input.teamAScore !== input.teamBScore, {
    message: "A match cannot end in a tie.",
    path: ["teamBScore"],
  });

export type MatchInputPayload = z.infer<typeof matchInputSchema>;

/** The winner is never entered by hand; it always follows the score. */
export function winnerFromScore(teamAScore: number, teamBScore: number): "A" | "B" {
  return teamAScore > teamBScore ? "A" : "B";
}
