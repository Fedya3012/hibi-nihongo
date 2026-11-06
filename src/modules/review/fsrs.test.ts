// Kiểm tra lịch ôn FSRS: thẻ mới, bước học, quên, và thứ tự khoảng cách Khó ≤ Được < Dễ.
import { describe, expect, it } from 'vitest'
import { DAY, newSchedule, retrievability, schedule, formatInterval } from './fsrs'
import { CardState, type Rating, type Schedule } from './types'

const OPT = { retention: 0.9, maxInterval: 3650 }
const T0 = Date.UTC(2026, 0, 1, 12)
const MIN = 60_000

/** Ôn liên tiếp, mỗi lần đúng hạn. */
function run(ratings: Rating[]): Schedule {
  let s = newSchedule(T0)
  let now = T0
  for (const g of ratings) {
    now = Math.max(now, s.due)
    s = schedule(s, g, now, OPT, 'card-1')
  }
  return s
}

describe('FSRS', () => {
  it('thẻ mới: Quên/Khó/Được vào bước học theo phút, Dễ tốt nghiệp luôn', () => {
    const s = newSchedule(T0)
    expect(schedule(s, 1, T0, OPT)).toMatchObject({ state: CardState.Learning, due: T0 + 1 * MIN })
    expect(schedule(s, 2, T0, OPT)).toMatchObject({ state: CardState.Learning, due: T0 + 6 * MIN })
    expect(schedule(s, 3, T0, OPT)).toMatchObject({ state: CardState.Learning, due: T0 + 10 * MIN })
    const easy = schedule(s, 4, T0, OPT)
    expect(easy.state).toBe(CardState.Review)
    expect(easy.due - T0).toBeGreaterThanOrEqual(DAY)
  })

  it('độ bền ban đầu tăng dần theo nút bấm', () => {
    const s = newSchedule(T0)
    const st = ([1, 2, 3, 4] as Rating[]).map((g) => schedule(s, g, T0, OPT).stability)
    expect(st).toEqual([...st].sort((a, b) => a - b))
  })

  it('học xong (Được hai lần) thì sang ôn theo ngày, khoảng cách lớn dần khi nhớ', () => {
    const a = run([3, 3])
    expect(a.state).toBe(CardState.Review)
    const b = run([3, 3, 3])
    const c = run([3, 3, 3, 3])
    const gap = (s: Schedule) => s.due - s.lastReview!
    expect(gap(b)).toBeGreaterThan(gap(a))
    expect(gap(c)).toBeGreaterThan(gap(b))
  })

  it('thẻ đã thuộc: Khó ≤ Được < Dễ', () => {
    const s = run([3, 3, 3])
    const now = s.due
    const [h, g, e] = ([2, 3, 4] as Rating[]).map((r) => schedule(s, r, now, OPT, 'x').due - now)
    expect(h).toBeLessThanOrEqual(g)
    expect(g).toBeLessThan(e)
  })

  it('quên thẻ đã thuộc: tăng số lần quên, vào học lại, độ bền giảm', () => {
    const s = run([3, 3, 3])
    const f = schedule(s, 1, s.due, OPT)
    expect(f.state).toBe(CardState.Relearning)
    expect(f.lapses).toBe(s.lapses + 1)
    expect(f.stability).toBeLessThan(s.stability)
    expect(f.due).toBe(s.due + 10 * MIN)
  })

  it('không vượt quá khoảng cách tối đa', () => {
    let s = run([4])
    for (let i = 0; i < 30; i++) s = schedule(s, 4, s.due, { retention: 0.9, maxInterval: 30 }, 'm')
    expect(s.due - s.lastReview!).toBeLessThanOrEqual(30 * DAY)
  })

  it('hàm thuần: cùng đầu vào cho cùng kết quả, không sửa thẻ cũ', () => {
    const s = run([3, 3])
    const copy = { ...s }
    expect(schedule(s, 3, s.due, OPT, 'k')).toEqual(schedule(s, 3, s.due, OPT, 'k'))
    expect(s).toEqual(copy)
  })

  it('khả năng nhớ sau S ngày là 90%', () => {
    expect(retrievability(0, 5)).toBeCloseTo(1)
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 2)
    expect(retrievability(50, 5)).toBeLessThan(0.9)
  })

  it('chữ khoảng thời gian dễ đọc', () => {
    expect(formatInterval(10 * MIN)).toBe('10 phút')
    expect(formatInterval(3 * DAY)).toBe('3 ngày')
  })
})
