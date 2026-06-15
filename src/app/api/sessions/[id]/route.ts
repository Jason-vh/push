import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const patchSchema = z.object({
  playedAt: z.string().min(1).optional(),
  venue: z.string().trim().max(120).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;
    const input = patchSchema.parse(await request.json());

    const data: { playedAt?: Date; venue?: string | null } = {};
    if (input.playedAt !== undefined) data.playedAt = new Date(input.playedAt);
    if (input.venue !== undefined) data.venue = input.venue ? input.venue : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const result = await prisma.gameSession.updateMany({
      where: { id: sessionId, deletedAt: null },
      data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update session" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sessionId } = await params;

    const result = await prisma.gameSession.updateMany({
      where: { id: sessionId, deletedAt: null, matches: { none: {} } },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      const session = await prisma.gameSession.findFirst({
        where: { id: sessionId, deletedAt: null },
        select: { id: true },
      });
      if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
      return NextResponse.json(
        { error: "Only empty sessions can be deleted." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete session" },
      { status: 400 },
    );
  }
}
