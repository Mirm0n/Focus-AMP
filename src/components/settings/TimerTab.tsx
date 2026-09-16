import { FieldGroup, Hint, NumberField, Toggle } from "./fields";
import type { Pomodoro, PomodoroSettings } from "../../hooks/usePomodoro";

export function TimerTab({ pom }: { pom: Pomodoro }) {
  const set = <K extends keyof PomodoroSettings>(k: K, v: PomodoroSettings[K]) =>
    pom.update({ [k]: v } as Partial<PomodoroSettings>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Durations">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <NumberField
            name="Focus"
            value={pom.settings.focusMin}
            min={1}
            max={180}
            suffix="min"
            onChange={(v) => set("focusMin", v)}
          />
          <NumberField
            name="Short break"
            value={pom.settings.shortMin}
            min={1}
            max={60}
            suffix="min"
            onChange={(v) => set("shortMin", v)}
          />
          <NumberField
            name="Long break"
            value={pom.settings.longMin}
            min={1}
            max={120}
            suffix="min"
            onChange={(v) => set("longMin", v)}
          />
          <NumberField
            name="Long break every"
            value={pom.settings.longEvery}
            min={2}
            max={12}
            suffix="sessions"
            onChange={(v) => set("longEvery", v)}
          />
        </div>
        <Hint>
          {pom.running
            ? "The timer is running, so new durations take effect at the next phase."
            : "Changes apply immediately while the timer is stopped."}
        </Hint>
      </FieldGroup>

      <FieldGroup title="Behaviour">
        <Toggle
          name="Auto-start next phase"
          hint="Roll straight into breaks and back"
          on={pom.settings.autoStart}
          onChange={(v) => set("autoStart", v)}
        />
        <Toggle
          name="Pause radio on breaks"
          hint="Stops the stream when a break starts, resumes the same station after"
          on={pom.settings.pauseOnBreak}
          onChange={(v) => set("pauseOnBreak", v)}
        />
      </FieldGroup>

      <FieldGroup title="Alerts">
        <Toggle
          name="Chime"
          hint="A two-note tone at each phase change"
          on={pom.settings.chime}
          onChange={(v) => set("chime", v)}
        />
        <Toggle
          name="Desktop notification"
          hint="Reaches you when the window is behind others"
          on={pom.settings.notify}
          onChange={(v) => set("notify", v)}
        />
      </FieldGroup>
    </div>
  );
}
