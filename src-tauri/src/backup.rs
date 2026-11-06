//! SAO LƯU TỰ ĐỘNG (bản Windows): ghi file sao lưu .json vào thư mục người dùng chọn.
//! Phần giao diện và lịch chạy nằm ở src/modules/autobackup. Ở đây chỉ có vài lệnh đọc/ghi file
//! đơn giản, và chỉ đụng tới file có tên bắt đầu bằng PREFIX để không bao giờ xóa nhầm file khác.

use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Tên file sao lưu tự động luôn bắt đầu bằng chữ này.
const PREFIX: &str = "hibi-nihongo-tu-dong-";

#[derive(serde::Serialize)]
pub struct BackupEntry {
    name: String,
    size: u64,
    /// Thời điểm sửa file, tính bằng mili giây (giống Date.now() của JavaScript).
    modified: u64,
}

fn is_ours(name: &str) -> bool {
    name.starts_with(PREFIX) && name.ends_with(".json") && !name.contains('/') && !name.contains('\\')
}

/// Thư mục mặc định: Tài liệu (Documents) / Hibi Nihongo / Sao lưu
#[tauri::command]
pub fn backup_default_dir(app: tauri::AppHandle) -> Result<String, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("Hibi Nihongo").join("Sao lưu").to_string_lossy().into_owned())
}

/// Ghi một file sao lưu. Ghi ra file tạm rồi đổi tên, để mất điện giữa chừng không để lại file hỏng.
#[tauri::command]
pub fn backup_write(dir: String, name: String, contents: String) -> Result<String, String> {
    if !is_ours(&name) {
        return Err("Tên file sao lưu không hợp lệ".into());
    }
    let dir = PathBuf::from(dir);
    fs::create_dir_all(&dir).map_err(|e| format!("Không tạo được thư mục: {e}"))?;
    let path = dir.join(&name);
    let tmp = dir.join(format!("{name}.tmp"));
    fs::write(&tmp, contents).map_err(|e| format!("Không ghi được file: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Không ghi được file: {e}")
    })?;
    Ok(path.to_string_lossy().into_owned())
}

/// Liệt kê các file sao lưu tự động trong thư mục, mới nhất trước.
#[tauri::command]
pub fn backup_list(dir: String) -> Result<Vec<BackupEntry>, String> {
    let dir = Path::new(&dir);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = vec![];
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !is_ours(&name) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        out.push(BackupEntry { name, size: meta.len(), modified });
    }
    // Tên file có ngày giờ dạng 2026-11-06_093015 nên xếp theo tên cũng là xếp theo thời gian
    out.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(out)
}

/// Chỉ giữ lại `keep` file mới nhất, xóa các file sao lưu tự động cũ hơn. Trả về số file đã xóa.
#[tauri::command]
pub fn backup_prune(dir: String, keep: usize) -> Result<usize, String> {
    let keep = keep.max(1);
    let list = backup_list(dir.clone())?;
    let mut removed = 0;
    for e in list.iter().skip(keep) {
        if fs::remove_file(Path::new(&dir).join(&e.name)).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

/// Đọc nội dung một file sao lưu tự động (để khôi phục).
#[tauri::command]
pub fn backup_read(dir: String, name: String) -> Result<String, String> {
    if !is_ours(&name) {
        return Err("Tên file sao lưu không hợp lệ".into());
    }
    fs::read_to_string(Path::new(&dir).join(name)).map_err(|e| format!("Không đọc được file: {e}"))
}
