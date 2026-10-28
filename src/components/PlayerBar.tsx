import { useEffect, useState } from "react";
import { Play, Square, Radio, Loader2, Volume1, Volume2, VolumeX, SkipBack, SkipForward, ExternalLink } from "lucide-react";

import type { Station } from "../data/stations";
import type { RadioPlayer } from "../hooks/useRadioPlayer";
import type { Favorites } from "../hooks/useFavorites";
import type { SleepTimer } from "../hooks/useSleepTimer";
import { StarButton } from "./Sidebar";
import { EqPopover } from "./EqPopover";
import { SleepPopover } from "./SleepPopover";
import { isLocal } from "../lib/localFiles";
import type { AlbumArt } from "../lib/albumArt";
import { openExternal } from "../lib/openExternal";

/**
 * Persistent transport. Lives below every view so playback controls never move
 * or disappear as the main area changes.
 */

/**
 * The 44px slot left of the station name. Shared so the cover and the fallback
 * icon occupy exactly the same space and nothing shifts when art arrives.
 */
const coverFrame: React.CSSProperties = {
  width: 44,
  height: 44,
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: "var(--app-radius-sm)",
  background: "var(--app-bg-overlay)",
  border: "1px solid var(--app-border-subtle)",
};

interface PlayerBarProps {
  station: Station;
  favorites: Favorites;
  player: RadioPlayer;
  sleep: SleepTimer;
  nowPlaying: string | null;
  /** Cover for the current track and its Apple Music page, when one was found. */
  art: AlbumArt | null;
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onStop: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function PlayerBar({
  station,
  favorites,
  player,
  sleep,
  nowPlaying,
  art,
  playing,
  disabled,
  onPlay,
  onStop,
  onNext,
  onPrev,
}: PlayerBarProps) {
  const status = player.status;

  // A cover that fails to load falls back to the icon rather than a broken
  // image; a new URL gets a fresh chance.
  const [broken, setBroken] = useState<string | null>(null);
  useEffect(() => setBroken(null), [art]);
  const cover = art && art.url !== broken ? art : null;

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
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={disabled || !onPrev}
          title="Previous station"
          aria-label="Previous station"
          className="station-row"
          style={{
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "var(--app-text-muted)",
            cursor: disabled || !onPrev ? "not-allowed" : "pointer",
            opacity: disabled || !onPrev ? 0.4 : 1,
            padding: 0,
          }}
        >
          <SkipBack size={15} aria-hidden="true" />
        </button>

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
              <Square size={10} fill="currentColor" aria-hidden="true" />
              <Loader2 size={24} className="spin" aria-hidden="true" style={{ position: "absolute", opacity: 0.5 }} />
            </div>
          ) : playing ? (
            <Square size={14} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play size={16} fill="currentColor" aria-hidden="true" style={{ marginLeft: 2 }} />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={disabled || !onNext}
          title="Next station"
          aria-label="Next station"
          className="station-row"
          style={{
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "var(--app-text-muted)",
            cursor: disabled || !onNext ? "not-allowed" : "pointer",
            opacity: disabled || !onNext ? 0.4 : 1,
            padding: 0,
          }}
        >
          <SkipForward size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Now playing */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        {/* The cover is a link to the track on Apple Music, which is the only
            footing Apple's Search API terms give us for showing their artwork
            at all. No link, no cover: `findAlbumArt` never returns one alone. */}
        {cover ? (
          <button
            type="button"
            onClick={() => openExternal(cover.link)}
            title="Listen on Apple Music"
            aria-label={`Listen to ${nowPlaying ?? "this track"} on Apple Music`}
            style={{
              ...coverFrame,
              position: "relative",
              padding: 0,
              cursor: "pointer",
              color: "var(--app-text-faint)",
            }}
          >
            <img
              src={cover.url}
              alt=""
              draggable={false}
              onError={() => setBroken(cover.url)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* Says the cover goes somewhere. Over a corner of the art, which
                is why it carries its own backing rather than relying on it. */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                display: "grid",
                placeItems: "center",
                width: 14,
                height: 14,
                borderTopLeftRadius: 3,
                background: "rgba(0, 0, 0, 0.55)",
                color: "#fff",
              }}
            >
              <ExternalLink size={9} />
            </span>
          </button>
        ) : (
          <span
            style={{ ...coverFrame, color: playing ? "var(--app-accent)" : "var(--app-text-faint)" }}
          >
            <Radio size={16} aria-hidden="true" />
          </span>
        )}
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
        {!isLocal(station) && <StarButton station={station} favorites={favorites} size={16} />}
      </div>

      {/* Sound tools */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "0 0 auto" }}>
        <SleepPopover sleep={sleep} />
        <EqPopover eq={player.eq} onChange={player.setEq} />
      </div>

      {/* Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
        <VolIcon size={15} aria-hidden="true" style={{ color: "var(--app-text-faint)" }} />
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
          aria-valuetext={`${Math.round(player.volume * 100)} percent`}
        />
      </div>
    </div>
  );
}
