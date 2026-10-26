import { appTimeZone } from "@/lib/config";
import { prisma } from "@/lib/db";
import { dateFromKey, keyFromDate, type KeenDay } from "@/lib/keenDays";

const VENUE_SUGGESTION_COUNT = 2;

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function loadKeenDays(fromDate: string): Promise<KeenDay[]> {
  const from = dateFromKey(fromDate);
  const [availabilities, bookings] = await Promise.all([
    prisma.availability.findMany({
      where: { date: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { date: true, note: true, user: { select: { id: true, name: true } } },
    }),
    prisma.booking.findMany({
      where: { date: { gte: from } },
      include: {
        bookedBy: { select: { name: true } },
        players: { select: { userId: true } },
      },
    }),
  ]);

  const days = new Map<string, KeenDay>();
  const dayFor = (date: string) => {
    let day = days.get(date);
    if (!day) {
      day = { date, keen: [], booking: null };
      days.set(date, day);
    }
    return day;
  };

  for (const availability of availabilities) {
    dayFor(keyFromDate(availability.date)).keen.push({
      userId: availability.user.id,
      name: availability.user.name,
      note: availability.note,
    });
  }
  for (const booking of bookings) {
    dayFor(keyFromDate(booking.date)).booking = {
      venue: booking.venue,
      startTime: booking.startTime,
      durationMinutes: booking.durationMinutes,
      court: booking.court,
      bookedById: booking.bookedById,
      bookedByName: booking.bookedBy.name,
      playerIds: booking.players.map((player) => player.userId),
    };
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadVenueSuggestions() {
  const [sessions, bookings] = await Promise.all([
    prisma.gameSession.findMany({
      where: { deletedAt: null, venue: { not: null } },
      select: { venue: true, playedAt: true },
    }),
    prisma.booking.findMany({ select: { venue: true, date: true } }),
  ]);

  const uses = [
    ...sessions.map((session) => ({ venue: session.venue ?? "", at: session.playedAt })),
    ...bookings.map((booking) => ({ venue: booking.venue, at: booking.date })),
  ];

  const venues = new Map<string, { name: string; count: number; lastUsed: Date }>();
  for (const use of uses) {
    const name = use.venue.trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const existing = venues.get(key);
    if (!existing) {
      venues.set(key, { name, count: 1, lastUsed: use.at });
      continue;
    }
    existing.count += 1;
    if (use.at > existing.lastUsed) {
      existing.name = name;
      existing.lastUsed = use.at;
    }
  }

  return [...venues.values()]
    .sort((a, b) => b.count - a.count || b.lastUsed.getTime() - a.lastUsed.getTime())
    .slice(0, VENUE_SUGGESTION_COUNT)
    .map((venue) => venue.name);
}
