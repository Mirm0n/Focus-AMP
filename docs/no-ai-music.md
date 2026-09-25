# No AI music: the station rules

Status: **policy adopted 2026-09-18. Picks-only was built the same day and is currently switched off in `useCatalog.ts` — see section 9.** Section 9 says exactly which
rules the code enforces today and which are still only written down.

Tunescape plays music made by people. This document is the set of rules that keeps
AI-generated music stations out of the catalog, how each rule is checked, and what to do when
one gets through anyway.

---

## 1. The problem, stated honestly

**Nobody can reliably tell AI-generated music from a radio stream.** There is no detector the
app could run on the audio that is accurate enough to act on, and any rule that pretends
otherwise will block real musicians and wave through fakes.

So these rules do not try to detect AI music. They do the thing that does work:

> **A station is allowed in because there is evidence that people choose and make its music.
> It is never allowed in merely because there is no evidence against it.**

That is a rule about *provenance*: who runs the station, who picks the tracks, and whether the
artists it plays exist. Provenance can be checked. "Sounds human" cannot.

The cost of this approach is accepted up front: **some genuine stations will be left out**
because they are anonymous and cannot show who is behind them. A smaller catalog that can be
trusted is the goal. When in doubt, leave it out.

## 2. What counts as AI music

**In scope, not allowed:**

- Recordings whose composition or performance is primarily produced by a generative model
  (Suno, Udio, Stable Audio, Mubert, AIVA, Boomy, Soundraw, Beatoven, Loudly, Endel and
  whatever comes next), whether or not a person wrote the prompt.
- Stations that stream such recordings as all or a substantial part of their programming.
- "Infinite", "endless" or "generative" streams produced live by a model.
- Stations whose tracks are credited to artists that do not exist outside the station.

**Out of scope, allowed:**

- Human-made music that used machine learning as a tool: mastering, noise reduction, stem
  separation, a synth preset, pitch correction.
- Human-made electronic, algorithmic or generative *art* music in the older sense (modular
  patches, Eno-style systems, live coding). A person built the system and signs the work.
- **Auto-DJ stations.** Software that sequences a library of human-made tracks with no live
  presenter is fine. Automation of the *playlist* is not the issue; the *recordings* are.
  (Anonymous auto-DJ stations are still a risk factor under rule R3, because anonymity is.)
- AI-voiced station idents or presenters. Unwelcome, but this policy is about the music.

**The unit is the station, not the track.** A human-curated station may one day play a track
that turns out to be AI-made; that is the curator's error and outside what this app can
police. A station is removed when AI music is *what it is for*, or when its operator stops
caring about the difference.

## 3. Where the risk is

AI-generated music is not spread evenly. It concentrates where music is functional, wordless,
and interchangeable, because that is where it is cheapest to make and hardest to notice.

| Risk | Genres |
|---|---|
| **High** | Lofi · Ambient · Space / Drone · Solo piano · Nature & soundscapes · Downtempo / Chillout · Synthwave |
| **Medium** | Classical (public-domain works, synthetic performances) · Film & game scores · Deep house · Techno · Trance · IDM / Electronica |
| **Lower** | Jazz · Bossa · Folk · Reggae · Indie · Alternative rock · Rock · Post-rock · Metal · Blues · Soul & funk · Hip-hop · Drum & bass |

"Lower" is not "none". It means a station in that genre is far more likely to be playing
released records by known artists, which is exactly what is easy to verify.

High-risk genres are also the genres this app exists for. That is why the rules are stricter
there instead of the genres being dropped.

## 4. Two tiers, two standards

The catalog has two sources and they are held to different standards, because only one of
them is looked at by a person.

| | **Picks** (`src/data/stations.ts`) | **Directory** (Radio Browser) |
|---|---|---|
| Who adds it | A person, by hand | Nobody: it arrives by genre tag |
| Standard | Positive evidence, recorded (section 5) | Automated exclusion rules (section 6) |
| Badge | PICK | none |
| What the badge promises | "We checked who runs this" | nothing |

The PICK badge is the only thing in the app that vouches for a station. The rules below exist
to make that badge mean something, and to make the unvouched remainder as clean as automation
can get it.

## 5. Rules for Picks

A station becomes a Pick only if **every** rule below passes, and the result is written into
the register in section 10. One failure, or one "couldn't find out", means it is not a Pick.

