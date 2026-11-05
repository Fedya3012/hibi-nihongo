// Phần "vỏ" Windows: mở một cửa sổ chứa giao diện web của app.
// Các module cần quyền đặc biệt (đọc file manga, tự cập nhật...) sẽ thêm plugin ở đây.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Không mở được Hibi Nihongo");
}
