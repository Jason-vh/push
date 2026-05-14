import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { STARTING_RATING } from "@/lib/elo";
import { nameFromEmail, normalizeEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";

const sessionSchema = z.object({
  playedAt: z.string().min(1),
  venue: z.string().trim().max(120).optional(),
  courtNumber: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  attendeeEmails: z.array(z.string().email()).min(4),
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

      return tx.gameSession.create({
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
    });

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save session" },
      { status: 400 },
    );
  }
}