### R1. A named operator

There is an identifiable organisation or person who runs the station: a legal name, a
registered non-profit, a public broadcaster, a named founder. "A team of music lovers" is not
a name.

*Check:* the station's About or Imprint page; a company or charity registry where one applies.

### R2. Named people choose the music

The station says who programmes it: named DJs, music directors, curators or show hosts, and
those people can be found elsewhere (other stations, labels, interviews, a social account with
a history).

*Check:* About / Shows / Team pages. Search one of the names.

### R3. Not anonymous, even if automated

Auto-DJ is acceptable (section 2) **only with R1 and R2 satisfied**. An unattended stream with
no named operator and no named programmer fails, however good it sounds. This is the rule that
removed the original four Lofi stations from the Picks.

### R4. It predates the generators

The station was broadcasting before **1 January 2023**. Consumer text-to-music tools capable
of release-quality tracks arrived in 2023 and 2024; a station with a documented history before
that was not built on them.

A newer station can still pass, but only with **stronger evidence on R2, R5 and R6**, and the
register must say why the date was waived.

*Check, in order of reliability:* the Internet Archive's earliest capture of the station's
site; the domain's registration date; the age of its social accounts; press coverage.

### R5. The artists exist

Tune in. Take **ten consecutive track titles** from the stream's metadata and look each artist
up in MusicBrainz, Discogs or Bandcamp. At least **nine of ten** must be real artists with a
footprint that predates the station playing them: releases, a label, live dates, other people
writing about them.

A station that sends **no track metadata at all** cannot pass R5 by this route. It may pass
only if it publishes playlists or tracklists elsewhere that can be checked the same way.

### R6. It says where its music comes from

One of: it pays performance royalties and says so (SoundExchange, PRS, SACEM, GEMA, SUISA or
the local equivalent); it is a licensed public broadcaster; or it plays releases from named
labels and credits them.

**Fail outright** if the station describes its music as "royalty-free", "copyright-free",
"no copyright", "DMCA-free" or "stream-safe". Those libraries are now substantially
AI-generated, and a station built on one has no way of knowing what it is playing.

### R7. No AI claims, anywhere

Search the station's site and social accounts for: `AI`, `generated`, `generative`, `Suno`,
`Udio`, `Mubert`, `AIVA`, `Boomy`, `Soundraw`, `Endel`, `Stable Audio`, `neural`. Any statement
that its music is made with such tools is a fail. So is a network that runs dozens of
near-identical channels with no staff behind them.

### R8. Hand-marked, dated, and re-checked

Every Pick carries the date it was checked. Picks are re-checked **every six months**, and at
once if a broadcaster announces a change of ownership or format. A Pick that cannot be
re-verified is demoted, not left in place.

## 6. Rules for directory stations

Nobody looks at these, so the rules are whatever can be decided from the directory's own
fields: name, tags, homepage, votes, codec. They exclude; they never vouch.

### D1. AI keywords in the name or tags

Exclude a station whose name or tags contain, as whole words: `ai`, `a.i.`, `ai music`,
`ai generated`, `ai-generated`, `generated`, `generative`, `neural`, `suno`, `udio`, `mubert`,
`aiva`, `boomy`, `soundraw`, `beatoven`, `loudly`, `endel`, `stable audio`, `infinite`,
`endless`.

`ai` must match as a whole word only, or it removes every station with "rai", "air", "main"
or "Thai" in its name. Test any change against the live directory before shipping it.

### D2. Royalty-free keywords in the name or tags

Exclude: `royalty free`, `royalty-free`, `copyright free`, `copyright-free`, `no copyright`,
`ncs`, `dmca free`, `dmca-free`, `stream safe`, `streamer safe`, `twitch safe`. Same reasoning
as R6.

### D3. A higher bar in high-risk genres

In the high-risk genres of section 3, a directory station must have:

- **50 votes** instead of 20, and no fallback to the lenient threshold of 5; and
- a **homepage** on file in the directory that is not a bare streaming-host URL.

If that leaves a high-risk genre nearly empty, the genre shows its Picks and little else.
That is the intended outcome, not a bug to be fixed by loosening the rule.

### D4. The blocklist

