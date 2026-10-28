//! Local audio proxy.
//!
//! Public radio streams almost never send `Access-Control-Allow-Origin`, and a
//! cross-origin media element with no CORS grant makes
//! `createMediaElementSource()` emit **silence** — killing audio, not just the
//! analyser. Rust has no CORS, so we fetch upstream freely and re-serve the
//! bytes from 127.0.0.1 with a permissive header. The webview then sees a
//! CORS-clean stream and the whole Web Audio graph works.
//!
//! While we hold the bytes we also de-interleave the ICY metadata blocks that
//! Icecast injects into the audio, which is how we get real track titles — a
//! webview cannot see them at all.
//!
//! # Who is allowed to use it
//!
//! A loopback port is not private. Every other process on the machine can
//! reach it, and so can any web page in any browser, which may scan the
//! ephemeral range in a second or two. Unguarded, `/stream?url=…` is an open
//! HTTP relay: a page could fetch whatever it liked through this app, read the
//! answer (the old handler sent `Access-Control-Allow-Origin: *` to everybody),
//! and reach hosts it could never reach itself — the machine's own services,
//! the LAN, a cloud metadata endpoint.
//!
//! Three things stop that, each of which has to hold on its own:
//!
//! 1. **A token.** 32 random bytes made at startup, handed to the webview over
//!    IPC and required on every request. Nothing that cannot ask Tauri for it
//!    gets past the front door.
//! 2. **An origin allowlist.** `ACAO` is sent only to the app's own webview, so
//!    a page that somehow guessed the token still could not read a reply.
//! 3. **A target allowlist.** Upstream must be http(s) and must not resolve to
//!    a loopback, private, link-local or carrier-NAT address — checked before
//!    the request, on every redirect, and again against the address actually
//!    connected to, which is what closes DNS rebinding.

use std::collections::HashSet;
use std::net::{IpAddr, TcpListener as StdTcpListener};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use bytes::Bytes;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncReadExt;
use url::Host;

/// How long upstream gets to return response headers. The body that follows is
/// deliberately unbounded — it is a radio stream.
const HANDSHAKE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// Local files the user has added. The proxy listens on loopback, which any
/// web page open in a browser can also reach, so it serves exactly these paths
/// and nothing else on disk.
#[derive(Clone, Default)]
pub struct AllowedFiles(pub Arc<Mutex<HashSet<PathBuf>>>);

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    app: AppHandle,
    allowed: AllowedFiles,
    token: Arc<String>,
}

/// Every request carries `t`, the token from `proxy_access`. It travels in the
/// query string rather than a header because the thing that fetches the stream
/// is an `<audio>` element, which cannot set headers.
#[derive(Deserialize)]
struct StreamQuery {
    url: String,
    /// Optional only so that a request without it is refused by `token_ok`
    /// with a plain 403, rather than by the deserializer with a 400 that
    /// names the field.
    t: Option<String>,
}

#[derive(Deserialize)]
struct FileQuery {
    path: String,
    t: Option<String>,
}

/// 32 random bytes as hex. Generated once per run and never written to disk.
fn new_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("no OS randomness available");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Compares in time independent of how much of the token matched, so a caller
/// cannot discover it one character at a time. Loopback timing is noisy enough
/// that this is probably unnecessary; it costs a line.
fn token_ok(expected: &str, given: Option<&str>) -> bool {
    let (a, b) = (expected.as_bytes(), given.unwrap_or_default().as_bytes());
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[derive(Clone, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub station_url: String,
}

/// Addresses a radio station is never at, and that the proxy must therefore
/// never be aimed at: the machine itself, the LAN, link-local (which is where
/// cloud metadata services live, at 169.254.169.254), and carrier-grade NAT.
///
/// Reaching any of these is the whole prize in an SSRF: they are the addresses
/// an attacker cannot route to directly but this app can.
fn is_forbidden_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(a) => {
            let [first, second, ..] = a.octets();
            a.is_loopback()
                || a.is_private()
                || a.is_link_local()
                || a.is_broadcast()
                || a.is_documentation()
                || a.is_unspecified()
                || a.is_multicast()
                // 100.64.0.0/10, carrier-grade NAT.
                || (first == 100 && (64..128).contains(&second))
        }
        IpAddr::V6(a) => {
            // `is_unique_local` and `is_unicast_link_local` are still unstable,
            // so the two prefixes are matched by hand.
            let head = a.segments()[0];
            a.is_loopback()
                || a.is_unspecified()
                || a.is_multicast()
                || (head & 0xfe00) == 0xfc00
                || (head & 0xffc0) == 0xfe80
                // An IPv4 address wearing an IPv6 costume: ::ffff:127.0.0.1.
                || a.to_ipv4_mapped().is_some_and(|v4| is_forbidden_ip(IpAddr::V4(v4)))
        }
    }
}

