// Native time inputs show no placeholder, and iOS Safari renders an empty one as a blank strip.
export function TimeInput({
  label,
  value,
  onChange,
  placeholder = "Add a time",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="label">
      {label}
      <span className="time-input">
        <input
          className={`input${value ? "" : " is-empty"}`}
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {value ? null : (
          <span className="time-input-placeholder" aria-hidden>
            {placeholder}
          </span>
        )}
      </span>
    </label>
  );
}
