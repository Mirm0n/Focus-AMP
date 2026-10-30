import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Pin, Plus, Search, Settings, Star, LayoutDashboard, X } from "lucide-react";

import { label } from "./primitives";
import { GENRES, getGenre, type GenreDef } from "../data/genres";
import { PICKS, isPick, type Station } from "../data/stations";
import { listGenre, loadedGenres, searchDirectory } from "../lib/radioBrowser";
import type { Favorites } from "../hooks/useFavorites";
import type { LocalLibrary } from "../lib/localFiles";

/**
 * The station browser.
 *
 * Two levels: the genres, in groups, and then one genre's stations. A search
 * box sits above both and means the same thing at either level: search what is
 * listed here.
 *
 * By default the catalog is Picks and nothing else (docs/EXECUTION.md, Part 3): a
 * genre lists its Picks, a genre with none is not shown, and search and
 * favorites look no further. With "Show unverified stations" on, each genre is
 * filled out from the directory behind its Picks.
 *
 * Whichever list a station is picked from travels with it as its queue, so
 * when a stream dies the player moves to the next one *in that list*.
 */

export interface Queue {
  /** For the one-line note: "Nothing else in <name> is responding." */
  name: string;
  /** The genre it came from, so the sidebar can mark it. Favorites has none. */
  genreId?: string;
  stations: Station[];
}

/**
 * `genreId` for the Favorites queue. No genre uses this id, so the marker is
 * never a guess: a queue restored from an older session carries no id at all
 * and lights nothing up, rather than defaulting to Favorites.
 */
export const FAVORITES_QUEUE = "__favorites__";

/** `genreId` for the Local files queue. */
export const LOCAL_QUEUE = "__local__";

const STORAGE_KEY = "focusamp:browse";

interface Browse {
  genre: string | null;
  homeCollapsed: string[];
  collapsed: boolean;
  /** Genre ids pinned to the top of the list, in the order they were pinned. */
  pinned: string[];
}

function loadBrowse(): Browse {
  const fallback: Browse = { genre: null, homeCollapsed: [], collapsed: false, pinned: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      genre: typeof parsed.genre === "string" && getGenre(parsed.genre) ? parsed.genre : null,
      homeCollapsed: Array.isArray(parsed.homeCollapsed) ? parsed.homeCollapsed.filter((c: unknown) => typeof c === "string") : [],
      collapsed: typeof parsed.collapsed === "boolean" ? parsed.collapsed : false,
      // Dropped if the genre no longer exists, so a rename can't strand a pin.
      pinned: Array.isArray(parsed.pinned)
        ? parsed.pinned.filter((id: unknown) => typeof id === "string" && getGenre(id))
        : [],
    };
  } catch {
    return fallback;
  }
}

interface RowState {
  selected: Station;
  playing: Station | null;
  buffering: boolean;
  unavailable: Set<string>;
  favorites: Favorites;
  /** Include directory stations nobody has vetted. Off by default. */
  showUnverified: boolean;
  /** The list the playing station came from, or null when nothing is playing. */
  playingFrom: Queue | null;
  local: LocalLibrary;
}

/** What a genre may list right now, without touching the network. */
function pool(genreId: string, showUnverified: boolean): Station[] {
  const picks = PICKS[genreId] ?? [];
  return showUnverified ? (loadedGenres().get(genreId) ?? picks) : picks;
}

/** A genre with nothing to list under the current setting is not offered. */
function offered(genre: GenreDef, showUnverified: boolean): boolean {
  return showUnverified ? true : (PICKS[genre.id]?.length ?? 0) > 0;
}

