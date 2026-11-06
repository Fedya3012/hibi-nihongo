/**
 * BỘ HẸN GIỜ POMODORO (trạng thái dùng chung cả app)
 * -------------------------------------------------
 * Một vòng: Tập trung 25 phút → Nghỉ ngắn 5 phút, lặp lại; cứ sau 4 lần tập trung thì Nghỉ dài 15 phút.
 *
 * Trạng thái lưu trong localStorage ('hibi-pomodoro'), ghi THỜI ĐIỂM KẾT THÚC (endsAt) chứ không đếm lùi
 * từng giây. Nhờ vậy tải lại trang, chuyển trang hay thu nhỏ cửa sổ thì đồng hồ vẫn chạy đúng.
 *
 * Việc "hết giờ thì chuyển phiên, kêu chuông, hiện thông báo" nằm ở ticker.ts.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'work' | 'short' | 'long'
export type Status = 'idle' | 'running' | 'paused'

export interface PomodoroSettings {
  work: number // phút
  short: number
  long: number
  /** Sau bao nhiêu lần tập trung thì nghỉ dài. */
  longEvery: number
  /** Hết phiên này thì tự chạy phiên tiếp theo. */
  autoStart: boolean
  sound: boolean
  notify: boolean
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  work: 25, short: 5, long: 15, longEvery: 4, autoStart: false, sound: true, notify: true,
}

interface PomodoroState {
  settings: PomodoroSettings
  phase: Phase
  status: Status
  /** Lúc chạy: thời điểm hết giờ (ms). */
  endsAt: number | null
  /** Lúc dừng / chưa chạy: số ms còn lại. */
  remaining: number
  /** Số lần tập trung đã xong trong vòng hiện tại (để biết khi nào nghỉ dài). */
  cycle: number

  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  /** Chọn phiên khác (đồng hồ về đầu phiên đó, dừng lại). */
  choose: (p: Phase) => void
  /** Bỏ qua phiên đang chạy, sang phiên tiếp theo (không tính là đã xong). */
  skip: () => void
  /** Hết giờ: sang phiên tiếp theo. Trả về phiên vừa xong. Do ticker.ts gọi. */
  complete: () => Phase
  setSettings: (patch: Partial<PomodoroSettings>) => void
}

export const phaseMs = (p: Phase, s: PomodoroSettings) => s[p] * 60_000

/** Phiên tiếp theo sau `p`, khi đã xong `cycle` lần tập trung. */
function nextPhase(p: Phase, cycle: number, s: PomodoroSettings): Phase {
  if (p !== 'work') return 'work'
  return cycle > 0 && cycle % s.longEvery === 0 ? 'long' : 'short'
}

export const usePomodoro = create<PomodoroState>()(
  persist(
    (set, get) => {
      /** Vào phiên `phase`, chạy luôn hoặc chờ bấm Bắt đầu. */
      const enter = (phase: Phase, run: boolean, cycle = get().cycle) => {
        const ms = phaseMs(phase, get().settings)
        set({ phase, cycle, remaining: ms, status: run ? 'running' : 'idle', endsAt: run ? Date.now() + ms : null })
      }
      return {
        settings: DEFAULT_SETTINGS,
        phase: 'work',
        status: 'idle',
        endsAt: null,
        remaining: DEFAULT_SETTINGS.work * 60_000,
        cycle: 0,

        start: () => {
          const s = get()
          if (s.status === 'running') return
          const left = s.remaining > 0 ? s.remaining : phaseMs(s.phase, s.settings)
          set({ status: 'running', endsAt: Date.now() + left })
        },
        pause: () => {
          const s = get()
          if (s.status !== 'running' || s.endsAt == null) return
          set({ status: 'paused', remaining: Math.max(0, s.endsAt - Date.now()), endsAt: null })
        },
        toggle: () => (get().status === 'running' ? get().pause() : get().start()),
        reset: () => enter(get().phase, false),
        choose: (p) => enter(p, false),
        skip: () => {
          const s = get()
          const cycle = s.phase === 'long' ? 0 : s.cycle // bỏ qua nghỉ dài cũng là sang vòng mới
          enter(nextPhase(s.phase, cycle, s.settings), s.status === 'running' && s.settings.autoStart, cycle)
        },
        complete: () => {
          const s = get()
          const done = s.phase
          // Xong nghỉ dài thì bắt đầu vòng mới
          const cycle = done === 'work' ? s.cycle + 1 : done === 'long' ? 0 : s.cycle
          enter(nextPhase(done, cycle, s.settings), s.settings.autoStart, cycle)
          return done
        },
        setSettings: (patch) => {
          const settings = { ...get().settings, ...patch }
          set({ settings })
          // Đang chờ (chưa chạy) thì đồng hồ hiện ngay độ dài mới
          if (get().status === 'idle') set({ remaining: phaseMs(get().phase, settings) })
        },
      }
    },
    {
      name: 'hibi-pomodoro',
      // Bản lưu cũ thiếu cài đặt mới thêm → lấy mặc định cho phần thiếu
      merge: (saved, cur) => {
        const s = (saved ?? {}) as Partial<PomodoroState>
        return { ...cur, ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) } }
      },
      partialize: ({ settings, phase, status, endsAt, remaining, cycle }) => ({ settings, phase, status, endsAt, remaining, cycle }),
    },
  ),
)

/** Số ms còn lại của phiên hiện tại (tính theo giờ thật). */
export function remainingNow(s: Pick<PomodoroState, 'status' | 'endsAt' | 'remaining'>, now = Date.now()): number {
  return s.status === 'running' && s.endsAt != null ? Math.max(0, s.endsAt - now) : s.remaining
}

/** 1500000 → "25:00" */
export function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
