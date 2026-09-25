import { useEffect, useState } from "react";
import { Play, Square, Radio, Loader2, Volume1, Volume2, VolumeX } from "lucide-react";

import type { Station } from "../data/stations";
import type { RadioPlayer } from "../hooks/useRadioPlayer";
import type { Favorites } from "../hooks/useFavorites";
import { StarButton } from "./Sidebar";

/**
 * Persistent transport. Lives below every view so playback controls never move
 * or disappear as the main area changes.
 */

interface PlayerBarProps {
  station: Station;
  favorites: Favorites;
  player: RadioPlayer;
  nowPlaying: string | null;
  /** Cover for the current track, when one was found. */
  art: string | null;
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onStop: () => void;
}

export function PlayerBar({
  station,
  favorites,
  player,
  nowPlaying,
  art,
  playing,
  disabled,
  onPlay,
  onStop,
}: PlayerBarProps) {
  const status = player.status;

  // A cover that fails to load falls back to the icon rather than a broken
  // image; a new URL gets a fresh chance.
  const [broken, setBroken] = useState<string | null>(null);
  useEffect(() => setBroken(null), [art]);
  const cover = art && art !== broken ? art : null;

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
      ? "var(--app-danger)"
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
          <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
            <Square size={10} fill="currentColor" />
            <Loader2 size={24} className="spin" style={{ position: "absolute", opacity: 0.5 }} />
          </div>
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
            width: 44,
            height: 44,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            borderRadius: "var(--app-radius-sm)",
            background: "var(--app-bg-overlay)",
            border: "1px solid var(--app-border-subtle)",
            color: playing ? "var(--app-accent)" : "var(--app-text-faint)",
          }}
        >
          {cover ? (
            <img
              src={cover}
              alt=""
              draggable={false}
              onError={() => setBroken(cover)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Radio size={16} />
          )}
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
        <StarButton station={station} favorites={favorites} size={16} />
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
