/**
 * NGÀY HỌC
 * --------
 * "Ngày học" bắt đầu lúc dayStartHour giờ sáng (mặc định 4h, chỉnh trong Ôn tập → Cài đặt),
 * để học tới 1–2 giờ đêm vẫn tính cho hôm trước. Ngày được ghi dạng chữ 'YYYY-MM-DD'.
 */
import { kvGet } from '@/core/db'

export const HOUR = 3600_000
export const DAY_MS = 24 * HOUR

let cachedStartHour = 4
let cachedAt = 0

/** Giờ bắt đầu ngày mới, đọc từ cài đặt của module Ôn tập (khóa kv "review:settings"). */
export async function getDayStartHour(): Promise<number> {
  if (Date.now() - cachedAt < 60_000) return cachedStartHour
  const s = await kvGet<{ dayStartHour?: number }>('review:settings', {})
  cachedStartHour = typeof s.dayStartHour === 'number' ? s.dayStartHour : 4
  cachedAt = Date.now()
  return cachedStartHour
}

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Thời điểm → ngày học. */
export function dayKey(ts: number, startHour: number): string {
  return fmtDay(new Date(ts - startHour * HOUR))
}

/** 'YYYY-MM-DD' → Date (0 giờ, giờ máy). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Cộng/trừ số ngày. Dùng setDate nên không lệch khi đổi giờ mùa hè. */
export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return fmtDay(d)
}

/** Số ngày từ a đến b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY_MS)
}

/** Danh sách ngày liên tiếp từ from đến to (gồm cả hai đầu). */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** Thứ Hai đầu tuần chứa ngày này. */
export function weekStart(day: string): string {
  const wd = (parseDay(day).getDay() + 6) % 7 // 0 = thứ Hai
  return addDays(day, -wd)
}

export const monthOf = (day: string) => day.slice(0, 7) // 'YYYY-MM'

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const weekdayShort = (day: string) => WEEKDAY[parseDay(day).getDay()]

/** "Thứ Ba, 4/11/2026" */
export function fmtDayLong(day: string): string {
  const d = parseDay(day)
  const wd = d.getDay() === 0 ? 'Chủ nhật' : `Thứ ${['', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'][d.getDay()]}`
  return `${wd}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

/** "4/11" */
export const fmtDayShort = (day: string) => {
  const d = parseDay(day)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/** Số phút → "1 giờ 25 phút" / "25 phút". */
export function fmtMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} giờ ${r} phút` : `${h} giờ`
}

/** Giờ:phút từ thời điểm. */
export const fmtClock = (ts: number) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
