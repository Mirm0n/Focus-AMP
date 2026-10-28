import { Moon } from "lucide-react";

import { SLEEP_CHOICES, SLEEP_FADE_SECONDS, type SleepTimer } from "../hooks/useSleepTimer";
import { Chip, PanelHeader, Popover } from "./Popover";

function short(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

/** Sleep timer, opened from the transport bar. Shows the time left on the button. */
export function SleepPopover({ sleep }: { sleep: SleepTimer }) {
  const on = sleep.endsAt !== null;

  return (
    <Popover
      label={on ? `Sleep timer, ${short(sleep.remaining)} left` : "Sleep timer"}
      active={on}
      width={244}
      trigger={
        <>
          <Moon size={14} aria-hidden="true" fill={on ? "currentColor" : "none"} />
          {on && <span>{short(sleep.remaining)}</span>}
        </>
      }
    >
      <PanelHeader title="Sleep timer">
        {on && (
          <button
            type="button"
            onClick={sleep.cancel}
            style={{
              padding: "3px 8px",
              font: "inherit",
              fontSize: 11.5,
              borderRadius: "var(--app-radius-sm)",
              border: "1px solid var(--app-border-muted)",
              background: "transparent",
              color: "var(--app-text-muted)",
              cursor: "pointer",
            }}
          >
            Turn off
          </button>
        )}
      </PanelHeader>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SLEEP_CHOICES.map((m) => (
          <Chip key={m} on={false} onClick={() => sleep.start(m)}>
            {m} min
          </Chip>
        ))}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: 1.45, color: "var(--app-text-muted)" }}>
        {on
          ? `Stops in ${short(sleep.remaining)}. Picking a time starts over.`
          : `Fades out over the last ${SLEEP_FADE_SECONDS} seconds, then stops.`}
      </p>
    </Popover>
  );
}
