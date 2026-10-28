import { useEffect, useId, useRef, useState } from "react";

/**
 * A toggle button with a panel that opens above it — for the transport bar,
 * which sits at the bottom of the window, so there is only room upward.
 *
 * Closes on Escape (focus goes back to the button) and on a press anywhere
 * outside. Not modal: the rest of the app stays usable while it is open.
 */
export function Popover({
  label,
  active = false,
  trigger,
  children,
  width = 260,
}: {
  /** Accessible name and tooltip for the trigger. */
  label: string;
  /** Lit in the accent colour — something in the panel is switched on. */
  active?: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        ref={buttonRef}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="station-row"
        style={{
          height: 30,
          minWidth: 30,
          padding: "0 7px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          font: "inherit",
          fontSize: 11.5,
          fontVariantNumeric: "tabular-nums",
          borderRadius: "var(--app-radius-sm)",
          border: "1px solid",
          borderColor: open ? "var(--app-border-input)" : "transparent",
          background: open ? "var(--app-bg-overlay)" : "transparent",
          color: active ? "var(--app-accent)" : "var(--app-text-muted)",
          cursor: "pointer",
        }}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          style={{
            position: "absolute",
            right: 0,
            bottom: "calc(100% + 10px)",
            zIndex: 30,
            width,
            padding: 14,
            borderRadius: "var(--app-radius-md)",
            border: "1px solid var(--app-border-subtle)",
            background: "var(--app-bg-surface)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The small uppercase heading row inside a popover panel. */
export function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--app-text-primary)" }}>{title}</span>
      {children}
    </div>
  );
}

/** A compact pill-shaped choice button. */
export function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: "5px 10px",
        font: "inherit",
        fontSize: 11.5,
        borderRadius: 999,
        border: "1px solid",
        borderColor: on ? "var(--app-accent)" : "var(--app-border-muted)",
        background: on ? "color-mix(in srgb, var(--app-accent) 16%, transparent)" : "transparent",
        color: on ? "var(--app-accent)" : "var(--app-text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
