/**
 * THUẬT TOÁN FSRS (Free Spaced Repetition Scheduler, phiên bản 5)
 * ---------------------------------------------------------------
 * FSRS mô tả trí nhớ về một thẻ bằng 3 con số:
 *   - R (retrievability): xác suất bạn còn nhớ thẻ ngay lúc này (0–1).
 *   - S (stability): sau S ngày thì R giảm xuống 90%. Mỗi lần ôn đúng, S tăng lên.
 *   - D (difficulty): thẻ khó hay dễ với bạn (1–10). Thẻ khó thì S tăng chậm hơn.
 * Khi bạn chấm Again/Hard/Good/Easy, FSRS cập nhật S và D rồi chọn ngày ôn tiếp theo
 * sao cho đúng lúc đó R vừa giảm xuống mức "tỉ lệ nhớ mong muốn" (mặc định 90%).
 *
 * Tham số mặc định lấy từ FSRS-5 (huấn luyện trên hàng trăm triệu lượt ôn của người dùng Anki).
 * Code tự viết, không cần thư viện ngoài, chạy hoàn toàn offline.
 */
import { CardState, type Rating, type Schedule } from './types'

/** Tham số mặc định của FSRS-5. Bấm "Tối ưu" trong Cài đặt để app học bộ tham số riêng từ lịch sử ôn của bạn. */
export const DEFAULT_W: readonly number[] = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]
/** Tên cũ, giữ cho code khác. */
export const W = DEFAULT_W

/** Giới hạn hợp lệ của từng tham số (theo FSRS-5), dùng khi tối ưu và khi kiểm tra tham số đã lưu. */
export const W_BOUNDS: readonly (readonly [number, number])[] = [
  [0.01, 100], [0.01, 100], [0.01, 100], [0.01, 100], [1, 10], [0.001, 4], [0.001, 4], [0.001, 0.75],
  [0, 4.5], [0, 0.8], [0.001, 3.5], [0.001, 5], [0.001, 0.25], [0.001, 0.9], [0, 4], [0, 1], [1, 6], [0, 2], [0, 2],
]

/** Bộ tham số dùng được: đủ 19 số, nằm trong giới hạn. Không hợp lệ thì dùng mặc định. */
export function validWeights(w?: readonly number[] | null): readonly number[] {
  if (!w || w.length !== DEFAULT_W.length) return DEFAULT_W
  for (let i = 0; i < w.length; i++) {
    const [lo, hi] = W_BOUNDS[i]
    if (!Number.isFinite(w[i]) || w[i] < lo || w[i] > hi) return DEFAULT_W
  }
  return w
}

const DECAY = -0.5
const FACTOR = 19 / 81 // chọn để R(S, S) = 0.9
const MINUTE = 60_000
export const DAY = 86_400_000

/** Các bước học (phút) cho thẻ mới / thẻ vừa quên, trước khi chuyển sang ôn theo ngày. */
const LEARN_STEPS = { again: 1, hard: 6, good: 10 }
const RELEARN_STEP = 10

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Xác suất còn nhớ sau `days` ngày, với độ bền S. */
export function retrievability(days: number, stability: number): number {
  if (stability <= 0) return 0
  return Math.pow(1 + (FACTOR * Math.max(0, days)) / stability, DECAY)
}

/** Số ngày để R giảm từ 100% xuống `retention`. Với retention = 0.9 thì đúng bằng S. */
function intervalFor(stability: number, retention: number, maxInterval: number): number {
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)
  return clamp(Math.round(days), 1, maxInterval)
}

type Ws = readonly number[]

const initStability = (w: Ws, g: Rating) => Math.max(w[g - 1], 0.1)
const initDifficulty = (w: Ws, g: Rating) => clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10)

function nextDifficulty(w: Ws, d: number, g: Rating): number {
  const delta = -w[6] * (g - 3)
  const damped = d + (delta * (10 - d)) / 9 // càng gần 10 thì tăng càng chậm
  const reverted = w[7] * initDifficulty(w, 4) + (1 - w[7]) * damped // kéo nhẹ về mức trung bình
  return clamp(reverted, 1, 10)
}

/** Độ bền mới khi NHỚ được (Hard/Good/Easy) sau r xác suất. */
function recallStability(w: Ws, d: number, s: number, r: number, g: Rating): number {
  const hard = g === 2 ? w[15] : 1
  const easy = g === 4 ? w[16] : 1
  return s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hard * easy)
}

