// Kiểm tra bộ tối ưu FSRS: với một "người học giả" nhớ tốt hơn mức trung bình,
// tham số tối ưu phải đoán đúng hơn tham số mặc định.
import { describe, expect, it } from 'vitest'
import { DAY, DEFAULT_W, newSchedule, nextMemory, retrievability, schedule, validWeights, type Memory } from './fsrs'
import { logLoss, optimize, prepare } from './optimizer'
import { CardState, type Rating, type SrsLog } from './types'

/** Số giả ngẫu nhiên cố định để test luôn ra cùng kết quả. */
function rng(seed: number) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}

/** Người học giả: trí nhớ thật theo tham số `truth`, app xếp lịch bằng tham số mặc định. */
function simulate(truth: number[], cards: number, days: number): SrsLog[] {
  const rand = rng(42)
  const logs: SrsLog[] = []
  const T0 = Date.UTC(2026, 0, 1)
  for (let c = 0; c < cards; c++) {
    let sched = newSchedule(T0)
    let mem: Memory | null = null
    let now = T0 + (c % 30) * DAY
    while (now < T0 + days * DAY) {
      const elapsed = sched.lastReview ? (now - sched.lastReview) / DAY : 0
      let g: Rating
      if (sched.state === CardState.New) g = rand() < 0.3 ? 1 : 3
      else {
        const r = mem ? retrievability(elapsed, mem.s) : 0.5
        g = rand() < r ? 3 : 1
      }
      const kind = sched.state === CardState.New ? 'first'
        : sched.state === CardState.Learning || sched.state === CardState.Relearning || elapsed < 1 ? 'short' : 'long'
      mem = nextMemory(truth, mem, kind, g, elapsed)
      logs.push({ cardId: `c${c}`, rating: g, reviewedAt: now, stateBefore: sched.state, elapsedDays: elapsed,
        scheduledDays: 0, durationMs: 0, question: 'recognize' })
      sched = schedule(sched, g, now, { retention: 0.9, maxInterval: 3650 }, `c${c}`)
      now = Math.max(now + 60_000, sched.due)
    }
  }
  return logs
}

describe('Tối ưu FSRS', () => {
  it('chuẩn bị dữ liệu: bỏ thẻ thiếu lần học đầu, đếm lượt ôn theo ngày', () => {
    const base = { scheduledDays: 0, durationMs: 0, question: 'recognize' as const }
    const data = prepare([
      { ...base, cardId: 'a', rating: 3, reviewedAt: 1, stateBefore: CardState.New, elapsedDays: 0 },
      { ...base, cardId: 'a', rating: 3, reviewedAt: 2, stateBefore: CardState.Learning, elapsedDays: 0 },
      { ...base, cardId: 'a', rating: 1, reviewedAt: 3, stateBefore: CardState.Review, elapsedDays: 3 },
      { ...base, cardId: 'b', rating: 3, reviewedAt: 1, stateBefore: CardState.Review, elapsedDays: 5 }, // nhập từ Anki, thiếu lịch sử
    ])
    expect([...data.kind]).toEqual([0, 1, 2])
    expect(data.reviews).toBe(1)
    expect(data.cards).toBe(1)
  })

  it('học được trí nhớ tốt hơn mặc định và đoán đúng hơn', () => {
    const truth = [...DEFAULT_W]
    truth[2] = 8 // nhớ thẻ mới lâu hơn nhiều
    truth[8] = 2.0 // độ bền tăng nhanh hơn sau mỗi lần nhớ
    const data = prepare(simulate(truth, 150, 240))
    expect(data.reviews).toBeGreaterThan(300)
    const res = optimize(data, { steps: 120 })
    expect(res.lossNew).toBeLessThan(res.lossDefault)
    expect(res.weights[2]).toBeGreaterThan(DEFAULT_W[2])
    expect(validWeights(res.weights)).toBe(res.weights)
    expect(logLoss(truth, data)).toBeLessThan(res.lossDefault)
  })

  it('tham số hỏng thì quay về mặc định', () => {
    expect(validWeights([1, 2, 3])).toBe(DEFAULT_W)
    expect(validWeights(DEFAULT_W.map((w, i) => (i === 4 ? 50 : w)))).toBe(DEFAULT_W)
  })
})
