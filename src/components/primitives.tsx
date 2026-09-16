import type { CSSProperties, ReactNode } from "react";

/** Shared surface + text styles, so App and the dev harness stay in step. */

export const card: CSSProperties = {
  background: "var(--app-bg-surface)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: "var(--app-radius-md)",
  padding: 16,
};

export const label: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  color: "var(--app-text-faint)",
  fontFamily: "var(--app-font-ui)",
};

export function Button({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 13px",
        fontSize: 12.5,
        fontFamily: "var(--app-font-ui)",
        fontWeight: 500,
        borderRadius: "var(--app-radius-sm)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        border: primary ? "1px solid var(--app-accent)" : "1px solid var(--app-border-muted)",
        background: primary ? "var(--app-accent)" : "transparent",
        color: primary ? "#161104" : "var(--app-text-primary)",
      }}
    >
      {children}
    </button>
  );
}
