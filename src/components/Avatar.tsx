type Tone = "auto" | "forest" | "mint" | "court" | "cream";

const namedPalette: Record<Exclude<Tone, "auto">, { bg: string; fg: string }> = {
  forest: { bg: "#0d3f24", fg: "#f4ead0" },
  mint: { bg: "#dceede", fg: "#0d3f24" },
  court: { bg: "#5e9d6b", fg: "#f4ead0" },
  cream: { bg: "#f4ead0", fg: "#0d3f24" },
};

// Cream-friendly earth tones — each avatar gets a deterministic colour from
// this list so the same player keeps the same swatch across the app.
const autoPalette: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#0d3f24", fg: "#f4ead0" }, // forest
  { bg: "#6e7f3b", fg: "#f4ead0" }, // olive
  { bg: "#5e9d6b", fg: "#0d3f24" }, // sage
  { bg: "#2e5b62", fg: "#f4ead0" }, // slate teal
  { bg: "#1f3e57", fg: "#f4ead0" }, // deep navy
  { bg: "#b3654a", fg: "#f4ead0" }, // terracotta
  { bg: "#c79431", fg: "#0d3f24" }, // mustard
  { bg: "#a04a2f", fg: "#f4ead0" }, // brick
  { bg: "#8e3b3c", fg: "#f4ead0" }, // burgundy
  { bg: "#5a3c5c", fg: "#f4ead0" }, // plum
  { bg: "#45663d", fg: "#f4ead0" }, // moss
  { bg: "#d9a06b", fg: "#0d3f24" }, // peach
];

// FNV-1a, stable across runtimes — collapse case + trim so casing tweaks
// don't shuffle the colour.
function hashName(name: string): number {
  const normalized = name.trim().toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Avatar({
  name,
  size = 28,
  tone = "auto",
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const { bg, fg } =
    tone === "auto"
      ? autoPalette[hashName(name) % autoPalette.length]
      : namedPalette[tone];
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