`src/data/blocklist.ts` lists stations excluded by hand: by directory UUID, by stream host,
or by name pattern. Every entry carries a **reason**, a **date**, and **what was found**. An
entry is never added on suspicion alone without saying that it is suspicion (section 8).

### D5. Votes are a floor, not a proof

The vote threshold stays because it removes test streams and abandoned entries cheaply. It is
**not evidence of human music**: an AI lofi stream can collect votes like anything else. No
rule in this document may treat votes as provenance.

### D6. A runtime signal: does anything it plays exist?

The app already looks up each track title for album art (`src/lib/albumArt.ts`). That lookup
is also a provenance signal. For each directory station, keep a local tally of titles
received and titles that matched a real release.

- A station that has sent **20 or more titles with zero matches** is flagged.
- A flagged station is shown a small "unverified" mark and sinks to the bottom of its genre.
  It is **not** removed automatically: obscure, regional and classical stations match badly
  too, and a bad match rate is a reason to look, not a verdict.

This only works while album art is switched on, and it says nothing about stations that send
no metadata at all, which in a high-risk genre is itself a reason for suspicion.

## 7. Red flags

None of these is proof. Two or more together on an anonymous station in a high-risk genre is
enough to leave it out.

- No homepage, or a homepage that is a template with no people on it
- A name that is a search phrase: "Lofi Beats to Study 24/7", "Deep Sleep Piano Radio"
- No track metadata, or metadata that is generic: "Lofi Track 47", "Chill Mix", "Ambient 3"
- Artist names that return nothing on MusicBrainz, Discogs or Bandcamp
- Every track credited to the station itself, or to one prolific "artist"
- An impossible output: hundreds of new tracks a month from one name
- A network of many near-identical channels launched together
- Cover art that is itself AI-generated across the whole catalog
- Sells or promotes "royalty-free" music, stream-safe packs, or a generator
- Launched after 2023 with no people attached to it
- Hosted on a free streaming host with no site of its own *and* any of the above

## 8. When one gets through

It will. The rules reduce the odds; they do not make the catalog clean by themselves.

**Reporting.** Any listener, including you, can flag a station. The target design is a
"Report this station" action on the player bar that blocks it locally at once and records the
name, URL and reason.

**Review.** Apply rules R1 to R7 to the reported station. Record what was found.

**Removal.** Add it to the blocklist (D4) with reason, date and findings. If it was a Pick,
remove it from `stations.ts` and from the register, and note the removal in the register's
history so the same station is not re-added later by someone who never saw the report.

**Wording.** Be careful what is asserted. Unless a station *says* its music is AI-generated,
the honest entry is **"excluded pending provenance: no named operator, artists not found"**,
not "AI station". The existing note on PAX LO-FI in the catalog's history is the model: *a
precaution rather than a finding about the station.* This matters for fairness, and because
the blocklist is in a public repository.

**Reinstatement.** A station comes back by passing section 5, the same as any new Pick. The
burden is on the evidence, not on the passage of time.

## 9. What is enforced today

Honest status as of 2026-09-18. "Built" means the code does it now. Nothing marked "Not
built" should be described anywhere as a protection the app has.

| Rule | Status | Where |
|---|---|---|
| Two tiers; PICK badge only on hand-chosen stations | **Built** | `stations.ts`, `Sidebar.tsx` |
| Picks drawn only from named broadcasters | **Built, not documented per rule** | `stations.ts` (see section 10) |
| R3: anonymous auto-DJ stations are not Picks | **Built** | the four original Lofi stations were demoted |
| R1, R2, R4 to R7 applied and recorded per Pick | **First pass done**, not yet confirmed by a person | section 10 |
| R8: six-monthly re-check | **Not done** | no dates per Pick, no reminder |
| **Picks only by default** | **Built, but currently DISABLED in code** | `useCatalog.ts` returns `true` unconditionally ("We force this to true… to avoid changing other components right now"), so every listener sees the unvetted directory and the Settings toggle does not stick. The gating in `Sidebar.tsx` and `StationsTab.tsx` is intact and works the moment that function reads storage again |
| Search, favorites and last station follow that setting | **Built** | `Sidebar.tsx`, `App.tsx` |
| D1: AI keyword exclusion (unverified tier) | **Built** | `AI_BARE`, `AI_WORDING`, `AI_TAGS` in `genres.ts` |
| D2: royalty-free keyword exclusion (unverified tier) | **Built** | `ROYALTY_FREE_WORDING` in `genres.ts` |
| D3: provenance check in high-risk genres (unverified tier) | **Built, in a lighter form** | `lacksProvenance` in `radioBrowser.ts`: no homepage, a homepage that is only a free streaming host, or a search-phrase name. First run: 34 stations excluded across the seven genres. The 50-vote bar was not adopted |
| D4: blocklist file | **Dropped** | nothing arrives by itself, so removing a station is deleting its line |
| D5: vote floor (20, falling back to 5) | **Built** | `radioBrowser.ts` |
| D6: catalog match-rate signal | **Parked** | only worth building if the unverified tier becomes the default again |
| Report action on the player bar | **Parked** | same reason |
| Audit of D1 and D2 against the live directory | **Built** | `npm run audit:genres` prints what they remove |

