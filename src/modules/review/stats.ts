/**
 * THỐNG KÊ ÔN TẬP CHI TIẾT (tab "Thống kê" của trang Ôn tập)
 * ----------------------------------------------------------
 * Toàn bộ là hàm thuần: nhận danh sách thẻ + lịch sử ôn, trả về số liệu. Không đọc/ghi dữ liệu,
 * nên dễ kiểm tra và không ảnh hưởng gì tới lịch ôn.
 *
 * - Dự báo: mỗi ngày sắp tới có bao nhiêu thẻ đến hạn (theo lịch FSRS đã tính sẵn trong thẻ).
 * - Tỉ lệ nhớ thật: trong các lần ôn thẻ ĐÃ THUỘC (trạng thái Review), bao nhiêu lần không bấm "Quên".
 *   Đây là con số để so với "Tỉ lệ nhớ mong muốn" trong Cài đặt.
 * - Thẻ khó nhất: quên nhiều lần nhất, độ khó FSRS cao nhất.
 */
import { DAY } from './fsrs'
import { CardState, type SrsCard, type SrsLog } from './types'

/** Thẻ "thuộc chắc" khi khoảng cách ôn từ 21 ngày trở lên (giống cách Anki chia non / chắc). */
export const MATURE_DAYS = 21

const isActive = (c: SrsCard) => !c.suspended

// ---------- Dự báo số thẻ những ngày tới ----------

export interface ForecastDay {
  /** 0 = hôm nay, 1 = ngày mai... */
  offset: number
  start: number // thời điểm bắt đầu ngày học đó
  review: number // thẻ đã thuộc đến hạn ôn
  learning: number // thẻ đang học / học lại (hẹn sau ít phút hoặc giờ)
}

/**
 * Đếm thẻ đến hạn theo từng "ngày học" trong `days` ngày tới.
 * Thẻ quá hạn được tính vào hôm nay. Thẻ đang chôn tính từ lúc hết chôn. Bỏ qua thẻ mới và thẻ tạm ẩn.
 */
export function forecast(cards: SrsCard[], dayStart: number, days: number): ForecastDay[] {
  const out: ForecastDay[] = Array.from({ length: days }, (_, i) => ({
    offset: i, start: dayStart + i * DAY, review: 0, learning: 0,
  }))
  for (const c of cards) {
    if (!isActive(c) || c.state === CardState.New) continue
    const when = Math.max(c.due, c.buriedUntil ?? 0)
    const i = Math.max(0, Math.floor((when - dayStart) / DAY))
    if (i >= days) continue
    if (c.state === CardState.Review) out[i].review++
    else out[i].learning++
  }
  return out
}

export interface ForecastSummary {
  total: number
  avgPerDay: number
  /** Ngày nặng nhất trong khoảng (null nếu không có thẻ nào). */
  peak: ForecastDay | null
}

export function summarizeForecast(f: ForecastDay[]): ForecastSummary {
  let total = 0
  let peak: ForecastDay | null = null
  for (const d of f) {
    const n = d.review + d.learning
    total += n
    if (n > 0 && (!peak || n > peak.review + peak.learning)) peak = d
  }
  return { total, avgPerDay: f.length ? total / f.length : 0, peak }
}

// ---------- Tỉ lệ nhớ thật ----------

export interface RetentionBucket {
  passed: number
  total: number
}

export interface RetentionRow {
  key: string
  label: string
  young: RetentionBucket // thẻ còn non (khoảng cách < 21 ngày)
  mature: RetentionBucket // thẻ thuộc chắc (≥ 21 ngày)
  all: RetentionBucket
}

/** Tỉ lệ (0–1), hoặc null nếu chưa có lần ôn nào. */
export const rate = (b: RetentionBucket) => (b.total ? b.passed / b.total : null)

const empty = (): RetentionBucket => ({ passed: 0, total: 0 })

/**
 * Tỉ lệ nhớ thật theo các khoảng thời gian.
 * Chỉ tính lần ôn thẻ đã thuộc (bỏ các bước học thẻ mới, vì lúc đó quên là chuyện bình thường).
 * "Nhớ" = bấm Khó / Được / Dễ; "Quên" = bấm Quên.
 */
