# Tunescape: the music plan

Status: **Phases 1–3 built**, 2026-09-18. Not yet listened to inside the Tauri app.

## The decision

Tunescape is a focus-music app. Not a world radio with a timer attached.

- Music only. Talk, news, sport and religious programming are filtered out everywhere.
- No World tab. Geography stops being a way in. (Country can survive as a small detail on a
  station, never as navigation.)
- Genre becomes the whole front door, so it has to grow from 3 groups and 11 stations into a
  real catalog, with the one filter that matters most for working: **vocals**.

## How the catalog works

Two sources, one list.

**Picks** are the stations in `src/data/stations.ts`: hand-chosen, provenance-checked, and
marked by hand as instrumental or vocal. They are few and they are trusted. They show first in
their genre, with a badge.

**The directory** is Radio Browser, which fills every genre out to dozens of stations. It is
uncurated, so it gets filtered hard before anyone sees it:

- a genre is a **set of tags we define**, not a raw tag. The directory's tags are free text
  ("lofi", "lo-fi", "lo fi", "chillhop" are four different tags), so each genre lists the tags
  that count as it, and the tags that disqualify a station from it
- **music only**: drop anything tagged news, talk, sport, religion, politics, comedy, podcast
- drop broken, HLS-only, duplicate and sub-96k streams; order by votes, then clicks
- the existing failover (next station in the same list, give up after five dead in a row)
  carries over unchanged

**Vocals** is the honest hard part: the directory has no such field. So it is inferred:

| Signal | Example | Trust |
|---|---|---|
| Marked by hand on a Pick | Groove Salad → mostly instrumental | high |
| Station tags | "instrumental", "vocal", "a cappella" | medium |
| The genre's default | Ambient → instrumental, Soul → vocal | low |

The filter has three positions: **Instrumental · Any · Vocal**. "Instrumental" means
"instrumental as far as we can tell", and the UI should say so rather than promise.

### Proposed genres

Grouped by what they are for. Each carries a default for vocals.

| Group | Genres |
|---|---|
| Deep focus | Lofi · Ambient · Space / Drone · Classical · Solo piano · Film & game scores · Nature & soundscapes |
| Easy | Jazz · Bossa & latin jazz · Downtempo / Chillout · Acoustic & folk · Reggae & dub |
| Electronic | Deep house · Techno · Trance · Drum & bass · Synthwave · IDM / Electronica |
| Band | Indie · Rock · Post-rock · Metal · Blues · Soul & funk · Hip-hop |
| Curated | SomaFM (kept as a group: it is the most dependable thing in the catalog) |

About 25 genres. Post-rock and scores sit where they do because they are instrumental music
that doesn't sound like "focus music", which is exactly what people run out of.

The list is a proposal until Phase 2 checks each genre against the live directory. A genre
that can't return a healthy number of playable stations gets its tag set widened, merged into
a neighbour, or dropped.

## Checklist

### Phase 1: clear the ground

- [x] Remove the World tab and its country browser from `Sidebar.tsx`
- [x] Remove `listCountries`; keep `radioBrowser.ts` and repurpose it for tag queries
- [x] Remove the Genre | World tab bar (one view needs no tabs)
- [x] Update README: drop the World section and its known-gap note

### Phase 2: the catalog

- [x] Define the genre model: id, name, group, tag set, excluded tags, default vocals
- [x] Write the ~25 genres and their tag sets; check each against the live directory for yield
- [x] Add `vocals` and provenance fields to Picks; mark the existing 11 by hand
- [ ] Find more Picks: aim for two or three trusted stations at the top of every genre
      (done for 23 of 26; Solo piano, Nature and Blues are still directory-only, and Lofi,
      Classical, Bossa, Drum & bass and Post-rock have one each)
- [x] Directory query by tag set, with the music-only and quality filters
- [x] Merge Picks and directory results into one list per genre, Picks first, deduplicated
- [x] Vocals inference (tags, then genre default) with a confidence level
- [x] Cache directory results per genre; retry and error states as the World view had
- [x] Audit script: station yield per genre, so a tag set that returns 3 stations gets caught

### Phase 3: browsing

- [x] Sidebar: genre groups, collapsible, with station counts
- [x] Genre view: station list with Pick badges, vocals marker, bitrate
- [x] ~~Vocals filter: Instrumental · Any · Vocal~~ built, then removed at your request; the
      INST / VOX marks on rows remain
- [x] Search across station names in the loaded genres
- [x] Remember the last genre, filter and station across restarts
- [x] Decide whether browsing needs a bigger surface than the 250px sidebar (see questions)

### Added since

- [x] Favorites: a star on every station row and in the player bar, and a Favorites section
      above the genres that acts as its own list
- [x] Album art in the player bar, from the stream's track title via iTunes Search; a setting,
      on by default

## Decisions taken

1. **Browsing lives in the sidebar** (option A): collapsible genre groups, then drill into a
   genre. It is the smaller change and it fits; a bigger Browse surface stays an option if the
   sidebar feels cramped in daily use.
2. **"Music only" is strict.** A directory station needs 20 votes to appear at all, on top of
   the tag filter — votes are the cheapest proxy for "real, and music". Genres too small for
   that (Post-rock, Synthwave) fall back to 5 so they aren't left empty.
3. **The vocals filter was removed** after trying it. Stations keep their INST / VOX mark
   where a Pick or the station's tags give one.
4. **The old Lofi stations are no longer Picks.** They were anonymous auto-DJ streams, which
   the catalog's own notes flag as unverifiable. They can still turn up through the directory.

5. **No religious programming, and no Arabic-language stations.** Religious stations are
   filtered by tag *and* by name, since a Quran recitation channel tagged only "classical"
   got through the tag filter. Arabic is excluded by language field or Arabic-script name,
   which also takes Persian and Urdu names that share the script.

## Still open

1. **Your earlier message ended mid-sentence** ("…a lot more categories and stations and
   with"). If there was a requirement after "with", it isn't built.