/// Whether a URL is one the proxy may fetch at all, judged on the URL alone.
///
/// Used before the request and again for every redirect hop, where there is no
/// opportunity to resolve names. A host that is not an IP literal passes here
/// and is caught later by `vet_target` or by the check on the peer address.
fn url_allowed(url: &reqwest::Url) -> bool {
    if !matches!(url.scheme(), "http" | "https") {
        return false;
    }
    match url.host() {
        Some(Host::Ipv4(ip)) => !is_forbidden_ip(IpAddr::V4(ip)),
        Some(Host::Ipv6(ip)) => !is_forbidden_ip(IpAddr::V6(ip)),
        // A name: nothing to judge yet, and `localhost` is the one that matters.
        Some(Host::Domain(d)) => {
            let d = d.trim_end_matches('.').to_ascii_lowercase();
            d != "localhost" && !d.ends_with(".localhost")
        }
        None => false,
    }
}

/// Parses an upstream URL and resolves it, rejecting anything that points
/// somewhere a station cannot be.
///
/// Resolution happens here rather than being left to reqwest so that a name
/// pointing at a private address is refused before a single byte is sent.
async fn vet_target(raw: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw).map_err(|e| format!("not a URL: {e}"))?;
    if !url_allowed(&url) {
        return Err("that address is not allowed".into());
    }
    // An IP literal has already been judged; only names need looking up.
    if let Some(Host::Domain(host)) = url.host() {
        let port = url.port_or_known_default().unwrap_or(80);
        let addrs = tokio::net::lookup_host((host, port))
            .await
            .map_err(|e| format!("cannot resolve host: {e}"))?;
        let mut any = false;
        for addr in addrs {
            any = true;
            if is_forbidden_ip(addr.ip()) {
                return Err("that address is not allowed".into());
            }
        }
        if !any {
            return Err("host resolved to nothing".into());
        }
    }
    Ok(url)
}

/// The last line against DNS rebinding: whatever the name said a moment ago,
/// this is the address the connection actually landed on.
fn peer_allowed(resp: &reqwest::Response) -> bool {
    // `is_none_or` would need Rust 1.82; this crate declares 1.77.
    resp.remote_addr()
        .map_or(true, |addr| !is_forbidden_ip(addr.ip()))
}

/// Bind an ephemeral loopback port and serve the proxy on it.
///
/// The listener is bound synchronously so the caller gets a real port number
/// before the app finishes starting; only the accept loop is async.
pub fn spawn(app: AppHandle, allowed: AllowedFiles) -> std::io::Result<(u16, String)> {
    let std_listener = StdTcpListener::bind("127.0.0.1:0")?;
    let port = std_listener.local_addr()?.port();
    std_listener.set_nonblocking(true)?;

    let client = reqwest::Client::builder()
        .user_agent("FocusAMP/2.0")
        // Radio streams are infinite; a request timeout would sever playback.
        .connect_timeout(std::time::Duration::from_secs(12))
        // Stations redirect constantly — to a CDN edge, to the current mount.
        // Each hop is judged on its URL, and the address finally connected to
        // is judged again once the response is in hand.
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 {
                attempt.stop()
            } else if url_allowed(attempt.url()) {
                attempt.follow()
            } else {
                attempt.stop()
            }
        }))
        .build()
        .map_err(std::io::Error::other)?;

    let token = new_token();
    let state = AppState {
        client,
        app,
        allowed,
        token: Arc::new(token.clone()),
    };

    let router = Router::new()
        .route("/health", get(health))
        .route("/stream", get(stream_handler))
        .route("/file", get(file_handler))
        .with_state(state);

    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::from_std(std_listener) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[proxy] failed to adopt listener: {e}");
                return;
            }
        };
        if let Err(e) = axum::serve(listener, router).await {
            eprintln!("[proxy] server stopped: {e}");
        }
    });

    // The token is deliberately not printed: this line goes to a console that
    // may be shared in a bug report.
    println!("[proxy] listening on http://127.0.0.1:{port}");
    Ok((port, token))
}

