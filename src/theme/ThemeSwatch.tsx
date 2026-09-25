import type { ThemeVariant } from "./themes";

/**
 * A theme at thumbnail size: a slab of its chassis carrying a line of text and
 * a dot of accent, beside its display with the three ladder colours lit. Two
 * flat colours can't tell Graphite from Walnut or Amber — they share an orange
 * — but the display colours and the ink can.
 */
export function ThemeSwatch({
  variant,
  width,
  height,
}: {
  variant: ThemeVariant;
  width: number | string;
  height: number;
}) {
  const t = variant.tokens;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        width,
        height,
        flex: "0 0 auto",
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${t["--app-border-muted"]}`,
        background: `linear-gradient(135deg, ${t["--app-bg-surface"]} 0 65%, ${t["--viz-ground"]} 65% 100%)`,
        position: "relative"
      }}
    >
      <span
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 6,
          background: t["--app-accent"],
        }}
      />
    </span>
  );
}
