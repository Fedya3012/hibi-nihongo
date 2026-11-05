// Ẩn cửa sổ dòng lệnh đen khi mở app trên Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hibi_nihongo_lib::run()
}