The practical meaning of this table: **by default a listener can only reach a Pick**, so the
protection is exactly as good as the Picks are. The Picks come from five long-established
broadcasters and none has yet been through section 5; that review is the next job. Sections 6
(D3 to D6) and 8 describe a larger system that was designed and then set aside as more than
this app needs. They are kept here in case the catalog ever has to grow past what a person can
hand-pick.

The provenance check excludes stations as "pending provenance", with the reason recorded by
the audit (`npm run audit:genres -- --names` lists them). It removed 34 of roughly 330
directory stations in the high-risk genres, which means about nine in ten have a site of their
own and an ordinary name. **That is a statement about websites, not about music**: having a
homepage is cheap, and an AI station can have one. This check trims the obvious cases; it does
not make the unverified tier safe, and only the Picks are vouched for.

When D1 and D2 were first run against the live directory (2026-09-18, all 26 genres, about
1,400 stations after the other filters) they removed **none**. That is the expected result,
not a reassuring one: the stations that pass the vote floor don't describe themselves as AI,
which is the reason the directory is no longer shown by default.

## 10. The Picks register

One row per broadcaster, since the Picks come in families. A Pick's channels inherit their
broadcaster's row. First review: **2026-09-18**, done by Claude from public sources and the
stations' own track feeds, **not yet confirmed by a person**. "Not established" means the
evidence could not be retrieved, not that it does not exist.

| Broadcaster | R1 Operator | R2 Who programmes | R4 Since | R5 Artists exist | R6 Music source | R7 AI claims | Verdict |
|---|---|---|---|---|---|---|---|
| SomaFM | **Pass.** SomaFM.com, LLC; founder Rusty Hodge | **Partly.** "Playlist curators" credited; a page naming them per channel was not retrieved | **Pass.** Launched Feb 2000; site archived Aug 2000 | **Pass.** 20 of 20 (Groove Salad, Drone Zone) | **Pass.** Listener-supported; pays SoundExchange royalties | None found on its About page | **Keep** |
| Radio Paradise | **Pass.** Founded by William and Rebecca Goldsmith | **Pass.** Run and programmed by the founders | **Pass.** Feb 2000; site archived May 2000 | **Pass.** 12 of 12, across four channels | **Pass.** Listener-supported; pays negotiated webcasting royalties | Not established: its site is script-rendered and could not be read | **Keep** |
| FIP | **Pass.** Radio France, public broadcaster | **Pass.** "Hand-picked by a small team of curators" | **Pass.** Founded 5 Jan 1971; site archived Oct 1999 | **Pass, narrowly.** 8 of 9 (FIP and FIP Jazz); one name not in MusicBrainz | **Pass.** Licensed public broadcaster | None found | **Keep** |
| Radio Swiss Jazz / Classic | **Pass.** Schweizerische Radio- und Fernsehgesellschaft (SRG SSR) | Not established from its pages; in-house at a public broadcaster | **Pass.** Sites archived Jan and Jun 2002 | **Pass.** 10 of 10 (Jazz). Classic not sampled | **Pass.** Licensed public broadcaster | None found | **Keep** |
| KEXP | **Pass.** Friends of KEXP, a non-profit affiliated with the University of Washington | **Pass.** DJ-programmed; John Richards, Cheryl Waters, Kevin Cole named | **Pass.** On air since 1972 as KCMU | **Pass.** 12 of 12 | **Pass.** Listener-supported licensed broadcaster | None found | **Keep** |
| The Current | **Pass.** Minnesota Public Radio | **Pass.** Program director Steve Nelson, music director Thorn Skroch; named hosts | **Pass.** Launched 24 Jan 2005; site archived Feb 2003 | **Pass.** 10 of 10 | **Pass.** Public radio, listener-supported | None found | **Keep** |
| WXPN | **Pass.** Trustees of the University of Pennsylvania | **Pass.** Named hosts incl. David Dye (World Cafe) | **Pass.** On air since 1945; site archived Dec 1998 | Not sampled: its playlist is script-rendered | **Pass.** Non-commercial university station | None found | **Keep, R5 owed** |
| Nightride FM | **Fail.** No operator named on its site. Its About page now redirects elsewhere. One co-founder is identifiable only by a handle | **Partly.** Named DJ sets in its archive; no programmers named | **Pass.** Site archived Apr 2019 | **Pass.** 10 of 10, including Com Truise and Mega Drive | **Not established.** Runs a Bandcamp label and takes artist submissions; no licensing statement found | None found on its homepage; its submission rules could not be read | **Removed** |

