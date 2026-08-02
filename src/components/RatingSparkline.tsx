const WIDTH = 300;
const HEIGHT = 72;
const PAD_Y = 8;

/** Rating after every match, oldest first. Drawn on a stretched viewBox, so the
    stroke keeps its width via non-scaling-stroke. */
export function RatingSparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) {
    return <div className="sparkline-empty">Not enough matches yet.</div>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = HEIGHT - PAD_Y - ((value - min) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y };
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
  const last = points[points.length - 1];

  return (
    <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      <title>{label}</title>
      <defs>
        <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--court)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--court)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparklineFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--forest)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="3"
        fill="var(--forest)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
