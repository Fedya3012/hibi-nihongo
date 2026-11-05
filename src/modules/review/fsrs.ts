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

export const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
] as const

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

const initStability = (g: Rating) => Math.max(W[g - 1], 0.1)
const initDifficulty = (g: Rating) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10)

function nextDifficulty(d: number, g: Rating): number {
  const delta = -W[6] * (g - 3)
  const damped = d + (delta * (10 - d)) / 9 // càng gần 10 thì tăng càng chậm
  const reverted = W[7] * initDifficulty(4) + (1 - W[7]) * damped // kéo nhẹ về mức trung bình
  return clamp(reverted, 1, 10)
}

/** Độ bền mới khi NHỚ được (Hard/Good/Easy) sau r xác suất. */
function recallStability(d: number, s: number, r: number, g: Rating): number {
  const hard = g === 2 ? W[15] : 1
  const easy = g === 4 ? W[16] : 1
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy)
}

/** Độ bền mới khi QUÊN (Again). Không bao giờ lớn hơn độ bền cũ. */
function forgetStability(d: number, s: number, r: number): number {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
  return Math.min(sf, s)
}

/** Ôn lại trong cùng một ngày (bước học ngắn): S thay đổi nhẹ. */
function shortTermStability(s: number, g: Rating): number {
  return Math.max(0.1, s * Math.exp(W[17] * (g - 3 + W[18])))
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

export interface SchedulerOptions {
  retention: number
  maxInterval: number
}

/**
 * Tính lịch ôn mới của thẻ sau khi chấm `g` vào lúc `now`.
 * Hàm "thuần": không đọc/ghi dữ liệu, chỉ tính toán. Nhờ vậy dễ xem trước cả 4 lựa chọn.
 */
export function schedule(card: Schedule, g: Rating, now: number, opt: SchedulerOptions, seed = ''): Schedule {
  const elapsedDays = card.lastReview ? Math.max(0, (now - card.lastReview) / DAY) : 0
  const next: Schedule = { ...card, reps: card.reps + 1, lastReview: now }
  const days = (s: number) => fuzz(intervalFor(s, opt.retention, opt.maxInterval), seed + card.reps)

  if (card.state === CardState.New) {
    next.stability = initStability(g)
    next.difficulty = initDifficulty(g)
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
    next.stability = shortTermStability(card.stability, g)
    next.difficulty = nextDifficulty(card.difficulty, g)
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
  next.difficulty = nextDifficulty(card.difficulty, g)
  if (g === 1) {
    next.stability = forgetStability(card.difficulty, card.stability, r)
    next.lapses = card.lapses + 1
    next.state = CardState.Relearning
    next.due = now + RELEARN_STEP * MINUTE
    return next
  }
  // Tính cả Hard/Good/Easy để bảo đảm thứ tự: Hard ≤ Good < Easy
  const sHard = recallStability(card.difficulty, card.stability, r, 2)
  const sGood = recallStability(card.difficulty, card.stability, r, 3)
  const sEasy = recallStability(card.difficulty, card.stability, r, 4)
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
  next.due = now + Math.min(opt.maxInterval, fuzz(interval, seed + card.reps)) * DAY
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
