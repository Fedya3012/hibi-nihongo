/**
 * TỐI ƯU FSRS THEO TRÍ NHỚ CỦA BẠN (giống nút "Optimize" của Anki)
 * ----------------------------------------------------------------
 * FSRS có 19 tham số. Bộ mặc định được học từ hàng trăm triệu lượt ôn của người dùng Anki,
 * nên hợp với "người trung bình". Hàm optimize() chạy lại toàn bộ lịch sử ôn của bạn (bảng srsLogs)
 * và chỉnh 19 tham số sao cho FSRS đoán đúng nhất lần nào bạn nhớ, lần nào bạn quên.
 *
 * Cách đo "đoán đúng": mỗi lần ôn thẻ sau ≥ 1 ngày, FSRS đoán xác suất còn nhớ R.
 * Nhớ thật (không bấm Quên) mà R cao, hoặc quên thật mà R thấp, là đoán tốt. Sai số tính bằng log-loss
 * (cách đo chuẩn của FSRS). Tìm tham số bằng Adam (một kiểu "xuống dốc" từng bước nhỏ), đạo hàm tính xấp xỉ.
 *
 * Hàm thuần, không đọc/ghi dữ liệu: chạy được trong Web Worker (optimizer.worker.ts) và trong test.
 */
import { DEFAULT_W, W_BOUNDS, nextMemory, retrievability, type Memory } from './fsrs'
import { CardState, type Rating, type SrsLog } from './types'

/** Số lần ôn "theo ngày" tối thiểu để tối ưu có ý nghĩa (ít hơn thì dễ học theo may rủi). */
export const MIN_REVIEWS = 300

/** Lịch sử ôn đã chuẩn bị: mảng phẳng cho nhanh. kind 0 = lần đầu, 1 = trong ngày, 2 = theo ngày. */
export interface TrainData {
  kind: Uint8Array
  rating: Uint8Array
  elapsed: Float64Array
  /** Số lượt ôn "theo ngày" (có tính sai số). */
  reviews: number
  cards: number
}

/**
 * Gom lịch sử theo thẻ, sắp theo thời gian. Chỉ lấy thẻ có lần học đầu tiên trong app
 * (thẻ nhập từ Anki mà thiếu lịch sử cũ thì bỏ, vì không biết trí nhớ ban đầu).
 * Bấm "Học lại" (thẻ quay về Mới) thì bắt đầu chuỗi mới.
 */
export function prepare(logs: SrsLog[]): TrainData {
  const byCard = new Map<string, SrsLog[]>()
  for (const l of logs) {
    if (l.rating < 1 || l.rating > 4) continue
    const arr = byCard.get(l.cardId)
    if (arr) arr.push(l)
    else byCard.set(l.cardId, [l])
  }
  const kind: number[] = []
  const rating: number[] = []
  const elapsed: number[] = []
  let reviews = 0
  let cards = 0
  for (const list of byCard.values()) {
    list.sort((a, b) => a.reviewedAt - b.reviewedAt)
    let started = false
    for (const l of list) {
      if (l.stateBefore === CardState.New) {
        if (!started) cards++
        started = true
        kind.push(0)
      } else {
        if (!started) continue
        // Giống schedule() trong fsrs.ts: đang ở bước học, hoặc ôn lại chưa đủ 1 ngày = ôn "trong ngày"
        const short = l.stateBefore === CardState.Learning || l.stateBefore === CardState.Relearning || l.elapsedDays < 1
        kind.push(short ? 1 : 2)
        if (!short) reviews++
      }
      rating.push(l.rating)
      elapsed.push(Math.max(0, l.elapsedDays))
    }
  }
  return {
    kind: Uint8Array.from(kind), rating: Uint8Array.from(rating), elapsed: Float64Array.from(elapsed), reviews, cards,
  }
}

const KINDS = ['first', 'short', 'long'] as const

