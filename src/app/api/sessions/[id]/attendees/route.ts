import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const attendeesSchema = z.object({
  attendeeUserIds: z.array(z.string().min(1)),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;
    const input = attendeesSchema.parse(await request.json());
    const attendeeUserIds = Array.from(new Set(input.attendeeUserIds));

    await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findFirst({
        where: { id: sessionId, deletedAt: null },
      });
      if (!session) throw new Error("Session not found.");

      if (attendeeUserIds.length > 0) {
        const existing = await tx.user.findMany({
          where: { id: { in: attendeeUserIds } },
          select: { id: true },
        });
        if (existing.length !== attendeeUserIds.length) {
          throw new Error("One or more attendees do not exist.");
        }
      }

      const playersWithMatches = await tx.match.findMany({
        where: { sessionId },
        select: {
          teamAPlayer1Id: true,
          teamAPlayer2Id: true,
          teamBPlayer1Id: true,
          teamBPlayer2Id: true,
        },
      });
      const locked = new Set<string>();
      for (const match of playersWithMatches) {
        locked.add(match.teamAPlayer1Id);
        locked.add(match.teamAPlayer2Id);
        locked.add(match.teamBPlayer1Id);
        locked.add(match.teamBPlayer2Id);
      }
      const nextSet = new Set(attendeeUserIds);
      for (const lockedId of locked) {
        if (!nextSet.has(lockedId)) {
          throw new Error("Cannot remove a player who has already played a match.");
        }
      }

      if (attendeeUserIds.length > 0) {
        await tx.sessionPlayer.deleteMany({
          where: { sessionId, userId: { notIn: attendeeUserIds } },
        });
      } else {
        await tx.sessionPlayer.deleteMany({ where: { sessionId } });
      }

      for (const userId of attendeeUserIds) {
        await tx.sessionPlayer.upsert({
          where: { sessionId_userId: { sessionId, userId } },
          create: { sessionId, userId },
          update: {},
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save players" },
      { status: 400 },
    );
  }
}
