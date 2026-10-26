"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { KeenDayCell, PastDayCell } from "@/components/KeenDayCell";
import { KeenDaySheet } from "@/components/KeenDaySheet";
import {
  addDays,
  dateFromKey,
  emptyDay,
  keyFromDate,
  mondayOf,
  type KeenDay,
} from "@/lib/keenDays";

const INITIAL_MONTHS = 4;
const MONTHS_PER_LOAD = 2;
const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export function KeenCalendar({
  days,
  today,
  userId,
  userName,
  venueSuggestions,
  initialDate,
}: {
  days: KeenDay[];
  today: string;
  userId: string;
  userName: string;
  venueSuggestions: string[];
  initialDate: string | null;
}) {
  const [monthCount, setMonthCount] = useState(INITIAL_MONTHS);
  const [openDate, setOpenDate] = useState<string | null>(initialDate);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const daysByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const dayFor = (date: string) => daysByDate.get(date) ?? emptyDay(date);
  const closeSheet = useCallback(() => setOpenDate(null), []);

  // Re-observing after every load re-checks the sentinel, in case it's still on screen.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMonthCount((count) => count + MONTHS_PER_LOAD);
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [monthCount]);

  return (
    <>
      <div className="keen-calendar-head">
        <div className="keen-title-row">
          <Link className="keen-back" href="/" aria-label="Back to dashboard">
            ‹
          </Link>
          <h1 className="keen-title">Who&apos;s keen</h1>
        </div>
        <div className="keen-weekdays">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
      </div>

      <div className="keen-months">
        {Array.from({ length: monthCount }, (_, offset) => {
          const month = monthOf(today, offset);
          return (
            <section key={month.key} className="keen-month">
              <h2 className="keen-month-label">
                {month.name}
                {month.year ? <span> {month.year}</span> : null}
              </h2>
              <div className="keen-month-grid">
                {month.cells.map((date, index) => {
                  if (!date) return <span key={`blank-${index}`} className="keen-cell blank" />;
                  if (date < today) return <PastDayCell key={date} date={date} />;
                  return (
                    <KeenDayCell
                      key={date}
                      day={dayFor(date)}
                      today={today}
                      userId={userId}
                      onOpen={setOpenDate}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div ref={sentinelRef} className="keen-sentinel" />

      <KeenDaySheet
        userName={userName}
        day={openDate ? dayFor(openDate) : null}
        userId={userId}
        venueSuggestions={venueSuggestions}
        onClose={closeSheet}
      />
    </>
  );
}

function monthOf(today: string, offset: number) {
  const todayDate = dateFromKey(today);
  const first = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const firstKey = keyFromDate(first);
  const lastKey = keyFromDate(last);

  const cells: Array<string | null> = [];
  if (offset === 0) {
    for (let date = mondayOf(today); date <= lastKey; date = addDays(date, 1)) cells.push(date);
  } else {
    const leadingBlanks = (first.getUTCDay() + 6) % 7;
    for (let index = 0; index < leadingBlanks; index++) cells.push(null);
    for (let date = firstKey; date <= lastKey; date = addDays(date, 1)) cells.push(date);
  }

  const year = first.getUTCFullYear();
  return {
    key: firstKey,
    name: new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(first),
    year: year === todayDate.getUTCFullYear() ? null : year,
    cells,
  };
}