function StationRow({
  station,
  state,
  onPick,
  onRemove,
}: {
  station: Station;
  state: RowState;
  onPick: () => void;
  /** Shown in place of the star — for local files, which are yours to drop. */
  onRemove?: () => void;
}) {
  const isSel = state.selected.url === station.url;
  const isLive = state.playing?.url === station.url;
  const isDown = state.unavailable.has(station.url);

  return (
    <li className="station-row" style={rowStyle(isSel, isLive)}>
      {/* The row and the star are two separate actions, so they are two
          separate buttons — a button inside a button is not valid, and the
          star was already a real one. */}
      <button
        type="button"
        onClick={onPick}
        // "The current item in a set" is exactly what the playing station is.
        aria-current={isLive ? "true" : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 0,
          font: "inherit",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                minWidth: 0,
                fontSize: 12.5,
                color: isLive ? "var(--app-accent)" : "var(--app-text-primary)",
                fontWeight: isLive ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {station.name}
            </span>
          </span>
          <span
            style={{
              display: "block",
              fontSize: 10.5,
              // Dimming the whole row dragged the station name to roughly 2:1.
              // Only the secondary line loses contrast now.
              color: isDown ? "var(--app-text-faint)" : "var(--app-text-faint)",
              opacity: isDown ? 0.75 : 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isDown ? "unavailable" : station.artist}
          </span>
        </span>

        {isLive && state.buffering ? (
          <>
            <Loader2 size={11} className="spin" aria-hidden="true" style={{ color: "var(--app-accent)" }} />
            <span className="sr-only">Connecting</span>
          </>
        ) : isLive ? (
          <>
            {/* aria-label on a span with no role is ignored by most screen
                readers; the state lives on the button instead. */}
            <span className="nowbars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="sr-only">Playing</span>
          </>
        ) : null}
      </button>

      {onRemove ? (
        <button
          type="button"
          className="star-button"
          aria-label={`Remove ${station.name}`}
          title="Remove from list"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            flex: "0 0 auto",
            width: 26,
            height: 26,
            margin: "-4px -6px -4px 0",
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: "none",
            borderRadius: "var(--app-radius-sm)",
            background: "transparent",
            color: "var(--app-text-faint)",
            cursor: "pointer",
          }}
        >
          <X size={13} aria-hidden="true" />
        </button>
      ) : (
        <StarButton station={station} favorites={state.favorites} />
      )}
    </li>
  );
}

/** Row chrome, shared by the list item wrapper. */
function rowStyle(isSel: boolean, isLive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px 8px 16px",
    listStyle: "none",
    background: isSel || isLive ? "var(--app-bg-overlay)" : "transparent",
    transition: "background 0.15s ease",
    borderLeft: isLive
      ? "2px solid var(--app-accent)"
      : isSel
        ? "2px solid var(--app-border-default)"
        : "2px solid transparent",
  };
}

/**
 * A real button inside the row, so it is reachable by Tab on its own and the
 * row's own click (play) doesn't fire with it.
 */
