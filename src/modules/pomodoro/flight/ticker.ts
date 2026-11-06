/**
 * CHẠY NGẦM TRONG CẢ APP cho chuyến bay tập trung:
 *  - Mỗi giây xem đã tới giờ hạ cánh chưa → ghi vé vào sổ, tính vào thống kê Pomodoro, kêu chuông, thông báo.
 *  - Tiếng ồn cabin (tiếng "ù" êm của động cơ) phát trong lúc bay, ở bất kỳ trang nào trong app.
 * Nhiều tab: khóa Web Locks + đọc lại trạng thái đã lưu, nên chỉ hạ cánh một lần.
 */
import { useSettings } from '@/core/settings'
import { showNotification } from '@/modules/reminders/lib/notify'
import { chime, logWork } from '../ticker'
import { useFlight } from './store'
import { airport } from './places'
import { addFlight } from './log'

async function land() {
  await useFlight.persist.rehydrate()
  const s = useFlight.getState()
  if (s.status !== 'flying' || s.endsAt == null || s.endsAt > Date.now() || !s.booking) return
  const b = s.booking
  const id = `${b.bookedAt}-${b.from}-${b.to}`
  await addFlight({ ...b, id, landedAt: Date.now(), intl: !airport(b.from).region })
  await logWork(b.minutes)
  useFlight.getState().land(id)
  if (useSettings.getState().sound) chime(4)
  const to = airport(b.to)
  void showNotification({ title: `🛬 Đã hạ cánh xuống ${to.city}`, body: `Chuyến ${b.flightNo} · ${b.minutes} phút tập trung. Mở app để nhận dấu hộ chiếu.`, to: '/pomodoro' })
}

let busy = false
async function tick() {
  const s = useFlight.getState()
  if (busy || s.status !== 'flying' || s.endsAt == null || s.endsAt > Date.now()) return
  busy = true
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    if (locks) await locks.request('hibi-flight', land)
    else await land()
  } catch (e) {
    console.warn('[flight] Không hạ cánh được', e)
  } finally {
    busy = false
  }
}

// ---------- Tiếng cabin: tiếng ồn nâu (brown noise) lọc trầm, tự tạo bằng Web Audio ----------
let ctx: AudioContext | null = null
let gain: GainNode | null = null

function startCabin() {
  try {
    if (!ctx) {
      ctx = new AudioContext()
      const len = ctx.sampleRate * 4
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 }
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(lp).connect(gain).connect(ctx.destination)
      src.start()
    }
    void ctx.resume()
    gain!.gain.setTargetAtTime(0.35, ctx.currentTime, 0.8)
  } catch { /* máy không hỗ trợ âm thanh */ }
}

function stopCabin() {
  if (ctx && gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
}

function syncCabin() {
  const s = useFlight.getState()
  if (s.status === 'flying' && s.cabinSound && useSettings.getState().sound) startCabin()
  else stopCabin()
}

if (typeof window !== 'undefined') {
  setInterval(tick, 1000)
  window.addEventListener('storage', (e) => { if (e.key === 'hibi-flight') void useFlight.persist.rehydrate() })
  useFlight.subscribe(syncCabin)
  useSettings.subscribe(syncCabin)
  // Trình duyệt chỉ cho phát tiếng sau khi người dùng chạm/bấm: tải lại trang giữa chuyến thì chờ lần chạm đầu
  window.addEventListener('pointerdown', () => syncCabin(), { once: true })
  window.addEventListener('keydown', () => syncCabin(), { once: true })
}