/** Sai số trung bình (log-loss) của bộ tham số `w` trên lịch sử ôn. Càng nhỏ càng đoán đúng. */
export function logLoss(w: readonly number[], data: TrainData): number {
  let m: Memory | null = null
  let sum = 0
  const n = data.kind.length
  for (let i = 0; i < n; i++) {
    const k = data.kind[i]
    const g = data.rating[i] as Rating
    if (k === 2 && m) {
      const r = Math.min(1 - 1e-6, Math.max(1e-6, retrievability(data.elapsed[i], m.s)))
      sum -= g > 1 ? Math.log(r) : Math.log(1 - r)
    }
    m = nextMemory(w, m, KINDS[k], g, data.elapsed[i])
  }
  return data.reviews ? sum / data.reviews : 0
}

// Tối ưu trong "không gian chuẩn hóa" để mọi tham số có cùng tầm: 4 độ bền ban đầu (0,01–100 ngày) dùng log,
// các tham số còn lại đưa về 0–1 theo giới hạn của chúng.
const isLog = (i: number) => i < 4
const toX = (w: readonly number[]) => w.map((v, i) => {
  const [lo, hi] = W_BOUNDS[i]
  return isLog(i) ? Math.log(v) : (v - lo) / (hi - lo)
})
const toW = (x: number[]) => x.map((v, i) => {
  const [lo, hi] = W_BOUNDS[i]
  const w = isLog(i) ? Math.exp(v) : lo + v * (hi - lo)
  return Math.min(hi, Math.max(lo, w))
})
const clampX = (x: number[]) => toX(toW(x))

export interface OptimizeResult {
  weights: number[]
  /** Sai số với tham số mặc định / tham số đang dùng / tham số mới. */
  lossDefault: number
  lossCurrent: number
  lossNew: number
  reviews: number
  cards: number
}

export interface OptimizeOptions {
  /** Tham số đang dùng (để so sánh). */
  current?: readonly number[]
  steps?: number
  /** Báo tiến độ 0–1. */
  onProgress?: (p: number) => void
}

/**
 * Tìm bộ tham số mới. Có thêm một "lực kéo" nhẹ về tham số mặc định (càng ít dữ liệu, kéo càng mạnh)
 * để không học theo may rủi khi lịch sử còn ngắn.
 */
export function optimize(data: TrainData, opt: OptimizeOptions = {}): OptimizeResult {
  const steps = opt.steps ?? 200
  const base = toX(DEFAULT_W)
  const pull = 20 / Math.max(1, data.reviews) // như thể có thêm 20 lượt ôn "trung bình"
  const objective = (x: number[]) => {
    let reg = 0
    for (let i = 0; i < x.length; i++) reg += (x[i] - base[i]) ** 2
    return logLoss(toW(x), data) + pull * reg
  }
  let x = [...base]
  const m = new Array(x.length).fill(0)
  const v = new Array(x.length).fill(0)
  const lr = 0.03
  const b1 = 0.9
  const b2 = 0.999
  const h = 1e-4
  let best = [...x]
  let bestF = objective(x)
  let stale = 0
  for (let t = 1; t <= steps; t++) {
    const f0 = objective(x)
    const grad = x.map((_, i) => {
      const xi = [...x]
      xi[i] += h
      return (objective(xi) - f0) / h
    })
    const rate = lr * (t < steps / 2 ? 1 : 0.3) // bước nhỏ lại ở nửa sau
    x = clampX(x.map((xi, i) => {
      m[i] = b1 * m[i] + (1 - b1) * grad[i]
      v[i] = b2 * v[i] + (1 - b2) * grad[i] ** 2
      const mh = m[i] / (1 - b1 ** t)
      const vh = v[i] / (1 - b2 ** t)
      return xi - (rate * mh) / (Math.sqrt(vh) + 1e-8)
    }))
    const f = objective(x)
    if (f < bestF - 1e-7) { bestF = f; best = [...x]; stale = 0 } else if (++stale >= 30) break
    opt.onProgress?.(t / steps)
  }
  opt.onProgress?.(1)
  const weights = toW(best).map((w) => Math.round(w * 1e4) / 1e4)
  return {
    weights,
    lossDefault: logLoss(DEFAULT_W, data),
    lossCurrent: logLoss(opt.current ?? DEFAULT_W, data),
    lossNew: logLoss(weights, data),
    reviews: data.reviews,
    cards: data.cards,
  }
}
