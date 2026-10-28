# Security policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting instead: go to the **Security** tab, then **Report a
vulnerability**. That opens a thread only you and the maintainers can read.

What helps, in rough order of usefulness:

- what an attacker can do, in one sentence
- the steps to reproduce it
- the version, or the commit, and your operating system
- anything you already know about a fix

You will get a first reply within **7 days**. If a fix is warranted, it ships in the next
release and the advisory credits you unless you would rather it did not.

## Supported versions

Focus AMP has not had a public release yet. Until it does, the `main` branch is the only
supported version.

## Where the risk actually is

Focus AMP is a local desktop application. It has no accounts, no server and no telemetry, so
most of its attack surface comes from the things it fetches:

- **The local stream proxy** (`src-tauri/src/proxy.rs`) runs an HTTP server on a loopback port
  and fetches URLs on the app's behalf. It is the most security-sensitive code in the project,
  and tightening it is a release blocker (decision C11 in `docs/EXECUTION.md`).
- **Station streams and directory data** come from third parties over the network. Names, tags
  and stream URLs from the [Radio Browser](https://www.radio-browser.info) directory are
  untrusted input and are treated as data, never as anything executable.
- **Album art** is fetched from Apple's iTunes Search API when that setting is on, which sends
  the current track title to Apple. It is off by default.

## Out of scope

Reports that a station plays something you dislike, or that a stream is dead — those are
ordinary issues, and dead streams are expected: the player skips them by design.
