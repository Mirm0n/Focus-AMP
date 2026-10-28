mod notify;
mod proxy;

use std::path::PathBuf;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use proxy::AllowedFiles;

struct ProxyPort(u16);

const TRAY_ID: &str = "main";

/// The webview needs the loopback port to build stream URLs.
#[tauri::command]
fn proxy_port(state: tauri::State<'_, ProxyPort>) -> u16 {
    state.0
}

/// Let the proxy serve these local files. Only the app's own webview can call
/// this; a web page that finds the loopback port cannot.
#[tauri::command]
fn allow_local_files(paths: Vec<String>, state: tauri::State<'_, AllowedFiles>) {
    if let Ok(mut set) = state.0.lock() {
        set.extend(paths.into_iter().map(PathBuf::from));
    }
}

/// Hover text on the tray icon — the station, so it can be read without
/// opening the window.
#[tauri::command]
fn set_tray_tooltip(app: AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(text));
    }
}

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Focus AMP", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Play / Stop", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next station", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &PredefinedMenuItem::separator(app)?,
            &toggle,
            &next,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Focus AMP")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            // Playback lives in the webview, so it is told what was asked for.
            other => {
                let _ = app.emit("tray-action", other.to_string());
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let allowed = AllowedFiles::default();
            let port = proxy::spawn(app.handle().clone(), allowed.clone())?;
            app.manage(ProxyPort(port));
            app.manage(allowed);
            notify::register();
            build_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            proxy_port,
            allow_local_files,
            set_tray_tooltip,
            notify::notify
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
