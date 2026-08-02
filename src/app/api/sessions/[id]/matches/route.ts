import { NextResponse } from "next/server";
import { Team } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { matchInputSchema, winnerFromScore } from "@/lib/matchInput";
import { RATINGS_CACHE_TAG } from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;
    const parsed = matchInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid match";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const input = parsed.data;
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
      const session = await tx.gameSession.findFirst({
        where: { id: sessionId, deletedAt: null },
        include: { players: true },
      });

      if (!session) throw new Error("Session not found.");

      const attendeeIds = new Set(session.players.map((sessionPlayer) => sessionPlayer.userId));
      for (const userId of userIds) {
        if (!attendeeIds.has(userId)) {
          throw new Error("Every match player must be an attendee of this session.");
        }
      }

      const lastMatch = await tx.match.findFirst({
        where: { sessionId },
        orderBy: { orderIndex: "desc" },
      });

      return tx.match.create({
        data: {
          sessionId,
          orderIndex: (lastMatch?.orderIndex ?? 0) + 1,
          teamAPlayer1Id: input.teamAPlayer1Id,
          teamAPlayer2Id: input.teamAPlayer2Id,
          teamBPlayer1Id: input.teamBPlayer1Id,
          teamBPlayer2Id: input.teamBPlayer2Id,
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
          winnerTeam: winnerFromScore(input.teamAScore, input.teamBScore) === "A" ? Team.A : Team.B,
        },
      });
    });

    revalidateTag(RATINGS_CACHE_TAG);
    return NextResponse.json({ ok: true, matchId: match.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save match" },
      { status: 400 },
    );
  }
}
