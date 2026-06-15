import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

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
