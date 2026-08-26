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

use std::net::TcpListener as StdTcpListener;

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

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    app: AppHandle,
}

#[derive(Deserialize)]
struct StreamQuery {
    url: String,
}

#[derive(Clone, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub station_url: String,
}

/// Bind an ephemeral loopback port and serve the proxy on it.
///
/// The listener is bound synchronously so the caller gets a real port number
/// before the app finishes starting; only the accept loop is async.
pub fn spawn(app: AppHandle) -> std::io::Result<u16> {
    let std_listener = StdTcpListener::bind("127.0.0.1:0")?;
    let port = std_listener.local_addr()?.port();
    std_listener.set_nonblocking(true)?;

    let client = reqwest::Client::builder()
        .user_agent("Tunescape/2.0")
        // Radio streams are infinite; a request timeout would sever playback.
        .connect_timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(std::io::Error::other)?;

    let state = AppState { client, app };

    let router = Router::new()
        .route("/health", get(health))
        .route("/stream", get(stream_handler))
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

    println!("[proxy] listening on http://127.0.0.1:{port}");
    Ok(port)
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, cors_headers(), "ok")
}

fn cors_headers() -> HeaderMap {
    let mut h = HeaderMap::new();
    h.insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    h
}

fn error_response(code: StatusCode, msg: String) -> Response {
    (code, cors_headers(), msg).into_response()
}

async fn stream_handler(State(state): State<AppState>, Query(q): Query<StreamQuery>) -> Response {
    // Radio Browser and older directories hand back playlist files rather than
    // the stream itself. Following that indirection here is trivial; in the
    // webview it is impossible.
    let upstream = match resolve_playlist(&state.client, &q.url).await {
        Ok(u) => u,
        Err(e) => return error_response(StatusCode::BAD_GATEWAY, format!("resolve failed: {e}")),
    };

    let resp = match state
        .client
        .get(&upstream)
        .header("Icy-MetaData", "1")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::BAD_GATEWAY, format!("upstream failed: {e}")),
    };

    if !resp.status().is_success() {
        return error_response(
            StatusCode::BAD_GATEWAY,
            format!("upstream returned {}", resp.status()),
        );
    }

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

    let mut out = cors_headers();
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
async fn resolve_playlist(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let lower = url.split('?').next().unwrap_or(url).to_ascii_lowercase();
    let is_pls = lower.ends_with(".pls");
    let is_m3u = lower.ends_with(".m3u");
    if !is_pls && !is_m3u {
        return Ok(url.to_string());
    }

    let text = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

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
    use super::parse_stream_title;

    #[test]
    fn reads_a_normal_title() {
        let raw = b"StreamTitle='Bonobo - Kerala';StreamUrl='';\0\0\0\0";
        assert_eq!(parse_stream_title(raw).unwrap(), "Bonobo - Kerala");
    }

    #[test]
    fn survives_an_apostrophe_in_the_title() {
        let raw = b"StreamTitle='Guns N' Roses - Patience';StreamUrl='';";
        assert_eq!(
            parse_stream_title(raw).unwrap(),
            "Guns N' Roses - Patience"
        );
    }

    #[test]
    fn ignores_an_empty_title() {
        assert!(parse_stream_title(b"StreamTitle='';StreamUrl='';").is_none());
    }

    #[test]
    fn ignores_a_block_with_no_title_field() {
        assert!(parse_stream_title(b"StreamUrl='http://x';").is_none());
    }
}
