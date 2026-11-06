/**
 * TRẠNG THÁI CHUYẾN BAY TẬP TRUNG (dùng chung cả app, lưu localStorage 'hibi-flight')
 * ----------------------------------------------------------------------------------
 *   idle      → chưa đặt vé (đang chọn điểm đến)
 *   checkin   → quầy làm thủ tục: chọn chỗ ngồi (= chế độ học)
 *   security  → cửa an ninh (một câu tiếng Nhật của nhân viên an ninh)
 *   gate      → cửa ra máy bay: xem thẻ lên máy bay, bấm "Lên máy bay"
 *   flying    → đang bay (đồng hồ chạy theo thời điểm hạ cánh `endsAt`, tải lại trang vẫn đúng)
 *   paused    → tạm dừng giữa chuyến
 *   arrival   → đã hạ cánh: nhập cảnh + hải quan (bay từ nước ngoài) rồi đóng dấu hộ chiếu
 *   landed    → vé lưu niệm + ghi chú (lastFlightId trỏ tới chuyến trong nhật ký)
 * Việc "tới giờ thì hạ cánh, ghi nhật ký, kêu chuông" nằm ở ../ticker.ts.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { airport, type ModeId } from './places'
import { distanceKm, focusMinutes } from './geo'

export type FlightStatus = 'idle' | 'checkin' | 'security' | 'gate' | 'flying' | 'paused' | 'arrival' | 'landed'
export type FlightView = 'map' | 'window'

export interface Booking {
  from: string
  to: string
  minutes: number
  km: number
  mode: ModeId
  seat: string
  flightNo: string
  gate: string
  bookedAt: number
}

interface FlightState {
  /** Sân bay xuất phát mặc định (nơi "đang ở"). Hạ cánh xong thì thành điểm vừa tới. */
  home: string
  /** Tốc độ: 1 = thời gian bay thật, 2 = nhanh gấp đôi... */
  speed: number
  /** Tiếng ồn cabin máy bay trong lúc bay. */
  cabinSound: boolean
  view: FlightView
  status: FlightStatus
  booking: Booking | null
  endsAt: number | null
  remaining: number
  lastFlightId: string | null

  setHome: (code: string) => void
  setSpeed: (n: number) => void
  setCabinSound: (on: boolean) => void
  setView: (v: FlightView) => void
  /** Chọn điểm đến → sang quầy làm thủ tục. */
  book: (to: string) => void
  checkIn: (mode: ModeId, seat: string) => void
  passSecurity: () => void
  cancel: () => void
  takeOff: () => void
  pause: () => void
  resume: () => void
  toggle: () => void
  /** Hết giờ: hạ cánh. Do ticker.ts gọi. */
  land: (flightId: string) => void
  /** Xong nhập cảnh / đóng dấu → xem vé lưu niệm. */
  finishArrival: () => void
  /** Hạ cánh khẩn cấp (bỏ chuyến, không ghi vào sổ). */
  abort: () => void
  /** Xem vé xong, quay lại chọn chuyến mới. */
  done: () => void
}

/** Số hiệu chuyến bay / cổng ngẫu nhiên nhưng cố định theo tuyến + ngày, cho giống vé thật. */
function ticketCodes(from: string, to: string) {
  let h = 0
  for (const c of `${from}${to}${new Date().toDateString()}`) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return { flightNo: `HB ${100 + (h % 900)}`, gate: `${'ABCDE'[h % 5]}${1 + ((h >> 4) % 30)}` }
}

export const useFlight = create<FlightState>()(
  persist(
    (set, get) => ({
      home: 'HND',
      speed: 2,
      cabinSound: true,
      view: 'map',
      status: 'idle',
      booking: null,
      endsAt: null,
      remaining: 0,
      lastFlightId: null,

      setHome: (home) => set({ home }),
      setSpeed: (speed) => set({ speed }),
      setCabinSound: (cabinSound) => set({ cabinSound }),
      setView: (view) => set({ view }),
      book: (to) => {
        const { home, speed } = get()
        const a = airport(home), b = airport(to)
        const minutes = focusMinutes(a, b, speed)
        set({
          status: 'checkin',
          remaining: minutes * 60_000,
          booking: { from: home, to, minutes, km: Math.round(distanceKm(a, b)), mode: 'vocab', seat: '', bookedAt: Date.now(), ...ticketCodes(home, to) },
        })
      },
      checkIn: (mode, seat) => {
        const b = get().booking
        if (b) set({ status: 'security', booking: { ...b, mode, seat } })
      },
      passSecurity: () => set({ status: 'gate' }),
      cancel: () => set({ status: 'idle', booking: null, endsAt: null }),
      takeOff: () => {
        const b = get().booking
        if (!b) return
        set({ status: 'flying', endsAt: Date.now() + b.minutes * 60_000, remaining: b.minutes * 60_000 })
      },
      pause: () => {
        const s = get()
        if (s.status !== 'flying' || s.endsAt == null) return
        set({ status: 'paused', remaining: Math.max(0, s.endsAt - Date.now()), endsAt: null })
      },
      resume: () => {
        const s = get()
        if (s.status !== 'paused') return
        set({ status: 'flying', endsAt: Date.now() + s.remaining })
      },
      toggle: () => (get().status === 'flying' ? get().pause() : get().resume()),
      land: (flightId) => {
        const b = get().booking
        set({ status: 'arrival', endsAt: null, remaining: 0, lastFlightId: flightId, home: b?.to ?? get().home })
      },
      finishArrival: () => set({ status: 'landed' }),
      abort: () => set({ status: 'idle', booking: null, endsAt: null, remaining: 0 }),
      done: () => set({ status: 'idle', booking: null, lastFlightId: null }),
    }),
    {
      name: 'hibi-flight',
      partialize: ({ home, speed, cabinSound, view, status, booking, endsAt, remaining, lastFlightId }) =>
        ({ home, speed, cabinSound, view, status, booking, endsAt, remaining, lastFlightId }),
    },
  ),
)

/** Đang có chuyến bay (đang bay hoặc tạm dừng). */
export const inFlight = (s: { status: FlightStatus }) => s.status === 'flying' || s.status === 'paused'

/** Số ms còn lại tới lúc hạ cánh. */
export function flightRemaining(s: Pick<FlightState, 'status' | 'endsAt' | 'remaining'>, now = Date.now()) {
  return s.status === 'flying' && s.endsAt != null ? Math.max(0, s.endsAt - now) : s.remaining
}
