type Tone = "forest" | "mint" | "court" | "cream";

const palette: Record<Tone, { bg: string; fg: string }> = {
  forest: { bg: "#0d3f24", fg: "#f4ead0" },
  mint: { bg: "#dceede", fg: "#0d3f24" },
  court: { bg: "#5e9d6b", fg: "#f4ead0" },
  cream: { bg: "#f4ead0", fg: "#0d3f24" },
};

export function Avatar({
  name,
  size = 28,
  tone = "forest",
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const { bg, fg } = palette[tone];
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
