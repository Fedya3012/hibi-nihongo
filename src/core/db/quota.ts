/**
 * BỘ NHỚ ĐẦY
 * Khi trình duyệt (hoặc ổ đĩa) hết chỗ, mọi lần ghi dữ liệu đều hỏng với lỗi QuotaExceededError.
 * Kho dữ liệu (idb.ts) tự nhận ra lỗi này, đổi thành câu dễ hiểu, và báo ra đây để một thanh
 * cảnh báo chung (src/modules/storage/Host.tsx) hiện nút "Dọn dữ liệu", ở bất kỳ trang nào.
 * Module tự ghi file lớn (vd chép video) có thể gọi reportQuotaError() khi gặp lỗi tương tự.
 */
export const QUOTA_MESSAGE =
  'Bộ nhớ của máy (hoặc trình duyệt) đã đầy nên không lưu được. Hãy mở "Dung lượng và dọn dẹp" để xóa bớt ảnh, video không cần nữa rồi thử lại.'

/** Lỗi này có phải do hết chỗ lưu không. */
export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; message?: string; code?: number; inner?: unknown }
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) return true
  return /quota|disk is full|not enough space|insufficient (disk )?space/i.test(e.message ?? '')
}

let lastAt = 0
const listeners = new Set<(at: number) => void>()

export function reportQuotaError(): void {
  lastAt = Date.now()
  for (const l of listeners) l(lastAt)
}

/** Thời điểm gặp lỗi đầy bộ nhớ gần nhất (0 = chưa gặp). */
export const lastQuotaErrorAt = () => lastAt

export function onQuotaError(cb: (at: number) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
