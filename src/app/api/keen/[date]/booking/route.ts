import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/keen";
import { BOOKING_DURATIONS, PLAYERS_PER_GAME, dateFromKey, isValidDateKey } from "@/lib/keenDays";
import { getCurrentUser } from "@/lib/session";

const bookingSchema = z.object({
  venue: z.string().trim().min(1, "Add where you're playing.").max(120),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a start time."),
  durationMinutes: z
    .number()
    .int()
    .refine((value) => BOOKING_DURATIONS.some((duration) => duration === value)),
  court: z.string().trim().max(40).nullable(),
  playerIds: z.array(z.string().min(1)).length(PLAYERS_PER_GAME, "Pick four players."),
});

type BookingInput = z.infer<typeof bookingSchema>;
type Params = { params: Promise<{ date: string }> };

async function upcomingDate(params: Params["params"]) {
  const { date } = await params;
  if (!isValidDateKey(date)) throw new Error("Invalid date.");
  if (date < todayKey()) throw new Error("That day has already passed.");
  return dateFromKey(date);
}

async function assertKeenPlayers(
  tx: Prisma.TransactionClient,
  date: Date,
  bookerId: string,
  playerIds: string[],
) {
  if (new Set(playerIds).size !== playerIds.length) throw new Error("Pick four different players.");
  const keen = await tx.availability.findMany({ where: { date }, select: { userId: true } });
  const keenIds = new Set(keen.map((availability) => availability.userId));
  if (!keenIds.has(bookerId)) throw new Error("Only someone who's keen can book this day.");
  if (playerIds.some((id) => !keenIds.has(id))) {
    throw new Error("Everyone playing has to be keen on this day.");
  }
}

function bookingData(input: BookingInput) {
  return {
    venue: input.venue,
    startTime: input.startTime,
    durationMinutes: input.durationMinutes,
    court: input.court || null,
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const input = bookingSchema.parse(await request.json());

    await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { date } });
      if (existing) throw new Error("That day is already booked.");
      await assertKeenPlayers(tx, date, user.id, input.playerIds);
      await tx.booking.create({
        data: {
          ...bookingData(input),
          date,
          bookedById: user.id,
          players: { create: input.playerIds.map((userId) => ({ userId })) },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save booking" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const input = bookingSchema.parse(await request.json());

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { date } });
      if (!booking) throw new Error("Booking not found.");
      if (booking.bookedById !== user.id)
        throw new Error("Only the booker can change this booking.");
      await assertKeenPlayers(tx, date, user.id, input.playerIds);
      await tx.bookingPlayer.deleteMany({ where: { bookingId: booking.id } });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          ...bookingData(input),
          players: { create: input.playerIds.map((userId) => ({ userId })) },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save booking" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await upcomingDate(params);
    const booking = await prisma.booking.findUnique({ where: { date } });
    if (!booking) throw new Error("Booking not found.");
    if (booking.bookedById !== user.id) throw new Error("Only the booker can cancel this booking.");
    await prisma.booking.delete({ where: { id: booking.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not cancel booking" },
      { status: 400 },
    );
  }
}
