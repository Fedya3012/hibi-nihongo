// Phần "vỏ" Windows: mở một cửa sổ chứa giao diện web của app.
// Các module cần quyền đặc biệt (đọc file manga, tự cập nhật...) sẽ thêm plugin ở đây.
mod backup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Thông báo của Windows (module Nhắc học: src/modules/reminders)
        .plugin(tauri_plugin_notification::init())
        // Hộp thoại chọn thư mục (module Sao lưu tự động: src/modules/autobackup)
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            backup::backup_default_dir,
            backup::backup_write,
            backup::backup_list,
            backup::backup_prune,
            backup::backup_read,
            backup::backup_write_bin,
            backup::backup_read_bin,
        ])
        .run(tauri::generate_context!())
        .expect("Không mở được Hibi Nihongo");
}
