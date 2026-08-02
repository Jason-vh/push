import { NextResponse } from "next/server";
import { Team } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { matchInputSchema, winnerFromScore } from "@/lib/matchInput";
import { RATINGS_CACHE_TAG } from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId, matchId } = await params;
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

    await prisma.$transaction(async (tx) => {
      const existing = await tx.match.findUnique({
        where: { id: matchId },
        include: { session: { include: { players: true } } },
      });

      if (!existing || existing.sessionId !== sessionId) {
        throw new Error("Match not found.");
      }

      const attendeeIds = new Set(
        existing.session.players.map((sessionPlayer) => sessionPlayer.userId),
      );
      for (const userId of userIds) {
        if (!attendeeIds.has(userId)) {
          throw new Error("Every match player must be an attendee of this session.");
        }
      }

      await tx.match.update({
        where: { id: matchId },
        data: {
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save match" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId, matchId } = await params;
    const existing = await prisma.match.findUnique({ where: { id: matchId } });
    if (!existing || existing.sessionId !== sessionId) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }

    await prisma.match.delete({ where: { id: matchId } });
    revalidateTag(RATINGS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete match" },
      { status: 400 },
    );
  }
}
