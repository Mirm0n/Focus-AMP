//! Branded desktop notifications.
//!
//! Windows does not attribute a toast to the process that sent it. It
//! attributes it to an AppUserModelID, and if the sender names none, the
//! toast is filed under PowerShell's — PowerShell's name, PowerShell's icon.
//! `tauri-plugin-notification` sets ours only for an installed build (it skips
//! it when the exe sits in `target/debug` or `target/release`), so under
//! `tauri dev` every pomodoro alert arrives as "Windows PowerShell".
//!
//! So the id is registered here instead, per user, with the name and icon it
//! should carry, and the toast is sent under it. Installed or not, the
//! notification says Focus AMP.
//!
//! macOS and Linux name the application from the bundle and need none of this,
//! so there the plugin still does the work.

#[cfg(windows)]
mod platform {
    use std::{fs, io, path::PathBuf};

    use tauri_winrt_notification::{Duration, Toast};
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    /// Matches `identifier` in tauri.conf.json, which is what an installed
    /// build registers. Sending under the same id means the two agree.
    const AUMID: &str = "com.focusamp.desktop";
    const DISPLAY_NAME: &str = "Focus AMP";

    /// Windows wants an image it can open by path, and an exe's embedded icon
    /// is not one. The PNG rides along in the binary and is unpacked once.
    const ICON: &[u8] = include_bytes!("../icons/128x128@2x.png");

    fn icon_path() -> io::Result<PathBuf> {
        let dir = std::env::temp_dir().join("focus-amp");
        fs::create_dir_all(&dir)?;
        let path = dir.join("icon.png");
        // Rewritten only when missing or the wrong size, so a new icon in a
        // later build replaces the old one without writing on every launch.
        if fs::metadata(&path).ok().map(|m| m.len()) != Some(ICON.len() as u64) {
            fs::write(&path, ICON)?;
        }
        Ok(path)
    }

    /// Teach Windows what this id is called and what it looks like. Writes
    /// under HKCU, so it needs no elevation and touches no other user.
    pub fn register() {
        let Ok(icon) = icon_path() else { return };
        let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey(format!(r"Software\Classes\AppUserModelId\{AUMID}"))
        else {
            return;
        };
        let _ = key.set_value("DisplayName", &DISPLAY_NAME.to_string());
        let _ = key.set_value("IconUri", &icon.to_string_lossy().to_string());
    }

    pub fn show(title: &str, body: &str) -> Result<(), String> {
        Toast::new(AUMID)
            .title(title)
            .text1(body)
            .duration(Duration::Short)
            .show()
            .map_err(|e| e.to_string())
    }
}

#[cfg(not(windows))]
mod platform {
    use tauri_plugin_notification::NotificationExt;

    pub fn register() {}

    pub fn show_with(app: &tauri::AppHandle, title: &str, body: &str) -> Result<(), String> {
        app.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| e.to_string())
    }
}

/// Called once at startup. Does nothing off Windows.
pub fn register() {
    platform::register();
}

#[tauri::command]
pub fn notify(_app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let _ = &_app;
        platform::show(&title, &body)
    }
    #[cfg(not(windows))]
    {
        platform::show_with(&_app, &title, &body)
    }
}