/** Độ bền mới khi QUÊN (Again). Không bao giờ lớn hơn độ bền cũ. */
function forgetStability(w: Ws, d: number, s: number, r: number): number {
  const sf = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r))
  return Math.min(sf, s)
}

/** Ôn lại trong cùng một ngày (bước học ngắn): S thay đổi nhẹ. */
function shortTermStability(w: Ws, s: number, g: Rating): number {
  return Math.max(0.1, s * Math.exp(w[17] * (g - 3 + w[18])))
}

/** "Trí nhớ" về một thẻ: độ bền S (ngày) và độ khó D (1–10). */
export interface Memory {
  s: number
  d: number
}

/**
 * Cập nhật trí nhớ sau một lần ôn, ĐÚNG như schedule() làm. Bộ tối ưu (optimizer.ts) dùng hàm này
 * để "chạy lại" lịch sử ôn với bộ tham số khác.
 *   kind 'first': lần đầu học thẻ mới · 'short': ôn trong ngày / đang ở bước học · 'long': ôn theo ngày
 */
export function nextMemory(w: Ws, m: Memory | null, kind: 'first' | 'short' | 'long', g: Rating, elapsedDays: number): Memory {
  if (!m || kind === 'first') return { s: initStability(w, g), d: initDifficulty(w, g) }
  if (kind === 'short') return { s: shortTermStability(w, m.s, g), d: nextDifficulty(w, m.d, g) }
  const r = retrievability(elapsedDays, m.s)
  return {
    s: g === 1 ? forgetStability(w, m.d, m.s, r) : recallStability(w, m.d, m.s, r, g),
    d: nextDifficulty(w, m.d, g),
  }
}

/**
 * "Rung" khoảng cách một chút (±5%) để các thẻ học cùng ngày không dồn đến hạn cùng một ngày.
 * Dùng số giả ngẫu nhiên theo id thẻ, nên nút bấm hiển thị đúng con số sẽ được dùng.
 */
function fuzz(days: number, seed: string): number {
  if (days < 3) return days
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const rand = ((h >>> 0) % 1000) / 1000 // 0–1
  const spread = Math.max(1, Math.round(days * 0.05))
  return days + Math.round((rand * 2 - 1) * spread)
}

/**
 * Khoảng "rung" cho phép quanh một khoảng cách (ngày), giống Anki: thẻ có thể đến hạn sớm/muộn
 * vài ngày trong khoảng này mà gần như không ảnh hưởng trí nhớ. Dàn đều thẻ (load.ts) chọn ngày trong khoảng này.
 */
export function fuzzRange(days: number, maxInterval: number): [number, number] {
  if (days < 3) return [days, days]
  const delta = 1 + 0.15 * Math.max(Math.min(days, 7) - 2.5, 0) + 0.1 * Math.max(Math.min(days, 20) - 7, 0)
    + 0.05 * Math.max(days - 20, 0)
  const lo = Math.max(2, Math.round(days - delta))
  const hi = Math.min(maxInterval, Math.round(days + delta))
  return [Math.min(lo, hi), hi]
}

/** Chọn ngày đến hạn trong khoảng [lo, hi] (tính bằng số ngày kể từ hôm nay). Xem load.ts. */
export type DayPicker = (ideal: number, lo: number, hi: number, seed: string) => number

export interface SchedulerOptions {
  retention: number
  maxInterval: number
  /** Tham số FSRS riêng (sau khi bấm Tối ưu). Không có = mặc định. */
  weights?: readonly number[] | null
  /** Dàn đều thẻ: chọn ngày ít thẻ nhất trong khoảng rung. Không có = rung ngẫu nhiên ±5% như cũ. */
  pickDay?: DayPicker | null
}

/**
 * Tính lịch ôn mới của thẻ sau khi chấm `g` vào lúc `now`.
 * Hàm "thuần": không đọc/ghi dữ liệu, chỉ tính toán. Nhờ vậy dễ xem trước cả 4 lựa chọn.
 */
