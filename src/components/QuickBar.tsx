import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AudioLines, ChevronDown, Monitor, Moon, Sun } from "lucide-react";

import { VisualizerCanvas } from "./VisualizerCanvas";
import { label } from "./primitives";
import { LAYOUTS, type LayoutId } from "../layout/layouts";
import { LayoutGlyph } from "../layout/LayoutGlyph";
import { THEMES, type Mode } from "../theme/themes";
import { ThemeSwatch } from "../theme/ThemeSwatch";
import { VISUALIZERS } from "../viz/registry";
import type { Appearance } from "../theme/useAppearance";

/**
 * The quick bar — layout, display, theme and light/dark without opening
 * settings.
 *
 * Each is a dropdown whose entries show the thing itself rather than its name
 * alone: a schematic of the layout, the display running live on the current
 * audio, the theme's own colours. The closed bar stays a quiet line of four
 * labels; the pictures only appear when asked for.
 *
 * The menus follow the WAI-ARIA menu button pattern — arrows to move, Home and
 * End to jump, Enter or Space to choose, Escape to back out to the trigger.
 */

const MODES: Array<{ id: Mode; name: string; blurb: string; Icon: typeof Sun }> = [
  { id: "light", name: "Light", blurb: "Always the light variant", Icon: Sun },
  { id: "dark", name: "Dark", blurb: "Always the dark variant", Icon: Moon },
  { id: "system", name: "System", blurb: "Follow the operating system", Icon: Monitor },
];

interface Item {
  id: string;
  name: string;
  blurb?: string;
  /** The picture. Only rendered while the menu is open. */
  thumb: React.ReactNode;
}

interface DropdownProps {
  name: string;
  value: string;
  items: Item[];
  onSelect: (id: string) => void;
  /** A small stand-in for the current choice, shown in the closed trigger. */
  icon: React.ReactNode;
  width: number;
  columns?: number;
  /** `card` stacks the picture over the text; `row` sets it to the left. */
  shape?: "card" | "row";
}

