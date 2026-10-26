import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/keen";
import { dateFromKey, isValidDateKey } from "@/lib/keenDays";
import { getCurrentUser } from "@/lib/session";

const noteSchema = z.object({
  note: z.string().trim().max(80).nullable(),
});

type Params = { params: Promise<{ date: string }> };

async function openDate(params: Params["params"]) {
  const { date } = await params;
  if (!isValidDateKey(date)) throw new Error("Invalid date.");
  if (date < todayKey()) throw new Error("That day has already passed.");
  const booking = await prisma.booking.findUnique({ where: { date: dateFromKey(date) } });
  if (booking) throw new Error("That day is already booked.");
  return dateFromKey(date);
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await openDate(params);
    await prisma.availability.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await openDate(params);
    const input = noteSchema.parse(await request.json());
    await prisma.availability.update({
      where: { userId_date: { userId: user.id, date } },
      data: { note: input.note || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save note" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await openDate(params);
    await prisma.availability.deleteMany({ where: { userId: user.id, date } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 400 },
    );
  }
}