async fn health(headers: HeaderMap) -> impl IntoResponse {
    (
        StatusCode::OK,
        cors_headers(headers.get(header::ORIGIN)),
        "ok",
    )
}

/// Origins the app itself runs on. `tauri.localhost` is the packaged app on
/// Windows and Linux, `tauri://localhost` is macOS, and the `localhost:1420`
/// pair is `npm run tauri dev`, where the webview loads from Vite.
fn origin_allowed(origin: &str) -> bool {
    matches!(
        origin,
        "http://tauri.localhost"
            | "https://tauri.localhost"
            | "tauri://localhost"
            | "http://localhost:1420"
            | "http://127.0.0.1:1420"
    )
}

/// `Access-Control-Allow-Origin` goes to the app's own webview and to nobody
/// else. The audio element sets `crossOrigin = "anonymous"` — it has to, or
/// `createMediaElementSource` yields silence — so it sends an `Origin` and
/// needs this back. Anything else gets the bytes refused by its own browser.
fn cors_headers(origin: Option<&HeaderValue>) -> HeaderMap {
    let mut h = HeaderMap::new();
    if let Some(origin) = origin {
        if origin.to_str().map(origin_allowed).unwrap_or(false) {
            h.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin.clone());
            h.insert(header::VARY, HeaderValue::from_static("Origin"));
        } else {
            // Either someone else is knocking, or `origin_allowed` has fallen
            // behind what the webview actually reports on some platform — in
            // which case audio goes silent and this line is the only clue.
            eprintln!("[proxy] no CORS grant for origin {origin:?}");
        }
    }
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    h
}

/// How many extra attempts a failing upstream gets before the station is
/// reported dead, and how long to wait between them.
const UPSTREAM_RETRIES: u32 = 1;
const RETRY_PAUSE: std::time::Duration = std::time::Duration::from_millis(600);

/// Rejects a 200 that is plainly not a stream. Handing a web page to an
/// `<audio>` element produces a decode error seconds later, which the app can
/// only read as "this station is broken"; failing here keeps the reason.
fn served_audio(resp: &reqwest::Response) -> Result<(), String> {
    let ct = resp
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let kind = ct
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    if kind.starts_with("text/html") || kind == "application/xhtml+xml" {
        return Err(format!("upstream served a web page, not audio ({kind})"));
    }
    Ok(())
}

fn error_response(code: StatusCode, msg: String, origin: Option<&HeaderValue>) -> Response {
    (code, cors_headers(origin), msg).into_response()
}

/// Refuses anything that did not come from the app. Returned before a handler
/// looks at the rest of the query, so an unauthenticated caller cannot even
/// make this app perform a DNS lookup on its behalf.
fn deny() -> Response {
    (StatusCode::FORBIDDEN, cors_headers(None), "not for you").into_response()
}

fn audio_mime(path: &std::path::Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "mp3" => "audio/mpeg",
        "flac" => "audio/flac",
        "wav" => "audio/wav",
        "ogg" | "oga" => "audio/ogg",
        "opus" => "audio/opus",
        "m4a" | "aac" => "audio/mp4",
        "webm" => "audio/webm",
        _ => "application/octet-stream",
    }
}

/// Serve one of the user's own audio files, from the allowlist only.
async fn file_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<FileQuery>,
) -> Response {
    if !token_ok(&state.token, q.t.as_deref()) {
        return deny();
    }
    let origin = headers.get(header::ORIGIN);
    let path = PathBuf::from(&q.path);
    let permitted = state
        .allowed
        .0
        .lock()
        .map(|set| set.contains(&path))
        .unwrap_or(false);
    if !permitted {
        return error_response(StatusCode::FORBIDDEN, "not an added file".into(), origin);
    }

    let mut file = match tokio::fs::File::open(&path).await {
        Ok(f) => f,
        Err(e) => {
            return error_response(
                StatusCode::NOT_FOUND,
                format!("cannot open file: {e}"),
                origin,
            )
        }
    };
    let len = file.metadata().await.ok().map(|m| m.len());

    let body = Body::from_stream(async_stream::stream! {
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            match file.read(&mut buf).await {
                Ok(0) => break,
                Ok(n) => yield Ok::<Bytes, std::io::Error>(Bytes::copy_from_slice(&buf[..n])),
                Err(e) => { yield Err(e); break; }
            }
        }
    });

    let mut out = cors_headers(origin);
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(audio_mime(&path)),
    );
    if let Some(len) = len {
        if let Ok(v) = HeaderValue::from_str(&len.to_string()) {
            out.insert(header::CONTENT_LENGTH, v);
        }
    }
    (StatusCode::OK, out, body).into_response()
}

