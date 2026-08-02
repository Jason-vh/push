import { prisma } from "@/lib/db";

export const ACTIVE_WINDOW_MONTHS = 1;

/** Players who haven't played since this date are hidden from stats. */
export function activeSince(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - ACTIVE_WINDOW_MONTHS);
  return cutoff;
}

/** Ids of players who attended a session inside the active window. */
export async function loadActivePlayerIds(): Promise<Set<string>> {
  const rows = await prisma.sessionPlayer.findMany({
    where: { session: { deletedAt: null, playedAt: { gte: activeSince() } } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((row) => row.userId));
}
