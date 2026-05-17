import { NextResponse } from "next/server";
import { Team } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { doublesEloDelta } from "@/lib/elo";
import { getCurrentUser } from "@/lib/session";

const matchSchema = z.object({
  teamAPlayer1Id: z.string().min(1),
  teamAPlayer2Id: z.string().min(1),
  teamBPlayer1Id: z.string().min(1),
  teamBPlayer2Id: z.string().min(1),
  winnerTeam: z.enum(["A", "B"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;
    const input = matchSchema.parse(await request.json());
    const userIds = [
      input.teamAPlayer1Id,
      input.teamAPlayer2Id,
      input.teamBPlayer1Id,
      input.teamBPlayer2Id,
    ];

    if (new Set(userIds).size !== 4) {
      return NextResponse.json(
        { error: "A match must have four distinct players." },
        { status: 400 },
      );
    }

    const match = await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findUnique({
        where: { id: sessionId },
        include: { players: true },
      });

      if (!session) throw new Error("Session not found.");

      const attendeeIds = new Set(session.players.map((sessionPlayer) => sessionPlayer.userId));
      for (const userId of userIds) {
        if (!attendeeIds.has(userId)) {
          throw new Error("Every match player must be an attendee of this session.");
        }
      }

      const users = await tx.user.findMany({ where: { id: { in: userIds } } });
      const userById = new Map(users.map((u) => [u.id, u]));
      const a1 = userById.get(input.teamAPlayer1Id)!;
      const a2 = userById.get(input.teamAPlayer2Id)!;
      const b1 = userById.get(input.teamBPlayer1Id)!;
      const b2 = userById.get(input.teamBPlayer2Id)!;
      const teamARating = (a1.rating + a2.rating) / 2;
      const teamBRating = (b1.rating + b2.rating) / 2;
      const { deltaA, deltaB } = doublesEloDelta({
        teamARating,
        teamBRating,
        winnerTeam: input.winnerTeam,
      });

      const lastMatch = await tx.match.findFirst({
        where: { sessionId },
        orderBy: { orderIndex: "desc" },
      });

      const createdMatch = await tx.match.create({
        data: {
          sessionId,
          orderIndex: (lastMatch?.orderIndex ?? 0) + 1,
          teamAPlayer1Id: a1.id,
          teamAPlayer2Id: a2.id,
          teamBPlayer1Id: b1.id,
          teamBPlayer2Id: b2.id,
          winnerTeam: input.winnerTeam === "A" ? Team.A : Team.B,
        },
      });

      const changes = [
        { user: a1, delta: deltaA },
        { user: a2, delta: deltaA },
        { user: b1, delta: deltaB },
        { user: b2, delta: deltaB },
      ];

      for (const change of changes) {
        const after = change.user.rating + change.delta;
        await tx.user.update({ where: { id: change.user.id }, data: { rating: after } });
        await tx.ratingChange.create({
          data: {
            matchId: createdMatch.id,
            userId: change.user.id,
            ratingBefore: change.user.rating,
            ratingAfter: after,
            delta: change.delta,
          },
        });
      }

      return createdMatch;
    });

    return NextResponse.json({ ok: true, matchId: match.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save match" },
      { status: 400 },
    );
  }
}
