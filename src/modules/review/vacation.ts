/**
 * CHẾ ĐỘ NGHỈ (vacation mode)
 * ---------------------------
 * Đi chơi, ốm, bận thi… vài ngày không ôn thì quay lại thường gặp cả núi thẻ quá hạn.
 * Bật chế độ nghỉ (từ hôm nay đến một ngày bạn chọn):
 *   - Thẻ đến hạn trong kỳ nghỉ (và thẻ đang quá hạn) được dời sang những ngày ngay SAU kỳ nghỉ,
 *     dàn đều trong vài ngày (thẻ đến hạn sớm hơn được xếp trước). FSRS vẫn biết bạn ôn muộn bao lâu
 *     nên tự tính lịch đúng khi ôn lại.
 *   - Trong kỳ nghỉ không mở thẻ mới.
 *   - Những ngày nghỉ không làm đứt streak (module Hôm nay đọc getVacationDays()) và không dùng lượt đóng băng.
 * Về sớm: bấm "Kết thúc nghỉ", thẻ đã dời được dàn lại bắt đầu từ hôm nay. Kết thúc ngay trong ngày bật
 * thì mọi thứ trở lại y như trước (hoàn tác).
 * Lưu ở kv "review:vacations" (có trong sao lưu).
 */
import { getAll, kvGet, kvSet, putMany } from '@/core/db'
import { DAY } from './fsrs'
import { DueLoad } from './load'
import { CardState, type SrsCard } from './types'

const KEY = 'review:vacations'

export interface Vacation {
  /** Ngày học đầu tiên và cuối cùng của kỳ nghỉ, dạng 'YYYY-MM-DD'. */
  start: string
  end: string
  /** Thẻ đã dời: hạn cũ và lần ôn gần nhất lúc dời (để hoàn tác / dàn lại khi về sớm). */
  moved?: { id: string; due: number; lastReview?: number }[]
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Ngày học (bắt đầu lúc `ts`) → 'YYYY-MM-DD'. */
export const dayKeyOf = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** 'YYYY-MM-DD' → thời điểm bắt đầu ngày học đó. */
export function dayStartOf(day: string, dayStartHour: number): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, dayStartHour).getTime()
}
/** Số ngày học từ a đến b (b sau a thì dương). Làm tròn để không lệch khi đổi giờ mùa hè. */
const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY)

export const getVacations = () => kvGet<Vacation[]>(KEY, [])
const saveVacations = (v: Vacation[]) => kvSet(KEY, v)

/** Kỳ nghỉ đang diễn ra (hôm nay nằm trong kỳ nghỉ), nếu có. */
export function activeVacation(list: Vacation[], todayKey: string): Vacation | undefined {
  return list.find((v) => v.start <= todayKey && todayKey <= v.end)
}

/** Mọi ngày đã/đang nghỉ (tới hôm nay), dạng 'YYYY-MM-DD', để giữ streak. */
export async function getVacationDays(): Promise<Set<string>> {
  const out = new Set<string>()
  for (const v of await getVacations()) {
    const d = new Date(Number(v.start.slice(0, 4)), Number(v.start.slice(5, 7)) - 1, Number(v.start.slice(8, 10)))
    for (let i = 0; i < 400; i++) {
      const k = dayKeyOf(d.getTime())
      if (k > v.end) break
      out.add(k)
      d.setDate(d.getDate() + 1)
    }
  }
  return out
}

/** Số ngày dàn thẻ sau kỳ nghỉ: khoảng nửa độ dài kỳ nghỉ, từ 3 đến 10 ngày. */
export const spreadDaysFor = (vacationDays: number) => Math.min(10, Math.max(3, Math.round(vacationDays / 2)))

/**
 * Dàn các thẻ vào những ngày [from, from + days) (số ngày kể từ hôm nay) sao cho mỗi ngày có số thẻ gần bằng nhau.
 * Thẻ đến hạn sớm hơn (đã chờ lâu hơn) được xếp vào ngày sớm hơn. Trả về các thẻ đã đổi hạn.
 */
