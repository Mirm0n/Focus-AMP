import { useId } from "react";
import { Check } from "lucide-react";

/** Form controls shared by the settings tabs. */

export function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--app-text-primary)",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 11, color: "var(--app-text-muted)" }}>{children}</p>
  );
}

export function NumberField({
  name,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 11.5, color: "var(--app-text-muted)" }}>
        {name}
      </label>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          style={{
            width: 58,
            padding: "6px 8px",
            fontSize: 12.5,
            fontFamily: "var(--app-font-mono)",
            borderRadius: "var(--app-radius-sm)",
            border: "1px solid var(--app-border-input)",
            background: "var(--app-bg-overlay)",
            color: "var(--app-text-primary)",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--app-text-muted)" }}>{suffix}</span>
      </span>
    </div>
  );
}

export function Toggle({
  name,
  hint,
  on,
  onChange,
}: {
  name: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  const hintId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={hintId}
      onClick={() => onChange(!on)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 11px",
        textAlign: "left",
        borderRadius: "var(--app-radius-sm)",
        border: "1px solid var(--app-border-input)",
        background: on ? "var(--app-bg-overlay)" : "transparent",
        cursor: "pointer",
        width: "100%",
        minHeight: 44,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          flex: "0 0 auto",
          marginTop: 2,
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          border: `1px solid ${on ? "var(--app-accent)" : "var(--app-border-muted)"}`,
          background: on ? "var(--app-accent)" : "transparent",
          color: "var(--app-accent-ink)",
        }}
      >
        {on && <Check size={11} strokeWidth={3} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--app-text-primary)" }}>
          {name}
        </span>
        <span
          id={hintId}
          style={{ display: "block", fontSize: 11, color: "var(--app-text-muted)" }}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}