export function StarButton({
  station,
  favorites,
  size = 14,
}: {
  station: Station;
  favorites: Favorites;
  size?: number;
}) {
  const on = favorites.has(station);
  return (
    <button
      type="button"
      className="star-button"
      aria-pressed={on}
      aria-label={on ? `Remove ${station.name} from favorites` : `Add ${station.name} to favorites`}
      title={on ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        favorites.toggle(station);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        flex: "0 0 auto",
        width: size + 12,
        height: size + 12,
        margin: "-4px -6px -4px 0",
        display: "grid",
        placeItems: "center",
        padding: 0,
        border: "none",
        borderRadius: "var(--app-radius-sm)",
        background: "transparent",
        color: on ? "var(--app-accent)" : "var(--app-text-faint)",
        opacity: on ? 1 : undefined,
        cursor: "pointer",
      }}
    >
      <Star size={size} fill={on ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

function Status({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div
      style={{ padding: "16px", fontSize: 12, lineHeight: 1.5, color: "var(--app-text-muted)" }}
    >
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "block",
            marginTop: 10,
            padding: "6px 12px",
            font: "inherit",
            fontSize: 12,
            borderRadius: "var(--app-radius-sm)",
            border: "1px solid var(--app-border-muted)",
            background: "transparent",
            color: "var(--app-text-primary)",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** A request that is pending, failed, or done. */
type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

function GenreView({
  genre,
  needle,
  state,
  onPick,
  onBack,
}: {
  genre: GenreDef;
  needle: string;
  state: RowState;
  onPick: (station: Station, queue: Queue) => void;
  onBack: () => void;
}) {
  const [load, setLoad] = useState<Load<Station[]>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const picks = PICKS[genre.id] ?? [];

  useEffect(() => {
    // Picks only: there is nothing to fetch, and nothing is fetched.
    if (!state.showUnverified) {
      setLoad({ status: "ready", data: picks });
      return;
    }
    // `live` guards against a slow genre landing after a quicker later one.
    let live = true;
    setLoad({ status: "loading" });
    listGenre(genre).then(
      (data) => live && setLoad({ status: "ready", data }),
      () => live && setLoad({ status: "error" }),
    );
    return () => {
      live = false;
    };
    // `picks` is derived from `genre`, so it needs no entry of its own.
  }, [genre, attempt, state.showUnverified]);

  // Picks need no network, so they are on screen while the directory loads and
  // stay there if it never answers.
  const all = load.status === "ready" ? load.data : picks;
  const shown = useMemo(
    () =>
      needle
        ? all.filter(
            (s) => s.name.toLowerCase().includes(needle) || s.artist.toLowerCase().includes(needle),
          )
        : all,
    [all, needle],
  );

  /**
   * Vetted stations and the rest, under a heading each — but only when the
   * list actually holds both. Marking every row instead said the same thing
   * a dozen times over, and in a genre that is nearly all Picks it said
   * nothing at all.
   */
  const sections = useMemo(() => {
    const vetted = shown.filter(isPick);
    const community = shown.filter((st) => !isPick(st));
    if (vetted.length === 0 || community.length === 0) {
      return [{ heading: null as string | null, stations: shown }];
    }
    return [
      { heading: "Picks" as string | null, stations: vetted },
      { heading: "Community directory" as string | null, stations: community },
    ];
  }, [shown]);

  return (
    <>
      <button
        type="button"
        className="station-row"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "10px 12px 9px",
          font: "inherit",
          fontSize: 12.5,
          fontWeight: 600,
          textAlign: "left",
          color: "var(--app-text-primary)",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid var(--app-border-subtle)",
          cursor: "pointer",
        }}
      >
        <ChevronLeft size={15} aria-hidden="true" style={{ color: "var(--app-text-muted)" }} />
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {genre.name}
        </span>
        <span style={{ ...label, marginLeft: "auto", flex: "0 0 auto" }}>All genres</span>
      </button>

      {sections.map(({ heading, stations }) => (
        <div key={heading ?? "all"}>
          {heading && <div style={{ ...label, padding: "12px 16px 5px" }}>{heading}</div>}
          <ul
            aria-label={heading ? `${genre.name}, ${heading}` : `${genre.name} stations`}
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {stations.map((station) => (
              <StationRow
                key={station.url}
                station={station}
                state={state}
                // The queue is the whole genre, not the searched view of it.
                onPick={() => onPick(station, { name: genre.name, genreId: genre.id, stations: all })}
              />
            ))}
          </ul>
        </div>
      ))}

      {load.status === "loading" && genre.tags.length > 0 && (
        <Status>
          <Loader2
            size={12}
            className="spin"
            style={{ verticalAlign: "-2px", marginRight: 7, color: "var(--app-text-faint)" }}
          />
          Finding more {genre.name.toLowerCase()} stations…
        </Status>
      )}
      {load.status === "error" && (
        <Status onRetry={() => setAttempt((n) => n + 1)}>
          Couldn't reach the station directory{picks.length > 0 ? ", so these are the Picks only." : "."}
        </Status>
      )}
      {load.status === "ready" && shown.length === 0 && (
        <Status>
          {needle ? "No station here matches that." : "No playable stations listed here right now."}
        </Status>
      )}
    </>
  );
}

function Home({
  needle,
  collapsed,
  pinned,
  state,
  onToggle,
  onPin,
  onGenre,
  onPick,
}: {
  needle: string;
  collapsed: string[];
  pinned: string[];
  state: RowState;
  onToggle: (id: string) => void;
  onPin: (id: string) => void;
  onGenre: (id: string) => void;
  onPick: (station: Station, queue: Queue) => void;
}) {
  // Search looks through every Pick, plus whatever genres have been opened
  // this session. That is everything it can do without the network.
  const found = useMemo(() => {
    if (!needle) return null;
    const genres = GENRES.filter(
      (g) => offered(g, state.showUnverified) && g.name.toLowerCase().includes(needle),
    );
    const seen = new Set<string>();
    const stations: Array<{ station: Station; genre: GenreDef }> = [];
    for (const genre of GENRES) {
      for (const station of pool(genre.id, state.showUnverified)) {
        if (seen.has(station.url)) continue;
        const hit =
          station.name.toLowerCase().includes(needle) || station.artist.toLowerCase().includes(needle);
        if (!hit) continue;
        seen.add(station.url);
        stations.push({ station, genre });
      }
    }
    return { genres, stations: stations.slice(0, 80) };
  }, [needle, state.showUnverified]);

  /**
   * …and, with the community directory on, the directory itself.
   *
   * Without this the app could only find a station in a genre somebody had
   * already opened, which made most of the directory unreachable however
   * precisely you typed its name. Picks-only listeners see none of this: it
   * searches the unvetted listing, so it is offered only to people who have
   * asked for that listing.
   */
  const [fromDirectory, setFromDirectory] = useState<Station[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!state.showUnverified || needle.length < 2) {
      setFromDirectory(null);
      setSearching(false);
      return;
    }
    const abort = new AbortController();
    // Long enough that typing a station's name is one request, not eight.
    const timer = setTimeout(() => {
      setSearching(true);
      searchDirectory(needle, abort.signal)
        .then((rows) => {
          if (!abort.signal.aborted) {
            setFromDirectory(rows);
            setSearching(false);
          }
        })
        .catch(() => {
          // Offline, or a mirror having a bad minute. The local results are
          // already on screen and are not worth replacing with an error.
          if (!abort.signal.aborted) {
            setFromDirectory([]);
            setSearching(false);
          }
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [needle, state.showUnverified]);

  /** Whatever the local pass already found should not be listed twice. */
  const directoryOnly = useMemo(() => {
    if (!fromDirectory || !found) return [];
    const already = new Set(found.stations.map((s) => s.station.url));
    return fromDirectory.filter((s) => !already.has(s.url));
  }, [fromDirectory, found]);

  const genreRow = (genre: GenreDef) => {
    // Only once the genre has been opened: before that the only number to
    // hand is its Picks, which would undersell a genre of sixty as "1".
    const count = state.showUnverified
      ? (loadedGenres().get(genre.id)?.length ?? 0)
      : (PICKS[genre.id]?.length ?? 0);
    const live = state.playingFrom?.genreId === genre.id;
    const isPinned = pinned.includes(genre.id);
    return (
      <li key={genre.id} className="station-row" style={genreRowStyle(live)}>
        {/* Two sibling buttons, not one nested in the other. A focusable
            control inside a button is unreliable — some screen readers flatten
            the button's contents into its name and the pin disappears. */}
        <button
          type="button"
          onClick={() => onGenre(genre.id)}
          aria-current={live ? "true" : undefined}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 0,
            font: "inherit",
            fontSize: 12.5,
            textAlign: "left",
            color: "var(--app-text-primary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: live ? "var(--app-accent)" : undefined,
              fontWeight: live ? 600 : undefined,
            }}
          >
            {genre.name}
          </span>

          {live && (
            <>
              <span className="nowbars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sr-only">Playing from this genre</span>
            </>
          )}

          {count > 0 && !live && (
            <span
              style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums", color: "var(--app-text-faint)" }}
            >
              {count}
            </span>
          )}
          <ChevronRight size={13} aria-hidden="true" style={{ color: "var(--app-text-faint)" }} />
        </button>

        <button
          type="button"
          className="pin-button"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${genre.name}` : `Pin ${genre.name} to the top`}
          title={isPinned ? "Unpin" : "Pin to the top"}
          onClick={() => onPin(genre.id)}
          style={{
            flex: "0 0 auto",
            width: 22,
            height: 22,
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--app-radius-sm)",
            border: "none",
            background: "transparent",
            color: isPinned ? "var(--app-accent)" : "var(--app-text-faint)",
            cursor: "pointer",
          }}
        >
          <Pin size={12} fill={isPinned ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </li>
    );
  };

  /** Row chrome for a genre, now that the row is a list item. */
  function genreRowStyle(live: boolean): React.CSSProperties {
    return {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      padding: "7px 12px 7px 16px",
      listStyle: "none",
      transition: "background 0.15s ease",
      borderLeft: live ? "2px solid var(--app-accent)" : "2px solid transparent",
    };
  }

  if (found) {
    const nothingAnywhere =
      found.genres.length === 0 && found.stations.length === 0 && directoryOnly.length === 0;
    if (nothingAnywhere && !searching) {
      return (
        <Status>
          {state.showUnverified
            ? "Nothing matches that, here or in the community directory."
            : "Nothing matches that. Only Picks are searched — turn on the community directory in Settings to search the rest."}
        </Status>
      );
    }
    return (
      <>
        {found.genres.length > 0 && <h2 style={{ ...label, margin: 0, padding: "12px 16px 5px" }}>Genres</h2>}
        <ul aria-label="Matching genres" style={{ listStyle: "none", margin: 0, padding: 0 }}>{found.genres.map(genreRow)}</ul>
        {found.stations.length > 0 && <h2 style={{ ...label, margin: 0, padding: "12px 16px 5px" }}>Stations</h2>}
        <ul aria-label="Matching stations" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {found.stations.map(({ station, genre }) => (
            <StationRow
              key={station.url}
              station={station}
              state={state}
              onPick={() =>
                onPick(station, {
                  name: genre.name,
                  genreId: genre.id,
                  stations: pool(genre.id, state.showUnverified),
                })
              }
            />
          ))}
        </ul>

        {/* The directory's own answer, under its own heading so there is
            never any doubt which of these somebody has vouched for. */}
        {state.showUnverified && (searching || directoryOnly.length > 0) && (
          <>
            <h2 style={{ ...label, margin: 0, padding: "12px 16px 5px" }}>
              Community directory
            </h2>
            {searching && directoryOnly.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "2px 16px 10px",
                  fontSize: 11.5,
                  color: "var(--app-text-faint)",
                }}
              >
                Searching…
              </p>
            ) : (
              <ul
                aria-label="Matching stations from the community directory"
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {directoryOnly.map((station) => (
                  <StationRow
                    key={station.url}
                    station={station}
                    state={state}
                    // The queue is what the search turned up, so Next and
                    // Previous walk the results rather than jumping into a
                    // genre the listener never opened.
                    // No genreId: these came from a search, not a genre, so
                    // the sidebar has no genre to mark as playing — the same
                    // way favorites behave.
                    onPick={() =>
                      onPick(station, {
                        name: `Search: ${needle}`,
                        stations: directoryOnly,
                      })
                    }
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </>
    );
  }

  // A directory station starred while the setting was on stays saved, but is
  // only listed while it is on: turning the setting off means Picks only,
  // everywhere, and turning it back on brings the star back.
  const favorites = state.favorites.stations.filter((s) => state.showUnverified || isPick(s));
  const favOpen = !collapsed.includes("favorites");
  const localOpen = !collapsed.includes("local");
  const allOpen = !collapsed.includes("all");

  // Pinned keep the order they were pinned in; the rest stay in catalog order.
  const offeredGenres = GENRES.filter((g) => offered(g, state.showUnverified));
  const pinnedGenres = pinned
    .map((id) => offeredGenres.find((g) => g.id === id))
    .filter((g): g is GenreDef => g !== undefined);
  const restGenres = offeredGenres.filter((g) => !pinned.includes(g.id));

  // Playing from Favorites: that queue has no genre, so the section says it.
  const liveFromFavorites = state.playingFrom?.genreId === FAVORITES_QUEUE;
  const liveFromLocal = state.playingFrom?.genreId === LOCAL_QUEUE;

  const toggleBtn = (id: string, text: string, open: boolean, live = false) => (
    <button
      type="button"
      className="station-row"
      aria-expanded={open}
      onClick={() => onToggle(id)}
      style={{
        ...label,
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        padding: "13px 12px 6px 16px",
        textAlign: "left",
        background: "transparent",
        transition: "background 0.15s ease",
        border: "none",
        cursor: "pointer",
      }}
    >
      <span style={{ flex: 1, color: live ? "var(--app-accent)" : undefined }}>{text}</span>
      {live && (
        <>
          <span className="nowbars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="sr-only">Playing from here</span>
        </>
      )}
      <ChevronDown
        size={12}
        aria-hidden="true"
        style={{ transform: open ? undefined : "rotate(-90deg)", transition: "transform 120ms ease" }}
      />
    </button>
  );

  return (
    <>
      <div>
        {toggleBtn("favorites", "Favorites", favOpen, liveFromFavorites)}
        {favOpen && (
          favorites.length > 0 ? (
            <ul aria-label="Favorite stations" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {favorites.map((station) => (
                <StationRow
                  key={station.url}
                  station={station}
                  state={state}
                  onPick={() =>
                    onPick(station, {
                      name: "Favorites",
                      genreId: FAVORITES_QUEUE,
                      stations: favorites,
                    })
                  }
                />
              ))}
              </ul>
          ) : (
            <div style={{ padding: "8px 16px", fontSize: 12.5, color: "var(--app-text-muted)" }}>
              No favorites
            </div>
          )
        )}
      </div>
      <div>
        {toggleBtn("local", "Local files", localOpen, liveFromLocal)}
        {localOpen && (
          <>
            {state.local.stations.length > 0 && (
              <ul aria-label="Local files" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {state.local.stations.map((station) => (
                  <StationRow
                    key={station.url}
                    station={station}
                    state={state}
                    onRemove={() => state.local.remove(station)}
                    onPick={() =>
                      onPick(station, {
                        name: "Local files",
                        genreId: LOCAL_QUEUE,
                        stations: state.local.stations,
                      })
                    }
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              className="station-row"
              onClick={() => void state.local.pick()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 16px",
                font: "inherit",
                fontSize: 12.5,
                textAlign: "left",
                color: "var(--app-text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={13} aria-hidden="true" />
              Add audio files…
            </button>
          </>
        )}
      </div>
      <div>
        {toggleBtn("all", "All Genres", allOpen)}
        {allOpen && (
          <div style={{ paddingTop: 8 }}>
            {pinnedGenres.length > 0 && (
              <ul aria-label="Pinned genres" style={{ listStyle: "none", margin: 0, padding: 0 }}>{pinnedGenres.map(genreRow)}</ul>
            )}
            {pinnedGenres.length > 0 && restGenres.length > 0 && (
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  margin: "7px 16px",
                  background: "var(--app-border-subtle)",
                }}
              />
            )}
            <ul aria-label="Genres" style={{ listStyle: "none", margin: 0, padding: 0 }}>{restGenres.map(genreRow)}</ul>
          </div>
        )}
      </div>
    </>
  );
}

interface SidebarProps extends RowState {
  onPick: (station: Station, queue: Queue) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onPick, onOpenSettings, ...state }: SidebarProps) {
  const [browse, setBrowse] = useState(loadBrowse);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(browse));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [browse]);

  // A different list starts from its top, and with an empty search box: the
  // box means "in this list", and the list has just changed.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setSearch("");
  }, [browse.genre]);

  const stored = browse.genre ? getGenre(browse.genre) : undefined;
  // A genre that the current setting doesn't offer falls back to the list.
  const genre = stored && offered(stored, state.showUnverified) ? stored : undefined;
  const needle = search.trim().toLowerCase();

  return (
    <aside
      aria-label="Stations"
      style={{
        width: browse.collapsed ? 54 : 250,
        flex: browse.collapsed ? "0 0 54px" : "0 0 250px",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--app-border-subtle)",
        background: "var(--app-bg-surface)",
        transition: "width 0.2s ease, flex 0.2s ease",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          padding: "16px",
          borderBottom: "1px solid var(--app-border-subtle)",
        }}
      >
        <button
          className="selectable"
          onClick={() => setBrowse({ ...browse, collapsed: !browse.collapsed })}
          title={browse.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            flex: "0 0 auto",
            borderRadius: "var(--app-radius-sm)",
            border: "none",
            background: "transparent",
            color: "var(--app-text-muted)",
            cursor: "pointer",
            marginLeft: -4,
          }}
        >
          <LayoutDashboard size={16} />
        </button>

        {!browse.collapsed && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "0 12px",
              height: 36,
              flex: 1,
              borderRadius: "var(--app-radius-sm)",
              border: "1px solid var(--app-border-input)",
              background: "var(--app-bg-base)",
            }}
          >
            <Search size={13} aria-hidden="true" style={{ color: "var(--app-text-faint)", flex: "0 0 auto" }} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={genre ? `Search ${genre.name}` : "Search genres and stations"}
              aria-label={genre ? `Search ${genre.name}` : "Search genres and stations"}
              className="selectable"
              style={{
                flex: 1,
                minWidth: 0,
                font: "inherit",
                fontSize: 12.5,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--app-text-primary)",
              }}
            />
          </label>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", display: browse.collapsed ? "none" : "block" }}>
        {genre ? (
          <GenreView
            genre={genre}
            needle={needle}
            state={state}
            onPick={onPick}
            onBack={() => setBrowse((b) => ({ ...b, genre: null }))}
          />
        ) : (
          <Home
            needle={needle}
            pinned={browse.pinned}
            onPin={(id) =>
              setBrowse((b) => ({
                ...b,
                pinned: b.pinned.includes(id)
                  ? b.pinned.filter((p) => p !== id)
                  : [...b.pinned, id],
              }))
            }
            collapsed={browse.homeCollapsed}
            state={state}
            onToggle={(id) =>
              setBrowse((b) => ({
                ...b,
                homeCollapsed: b.homeCollapsed.includes(id)
                  ? b.homeCollapsed.filter((c) => c !== id)
                  : [...b.homeCollapsed, id],
              }))
            }
            onGenre={(id) => setBrowse((b) => ({ ...b, genre: id }))}
            onPick={onPick}
          />
        )}
      </div>

      {/* Pinned so it stays reachable however long the station list gets. */}
      <button
        type="button"
        className="station-row"
        onClick={onOpenSettings}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: browse.collapsed ? "center" : "flex-start",
          gap: 10,
          width: "100%",
          minHeight: 44,
          padding: browse.collapsed ? "11px 0" : "11px 18px",
          font: "inherit",
          fontSize: 12.5,
          color: "var(--app-text-muted)",
          background: "transparent",
          transition: "background 0.15s ease",
          border: "none",
          borderTop: "1px solid var(--app-border-subtle)",
          cursor: "pointer",
        }}
      >
        <Settings size={15} aria-hidden="true" />
        {!browse.collapsed && "Settings"}
      </button>
    </aside>
  );
}
