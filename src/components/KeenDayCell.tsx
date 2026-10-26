import {
  PLAYERS_PER_GAME,
  dateFromKey,
  dayStatus,
  isKeen,
  isPlaying,
  type KeenDay,
} from "@/lib/keenDays";

export function KeenDayCell({
  day,
  today,
  userId,
  onOpen,
}: {
  day: KeenDay;
  today: string;
  userId: string;
  onOpen: (date: string) => void;
}) {
  const classes = ["keen-cell", `is-${dayStatus(day)}`];
  if (day.date === today) classes.push("today");
  if (isPlaying(day, userId)) classes.push("playing");

  return (
    <button type="button" className={classes.join(" ")} onClick={() => onOpen(day.date)}>
      <span className="keen-cell-num">{dateFromKey(day.date).getUTCDate()}</span>
      <KeenCellFooter day={day} userId={userId} />
    </button>
  );
}

export function PastDayCell({ date }: { date: string }) {
  return (
    <span className="keen-cell past" aria-hidden>
      <span className="keen-cell-num">{dateFromKey(date).getUTCDate()}</span>
      <span className="keen-cell-dots" />
    </span>
  );
}

function KeenCellFooter({ day, userId }: { day: KeenDay; userId: string }) {
  if (day.session?.startTime)
    return <span className="keen-cell-time">{day.session.startTime}</span>;

  const people = day.session ? day.session.players.length : day.keen.length;
  const count = Math.min(PLAYERS_PER_GAME, people);
  if (count === 0) {
    return (
      <span className="keen-cell-dots hint" aria-hidden>
        {Array.from({ length: PLAYERS_PER_GAME }, (_, index) => (
          <span key={index} className="keen-dot open" />
        ))}
      </span>
    );
  }

  if (day.session) {
    return (
      <span className="keen-cell-dots" aria-label={`${people} playing`}>
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className="keen-dot" />
        ))}
      </span>
    );
  }

  const mine = isKeen(day, userId);
  return (
    <span className="keen-cell-dots" aria-label={`${people} keen`}>
      {Array.from({ length: PLAYERS_PER_GAME }, (_, index) => {
        let className = "keen-dot";
        if (index === 0 && mine) className += " me";
        else if (index >= count) className += " open";
        return <span key={index} className={className} />;
      })}
    </span>
  );
}
