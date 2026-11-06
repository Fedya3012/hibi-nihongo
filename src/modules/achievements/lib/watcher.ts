/**
 * BỘ THEO DÕI THÀNH TÍCH (chạy ngầm trong cả app, nạp từ module.ts)
 * ---------------------------------------------------------------
 * Khi dữ liệu học thay đổi (ôn thẻ, đồng hồ học, đọc xong chương...), đợi một lúc rồi tính lại.
 * Có huy hiệu mới hoặc lên cấp → hiện thông báo nhỏ góc dưới màn hình (bấm để mở trang Thành tích).
 *
 * Để không làm chậm app: gom nhiều thay đổi liền nhau thành một lần tính, cách nhau ít nhất 45 giây,
 * và không tính khi app đang ẩn. Nhiều tab: khóa Web Locks để chỉ một tab báo.
 */
import { onDbChange } from '@/core/db'
import { SNAPSHOT_STORES } from './stores'

const DEBOUNCE = 5_000
const MIN_GAP = 45_000

let timer: ReturnType<typeof setTimeout> | undefined
let lastRun = 0
let running = false

async function run() {
  if (running) return
  if (typeof document !== 'undefined' && document.hidden) return
  running = true
  lastRun = Date.now()
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    // Phần tính toán nạp khi cần, để lúc mở app không phải tải thêm
    const { check } = await import('./notify')
    if (locks) await locks.request('hibi-achievements', () => check(showToast))
    else await check(showToast)
  } catch (e) {
    console.warn('[achievements] Không tính được thành tích', e)
  } finally {
    running = false
  }
}

function schedule() {
  if (timer) clearTimeout(timer)
  const wait = Math.max(DEBOUNCE, MIN_GAP - (Date.now() - lastRun))
  timer = setTimeout(() => { timer = undefined; void run() }, wait)
}

// ---------- Thông báo nhỏ (toast) ----------
// Vẽ bằng DOM thường để không phải sửa khung app (Layout). Màu lấy từ token như mọi chỗ khác.

let toastEl: HTMLElement | null = null

export type ShowToast = typeof showToast

function showToast(icon: string, head: string, lines: string[], hint: string, pct: number) {
  toastEl?.remove()
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('role', 'status')
  el.className =
    'fixed bottom-20 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-card border border-primary ' +
    'bg-surface p-3 pr-4 text-left shadow-card transition duration-300 md:bottom-6 opacity-0 translate-y-2'
  const iconEl = document.createElement('span')
  iconEl.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xl'
  iconEl.textContent = icon
  const body = document.createElement('span')
  body.className = 'min-w-0'
  const h = document.createElement('span')
  h.className = 'block font-semibold text-text'
  h.textContent = head
  body.append(h)
  for (const l of lines) {
    const p = document.createElement('span')
    p.className = 'block text-sm text-text'
    p.textContent = l
    body.append(p)
  }
  const bar = document.createElement('span')
  bar.className = 'mt-1.5 block h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-surface-2'
  const fill = document.createElement('span')
  fill.className = 'block h-full rounded-full bg-primary'
  fill.style.width = `${Math.round(pct * 100)}%`
  bar.append(fill)
  const small = document.createElement('span')
  small.className = 'mt-1 block text-xs text-muted'
  small.textContent = hint
  body.append(bar, small)
  el.append(iconEl, body)
  const close = () => {
    el.classList.add('opacity-0', 'translate-y-2')
    setTimeout(() => el.remove(), 300)
    if (toastEl === el) toastEl = null
  }
  el.addEventListener('click', () => {
    window.location.hash = '#/achievements'
    close()
  })
  document.body.append(el)
  toastEl = el
  requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2'))
  setTimeout(close, 8_000)
}

if (typeof window !== 'undefined') {
  onDbChange([...SNAPSHOT_STORES], schedule)
  // Mở app: tính một lần (lần đầu chỉ ghi lại những gì đã đạt, không báo)
  setTimeout(() => void run(), 8_000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer === undefined) schedule() })
}
