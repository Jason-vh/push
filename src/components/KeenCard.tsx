"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { KeenDayCell } from "@/components/KeenDayCell";
import { KeenDaySheet } from "@/components/KeenDaySheet";
import { dateFromKey, formatDate, weekdayShort, type KeenDay } from "@/lib/keenDays";

export function KeenCard({
  days,
  today,
  userId,
  venueSuggestions,
}: {
  days: KeenDay[];
  today: string;
  userId: string;
  venueSuggestions: string[];
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const closeSheet = useCallback(() => setOpenDate(null), []);
  const openDay = days.find((day) => day.date === openDate) ?? null;

  return (
    <section className="keen-card">
      <div className="keen-card-head">
        <h2>Who&apos;s keen</h2>
        <Link className="keen-card-link" href="/keen">
          Full calendar ›
        </Link>
      </div>

      {days.length > 0 ? (
        <KeenStrip days={days} today={today} userId={userId} onOpen={setOpenDate} />
      ) : (
        <Link className="keen-empty" href="/keen">
          <Image src="/empty-court.webp" alt="" width={190} height={125} />
          <strong>Nobody&apos;s keen yet</strong>
          <span>Pick a day you can play and others can join</span>
        </Link>
      )}

      <KeenDaySheet
        day={openDay}
        userId={userId}
        venueSuggestions={venueSuggestions}
        onClose={closeSheet}
      />
    </section>
  );
}

function KeenStrip({
  days,
  today,
  userId,
  onOpen,
}: {
  days: KeenDay[];
  today: string;
  userId: string;
  onOpen: (date: string) => void;
}) {
  const monthLabels = monthChangeLabels(days, today);
  const showMonths = monthLabels.some(Boolean);

  return (
    <div className="keen-strip">
      {days.map((day, index) => (
        <div key={day.date} className="keen-strip-col">
          {showMonths ? <span className="keen-strip-month">{monthLabels[index]}</span> : null}
          <span className="keen-strip-weekday">{weekdayShort(day.date)}</span>
          <KeenDayCell day={day} today={today} userId={userId} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

function monthChangeLabels(days: KeenDay[], today: string) {
  let previousMonth = dateFromKey(today).getUTCMonth();
  return days.map((day) => {
    const month = dateFromKey(day.date).getUTCMonth();
    const changed = month !== previousMonth;
    previousMonth = month;
    return changed ? formatDate(day.date, { month: "short" }).toUpperCase() : "";
  });
}
