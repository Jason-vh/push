import { BOOKING_DURATIONS, durationLabel } from "@/lib/keenDays";

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <div className="segmented">
      {BOOKING_DURATIONS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          className={value === minutes ? "selected" : undefined}
          aria-pressed={value === minutes}
          onClick={() => onChange(minutes)}
        >
          {durationLabel(minutes)}
        </button>
      ))}
    </div>
  );
}
