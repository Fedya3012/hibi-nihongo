/**
 * TỰ SỬA KHI APP VỪA ĐƯỢC CẬP NHẬT
 * --------------------------------
 * Mỗi lần đăng bản mới, tên các file code (ví dụ ImmersionPage-CCb_Z3Vg.js) đổi theo, file cũ bị xoá.
 * Một tab đang mở bản cũ sẽ không tải được trang con nữa ("Failed to fetch dynamically imported module").
 * Cách sửa: tải lại trang một lần để lấy bản mới. Ghi lại thời điểm để không tải lại liên tục
 * nếu lỗi do nguyên nhân khác (ví dụ mất mạng).
 */
const KEY = 'hibi:chunk-reload-at'
const MIN_GAP_MS = 10_000

/** Lỗi này có phải do file code của bản cũ không còn nữa không? */
export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(msg)
}

/** Tải lại trang một lần. Trả về false nếu vừa mới tải lại (để hiện thông báo thay vì lặp vô tận). */
export function reloadOnce(): boolean {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0)
  } catch {
    /* không đọc được sessionStorage: vẫn thử tải lại */
  }
  if (Date.now() - last < MIN_GAP_MS) return false
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* bỏ qua */
  }
  window.location.reload()
  return true
}

/** Gọi một lần lúc khởi động: Vite phát sự kiện này khi không tải được file code của trang con. */
export function installStaleChunkReload() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnce()) event.preventDefault()
  })
}