async fn stream_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<StreamQuery>,
) -> Response {
    if !token_ok(&state.token, q.t.as_deref()) {
        return deny();
    }
    let origin = headers.get(header::ORIGIN);

    // Radio Browser and older directories hand back playlist files rather than
    // the stream itself. Following that indirection here is trivial; in the
    // webview it is impossible.
    let upstream = match resolve_playlist(&state.client, &q.url).await {
        Ok(u) => u,
        Err(e) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("resolve failed: {e}"),
                origin,
            )
        }
    };

    // The playlist may have named anywhere at all, so what comes back from it
    // is vetted exactly like the URL the caller gave.
    let upstream = match vet_target(&upstream).await {
        Ok(u) => u,
        Err(e) => return error_response(StatusCode::FORBIDDEN, e, origin),
    };

    // Radio hosts are flaky in a way that is usually not fatal: a CDN edge
    // 404s, a server refuses one connection, TLS stalls once. Without a second
    // try the app marks the station dead and skips past it, so a station that
    // works perfectly on the next attempt is lost for the session.
    let mut last: String = String::new();
    let mut resp = None;
    for attempt in 0..=UPSTREAM_RETRIES {
        if attempt > 0 {
            tokio::time::sleep(RETRY_PAUSE).await;
        }
        // Bounded on the handshake only — never on the body, which is an
        // endless stream. A station that completes TLS and then goes quiet
        // would otherwise hold this connection open forever.
        let send = state
            .client
            .get(upstream.clone())
            .header("Icy-MetaData", "1")
            .send();
        match tokio::time::timeout(HANDSHAKE_TIMEOUT, send).await {
            // The name was vetted before the request, but a name can be made to
            // answer differently the second time it is asked. This is the
            // address the socket is actually on, so it is the one that counts.
            Ok(Ok(r)) if !peer_allowed(&r) => {
                return error_response(
                    StatusCode::FORBIDDEN,
                    "that address is not allowed".into(),
                    origin,
                )
            }
            Ok(Ok(r)) if r.status().is_success() => match served_audio(&r) {
                Ok(()) => {
                    resp = Some(r);
                    break;
                }
                // A station that answers 200 with a web page has moved, or is
                // bouncing us to a landing page this once. Worth another go:
                // some hosts do it only under load.
                Err(e) => last = e,
            },
            Ok(Ok(r)) => last = format!("upstream returned {}", r.status()),
            Ok(Err(e)) => last = format!("upstream failed: {e}"),
            Err(_) => last = "upstream did not send headers in time".to_string(),
        }
        if attempt < UPSTREAM_RETRIES {
            println!(
                "[proxy] retry {}/{UPSTREAM_RETRIES} after {last} · {upstream}",
                attempt + 1
            );
        }
    }
    let Some(resp) = resp else {
        return error_response(StatusCode::BAD_GATEWAY, last, origin);
    };

    let headers_in = resp.headers().clone();
    let content_type = headers_in
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("audio/mpeg")
        .to_string();

    // `icy-metaint` is the number of audio bytes between metadata blocks.
    // Absent means the station sends no in-band metadata at all.
    let metaint = headers_in
        .get("icy-metaint")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<usize>().ok())
        .filter(|n| *n > 0);

    let station_name = headers_in
        .get("icy-name")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    println!(
        "[proxy] open {upstream} · metaint={metaint:?} · type={content_type} · name={station_name}"
    );

    let body = Body::from_stream(deinterleave(
        resp.bytes_stream(),
        metaint,
        state.app.clone(),
        q.url.clone(),
    ));

    let mut out = cors_headers(origin);
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("audio/mpeg")),
    );
    if let Ok(v) = HeaderValue::from_str(&station_name) {
        out.insert("x-icy-name", v);
    }
    out.insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        HeaderValue::from_static("x-icy-name"),
    );
    if metaint.is_some() {
        out.insert("x-icy-metadata", HeaderValue::from_static("1"));
    }

    (StatusCode::OK, out, body).into_response()
}

