import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const sessionSchema = z.object({
  playedAt: z.string().min(1),
  venue: z.string().trim().max(120).optional(),
  attendeeUserIds: z.array(z.string().min(1)).default([]),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = sessionSchema.parse(await request.json());
    const attendeeUserIds = Array.from(new Set(input.attendeeUserIds));

    const session = await prisma.$transaction(async (tx) => {
      if (attendeeUserIds.length > 0) {
        const existing = await tx.user.findMany({
          where: { id: { in: attendeeUserIds } },
          select: { id: true },
        });
        if (existing.length !== attendeeUserIds.length) {
          throw new Error("One or more attendees do not exist.");
        }
      }

      return tx.gameSession.create({
        data: {
          playedAt: new Date(input.playedAt),
          venue: input.venue || null,
          createdById: user.id,
          players: {
            create: attendeeUserIds.map((userId) => ({ userId })),
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
