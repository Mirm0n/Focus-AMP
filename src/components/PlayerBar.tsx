import { Play, Square, Radio, Loader2, Volume1, Volume2, VolumeX } from "lucide-react";

import type { Station } from "../data/stations";
import type { RadioPlayer } from "../hooks/useRadioPlayer";

/**
 * Persistent transport. Lives below every view so playback controls never move
 * or disappear as the main area changes.
 */

interface PlayerBarProps {
  station: Station;
  player: RadioPlayer;
  nowPlaying: string | null;
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onStop: () => void;
}

export function PlayerBar({
  station,
  player,
  nowPlaying,
  playing,
  disabled,
  onPlay,
  onStop,
}: PlayerBarProps) {
  const status = player.status;

  const secondary =
    nowPlaying ??
    (status === "playing"
      ? station.artist
      : status === "loading"
        ? "connecting…"
        : status === "error"
          ? (player.error ?? "unavailable")
          : "not playing");

  const secondaryColor = nowPlaying
    ? "var(--app-accent)"
    : status === "error"
      ? "var(--viz-hi)"
      : "var(--app-text-faint)";

  const VolIcon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      style={{
        flex: "0 0 auto",
        height: 66,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 18px",
        borderTop: "1px solid var(--app-border-subtle)",
        background: "var(--app-bg-header)",
      }}
    >
      {/* Transport */}
      <button
        onClick={playing ? onStop : onPlay}
        disabled={disabled}
        title={playing ? "Stop" : "Play"}
        aria-label={playing ? "Stop" : "Play"}
        style={{
          width: 40,
          height: 40,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          border: "none",
          background: disabled ? "var(--app-border-muted)" : "var(--app-accent)",
          color: "var(--app-accent-ink)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {status === "loading" ? (
          <Loader2 size={16} className="spin" />
        ) : playing ? (
          <Square size={14} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
        )}
      </button>

      {/* Now playing */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <span
          style={{
            width: 38,
            height: 38,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--app-radius-sm)",
            background: "var(--app-bg-overlay)",
            border: "1px solid var(--app-border-subtle)",
            color: playing ? "var(--app-accent)" : "var(--app-text-faint)",
          }}
        >
          <Radio size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--app-text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {station.name}
          </div>
          <div
            className="selectable"
            style={{
              fontSize: 11.5,
              color: secondaryColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={secondary}
          >
            {secondary}
          </div>
        </div>
      </div>

      {/* Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
        <VolIcon size={15} style={{ color: "var(--app-text-faint)" }} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(e) => player.setVolume(parseFloat(e.target.value))}
          style={{ width: 104, accentColor: "var(--app-accent)" }}
          title={`Volume ${Math.round(player.volume * 100)}%`}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