/// If the URL points at a `.pls` or `.m3u` playlist, pull the first entry out
/// of it. `.m3u8` is left alone — that is HLS, a different thing entirely.
///
/// Matched on the extension only. Plenty of stations serve a playlist from a
/// URL that gives no hint (`/listen`, `/stream`), and those still slip through
/// to be handed to the audio element as if they were sound.
async fn resolve_playlist(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let lower = url.split('?').next().unwrap_or(url).to_ascii_lowercase();
    let is_pls = lower.ends_with(".pls");
    let is_m3u = lower.ends_with(".m3u");
    if !is_pls && !is_m3u {
        return Ok(url.to_string());
    }

    // Fetching the playlist is itself a request this app makes on somebody
    // else's say-so, so it is vetted like any other.
    let target = vet_target(url).await?;

    // A playlist is a small finite body, so a whole-request timeout is safe here
    // in a way it never would be for the stream itself.
    let resp = client
        .get(target)
        .timeout(HANDSHAKE_TIMEOUT)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !peer_allowed(&resp) {
        return Err("that address is not allowed".into());
    }
    let text = resp.text().await.map_err(|e| e.to_string())?;

    let first = if is_pls {
        text.lines()
            .filter_map(|l| l.trim().strip_prefix("File1="))
            .map(str::trim)
            .next()
            .or_else(|| {
                text.lines()
                    .filter_map(|l| l.trim().split_once('='))
                    .filter(|(k, _)| k.to_ascii_lowercase().starts_with("file"))
                    .map(|(_, v)| v.trim())
                    .next()
            })
    } else {
        text.lines()
            .map(str::trim)
            .find(|l| !l.is_empty() && !l.starts_with('#'))
    };

    match first {
        Some(u) if !u.is_empty() => Ok(u.to_string()),
        _ => Err("playlist contained no stream entry".into()),
    }
}

/// Split the ICY byte stream back into pure audio plus out-of-band titles.
///
/// The wire format is: `metaint` bytes of audio, then one length byte L, then
/// `L * 16` bytes of metadata (`StreamTitle='...';`), then repeat. L == 0 means
/// nothing changed this round, which is the common case.
fn deinterleave<S>(
    input: S,
    metaint: Option<usize>,
    app: AppHandle,
    station_url: String,
) -> impl futures_util::Stream<Item = Result<Bytes, std::io::Error>>
where
    S: futures_util::Stream<Item = reqwest::Result<Bytes>> + Send + 'static,
{
    async_stream::stream! {
        futures_util::pin_mut!(input);

        let Some(metaint) = metaint else {
            while let Some(chunk) = input.next().await {
                match chunk {
                    Ok(b) => yield Ok(b),
                    Err(e) => { yield Err(std::io::Error::other(e)); break; }
                }
            }
            return;
        };

        let mut audio_left = metaint;
        let mut meta_remaining = 0usize;
        let mut expecting_len = false;
        let mut meta_buf: Vec<u8> = Vec::new();
        let mut last_title = String::new();

        while let Some(chunk) = input.next().await {
            let chunk = match chunk {
                Ok(b) => b,
                Err(e) => { yield Err(std::io::Error::other(e)); break; }
            };

            let mut cur: &[u8] = &chunk;
            while !cur.is_empty() {
                if audio_left > 0 {
                    let take = audio_left.min(cur.len());
                    yield Ok(Bytes::copy_from_slice(&cur[..take]));
                    cur = &cur[take..];
                    audio_left -= take;
                    if audio_left == 0 {
                        expecting_len = true;
                    }
                    continue;
                }

                if expecting_len {
                    meta_remaining = cur[0] as usize * 16;
                    cur = &cur[1..];
                    expecting_len = false;
                    meta_buf.clear();
                    if meta_remaining == 0 {
                        audio_left = metaint;
                    }
                    continue;
                }

                let take = meta_remaining.min(cur.len());
                meta_buf.extend_from_slice(&cur[..take]);
                cur = &cur[take..];
                meta_remaining -= take;

                if meta_remaining == 0 {
                    if let Some(title) = parse_stream_title(&meta_buf) {
                        if title != last_title {
                            last_title = title.clone();
                            println!("[proxy] now playing: {title}");
                            let _ = app.emit(
                                "now-playing",
                                NowPlaying { title, station_url: station_url.clone() },
                            );
                        }
                    }
                    audio_left = metaint;
                }
            }
        }
    }
}

