//! BẢN WINDOWS: những thứ chỉ app cài trên máy mới làm được (giao diện nằm ở src/modules/desktop).
//!
//! - Phím tắt tra từ ở MỌI app: sao chép (Ctrl+C) chữ tiếng Nhật ở bất kỳ đâu, bấm phím tắt
//!   (mặc định Ctrl+Alt+D) → cửa sổ tra nhỏ hiện cạnh con trỏ chuột, tra chữ vừa sao chép.
//! - Khay hệ thống (cạnh đồng hồ): bấm X thì app thu xuống khay thay vì tắt, để phím tắt vẫn dùng được.
//! - Chạy cùng Windows: mở sẵn dưới khay (đối số --minimized), không bật cửa sổ lên.
//! - Mở app lần thứ hai: không mở thêm cửa sổ, chỉ đưa cửa sổ đang có lên trước (xem lib.rs).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};
use tauri_plugin_notification::NotificationExt;

/// Đối số khi Windows tự mở app lúc khởi động máy: mở sẵn dưới khay, không hiện cửa sổ.
pub const MINIMIZED_ARG: &str = "--minimized";
/// Tên cửa sổ tra nhanh (trang web trong đó tự nhận ra tên này, xem src/main.tsx).
pub const LOOKUP: &str = "lookup";

pub struct DesktopState {
    /// Bấm X ở cửa sổ chính thì thu xuống khay (true) hay tắt hẳn app (false).
    close_to_tray: AtomicBool,
    /// Đã báo "Hibi vẫn chạy dưới khay" trong lần mở app này chưa (chỉ báo một lần).
    told_tray: AtomicBool,
    /// Chữ chờ cửa sổ tra nhanh lấy (cửa sổ mới mở chưa kịp nghe sự kiện thì lấy ở đây).
    pending: Mutex<Option<String>>,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self { close_to_tray: AtomicBool::new(true), told_tray: AtomicBool::new(false), pending: Mutex::new(None) }
    }
}

/// Đưa cửa sổ chính lên trước (kể cả khi đang ẩn dưới khay hoặc thu nhỏ).
pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn clipboard_text(app: &AppHandle) -> String {
    app.clipboard().read_text().unwrap_or_default().trim().chars().take(2000).collect()
}

/// Đặt cửa sổ tra cạnh con trỏ chuột, không để tràn ra ngoài màn hình.
fn place_near_cursor(app: &AppHandle, w: &tauri::WebviewWindow) {
    let Ok(c) = app.cursor_position() else { return };
    let Ok(size) = w.outer_size() else { return };
    let (mut x, mut y) = (c.x + 16.0, c.y + 16.0);
    if let Ok(Some(m)) = app.monitor_from_point(c.x, c.y) {
        let (mx, my) = (m.position().x as f64, m.position().y as f64);
        let (mw, mh) = (m.size().width as f64, m.size().height as f64);
        let (ww, wh) = (size.width as f64, size.height as f64);
        if x + ww > mx + mw { x = (c.x - ww - 16.0).max(mx) }
        if y + wh > my + mh - 48.0 { y = (my + mh - wh - 48.0).max(my) } // chừa thanh Taskbar
    }
    let _ = w.set_position(PhysicalPosition::new(x, y));
}

/// Mở (hoặc đưa lên) cửa sổ tra nhanh với chữ đang có trong clipboard.
/// Cửa sổ đang mở và đang được chọn thì bấm phím tắt lần nữa sẽ ẩn nó đi.
pub fn toggle_lookup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(LOOKUP) {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
            return;
        }
    }
    open_lookup(app);
}

pub fn open_lookup(app: &AppHandle) {
    let text = clipboard_text(app);
    *app.state::<DesktopState>().pending.lock().unwrap() = Some(text.clone());
    let w = match app.get_webview_window(LOOKUP) {
        Some(w) => {
            let _ = w.emit_to(LOOKUP, "hibi://lookup", text);
            w
        }
        None => {
            let built = WebviewWindowBuilder::new(app, LOOKUP, WebviewUrl::App("index.html".into()))
                .title("Hibi · Tra nhanh")
                .inner_size(440.0, 600.0)
                .min_inner_size(320.0, 320.0)
                .always_on_top(true)
                .skip_taskbar(true)
                .visible(false)
                .build();
            match built {
                Ok(w) => w,
                Err(_) => return,
            }
        }
    };
    place_near_cursor(app, &w);
    let _ = w.show();
    let _ = w.unminimize();
    let _ = w.set_focus();
}

