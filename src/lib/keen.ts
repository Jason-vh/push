import { appTimeZone } from "@/lib/config";
import { prisma } from "@/lib/db";
import { addDays, dateFromKey, emptyDay, keyFromDate, type KeenDay } from "@/lib/keenDays";

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
  const [availabilities, sessions] = await Promise.all([
    prisma.availability.findMany({
      where: { date: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { date: true, note: true, user: { select: { id: true, name: true } } },
    }),
    prisma.gameSession.findMany({
      where: { deletedAt: null, playedAt: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        playedAt: true,
        venue: true,
        startTime: true,
        durationMinutes: true,
        court: true,
        createdBy: { select: { id: true, name: true } },
        players: {
          orderBy: { createdAt: "asc" },
          select: { user: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  const days = new Map<string, KeenDay>();
  const dayFor = (date: string) => {
    let day = days.get(date);
    if (!day) {
      day = emptyDay(date);
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
  for (const session of sessions) {
    dayFor(keyFromDate(session.playedAt)).session ??= {
      id: session.id,
      venue: session.venue,
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      court: session.court,
      createdById: session.createdBy.id,
      createdByName: session.createdBy.name,
      players: session.players.map(({ user }) => ({ userId: user.id, name: user.name })),
    };
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function findSessionOn(date: string) {
  return prisma.gameSession.findFirst({
    where: {
      deletedAt: null,
      playedAt: { gte: dateFromKey(date), lt: dateFromKey(addDays(date, 1)) },
    },
    select: { id: true },
  });
}

export async function loadVenueSuggestions() {
  const sessions = await prisma.gameSession.findMany({
    where: { deletedAt: null, venue: { not: null } },
    select: { venue: true, playedAt: true },
  });

  const venues = new Map<string, { name: string; count: number; lastUsed: Date }>();
  for (const session of sessions) {
    const name = session.venue?.trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const existing = venues.get(key);
    if (!existing) {
      venues.set(key, { name, count: 1, lastUsed: session.playedAt });
      continue;
    }
    existing.count += 1;
    if (session.playedAt > existing.lastUsed) {
      existing.name = name;
      existing.lastUsed = session.playedAt;
    }
  }

  return [...venues.values()]
    .sort((a, b) => b.count - a.count || b.lastUsed.getTime() - a.lastUsed.getTime())
    .slice(0, VENUE_SUGGESTION_COUNT)
    .map((venue) => venue.name);
}
