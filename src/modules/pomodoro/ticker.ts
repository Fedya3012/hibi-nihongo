/**
 * CHẠY NGẦM TRONG CẢ APP: xem phiên Pomodoro hết giờ chưa (mỗi giây).
 * Hết giờ → sang phiên tiếp theo, ghi nhật ký, kêu chuông, hiện thông báo trên máy.
 *
 * Nhiều tab cùng mở: dùng khóa Web Locks + đọc lại trạng thái đã lưu trước khi chuyển phiên,
 * nên chỉ một tab chuyển phiên và chỉ kêu chuông một lần.
 */
import { currentLang, translate } from '@/core/i18n'
import { useSettings } from '@/core/settings'
import { kvGet, kvSet } from '@/core/db'
import { dayKey, getDayStartHour } from '@/modules/today/lib/days'
import { showNotification } from '@/modules/reminders/lib/notify'
import { usePomodoro, type Phase } from './store'
import { S } from './strings'

export interface DayLog { count: number; minutes: number }
export const LOG_KEY = 'pomodoro:log'

/** Ghi thêm một phiên tập trung đã xong vào nhật ký theo ngày học. */
export async function logWork(minutes: number) {
  const day = dayKey(Date.now(), await getDayStartHour())
  const log = await kvGet<Record<string, DayLog>>(LOG_KEY, {})
  const d = log[day] ?? { count: 0, minutes: 0 }
  log[day] = { count: d.count + 1, minutes: d.minutes + minutes }
  await kvSet(LOG_KEY, log)
  window.dispatchEvent(new Event('pomodoro:logged'))
}

// ---------- Chuông: vài tiếng "ting" ngắn, tự tạo bằng Web Audio (không cần file âm thanh) ----------
let ctx: AudioContext | null = null
export function chime(times = 3) {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    const t0 = ctx.currentTime + 0.05
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = i % 2 ? 1046.5 : 880 // La – Đô, nghe dịu
      const t = t0 + i * 0.35
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.32)
    }
  } catch { /* máy không hỗ trợ âm thanh: bỏ qua */ }
}

async function finish() {
  // Tab khác có thể vừa chuyển phiên: đọc lại bản đã lưu rồi mới kiểm tra
  await usePomodoro.persist.rehydrate()
  const s = usePomodoro.getState()
  if (s.status !== 'running' || s.endsAt == null || s.endsAt > Date.now()) return
  const minutes = s.settings.work
  const done: Phase = s.complete()
  if (done === 'work') await logWork(minutes)
  const next = usePomodoro.getState()
  if (next.settings.sound && useSettings.getState().sound) chime()
  if (next.settings.notify) {
    const lang = currentLang()
    const body = translate(S, lang, next.status === 'running' ? 'notifyAuto' : 'notifyPress', {
      next: translate(S, lang, next.phase),
      min: next.settings[next.phase],
    })
    void showNotification({ title: translate(S, lang, done === 'work' ? 'notifyWorkDone' : 'notifyBreakDone'), body, to: '/pomodoro' })
  }
}

let busy = false
async function tick() {
  const s = usePomodoro.getState()
  if (busy || s.status !== 'running' || s.endsAt == null || s.endsAt > Date.now()) return
  busy = true
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    if (locks) await locks.request('hibi-pomodoro', finish)
    else await finish()
  } catch (e) {
    console.warn('[pomodoro] Không chuyển được phiên', e)
  } finally {
    busy = false
  }
}

if (typeof window !== 'undefined') {
  setInterval(tick, 1000)
  // Tab khác bấm Bắt đầu / Tạm dừng: tab này cập nhật theo
  window.addEventListener('storage', (e) => { if (e.key === 'hibi-pomodoro') void usePomodoro.persist.rehydrate() })
}