export function schedule(card: Schedule, g: Rating, now: number, opt: SchedulerOptions, seed = ''): Schedule {
  const elapsedDays = card.lastReview ? Math.max(0, (now - card.lastReview) / DAY) : 0
  const next: Schedule = { ...card, reps: card.reps + 1, lastReview: now }
  const w = validWeights(opt.weights)
  // Khoảng cách cuối cùng: dàn đều theo số thẻ mỗi ngày nếu có, không thì rung ±5%
  const spread = (ideal: number) => {
    if (opt.pickDay && ideal >= 3) {
      const [lo, hi] = fuzzRange(ideal, opt.maxInterval)
      return clamp(opt.pickDay(ideal, lo, hi, seed + card.reps), 1, opt.maxInterval)
    }
    return Math.min(opt.maxInterval, fuzz(ideal, seed + card.reps))
  }
  const days = (s: number) => spread(intervalFor(s, opt.retention, opt.maxInterval))

  if (card.state === CardState.New) {
    next.stability = initStability(w, g)
    next.difficulty = initDifficulty(w, g)
    if (g === 4) {
      next.state = CardState.Review
      next.due = now + days(next.stability) * DAY
    } else {
      next.state = CardState.Learning
      next.due = now + (g === 1 ? LEARN_STEPS.again : g === 2 ? LEARN_STEPS.hard : LEARN_STEPS.good) * MINUTE
    }
    return next
  }

  // Ôn lại trong cùng ngày (đang ở bước học, hoặc ôn sớm < 1 ngày)
  if (card.state === CardState.Learning || card.state === CardState.Relearning || elapsedDays < 1) {
    next.stability = shortTermStability(w, card.stability, g)
    next.difficulty = nextDifficulty(w, card.difficulty, g)
    if (card.state === CardState.Review && g !== 1) {
      // Ôn sớm một thẻ đã thuộc: giữ ở trạng thái Review
      next.due = now + days(Math.max(next.stability, card.stability)) * DAY
      return next
    }
    if (g === 1) {
      if (card.state === CardState.Review) next.lapses = card.lapses + 1
      next.state = card.state === CardState.Review ? CardState.Relearning : card.state
      next.due = now + (card.state === CardState.Learning ? LEARN_STEPS.again : RELEARN_STEP) * MINUTE
    } else if (g === 2) {
      next.due = now + (card.state === CardState.Learning ? LEARN_STEPS.hard : RELEARN_STEP) * MINUTE
    } else {
      // Good/Easy: tốt nghiệp sang ôn theo ngày
      next.state = CardState.Review
      next.due = now + days(next.stability) * DAY
    }
    return next
  }

  // Thẻ đã thuộc, đến lúc ôn theo ngày
  const r = retrievability(elapsedDays, card.stability)
  next.difficulty = nextDifficulty(w, card.difficulty, g)
  if (g === 1) {
    next.stability = forgetStability(w, card.difficulty, card.stability, r)
    next.lapses = card.lapses + 1
    next.state = CardState.Relearning
    next.due = now + RELEARN_STEP * MINUTE
    return next
  }
  // Tính cả Hard/Good/Easy để bảo đảm thứ tự: Hard ≤ Good < Easy
  const sHard = recallStability(w, card.difficulty, card.stability, r, 2)
  const sGood = recallStability(w, card.difficulty, card.stability, r, 3)
  const sEasy = recallStability(w, card.difficulty, card.stability, r, 4)
  let iHard = intervalFor(sHard, opt.retention, opt.maxInterval)
  let iGood = intervalFor(sGood, opt.retention, opt.maxInterval)
  let iEasy = intervalFor(sEasy, opt.retention, opt.maxInterval)
  iHard = Math.min(iHard, iGood)
  iGood = Math.max(iGood, iHard + 1)
  iEasy = Math.max(iEasy, iGood + 1)
  const pick = { 2: [sHard, iHard], 3: [sGood, iGood], 4: [sEasy, iEasy] } as const
  const [s, interval] = pick[g as 2 | 3 | 4]
  next.stability = s
  next.state = CardState.Review
  next.due = now + spread(interval) * DAY
  return next
}

/** Lịch mới cho một thẻ chưa từng học. */
export function newSchedule(now: number): Schedule {
  return { state: CardState.New, due: now, stability: 0, difficulty: 0, reps: 0, lapses: 0 }
}

/** Chữ ngắn gọn cho khoảng thời gian: "1 phút", "10 phút", "3 ngày", "2,5 tháng", "1,2 năm". */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / MINUTE))
  if (min < 60) return `${min} phút`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} giờ`
  const d = Math.round(ms / DAY)
  if (d < 31) return `${d} ngày`
  const fmt = (x: number) => (Math.round(x * 10) / 10).toLocaleString('vi-VN')
  if (d < 365) return `${fmt(d / 30)} tháng`
  return `${fmt(d / 365)} năm`
}