export function spreadCards(cards: SrsCard[], others: SrsCard[], todayStart: number, from: number, days: number): SrsCard[] {
  const load = new DueLoad(others, todayStart)
  const sorted = [...cards].sort((a, b) => a.due - b.due)
  // "Đổ nước": mỗi ngày nhận số thẻ sao cho tổng (thẻ sẵn có + thẻ dời tới) gần bằng nhau
  const existing = [...Array(days)].map((_, i) => load.count(from + i))
  const target = (existing.reduce((a, b) => a + b, 0) + sorted.length) / days
  const out: SrsCard[] = []
  let i = 0
  for (let d = 0; d < days && i < sorted.length; d++) {
    const take = d === days - 1 ? sorted.length - i : Math.max(0, Math.round(target * (d + 1) - existing.slice(0, d + 1).reduce((a, b) => a + b, 0)) - i)
    for (let k = 0; k < take && i < sorted.length; k++) out.push({ ...sorted[i++], due: todayStart + (from + d) * DAY })
  }
  return out
}

/**
 * Bật chế độ nghỉ từ hôm nay đến hết ngày `endKey`. Trả về số thẻ đã dời.
 * `todayStart` là lúc bắt đầu ngày học hôm nay (startOfStudyDay trong store.ts).
 */
export async function startVacation(endKey: string, todayStart: number, dayStartHour: number): Promise<number> {
  const todayKey = dayKeyOf(todayStart)
  if (endKey < todayKey) throw new Error('Ngày kết thúc phải từ hôm nay trở đi.')
  const list = await getVacations()
  if (activeVacation(list, todayKey)) throw new Error('Đang trong kỳ nghỉ rồi.')
  const returnOffset = daysBetween(todayStart, dayStartOf(endKey, dayStartHour)) + 1
  const returnStart = todayStart + returnOffset * DAY
  const cards = await getAll<SrsCard>('srsCards')
  const toMove = cards.filter((c) => !c.suspended && c.state !== CardState.New && c.due < returnStart)
  const others = cards.filter((c) => !toMove.includes(c))
  const moved = spreadCards(toMove, others, todayStart, returnOffset, spreadDaysFor(returnOffset))
  if (moved.length) await putMany('srsCards', moved)
  await saveVacations([
    ...list.map(({ start, end }) => ({ start, end })), // kỳ nghỉ cũ không cần giữ danh sách thẻ đã dời
    { start: todayKey, end: endKey, moved: toMove.map((c) => ({ id: c.id, due: c.due, lastReview: c.lastReview })) },
  ])
  return moved.length
}

/**
 * Kết thúc kỳ nghỉ đang diễn ra.
 *  - Kết thúc ngay trong ngày bật: hoàn tác, thẻ chưa ôn trở lại hạn cũ, kỳ nghỉ bị xóa.
 *  - Về sớm: kỳ nghỉ kết thúc hôm qua; thẻ đã dời mà chưa ôn được dàn lại bắt đầu từ hôm nay.
 * Trả về số thẻ được đổi hạn.
 */
export async function endVacation(todayStart: number): Promise<number> {
  const todayKey = dayKeyOf(todayStart)
  const list = await getVacations()
  const v = activeVacation(list, todayKey)
  if (!v) return 0
  const cards = await getAll<SrsCard>('srsCards')
  const byId = new Map(cards.map((c) => [c.id, c]))
  // Thẻ đã dời mà chưa được ôn lại kể từ lúc dời
  const untouched = (v.moved ?? []).filter((m) => {
    const c = byId.get(m.id)
    return c && c.lastReview === m.lastReview
  })
  let changed: SrsCard[]
  let rest: Vacation[]
  if (v.start === todayKey) {
    changed = untouched.map((m) => ({ ...byId.get(m.id)!, due: m.due }))
    rest = list.filter((x) => x !== v)
  } else {
    const ids = new Set(untouched.map((m) => m.id))
    const mine = cards.filter((c) => ids.has(c.id))
    const days = spreadDaysFor(daysBetween(dayStartOf(v.start, new Date(todayStart).getHours()), todayStart))
    changed = spreadCards(mine, cards.filter((c) => !ids.has(c.id)), todayStart, 0, days)
    const yesterday = dayKeyOf(todayStart - DAY)
    rest = list.map((x) => (x === v ? { start: x.start, end: yesterday } : x))
  }
  if (changed.length) await putMany('srsCards', changed)
  await saveVacations(rest)
  return changed.length
}
