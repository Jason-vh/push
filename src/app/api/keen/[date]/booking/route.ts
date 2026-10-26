import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findSessionOn, todayKey } from "@/lib/keen";
import { BOOKING_DURATIONS, dateFromKey, isValidDateKey } from "@/lib/keenDays";
import { getCurrentUser } from "@/lib/session";

const detailsSchema = z.object({
  venue: z.string().trim().min(1, "Add where you're playing.").max(120),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a start time."),
  durationMinutes: z
    .number()
    .int()
    .refine((value) => BOOKING_DURATIONS.some((duration) => duration === value), "Pick a length."),
  court: z.string().trim().max(40).nullable(),
});

const createSchema = detailsSchema.extend({
  playerIds: z.array(z.string().min(1)).min(1, "Pick who's playing."),
});

type Params = { params: Promise<{ date: string }> };

async function upcomingDate(params: Params["params"]) {
  const { date } = await params;
  if (!isValidDateKey(date)) throw new Error("Invalid date.");
  if (date < todayKey()) throw new Error("That day has already passed.");
  return date;
}

async function ownSessionOn(date: string, userId: string) {
  const session = await findSessionOn(date);
  if (!session) throw new Error("Booking not found.");
  if (session.createdById !== userId) throw new Error("Only whoever booked it can change it.");
  return session;
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
    const input = createSchema.parse(await request.json());
    if (new Set(input.playerIds).size !== input.playerIds.length) {
      throw new Error("Pick each player once.");
    }
    if (await findSessionOn(date)) throw new Error("That day is already booked.");

    const keen = await prisma.availability.findMany({
      where: { date: dateFromKey(date) },
      select: { userId: true },
    });
    const allowedIds = new Set([user.id, ...keen.map((availability) => availability.userId)]);
    if (input.playerIds.some((id) => !allowedIds.has(id))) {
      throw new Error("Everyone playing has to be keen on this day.");
    }

    await prisma.gameSession.create({
      data: {
        ...sessionDetails(input),
        playedAt: dateFromKey(date),
        createdById: user.id,
        players: { create: input.playerIds.map((userId) => ({ userId })) },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not save booking");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const input = detailsSchema.parse(await request.json());
    const session = await ownSessionOn(date, user.id);
    await prisma.gameSession.update({ where: { id: session.id }, data: sessionDetails(input) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not save booking");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const session = await ownSessionOn(date, user.id);
    if (session._count.matches > 0) throw new Error("This session already has matches logged.");
    await prisma.gameSession.update({ where: { id: session.id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not cancel booking");
  }
}