export function retention(logs: SrsLog[], dayStart: number): RetentionRow[] {
  const periods = [
    { key: 'today', label: 'Hôm nay', from: dayStart },
    { key: 'week', label: '7 ngày', from: dayStart - 6 * DAY },
    { key: 'month', label: '30 ngày', from: dayStart - 29 * DAY },
    { key: 'year', label: '1 năm', from: dayStart - 364 * DAY },
  ]
  const rows: RetentionRow[] = periods.map((p) => ({ key: p.key, label: p.label, young: empty(), mature: empty(), all: empty() }))
  for (const l of logs) {
    if (l.stateBefore !== CardState.Review) continue
    const ok = l.rating > 1 ? 1 : 0
    const mature = l.elapsedDays >= MATURE_DAYS
    periods.forEach((p, i) => {
      if (l.reviewedAt < p.from) return
      const r = rows[i]
      for (const b of [r.all, mature ? r.mature : r.young]) { b.total++; b.passed += ok }
    })
  }
  return rows
}

// ---------- Tỉ lệ các nút chấm ----------

export interface ButtonCounts { again: number; hard: number; good: number; easy: number; total: number }

/** Đếm số lần bấm từng nút trong các lần ôn từ `from` trở đi. */
export function buttonCounts(logs: SrsLog[], from: number): ButtonCounts {
  const c: ButtonCounts = { again: 0, hard: 0, good: 0, easy: 0, total: 0 }
  for (const l of logs) {
    if (l.reviewedAt < from) continue
    c.total++
    if (l.rating === 1) c.again++
    else if (l.rating === 2) c.hard++
    else if (l.rating === 3) c.good++
    else c.easy++
  }
  return c
}

/** Thời gian trung bình cho một lượt ôn (giây), tính trên các lần ôn từ `from`. Null nếu chưa có dữ liệu. */
export function avgSecondsPerReview(logs: SrsLog[], from: number): number | null {
  let sum = 0
  let n = 0
  for (const l of logs) {
    if (l.reviewedAt < from || !l.durationMs) continue
    sum += l.durationMs
    n++
  }
  return n ? sum / n / 1000 : null
}

// ---------- Độ thuộc của các thẻ ----------

export interface Maturity { fresh: number; learning: number; young: number; mature: number; suspended: number }

/** Khoảng cách (ngày) giữa lần ôn gần nhất và lần ôn kế tiếp đã hẹn. */
export const intervalDays = (c: SrsCard) => (c.lastReview ? (c.due - c.lastReview) / DAY : 0)

export function maturity(cards: SrsCard[]): Maturity {
  const m: Maturity = { fresh: 0, learning: 0, young: 0, mature: 0, suspended: 0 }
  for (const c of cards) {
    if (c.suspended) m.suspended++
    else if (c.state === CardState.New) m.fresh++
    else if (c.state !== CardState.Review) m.learning++
    else if (intervalDays(c) >= MATURE_DAYS) m.mature++
    else m.young++
  }
  return m
}

// ---------- Thẻ khó nhất ----------

export interface HardCard {
  card: SrsCard
  /** Số lần bấm Quên trong lịch sử ôn được truyền vào (tab Thống kê truyền ~1 năm gần đây). */
  agains: number
  reviews: number
}

/**
 * Các thẻ khó nhất: xếp theo số lần quên (khi đã thuộc), rồi số lần bấm Quên nói chung, rồi độ khó FSRS.
 * Chỉ lấy thẻ đã ôn ít nhất 3 lần và có quên ít nhất 1 lần, để không "oan" cho thẻ mới.
 */
export function hardestCards(cards: SrsCard[], logs: SrsLog[], limit = 10): HardCard[] {
  const per = new Map<string, { agains: number; reviews: number }>()
  for (const l of logs) {
    const s = per.get(l.cardId) ?? { agains: 0, reviews: 0 }
    s.reviews++
    if (l.rating === 1) s.agains++
    per.set(l.cardId, s)
  }
  return cards
    .filter((c) => c.state !== CardState.New)
    .map((card) => {
      const s = per.get(card.id) ?? { agains: 0, reviews: card.reps }
      return { card, agains: s.agains, reviews: Math.max(s.reviews, card.reps) }
    })
    .filter((h) => h.reviews >= 3 && (h.card.lapses > 0 || h.agains > 0))
    .sort((a, b) =>
      b.card.lapses - a.card.lapses || b.agains - a.agains || b.card.difficulty - a.card.difficulty)
    .slice(0, limit)
}