How R5 was done: recent tracks were taken from each broadcaster's own now-playing feed or
programme page and each artist looked up in MusicBrainz, accepting only an exact-name match.
Sample sizes are small and single-day. It shows these stations play real, catalogued artists;
it does not replace listening.

**What is still owed on the four that stay:** a person should confirm R2 for SomaFM and Radio
Swiss, read Radio Paradise's site for R7, and sample Radio Swiss Classic for R5.

**Nightride FM.** Removed under the policy's own rule that one failure, or one "couldn't find
out", keeps a station out. The evidence on its *music* is good: real artists, human DJ sets,
six years on air. What is missing is who is behind it and how it licenses what it plays. It
comes back if its site, or a reply from the station, names an operator and states its
licensing. Until then it is "excluded pending provenance", and nothing here says or implies
that it plays AI-generated music.

Sources: [SomaFM](https://en.wikipedia.org/wiki/SomaFM) ·
[SomaFM About](https://somafm.com/about/) ·
[Radio Paradise](https://en.wikipedia.org/wiki/Radio_Paradise) ·
[FIP](https://en.wikipedia.org/wiki/FIP_(radio_station)) ·
[Radio Swiss Jazz programme](https://www.radioswissjazz.ch/en/music-programme) ·
[Nightride FM](https://nightride.fm/) ·
first-capture dates from the Internet Archive's CDX index.

**History**

| Date | Station | Action | Reason |
|---|---|---|---|
| 2026-08-26 | PAX LO-FI | Removed | Excluded pending provenance review; a precaution, not a finding |
| 2026-09-24 | KEXP, The Current, WXPN | Added as Picks | Vetted for the new Alternative rock genre. All three are public or university stations with named programmers. WXPN still owes the artist sample |
| 2026-09-18 | Nightride FM, Chillsynth FM | Removed from Picks | Excluded pending provenance: no named operator (R1), licensing not stated (R6). Not a finding about its music |
| 2026-09-18 | Lofi 24/7, Box Lofi Radio, MoE Lofi, LITT Live | Demoted from Picks | Anonymous auto-DJ streams; fail R3. May still appear through the directory |

## 11. Changing these rules

- A rule is loosened only with a written reason in this file. "The genre looked empty" is not
  a reason (see D3).
- A rule is tightened freely.
- Keyword lists (D1, D2, R7) are expected to grow as new tools appear. Add the tool's name the
  day you hear of it.
- Any change to an automated rule is tested against the live directory first, and the numbers
  (stations removed per genre, and a sample of what was removed) go in the commit message, so
  a rule that quietly deletes real stations is caught before it ships.

## 12. What these rules cannot do

- They cannot detect AI music by listening. Nothing can, reliably.
- They cannot vouch for every track on a human-curated station.
- They cannot make the directory tier trustworthy; they can only make it less bad. The honest
  position is that **only Picks are vouched for**, and the interface should never imply
  otherwise.
- They depend on stations describing themselves truthfully. A station that hides what it is,
  names a fictional team and invents plausible artist names will pass D1 and D2, and would
  take a careful R5 check to catch.
- They will exclude some real, human, anonymous stations. That trade is deliberate.
