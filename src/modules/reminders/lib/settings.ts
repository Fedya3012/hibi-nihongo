/**
 * CÀI ĐẶT NHẮC HỌC (lưu trong kho kv, khóa "reminders:settings", có trong file sao lưu)
 * và NHẬT KÝ ĐÃ NHẮC (khóa "reminders:sent": hôm nay đã nhắc những giờ nào, để không nhắc 2 lần).
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'

export interface ReminderSettings {
  /** Bật/tắt toàn bộ nhắc học. */
  enabled: boolean
  /** Các giờ nhắc trong ngày, dạng 'HH:MM' (giờ máy), đã sắp xếp. */
  times: string[]
  /** Ngày trong tuần được nhắc: 0 = Chủ nhật, 1 = Thứ hai … 6 = Thứ bảy. */
  days: number[]
  /** Ghi số thẻ đến hạn trong thông báo. */
  showDue: boolean
  /** Nhắc giữ chuỗi ngày học (streak) khi hôm nay chưa học. */
  showStreak: boolean
  /** Không nhắc nữa nếu hôm nay đã đạt mục tiêu ngày. */
  skipIfDone: boolean
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  times: ['20:00'],
  days: [0, 1, 2, 3, 4, 5, 6],
  showDue: true,
  showStreak: true,
  skipIfDone: true,
}

export const MAX_TIMES = 5

const KEY = 'reminders:settings'
const SENT_KEY = 'reminders:sent'

export async function getReminderSettings(): Promise<ReminderSettings> {
  return { ...DEFAULT_REMINDER_SETTINGS, ...(await kvGet<Partial<ReminderSettings>>(KEY, {})) }
}

export async function saveReminderSettings(patch: Partial<ReminderSettings>) {
  const next = { ...(await getReminderSettings()), ...patch }
  next.times = [...new Set(next.times.filter(isTime))].sort()
  // Giờ vừa thêm mà đã qua trong hôm nay thì coi như đã nhắc (không bật thông báo ngay lúc lưu)
  await markSent(next.times.filter((t) => slotAt(t) <= Date.now()))
  await kvSet(KEY, next)
}

export function useReminderSettings(): ReminderSettings | undefined {
  return useDbQuery(() => getReminderSettings(), [], ['kv']).data
}

// ---------- Giờ nhắc ----------

export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

/** 'HH:MM' → thời điểm (ms) của giờ đó trong ngày `base` (mặc định hôm nay, giờ máy). */
export function slotAt(t: string, base = new Date()): number {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Ngày theo lịch (giờ máy), dạng 'YYYY-MM-DD'. Giờ nhắc theo lịch thật, không theo "ngày học". */
export const calendarDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Lần nhắc kế tiếp (ms), hoặc null nếu chưa bật / chưa có giờ nào. Xét tối đa 7 ngày tới. */
export function nextReminder(s: ReminderSettings, now = Date.now()): number | null {
  if (!s.enabled || !s.times.length || !s.days.length) return null
  for (let i = 0; i < 8; i++) {
    const base = new Date(now)
    base.setDate(base.getDate() + i)
    if (!s.days.includes(base.getDay())) continue
    for (const t of s.times) {
      const at = slotAt(t, base)
      if (at > now) return at
    }
  }
  return null
}

// ---------- Nhật ký đã nhắc trong hôm nay ----------

interface SentLog { day: string; times: string[] }

export async function getSentToday(): Promise<string[]> {
  const log = await kvGet<SentLog>(SENT_KEY, { day: '', times: [] })
  return log.day === calendarDay() ? log.times : []
}

export async function markSent(times: string[]) {
  if (!times.length) return
  const prev = await getSentToday()
  const merged = [...new Set([...prev, ...times])].sort()
  if (merged.length === prev.length) return // không đổi thì không ghi (tránh báo "kv đổi" vô ích)
  await kvSet<SentLog>(SENT_KEY, { day: calendarDay(), times: merged })
}
