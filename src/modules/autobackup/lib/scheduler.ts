/**
 * BỘ HẸN GIỜ SAO LƯU TỰ ĐỘNG (chạy ngầm trong cả app, giống bộ hẹn giờ Nhắc học)
 * -------------------------------------------------------------------------------
 * Mở app được 20 giây, rồi cứ 15 phút một lần, xem đã tới hạn sao lưu chưa.
 * Tới hạn:
 *   - Ghi được lặng lẽ (bản Windows, hoặc Chrome/Edge đã có quyền ghi thư mục) → ghi luôn.
 *   - Không ghi lặng lẽ được → báo cho thanh nhắc (Host.tsx) hiện lên để bạn bấm.
 * Nhiều tab cùng mở: khóa Web Locks đảm bảo chỉ một tab sao lưu mỗi lúc.
 */
import { getAutoBackupSettings, getState, nextDueAt } from './settings'
import { runAutoBackup } from './run'

const CHECK_EVERY = 15 * 60_000

let needsAction = false
const listeners = new Set<() => void>()
const setNeedsAction = (v: boolean) => {
  if (v === needsAction) return
  needsAction = v
  listeners.forEach((l) => l())
}

/** Thanh nhắc có nên hiện không. */
export const getNeedsAction = () => needsAction
export function subscribeNeedsAction(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
export const clearNeedsAction = () => setNeedsAction(false)

async function check() {
  const s = await getAutoBackupSettings()
  const due = nextDueAt(s, getState())
  if (due == null || Date.now() < due) { setNeedsAction(false); return }
  const r = await runAutoBackup()
  setNeedsAction(r.kind === 'needs-action')
}

let running = false
export async function tick() {
  if (running) return
  running = true
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    if (locks) await locks.request('hibi-autobackup', check)
    else await check()
  } catch (e) {
    console.warn('[autobackup] Không chạy được sao lưu tự động', e)
  } finally {
    running = false
  }
}

if (typeof window !== 'undefined') {
  setTimeout(tick, 20_000) // đợi app mở xong, không làm chậm lúc khởi động
  setInterval(tick, CHECK_EVERY)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() })
}