/// Cài khay hệ thống: bấm vào biểu tượng để mở app, chuột phải để có menu.
pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Mở Hibi Nihongo", true, None::<&str>)?;
    let lookup = MenuItem::with_id(app, "lookup", "Tra chữ vừa sao chép", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Thoát hẳn", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &lookup, &sep, &quit])?;
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Hibi Nihongo")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "open" => show_main(app),
            "lookup" => open_lookup(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Bấm X ở cửa sổ chính / cửa sổ tra nhanh.
pub fn on_window_event(w: &tauri::Window, e: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = e else { return };
    let app = w.app_handle();
    if w.label() == LOOKUP {
        // Giữ cửa sổ tra (chỉ ẩn) để lần sau mở ra ngay, không phải tải lại
        api.prevent_close();
        let _ = w.hide();
        return;
    }
    if w.label() != "main" {
        return;
    }
    let st = app.state::<DesktopState>();
    if st.close_to_tray.load(Ordering::Relaxed) {
        api.prevent_close();
        let _ = w.hide();
        if !st.told_tray.swap(true, Ordering::Relaxed) {
            let _ = app
                .notification()
                .builder()
                .title("Hibi Nihongo vẫn đang chạy")
                .body("App thu xuống khay cạnh đồng hồ để phím tắt tra từ vẫn dùng được. Chuột phải vào biểu tượng → Thoát hẳn để tắt.")
                .show();
        }
    } else {
        // Tắt hẳn (kể cả cửa sổ tra đang ẩn, nếu không app vẫn chạy ngầm)
        app.exit(0);
    }
}

// ---------- Lệnh gọi từ giao diện (src/modules/desktop/lib/native.ts) ----------

/// Áp cài đặt của bản Windows. `hotkey` rỗng = tắt phím tắt tra từ.
/// Trả về lỗi (tiếng Việt) nếu phím tắt sai hoặc đã bị app khác giữ.
#[tauri::command]
pub fn desktop_apply(app: AppHandle, hotkey: String, close_to_tray: bool) -> Result<(), String> {
    app.state::<DesktopState>().close_to_tray.store(close_to_tray, Ordering::Relaxed);
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let hotkey = hotkey.trim();
    if hotkey.is_empty() {
        return Ok(());
    }
    let sc: Shortcut = hotkey.parse().map_err(|_| format!("Phím tắt \"{hotkey}\" không dùng được"))?;
    gs.register(sc).map_err(|_| format!("Phím tắt \"{hotkey}\" đang được app khác dùng. Hãy chọn phím khác."))
}

/// Cửa sổ tra nhanh lấy chữ đang chờ (lần đầu mở cửa sổ).
#[tauri::command]
pub fn desktop_take_lookup(app: AppHandle) -> Option<String> {
    app.state::<DesktopState>().pending.lock().unwrap().take()
}

/// Đọc chữ trong clipboard (cửa sổ tra nhanh tự tra khi bạn sao chép chữ mới).
#[tauri::command]
pub fn desktop_clipboard(app: AppHandle) -> String {
    clipboard_text(&app)
}

/// Nút "Thử ngay" trong trang Bản Windows: mở cửa sổ tra như khi bấm phím tắt.
#[tauri::command]
pub fn desktop_show_lookup(app: AppHandle) {
    open_lookup(&app);
}

#[tauri::command]
pub fn desktop_hide_lookup(app: AppHandle) {
    if let Some(w) = app.get_webview_window(LOOKUP) {
        let _ = w.hide();
    }
}

/// Mở một trang trong cửa sổ chính (ví dụ "/dictionary?q=食べる") và đưa cửa sổ lên trước.
#[tauri::command]
pub fn desktop_open_in_main(app: AppHandle, path: String) {
    show_main(&app);
    let _ = app.emit_to("main", "hibi://navigate", path);
}

/// Xử lý khi phím tắt toàn hệ thống được bấm (đăng ký ở lib.rs).
pub fn on_shortcut(app: &AppHandle, _sc: &Shortcut, e: ShortcutEvent) {
    if e.state() == ShortcutState::Pressed {
        toggle_lookup(app);
    }
}

#[cfg(test)]
mod tests {
    use super::Shortcut;

    /// Phím tắt dạng chữ của giao diện ("Ctrl+Alt+D") phải đọc được ở phía Windows.
    #[test]
    fn parses_ui_combos() {
        for s in ["Ctrl+Alt+D", "Ctrl+Shift+Space", "Alt+Shift+1", "Ctrl+Alt+F2", "Ctrl+Alt+J"] {
            assert!(s.parse::<Shortcut>().is_ok(), "{s}");
        }
    }
}
