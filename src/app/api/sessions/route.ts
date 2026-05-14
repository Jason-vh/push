import { NextResponse } from "next/server";
import { Team } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { doublesEloDelta, STARTING_RATING } from "@/lib/elo";
import { nameFromEmail, normalizeEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";

const matchSchema = z.object({
  teamA: z.tuple([z.string().email(), z.string().email()]),
  teamB: z.tuple([z.string().email(), z.string().email()]),
  winnerTeam: z.enum(["A", "B"]),
  scoreText: z.string().trim().max(80).optional(),
});

const sessionSchema = z.object({
  playedAt: z.string().min(1),
  venue: z.string().trim().max(120).optional(),
  courtNumber: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  attendeeEmails: z.array(z.string().email()).min(4),
  matches: z.array(matchSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = sessionSchema.parse(await request.json());
    const attendeeEmails = Array.from(new Set(input.attendeeEmails.map(normalizeEmail)));

    const session = await prisma.$transaction(async (tx) => {
      const players = await Promise.all(
        attendeeEmails.map(async (email) => {
          const existingUser = await tx.user.findUnique({ where: { email } });
          return tx.player.upsert({
            where: { email },
            create: {
              email,
              name: nameFromEmail(email),
              rating: STARTING_RATING,
              userId: existingUser?.id,
            },
            update: {
              active: true,
              ...(existingUser ? { userId: existingUser.id } : {}),
            },
          });
        }),
      );

      const playerByEmail = new Map(players.map((player) => [player.email, player]));
      const ratingByPlayerId = new Map(players.map((player) => [player.id, player.rating]));

      const createdSession = await tx.gameSession.create({
        data: {
          playedAt: new Date(input.playedAt),
          venue: input.venue || null,
          courtNumber: input.courtNumber || null,
          notes: input.notes || null,
          createdById: user.id,
          players: {
            create: players.map((player) => ({ playerId: player.id })),
          },
        },
      });

      for (const [index, matchInput] of input.matches.entries()) {
        const teamAEmails = matchInput.teamA.map(normalizeEmail) as [string, string];
        const teamBEmails = matchInput.teamB.map(normalizeEmail) as [string, string];
        const matchEmails = [...teamAEmails, ...teamBEmails];
        const uniqueEmails = new Set(matchEmails);

        if (uniqueEmails.size !== 4) {
          throw new Error(`Match ${index + 1} must have four distinct players.`);
        }

        for (const email of matchEmails) {
          if (!playerByEmail.has(email)) {
            throw new Error(`Match ${index + 1} includes ${email}, who is not an attendee.`);
          }
        }

        const [a1, a2] = teamAEmails.map((email) => playerByEmail.get(email)!);
        const [b1, b2] = teamBEmails.map((email) => playerByEmail.get(email)!);
        const ratingA1 = ratingByPlayerId.get(a1.id)!;
        const ratingA2 = ratingByPlayerId.get(a2.id)!;
        const ratingB1 = ratingByPlayerId.get(b1.id)!;
        const ratingB2 = ratingByPlayerId.get(b2.id)!;
        const teamARating = (ratingA1 + ratingA2) / 2;
        const teamBRating = (ratingB1 + ratingB2) / 2;
        const { deltaA, deltaB } = doublesEloDelta({
          teamARating,
          teamBRating,
          winnerTeam: matchInput.winnerTeam,
        });

        const match = await tx.match.create({
          data: {
            sessionId: createdSession.id,
            orderIndex: index + 1,
            teamAPlayer1Id: a1.id,
            teamAPlayer2Id: a2.id,
            teamBPlayer1Id: b1.id,
            teamBPlayer2Id: b2.id,
            winnerTeam: matchInput.winnerTeam === "A" ? Team.A : Team.B,
            scoreText: matchInput.scoreText || null,
          },
        });

        const changes = [
          { player: a1, before: ratingA1, delta: deltaA },
          { player: a2, before: ratingA2, delta: deltaA },
          { player: b1, before: ratingB1, delta: deltaB },
          { player: b2, before: ratingB2, delta: deltaB },
        ];

        for (const change of changes) {
          const after = change.before + change.delta;
          ratingByPlayerId.set(change.player.id, after);
          await tx.player.update({ where: { id: change.player.id }, data: { rating: after } });
          await tx.ratingChange.create({
            data: {
              matchId: match.id,
              playerId: change.player.id,
              ratingBefore: change.before,
              ratingAfter: after,
              delta: change.delta,
            },
          });
        }
      }

      return createdSession;
    });

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save session" },
      { status: 400 },
    );
  }
}
