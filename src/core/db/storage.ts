/**
 * DUNG LƯỢNG VÀ CHẾ ĐỘ LƯU BỀN VỮNG
 * Mặc định trình duyệt có thể tự xóa dữ liệu website khi máy đầy ổ.
 * "Lưu bền vững" (persistent) xin trình duyệt không tự xóa. App cài dạng PWA thường được chấp nhận ngay.
 * Bản Windows lưu trong thư mục dữ liệu của app nên không bị xóa kiểu này.
 */
export interface StorageInfo {
  usage: number // byte đang dùng
  quota: number // byte tối đa trình duyệt cho phép
  persisted: boolean
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const est = await navigator.storage?.estimate?.()
    const persisted = (await navigator.storage?.persisted?.()) ?? false
    return { usage: est?.usage ?? 0, quota: est?.quota ?? 0, persisted }
  } catch {
    return { usage: 0, quota: 0, persisted: false }
  }
}

/** Đổi số byte thành chữ dễ đọc: 1536 → "1,5 KB". */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toLocaleString('vi-VN', { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`
}
