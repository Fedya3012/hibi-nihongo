/**
 * BỘ HẸN GIỜ NHẮC HỌC (chạy ngầm trong cả app)
 * --------------------------------------------
 * Cứ 30 giây xem đã tới giờ nhắc nào chưa. Tới giờ → hiện thông báo một lần, ghi lại để không nhắc lại.
 *
 * Lưu ý quan trọng: nhắc chỉ hiện được khi app ĐANG MỞ (cửa sổ thu nhỏ hay tab nằm phía sau vẫn được).
 * Website không thể tự bật lên lúc đã đóng hết tab (cần máy chủ gửi "push", app này chạy offline
 * nên không dùng). Nếu mở app trễ hơn giờ nhắc không quá 3 tiếng, app nhắc bù một lần.
 *
 * Nhiều tab cùng mở: dùng khóa Web Locks để chỉ một tab kiểm tra mỗi lúc, nên không nhắc trùng.
 */
import { getPermission, showNotification } from './notify'
import { getReminderSettings, getSentToday, markSent, slotAt } from './settings'

const CHECK_EVERY = 30_000
/** Mở app trễ hơn giờ nhắc bao lâu thì vẫn nhắc bù. */
const CATCH_UP = 3 * 3600_000

async function check() {
  const s = await getReminderSettings()
  if (!s.enabled || !s.times.length) return
  const now = new Date()
  if (!s.days.includes(now.getDay())) return
  const sent = await getSentToday()
  const due = s.times.filter((t) => slotAt(t, now) <= now.getTime() && !sent.includes(t))
  if (!due.length) return
  if ((await getPermission()) !== 'granted') return // chưa cho phép: để nguyên, cho phép xong vẫn nhắc bù được
  // Ghi "đã nhắc" TRƯỚC khi hiện, để lỗi giữa chừng cũng không nhắc lặp mỗi 30 giây
  await markSent(due)
  const latest = Math.max(...due.map((t) => slotAt(t, now)))
  if (now.getTime() - latest > CATCH_UP) return // quá trễ, bỏ qua lặng lẽ
  // Nạp phần ghép nội dung khi cần (để không làm nặng lúc mở app)
  const { buildReminder } = await import('./message')
  const msg = await buildReminder(s)
  if (msg) await showNotification(msg)
}

let running = false
async function tick() {
  if (running) return
  running = true
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    if (locks) await locks.request('hibi-reminders', check)
    else await check()
  } catch (e) {
    console.warn('[reminders] Không kiểm tra được giờ nhắc', e)
  } finally {
    running = false
  }
}

if (typeof window !== 'undefined') {
  setTimeout(tick, 5_000) // đợi app mở xong rồi mới xem có cần nhắc bù không
  setInterval(tick, CHECK_EVERY)
  // Máy vừa thức dậy / quay lại tab: kiểm tra ngay, không đợi tới lượt
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() })
}
