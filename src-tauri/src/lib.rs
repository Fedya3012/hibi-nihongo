// Phần "vỏ" Windows: mở một cửa sổ chứa giao diện web của app.
// Các module cần quyền đặc biệt (đọc file manga, tự cập nhật...) sẽ thêm plugin ở đây.
mod backup;
mod desktop;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Mở app lần thứ hai (ví dụ bấm lại biểu tượng trên Desktop): không mở thêm cửa sổ,
        // chỉ đưa cửa sổ đang chạy lên trước. Plugin này phải đứng đầu tiên.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| desktop::show_main(app)))
        // Thông báo của Windows (module Nhắc học: src/modules/reminders)
        .plugin(tauri_plugin_notification::init())
        // Hộp thoại chọn thư mục (module Sao lưu tự động: src/modules/autobackup)
        .plugin(tauri_plugin_dialog::init())
        // Bản Windows (src/modules/desktop): tự cập nhật + khởi động lại sau khi cập nhật
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Phím tắt tra từ dùng được ở mọi app, đọc chữ vừa sao chép
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(desktop::on_shortcut).build())
        .plugin(tauri_plugin_clipboard_manager::init())
        // Chạy cùng Windows (mở sẵn dưới khay)
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![desktop::MINIMIZED_ARG]),
        ))
        // Nhớ vị trí, kích thước cửa sổ chính. Ẩn/hiện do app tự quyết (xem setup bên dưới).
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all() - tauri_plugin_window_state::StateFlags::VISIBLE)
                .with_denylist(&[desktop::LOOKUP])
                .build(),
        )
        .manage(desktop::DesktopState::default())
        .setup(|app| {
            desktop::setup_tray(app.handle())?;
            // Cửa sổ chính mở ở trạng thái ẩn (tauri.conf.json), để vị trí cũ được đặt xong rồi mới hiện,
            // không bị nháy. Windows tự mở app lúc khởi động máy thì để yên dưới khay.
            let minimized = std::env::args().any(|a| a == desktop::MINIMIZED_ARG);
            if let Some(w) = app.get_webview_window("main") {
                if !minimized {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            Ok(())
        })
        .on_window_event(desktop::on_window_event)
        .invoke_handler(tauri::generate_handler![
            backup::backup_default_dir,
            backup::backup_write,
            backup::backup_list,
            backup::backup_prune,
            backup::backup_read,
            backup::backup_write_bin,
            backup::backup_read_bin,
            desktop::desktop_apply,
            desktop::desktop_take_lookup,
            desktop::desktop_clipboard,
            desktop::desktop_show_lookup,
            desktop::desktop_hide_lookup,
            desktop::desktop_open_in_main,
        ])
        .run(tauri::generate_context!())
        .expect("Không mở được Hibi Nihongo");
}