function Dropdown({
  name,
  value,
  items,
  onSelect,
  icon,
  width,
  columns = 1,
  shape = "row",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const current = items.find((i) => i.id === value) ?? items[0];

  // The bar sits at the right of the window, so a menu hangs from its
  // trigger's right edge — but the wider menus are wider than the space to the
  // left of the first trigger, so the position is then pulled back inside the
  // window. Measured on open; useLayoutEffect so it never paints misplaced.
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const t = triggerRef.current!.getBoundingClientRect();
      const margin = 8;
      const ideal = t.right - width;
      const max = window.innerWidth - width - margin;
      setLeft(Math.max(margin, Math.min(ideal, max)) - t.left);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, width]);

  // Land on the current choice, so the arrows start from where you are.
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, items.findIndex((it) => it.id === value));
    itemRefs.current[i]?.focus();
    // Only on opening — a selection closes the menu anyway.
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const at = itemRefs.current.findIndex((el) => el === document.activeElement);
    let next = -1;
    if (e.key === "ArrowDown") next = Math.min(items.length - 1, at + columns);
    else if (e.key === "ArrowUp") next = Math.max(0, at - columns);
    else if (e.key === "ArrowRight") next = (at + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (at - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      // Chosen here rather than left to the button's own activation, which
      // fires on keyup for Space and would land after the menu has gone.
      e.preventDefault();
      itemRefs.current[at]?.click();
      return;
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    } else if (e.key === "Tab") {
      // Let focus move on naturally, but don't leave the menu hanging open.
      setOpen(false);
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    itemRefs.current[next]?.focus();
  };

  return (
    <div ref={rootRef} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        ref={triggerRef}
        type="button"
        className="quick-choice"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{
          height: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 8px 0 10px",
          font: "inherit",
          fontSize: 12.5,
          borderRadius: "var(--app-radius-sm)",
          border: `1px solid ${open ? "var(--app-border-default)" : "var(--app-border-subtle)"}`,
          background: open ? "var(--app-bg-overlay)" : "transparent",
          color: "var(--app-text-primary)",
          cursor: "pointer",
        }}
      >
        <span style={label}>{name}</span>
        <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
          {icon}
        </span>
        <span style={{ fontWeight: 600 }}>{current.name}</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          style={{
            color: "var(--app-text-muted)",
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 120ms ease",
          }}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={name}
          onKeyDown={onMenuKeyDown}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left,
            zIndex: 30,
            width,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 6,
            padding: 8,
            background: "var(--app-bg-surface)",
            border: "1px solid var(--app-border-default)",
            borderRadius: "var(--app-radius-md)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
          }}
        >
          {items.map((item, i) => {
            const active = item.id === value;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="quick-choice"
                onClick={() => {
                  onSelect(item.id);
                  close(true);
                }}
                style={{
                  display: "flex",
                  flexDirection: shape === "card" ? "column" : "row",
                  alignItems: shape === "card" ? "stretch" : "center",
                  gap: shape === "card" ? 8 : 11,
                  padding: 8,
                  minWidth: 0,
                  textAlign: "left",
                  font: "inherit",
                  borderRadius: "var(--app-radius-sm)",
                  border: `1px solid ${active ? "var(--app-accent)" : "var(--app-border-input)"}`,
                  background: active ? "var(--app-bg-overlay)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {item.thumb}
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {item.name}
                  </span>
                  {item.blurb && (
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: "var(--app-text-muted)",
                      }}
                    >
                      {item.blurb}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Chassis with a wedge of accent — the settings swatch, folded into a chip. */
function ThemeChip({ swatch, size }: { swatch: [string, string]; size: number }) {
  return (
    <span
      style={{
        display: "block",
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: "50%",
        border: "1px solid var(--app-border-default)",
        background: `linear-gradient(135deg, ${swatch[0]} 0 58%, ${swatch[1]} 58% 100%)`,
      }}
    />
  );
}

interface QuickBarProps {
  appearance: Appearance;
  /** For the live display previews. */
  analyser: AnalyserNode | null;
  playing: boolean;
}

export function QuickBar({ appearance, analyser, playing }: QuickBarProps) {
  const {
    layout,
    setLayout,
    visualizer,
    setVisualizer,
    options,
    vizTheme,
    theme,
    setTheme,
    mode,
    setMode,
    resolved,
  } = appearance;

  const ModeIcon = (MODES.find((m) => m.id === mode) ?? MODES[0]).Icon;

  return (
    <div
      role="toolbar"
      aria-label="Quick appearance"
      style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingRight: 12, // space before window controls
      }}
    >
      <Dropdown
        name="Layout"
        value={layout.id}
        onSelect={(id) => setLayout(id as LayoutId)}
        icon={
          <span style={{ display: "block", width: 26 }}>
            <LayoutGlyph id={layout.id} height={17} />
          </span>
        }
        width={440}
        columns={2}
        shape="card"
        items={LAYOUTS.map((l) => ({
          id: l.id,
          name: l.name,
          blurb: l.blurb,
          thumb: <LayoutGlyph id={l.id} height={104} />,
        }))}
      />

      <Dropdown
        name="Display"
        value={visualizer.id}
        onSelect={setVisualizer}
        icon={<AudioLines size={14} style={{ color: "var(--app-text-muted)" }} />}
        width={600}
        columns={2}
        items={VISUALIZERS.map((v) => ({
          id: v.id,
          name: v.name,
          blurb: v.blurb,
          thumb: (
            <span
              aria-hidden="true"
              style={{
                display: "block",
                width: 112,
                height: 60,
                flex: "0 0 auto",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid var(--app-border-input)",
                background: vizTheme.ground,
              }}
            >
              <VisualizerCanvas
                analyser={analyser}
                visualizer={v}
                options={options}
                theme={vizTheme}
                playing={playing}
                preview
              />
            </span>
          ),
        }))}
      />

      <Dropdown
        name="Theme"
        value={theme.id}
        onSelect={setTheme}
        icon={<ThemeChip swatch={theme[resolved].swatch} size={15} />}
        width={400}
        columns={4}
        shape="card"
        items={THEMES.map((t) => ({
          id: t.id,
          name: t.name,
          thumb: <ThemeSwatch variant={t[resolved]} width="100%" height={38} />,
        }))}
      />

      <Dropdown
        name="Mode"
        value={mode}
        onSelect={(id) => setMode(id as Mode)}
        icon={<ModeIcon size={14} style={{ color: "var(--app-text-muted)" }} />}
        width={250}
        items={MODES.map(({ id, name, blurb, Icon }) => ({
          id,
          name,
          blurb: id === "system" ? `${blurb} — currently ${resolved}` : blurb,
          thumb: (
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
                borderRadius: 4,
                border: "1px solid var(--app-border-input)",
                color: "var(--app-text-muted)",
              }}
            >
              <Icon size={16} />
            </span>
          ),
        }))}
      />
    </div>
  );
}