fn parse_stream_title(buf: &[u8]) -> Option<String> {
    let raw = String::from_utf8_lossy(buf);
    let raw = raw.trim_end_matches('\0');
    let start = raw.find("StreamTitle=")? + "StreamTitle=".len();
    let rest = raw[start..].strip_prefix('\'')?;
    let end = rest.find("';").or_else(|| rest.rfind('\''))?;
    let title = rest[..end].trim();
    if title.is_empty() {
        None
    } else {
        Some(title.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_normal_title() {
        let raw = b"StreamTitle='Bonobo - Kerala';StreamUrl='';\0\0\0\0";
        assert_eq!(parse_stream_title(raw).unwrap(), "Bonobo - Kerala");
    }

    #[test]
    fn survives_an_apostrophe_in_the_title() {
        let raw = b"StreamTitle='Guns N' Roses - Patience';StreamUrl='';";
        assert_eq!(parse_stream_title(raw).unwrap(), "Guns N' Roses - Patience");
    }

    #[test]
    fn ignores_an_empty_title() {
        assert!(parse_stream_title(b"StreamTitle='';StreamUrl='';").is_none());
    }

    #[test]
    fn ignores_a_block_with_no_title_field() {
        assert!(parse_stream_title(b"StreamUrl='http://x';").is_none());
    }

    // ── The guards from the module header ────────────────────────────────

    fn allowed(u: &str) -> bool {
        url_allowed(&reqwest::Url::parse(u).unwrap())
    }

    #[test]
    fn refuses_the_machine_itself() {
        assert!(!allowed("http://127.0.0.1:8080/admin"));
        assert!(!allowed("http://localhost:9000/"));
        assert!(!allowed("http://LocalHost./"));
        assert!(!allowed("http://[::1]:8080/"));
        // An IPv4 loopback smuggled in as IPv6.
        assert!(!allowed("http://[::ffff:127.0.0.1]/"));
    }

    #[test]
    fn refuses_the_private_network() {
        for u in [
            "http://192.168.1.1/",
            "http://10.0.0.5/",
            "http://172.16.4.4/",
            "http://[fd00::1]/",
            "http://[fe80::1]/",
        ] {
            assert!(!allowed(u), "{u} should be refused");
        }
    }

    #[test]
    fn refuses_cloud_metadata_and_carrier_nat() {
        assert!(!allowed("http://169.254.169.254/latest/meta-data/"));
        assert!(!allowed("http://100.64.0.1/"));
        // 100.128.* is ordinary public space, just outside the /10.
        assert!(allowed("http://100.128.0.1/"));
    }

    #[test]
    fn refuses_anything_that_is_not_http() {
        assert!(!allowed("file:///C:/Windows/win.ini"));
        assert!(!allowed("ftp://example.com/x"));
    }

    #[test]
    fn allows_an_ordinary_station() {
        assert!(allowed("https://stream.radioparadise.com/mp3-128"));
        assert!(allowed("http://stream0.wfmu.org/freeform-128k.mp3"));
        assert!(allowed("http://8.8.8.8/stream"));
    }

    #[test]
    fn a_token_matches_only_itself() {
        let token = new_token();
        assert!(token_ok(&token, Some(token.as_str())));
        assert!(!token_ok(&token, None));
        assert!(!token_ok(&token, Some("")));
        assert!(!token_ok(&token, Some(&token[..token.len() - 1])));
        let mut wrong = token.clone();
        wrong.replace_range(0..1, if token.starts_with('a') { "b" } else { "a" });
        assert!(!token_ok(&token, Some(wrong.as_str())));
    }

    #[test]
    fn tokens_are_long_and_not_reused() {
        let a = new_token();
        assert_eq!(a.len(), 64, "32 bytes as hex");
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, new_token());
    }

    #[test]
    fn only_the_app_is_a_permitted_origin() {
        assert!(origin_allowed("http://tauri.localhost"));
        assert!(origin_allowed("http://localhost:1420"));
        assert!(!origin_allowed("https://evil.example"));
        assert!(!origin_allowed("null"));
        assert!(!origin_allowed("http://tauri.localhost.evil.example"));
    }

    #[test]
    fn an_unknown_origin_gets_no_cors_grant() {
        let evil = HeaderValue::from_static("https://evil.example");
        assert!(!cors_headers(Some(&evil)).contains_key(header::ACCESS_CONTROL_ALLOW_ORIGIN));

        let ours = HeaderValue::from_static("http://tauri.localhost");
        let out = cors_headers(Some(&ours));
        assert_eq!(out.get(header::ACCESS_CONTROL_ALLOW_ORIGIN).unwrap(), &ours);
    }
}
