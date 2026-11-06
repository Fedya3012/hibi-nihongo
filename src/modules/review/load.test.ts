// Kiểm tra dàn đều thẻ, ngày học nhẹ, dời thẻ khi nghỉ.
import { describe, expect, it } from 'vitest'
import { DAY, fuzzRange, newSchedule, schedule } from './fsrs'
import { DueLoad, newPerDayToday, weekdayOf } from './load'
import { spreadCards } from './vacation'
import { CardState, DEFAULT_SETTINGS, type EasyDay, type SrsCard } from './types'

const TODAY = new Date(2026, 10, 2, 4).getTime() // Thứ 2, 2/11/2026, 4 giờ sáng
const card = (id: string, dueOffset: number, state: CardState = CardState.Review): SrsCard => ({
  ...newSchedule(TODAY), state, due: TODAY + dueOffset * DAY + 3_600_000, stability: 10, difficulty: 5, reps: 3,
  id, deck: 'd', kind: 'vocab', front: id, meaning: id, createdAt: 0,
})

describe('Dàn đều thẻ', () => {
  it('khoảng rung rộng dần theo khoảng cách', () => {
    expect(fuzzRange(2, 3650)).toEqual([2, 2])
    expect(fuzzRange(10, 3650)).toEqual([8, 12])
    const [lo, hi] = fuzzRange(100, 3650)
    expect(hi - lo).toBeGreaterThanOrEqual(10)
  })

  it('chọn ngày ít thẻ nhất trong khoảng', () => {
    const cards = [...Array(20)].map((_, i) => card(`a${i}`, 10)).concat([...Array(5)].map((_, i) => card(`b${i}`, 9)))
    const load = new DueLoad(cards, TODAY)
    expect(load.count(10)).toBe(20)
    const d = load.pick(10, 8, 12)
    expect(d).not.toBe(10)
    expect([8, 11, 12]).toContain(d)
  })

  it('nhiều thẻ cùng hẹn một ngày được rải đều ra cả khoảng', () => {
    const load = new DueLoad([], TODAY)
    for (let i = 0; i < 50; i++) {
      const d = load.pick(10, 8, 12, `c${i}`)
      load.move(undefined, card(`c${i}`, d))
    }
    const counts = [8, 9, 10, 11, 12].map((d) => load.count(d))
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(3)
  })

  it('tránh ngày "Nghỉ" và giảm thẻ mới ngày "Nhẹ"', () => {
    const easy: EasyDay[] = ['minimum', 'normal', 'normal', 'normal', 'normal', 'normal', 'minimum'] // nghỉ T7, CN
    const load = new DueLoad([], TODAY, easy)
    for (let i = 0; i < 30; i++) {
      const d = load.pick(5, 3, 7, `x${i}`) // T5 → CN tuần này
      expect([0, 6]).not.toContain(weekdayOf(TODAY, d))
      load.move(undefined, card(`x${i}`, d))
    }
    const s = { ...DEFAULT_SETTINGS, newPerDay: 10, easyDays: ['normal', 'reduced', 'normal', 'normal', 'normal', 'normal', 'normal'] as EasyDay[] }
    expect(newPerDayToday(s, TODAY)).toBe(5) // hôm nay Thứ 2 = nhẹ
  })

  it('FSRS dùng ngày được chọn, nút xem trước và lúc chấm ra cùng một ngày', () => {
    const c = { ...card('z', 0), lastReview: TODAY - 10 * DAY, due: TODAY }
    const load = new DueLoad([], TODAY)
    for (let i = 0; i < 40; i++) load.move(undefined, card(`f${i}`, 25)) // dồn sẵn 40 thẻ vào ngày 25
    const opt = { retention: 0.9, maxInterval: 3650, pickDay: load.picker() }
    const a = schedule(c, 3, TODAY + 3_600_000, opt, 'z')
    const b = schedule(c, 3, TODAY + 3_600_000, opt, 'z')
    expect(a.due).toBe(b.due)
    expect(load.offsetOf(a.due)).not.toBe(25)
  })
})

describe('Chế độ nghỉ', () => {
  it('dời thẻ sang sau kỳ nghỉ, dàn đều, thẻ chờ lâu trước', () => {
    const cards = [...Array(60)].map((_, i) => card(`v${i}`, (i % 8) - 1)) // quá hạn và đến hạn trong 7 ngày nghỉ
    const moved = spreadCards(cards, [], TODAY, 8, 4)
    const days = moved.map((c) => Math.floor((c.due - TODAY) / DAY))
    expect(Math.min(...days)).toBe(8)
    expect(Math.max(...days)).toBe(11)
    const perDay = [8, 9, 10, 11].map((d) => days.filter((x) => x === d).length)
    expect(Math.max(...perDay) - Math.min(...perDay)).toBeLessThanOrEqual(3)
    // Thẻ quá hạn lâu nhất được xếp vào ngày đầu tiên
    const oldest = moved.find((c) => c.id === 'v0')!
    expect(Math.floor((oldest.due - TODAY) / DAY)).toBe(8)
  })
})
