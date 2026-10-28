import { ExternalLink } from "lucide-react";

import { FieldGroup, Hint } from "./fields";
import { MAKER, PROJECT, type Link } from "../../data/maker";
import { openExternal as open } from "../../lib/openExternal";

/**
 * About — what this is, who made it, and what it promises.
 *
 * Release task B5. Every field comes from `data/maker.ts` or the build, and
 * anything blank is left out rather than shown empty, so an unfinished detail
 * never reaches a listener as a placeholder.
 */

function LinkRow({ label, url, note }: Link) {
  return (
    <button
      type="button"
      className="station-row"
      onClick={() => open(url)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 11px",
        textAlign: "left",
        font: "inherit",
        borderRadius: "var(--app-radius-sm)",
        border: "1px solid var(--app-border-input)",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--app-text-primary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--app-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {note ?? url.replace(/^https:\/\//, "")}
        </span>
      </span>
      <ExternalLink size={13} aria-hidden="true" style={{ color: "var(--app-text-faint)" }} />
    </button>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 12.5, lineHeight: 1.6 }}>
      <span style={{ flex: "0 0 112px", color: "var(--app-text-muted)" }}>{term}</span>
      <span style={{ minWidth: 0, color: "var(--app-text-primary)" }}>{children}</span>
    </div>
  );
}

export function AboutTab() {
  const links = [
    PROJECT.source && { label: "Source code", url: PROJECT.source, note: "GPL-3.0-or-later" },
    PROJECT.donate && { label: "Support Focus AMP", url: PROJECT.donate, note: "There is no paywall, and never will be" },
    PROJECT.removal && { label: "Request a station's removal", url: PROJECT.removal, note: "Broadcasters: no reason needed, acted on within 7 days" },
  ].filter(Boolean) as Link[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Focus AMP">
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--app-text-primary)" }}>
          A radio for working to. Pick a genre, watch a retro display, and let the pomodoro
          timer keep the hours.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          <Row term="Version">{__APP_VERSION__}</Row>
          <Row term="Licence">GPL-3.0-or-later</Row>
          <Row term="Made by">{MAKER.name}</Row>
        </div>
        {MAKER.site && (
          <div style={{ marginTop: 6 }}>
            <LinkRow label={MAKER.name} url={MAKER.site} />
          </div>
        )}
      </FieldGroup>

      <FieldGroup title="The promise">
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--app-text-primary)" }}>
          Focus AMP plays music made by people. Stations are hand-checked: who runs them, who
          chooses the music, and whether the artists they play are real. A broadcaster who asks
          to be removed is removed, without having to give a reason.
        </p>
        <Hint>
          It has no account, no server of its own and no tracking. What it fetches, it fetches for
          you: the stations you play, the station directory when you turn it on, and Apple's
          iTunes search for album art when you turn that on. Nothing else leaves the app, and the
          fonts ship inside it, so with album art and the directory off it talks to nobody but
          the station you are listening to.
        </Hint>
      </FieldGroup>

      {links.length > 0 && (
        <FieldGroup title="Links">
          {links.map((l) => (
            <LinkRow key={l.url} {...l} />
          ))}
        </FieldGroup>
      )}

      {MAKER.projects.length > 0 && (
        <FieldGroup title="More from the maker">
          {MAKER.projects.map((p) => (
            <LinkRow key={p.url} {...p} />
          ))}
        </FieldGroup>
      )}

      <FieldGroup title="Credits">
        <Hint>
          Station directory by Radio Browser. Picks come from SomaFM, Radio Paradise, FIP,
          Radio Swiss, KEXP, WXPN, The Current and others — each one theirs, and listed with
          their own terms in mind. Typeset in Chivo and Chivo Mono by Omnibus-Type, bundled
          under the SIL Open Font License 1.1. Album art and track links from Apple Music.
          Built with Tauri, React and Rust; every dependency and its licence is listed in
          THIRD-PARTY-NOTICES.md.
        </Hint>
      </FieldGroup>
    </div>
  );
}
