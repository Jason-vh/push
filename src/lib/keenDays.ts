export const PLAYERS_PER_GAME = 4;
export const BOOKING_DURATIONS = [60, 90, 120] as const;
export const DEFAULT_START_TIME = "19:30";
export const DEFAULT_DURATION = 90;
export const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export type KeenPlayer = { userId: string; name: string; note: string | null };

export type KeenSession = {
  id: string;
  venue: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  court: string | null;
  createdById: string;
  createdByName: string;
  players: Array<{ userId: string; name: string }>;
};

export type KeenDay = {
  date: string;
  keen: KeenPlayer[];
  session: KeenSession | null;
};

export type DayStatus = "empty" | "open" | "enough" | "booked";

export function dayStatus(day: KeenDay): DayStatus {
  if (day.session) return "booked";
  if (day.keen.length >= PLAYERS_PER_GAME) return "enough";
  if (day.keen.length === 0) return "empty";
  return "open";
}

export function isKeen(day: KeenDay, userId: string) {
  return day.keen.some((player) => player.userId === userId);
}

export function isPlaying(day: KeenDay, userId: string) {
  return Boolean(day.session?.players.some((player) => player.userId === userId));
}

export function lineupOf(day: KeenDay): KeenPlayer[] {
  if (!day.session) return day.keen.slice(0, PLAYERS_PER_GAME);
  const notes = new Map(day.keen.map((player) => [player.userId, player.note]));
  return day.session.players.map((player) => ({
    ...player,
    note: notes.get(player.userId) ?? null,
  }));
}

export function benchOf(day: KeenDay): KeenPlayer[] {
  if (!day.session) return day.keen.slice(PLAYERS_PER_GAME);
  const playing = new Set(day.session.players.map((player) => player.userId));
  return day.keen.filter((player) => !playing.has(player.userId));
}

export function emptyDay(date: string): KeenDay {
  return { date, keen: [], session: null };
}

// Dates are calendar days ("YYYY-MM-DD"), so all arithmetic happens in UTC to stay timezone-free.
export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return keyFromDate(date);
}

export function mondayOf(key: string) {
  const weekday = (dateFromKey(key).getUTCDay() + 6) % 7;
  return addDays(key, -weekday);
}

export function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && keyFromDate(dateFromKey(key)) === key;
}

export function formatDate(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(dateFromKey(key));
}

export function weekdayShort(key: string) {
  return formatDate(key, { weekday: "short" }).slice(0, 2).toUpperCase();
}

export function relativeDay(key: string, today: string) {
  const diff = Math.round((dateFromKey(key).getTime() - dateFromKey(today).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return formatDate(key, { weekday: "long" });
  return formatDate(key, { weekday: "short", day: "numeric", month: "short" });
}

export function endTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = hours * 60 + minutes + durationMinutes;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

export function durationLabel(minutes: number) {
  const hours = minutes / 60;
  return hours === 1 ? "1 hr" : `${hours} hrs`;
}
