import { redirect } from "next/navigation";
import { KeenCalendar } from "@/components/KeenCalendar";
import { loadKeenDays, loadVenueSuggestions, todayKey } from "@/lib/keen";
import { isValidDateKey } from "@/lib/keenDays";
import { getCurrentUser } from "@/lib/session";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayKey();
  const [{ date }, days, venueSuggestions] = await Promise.all([
    searchParams,
    loadKeenDays(today),
    loadVenueSuggestions(),
  ]);
  const initialDate = date && isValidDateKey(date) && date >= today ? date : null;

  return (
    <main className="shell keen-shell">
      <KeenCalendar
        days={days}
        today={today}
        userId={user.id}
        venueSuggestions={venueSuggestions}
        initialDate={initialDate}
      />
    </main>
  );
}
