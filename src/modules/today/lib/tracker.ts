/**
 * ĐỒNG HỒ ĐẾM GIỜ HỌC (chạy ngầm trong cả app)
 * --------------------------------------------
 * Cứ 5 giây kiểm tra một lần. Một khoảng 5 giây được tính là "đang học" khi:
 *   1. bạn đang mở một trang học (Ôn tập, Manga, Anime, Kana, Kanji, Từ điển...),
 *   2. cửa sổ app đang hiện trên màn hình, và
 *   3. bạn vừa thao tác (bấm, gõ, cuộn, rê chuột) trong 90 giây qua, HOẶC video/âm thanh đang phát
 *      (xem anime không cần chạm chuột vẫn được tính).
 * Thời gian được ghi xuống bảng studyDays mỗi 30 giây và khi bạn đóng/ẩn app.
 *
 * File này được nạp một lần từ src/modules/registry.ts (dòng `import './today/lib/tracker'`).
 */
import { categoryOfPath, type Category } from './categories'
import { dayKey, getDayStartHour } from './days'
import { addStudyTime, type TimeChunk } from './store'

const TICK_MS = 5_000
const IDLE_MS = 90_000
const FLUSH_MS = 30_000

let lastInput = Date.now()
let lastTick = Date.now()
let startHour = 4
let pending: TimeChunk[] = []
let lastFlush = Date.now()
let started = false

/** Trang hiện tại (app dùng HashRouter: "#/review?quick=1" → "/review?quick=1"). */
function currentPath(): string {
  const h = location.hash.replace(/^#/, '')
  return h || '/'
}

function mediaPlaying(): boolean {
  for (const m of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
    if (!m.paused && !m.ended && m.readyState > 2) return true
  }
  return false
}

function tick() {
  const now = Date.now()
  // Máy ngủ hoặc tab bị treo lâu: chỉ tính tối đa 2 nhịp để không cộng nhầm cả tiếng
  const elapsed = Math.min(now - lastTick, TICK_MS * 2)
  lastTick = now
  const cat = categoryOfPath(currentPath())
  const visible = document.visibilityState === 'visible'
  const playing = visible && mediaPlaying()
  // Nhiều tab cùng mở: chỉ tab đang được chọn mới đếm (trừ khi tab đó đang phát video)
  const focused = document.hasFocus()
  const active = cat && visible && (playing || (focused && now - lastInput < IDLE_MS))
  if (active) add(cat, now - elapsed, now)
  if (now - lastFlush >= FLUSH_MS) void flush()
}

function add(c: Category, s: number, e: number) {
  const day = dayKey(e, startHour)
  const last = pending[pending.length - 1]
  if (last && last.c === c && last.day === day && s - last.e < TICK_MS * 3) {
    last.e = e
    last.secs += (e - s) / 1000
  } else {
    pending.push({ day, c, s, e, secs: (e - s) / 1000 })
  }
}

/** Ghi phần đã đếm xuống kho. Gọi được từ ngoài (ví dụ trước khi xem thống kê). */
export async function flush() {
  lastFlush = Date.now()
  startHour = await getDayStartHour().catch(() => startHour)
  if (!pending.length) return
  const batch = pending
  pending = []
  try {
    await addStudyTime(batch)
  } catch {
    pending = [...batch, ...pending] // lỗi ghi: giữ lại, lần sau ghi tiếp
  }
}

/** Bắt đầu đếm (gọi nhiều lần cũng chỉ chạy một đồng hồ). */
export function startTracker() {
  if (started || typeof window === 'undefined') return
  started = true
  const onInput = () => { lastInput = Date.now() }
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    window.addEventListener(ev, onInput, { passive: true, capture: true })
  }
  // Rê chuột: chỉ cập nhật tối đa mỗi giây cho nhẹ
  let lastMove = 0
  window.addEventListener('pointermove', () => {
    const now = Date.now()
    if (now - lastMove > 1000) { lastMove = now; lastInput = now }
  }, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
    else lastTick = Date.now()
  })
  window.addEventListener('pagehide', () => void flush())
  // Đổi trang (ví dụ học xong quay về Hôm nay): ghi ngay để số phút cập nhật liền
  window.addEventListener('hashchange', () => void flush())
  void getDayStartHour().then((h) => { startHour = h }).catch(() => {})
  setInterval(tick, TICK_MS)
  // Mở app sau vài ngày nghỉ (kể cả khi vào thẳng trang khác, không qua Hôm nay): giữ streak nếu còn lượt đóng băng
  // (nạp file thống kê lúc cần, để phần khởi động app vẫn nhẹ)
  setTimeout(() => void import('./stats').then((m) => m.autoFreeze()).catch(() => {}), 3000)
}

startTracker()
