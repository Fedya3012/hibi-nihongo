// Kiểm tra tổng lịch sử ôn theo ngày có lưu sẵn (#10): kết quả phải giống hệt tính lại từ đầu,
// và bản lưu sẵn phải tự bỏ khi lịch sử cũ bị đổi.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clear, getAll, putMany, remove } from '@/core/db'
import type { SrsCard, SrsLog } from '@/modules/review/api'
import { clearLogDaysCache, emptyFold, foldLogs, loadLogDays } from './logDays'

const HOUR = 3600_000
const DAY = 24 * HOUR
const START_HOUR = 4
const today0 = new Date(2026, 5, 15).getTime() + START_HOUR * HOUR // 4 giờ sáng "hôm nay"

const card = (id: string, kind: SrsCard['kind'] = 'vocab', module?: string) =>
  ({ id, kind, deck: 'd', front: id, meaning: 'm', state: 2, due: 0, stability: 1, difficulty: 5, reps: 1, lapses: 0, created: 0,
    ...(module && { source: { module, ref: id } }) }) as unknown as SrsCard

let nextId = 1
const log = (cardId: string, at: number, extra: Partial<SrsLog> = {}): SrsLog => ({
  id: nextId++, cardId, rating: 3, reviewedAt: at, stateBefore: 2, elapsedDays: 1, scheduledDays: 2, durationMs: 5000,
  question: 'recognize', ...extra,
})

const cards = [card('a'), card('b', 'kanji'), card('k', 'vocab', 'kana'), card('g', 'grammar')]
const cardById = new Map(cards.map((c) => [c.id, c]))

/** Cách cũ: đọc hết lịch sử rồi cộng. */
async function naive() {
  const all = (await getAll<SrsLog>('srsLogs')).sort((x, y) => x.reviewedAt - y.reviewedAt)
  const f = emptyFold()
  foldLogs(f, all, cardById, START_HOUR)
  return Object.fromEntries(f.days)
}
const asObj = (m: Map<string, unknown>) => Object.fromEntries(m)

beforeEach(async () => {
  clearLogDaysCache()
  await clear('srsLogs')
  nextId = 1
  await putMany('srsLogs', [
    log('a', today0 - 10 * DAY, { stateBefore: 0, rating: 1 }),
    log('a', today0 - 10 * DAY + HOUR),
    log('b', today0 - 3 * DAY, { stateBefore: 0 }),
    log('k', today0 - 3 * DAY + 1, { stateBefore: 0, durationMs: 999_999 }),
    log('g', today0 - 1 * HOUR, { stateBefore: 0 }), // 3 giờ sáng hôm nay = vẫn tính cho hôm qua
    log('a', today0 + 2 * HOUR),
  ])
})

describe('loadLogDays', () => {
  it('giống hệt cách tính lại từ đầu', async () => {
    const days = await loadLogDays(START_HOUR, today0, cardById)
    expect(asObj(days)).toEqual(await naive())
    const d10 = days.get('2026-06-05')!
    expect(d10).toMatchObject({ cards: 2, correct: 1, newCards: 1, learned: { vocab: 1, kanji: 0, grammar: 0 } })
    // thẻ kana không tính là từ vựng; thời gian mỗi lượt tối đa 2 phút
    expect(days.get('2026-06-12')).toMatchObject({ newCards: 2, learned: { vocab: 0, kanji: 1, grammar: 0 }, reviewMs: 5000 + 120_000 })
    expect(days.get('2026-06-14')?.learned.grammar).toBe(1)
  })

  it('lần sau dùng bản lưu sẵn và cộng thêm lượt ôn mới', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    await putMany('srsLogs', [log('b', today0 + 3 * HOUR), log('a', today0 + 4 * HOUR, { rating: 1 })])
    const days = await loadLogDays(START_HOUR, today0, cardById)
    expect(asObj(days)).toEqual(await naive())
    expect(days.get('2026-06-15')).toMatchObject({ cards: 3, correct: 2 })
  })

  it('thật sự dùng bản lưu sẵn (không đọc lại lịch sử cũ)', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    // Sửa thẳng một lượt cũ mà giữ nguyên id (app không bao giờ làm vậy): bản lưu sẵn không biết, vẫn là số cũ
    await putMany('srsLogs', [{ ...log('a', today0 - 10 * DAY, { rating: 3 }), id: 1 }])
    const days = await loadLogDays(START_HOUR, today0, cardById)
    expect(days.get('2026-06-05')?.correct).toBe(1)
  })

  it('sang ngày mới: cộng tiếp từ mốc cũ', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    await putMany('srsLogs', [log('a', today0 + DAY + HOUR)])
    const days = await loadLogDays(START_HOUR, today0 + DAY, cardById)
    expect(asObj(days)).toEqual(await naive())
  })

  it('lịch sử cũ bị xóa (vd xóa thẻ): tự tính lại', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    await remove('srsLogs', 3) // lượt ôn của 'b' 3 ngày trước
    const days = await loadLogDays(START_HOUR, today0, cardById)
    expect(asObj(days)).toEqual(await naive())
    expect(days.get('2026-06-12')?.cards).toBe(1)
  })

  it('xóa một lượt cũ và thêm một lượt cũ khác (số lượng như cũ): vẫn nhận ra', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    await remove('srsLogs', 1)
    await putMany('srsLogs', [log('g', today0 - 20 * DAY)])
    const days = await loadLogDays(START_HOUR, today0, cardById)
    expect(asObj(days)).toEqual(await naive())
  })

  it('đổi giờ bắt đầu ngày: tính lại theo ranh giới mới', async () => {
    await loadLogDays(START_HOUR, today0, cardById)
    const days = await loadLogDays(2, today0 - 2 * HOUR, cardById)
    const all = (await getAll<SrsLog>('srsLogs')).sort((x, y) => x.reviewedAt - y.reviewedAt)
    const f = emptyFold()
    foldLogs(f, all, cardById, 2)
    expect(asObj(days)).toEqual(Object.fromEntries(f.days))
    expect(days.get('2026-06-15')?.learned.grammar).toBe(1) // 3 giờ sáng giờ thuộc hôm nay
  })
})
