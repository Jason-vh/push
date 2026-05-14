import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { STARTING_RATING } from "@/lib/elo";
import { nameFromEmail, normalizeEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";

const attendeesSchema = z.object({
  attendeeEmails: z.array(z.string().email()),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;
    const input = attendeesSchema.parse(await request.json());
    const attendeeEmails = Array.from(new Set(input.attendeeEmails.map(normalizeEmail)));

    await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Session not found.");

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

      for (const player of players) {
        await tx.sessionPlayer.upsert({
          where: { sessionId_playerId: { sessionId, playerId: player.id } },
          create: { sessionId, playerId: player.id },
          update: {},
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save attendees" },
      { status: 400 },
    );
  }
}
