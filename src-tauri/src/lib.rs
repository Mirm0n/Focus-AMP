mod proxy;

use tauri::Manager;

struct ProxyPort(u16);

/// The webview needs the loopback port to build stream URLs.
#[tauri::command]
fn proxy_port(state: tauri::State<'_, ProxyPort>) -> u16 {
    state.0
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let port = proxy::spawn(app.handle().clone())?;
            app.manage(ProxyPort(port));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![proxy_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
