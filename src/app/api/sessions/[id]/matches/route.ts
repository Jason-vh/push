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
    const playerIds = [
      input.teamAPlayer1Id,
      input.teamAPlayer2Id,
      input.teamBPlayer1Id,
      input.teamBPlayer2Id,
    ];

    if (new Set(playerIds).size !== 4) {
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

      const attendeeIds = new Set(session.players.map((sessionPlayer) => sessionPlayer.playerId));
      for (const playerId of playerIds) {
        if (!attendeeIds.has(playerId)) {
          throw new Error("Every match player must be an attendee of this session.");
        }
      }

      const players = await tx.player.findMany({ where: { id: { in: playerIds } } });
      const playerById = new Map(players.map((player) => [player.id, player]));
      const a1 = playerById.get(input.teamAPlayer1Id)!;
      const a2 = playerById.get(input.teamAPlayer2Id)!;
      const b1 = playerById.get(input.teamBPlayer1Id)!;
      const b2 = playerById.get(input.teamBPlayer2Id)!;
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
        { player: a1, delta: deltaA },
        { player: a2, delta: deltaA },
        { player: b1, delta: deltaB },
        { player: b2, delta: deltaB },
      ];

      for (const change of changes) {
        const after = change.player.rating + change.delta;
        await tx.player.update({ where: { id: change.player.id }, data: { rating: after } });
        await tx.ratingChange.create({
          data: {
            matchId: createdMatch.id,
            playerId: change.player.id,
            ratingBefore: change.player.rating,
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
