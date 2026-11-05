// Phần "vỏ" Windows: mở một cửa sổ chứa giao diện web của app.
// Các module cần quyền đặc biệt (đọc file manga, tự cập nhật...) sẽ thêm plugin ở đây.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Thông báo của Windows (module Nhắc học: src/modules/reminders)
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("Không mở được Hibi Nihongo");
}
