import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findSessionOn, todayKey } from "@/lib/keen";
import { dateFromKey, isValidDateKey } from "@/lib/keenDays";
import { courtSchema, durationSchema, startTimeSchema } from "@/lib/sessionDetails";
import { getCurrentUser } from "@/lib/session";

const detailsSchema = z.object({
  venue: z.string().trim().min(1, "Add where you're playing.").max(120),
  startTime: startTimeSchema,
  durationMinutes: durationSchema,
  court: courtSchema,
});

type Params = { params: Promise<{ date: string }> };

async function upcomingDate(params: Params["params"]) {
  const { date } = await params;
  if (!isValidDateKey(date)) throw new Error("Invalid date.");
  if (date < todayKey()) throw new Error("That day has already passed.");
  return date;
}

function sessionDetails(input: z.infer<typeof detailsSchema>) {
  return {
    venue: input.venue,
    startTime: input.startTime,
    durationMinutes: input.durationMinutes,
    court: input.court || null,
  };
}

function errorResponse(error: unknown, fallback: string) {
  let message = fallback;
  if (error instanceof z.ZodError) message = error.issues[0]?.message ?? fallback;
  else if (error instanceof Error) message = error.message;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const input = detailsSchema.parse(await request.json());
    if (await findSessionOn(date)) throw new Error("That day is already booked.");

    const keen = await prisma.availability.findMany({
      where: { date: dateFromKey(date) },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    const playerIds = new Set([user.id, ...keen.map((availability) => availability.userId)]);

    await prisma.gameSession.create({
      data: {
        ...sessionDetails(input),
        playedAt: dateFromKey(date),
        createdById: user.id,
        players: { create: [...playerIds].map((userId) => ({ userId })) },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not save booking");
  }
}
