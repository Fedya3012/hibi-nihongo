/**
 * LƯU DỮ LIỆU CỦA MODULE HÔM NAY & TIẾN ĐỘ
 * ----------------------------------------
 * - Bảng studyDays (có sao lưu): mỗi ngày học một dòng, gồm số giây học theo từng nhóm
 *   và các "phiên học" (khoảng thời gian học liền mạch).
 * - kv "today:settings": mục tiêu ngày, cách tính streak, số lần đóng băng mỗi tháng.
 * - kv "today:freezes": danh sách ngày đã dùng đóng băng streak.
 * - kv "today:layout": thứ tự và ẩn/hiện các khối (widget) trên màn hình Hôm nay.
 */
import { getAll, kvGet, kvSet, transaction, promisify } from '@/core/db'
import type { Category } from './categories'

/** Một phiên học: s/e là thời điểm bắt đầu/kết thúc (Date.now()), c là nhóm. */
export interface StudySession { s: number; e: number; c: Category }

export interface StudyDay {
  day: string // 'YYYY-MM-DD'
  seconds: Partial<Record<Category, number>>
  sessions: StudySession[]
  updatedAt: number
}

/** Hai đoạn học cùng nhóm cách nhau dưới 3 phút được gộp làm một phiên. */
const MERGE_GAP = 3 * 60_000

export interface TimeChunk { day: string; c: Category; s: number; e: number; secs: number }

/** Cộng thời gian học vào bảng studyDays (nhiều đoạn cùng lúc, một giao dịch). */
export async function addStudyTime(chunks: TimeChunk[]) {
  const list = chunks.filter((x) => x.secs > 0)
  if (!list.length) return
  await transaction('studyDays', 'readwrite', async (tx) => {
    const store = tx.objectStore('studyDays')
    const byDay = new Map<string, TimeChunk[]>()
    for (const ch of list) byDay.set(ch.day, [...(byDay.get(ch.day) ?? []), ch])
    for (const [day, items] of byDay) {
      const row: StudyDay = (await promisify<StudyDay | undefined>(store.get(day)))
        ?? { day, seconds: {}, sessions: [], updatedAt: 0 }
      for (const ch of items) {
        row.seconds[ch.c] = Math.round((row.seconds[ch.c] ?? 0) + ch.secs)
        const last = row.sessions[row.sessions.length - 1]
        if (last && last.c === ch.c && ch.s - last.e < MERGE_GAP) last.e = Math.max(last.e, ch.e)
        else row.sessions.push({ s: ch.s, e: ch.e, c: ch.c })
      }
      row.updatedAt = Date.now()
      store.put(row)
    }
  })
}

export const allStudyDays = () => getAll<StudyDay>('studyDays')

// ---------- Cài đặt ----------

export type GoalType = 'minutes' | 'cards'
/** 'any' = có học (≥ 1 phút hoặc ≥ 1 thẻ) là giữ streak · 'goal' = phải đạt mục tiêu ngày. */
export type StreakRule = 'any' | 'goal'

export interface TodaySettings {
  goalType: GoalType
  goalMinutes: number
  goalCards: number
  streakRule: StreakRule
  /** Số lần đóng băng streak mỗi tháng (0–2). */
  freezesPerMonth: number
}

export const DEFAULT_TODAY_SETTINGS: TodaySettings = {
  goalType: 'minutes',
  goalMinutes: 15,
  goalCards: 30,
  streakRule: 'any',
  freezesPerMonth: 2,
}

const SETTINGS_KEY = 'today:settings'
export async function getTodaySettings(): Promise<TodaySettings> {
  return { ...DEFAULT_TODAY_SETTINGS, ...(await kvGet<Partial<TodaySettings>>(SETTINGS_KEY, {})) }
}
export async function saveTodaySettings(patch: Partial<TodaySettings>) {
  await kvSet(SETTINGS_KEY, { ...(await getTodaySettings()), ...patch })
}

const FREEZES_KEY = 'today:freezes'
export const getFreezes = () => kvGet<string[]>(FREEZES_KEY, [])
export const saveFreezes = (days: string[]) => kvSet(FREEZES_KEY, [...new Set(days)].sort())

// ---------- Bố cục màn hình Hôm nay ----------

export interface TodayLayout { order: string[]; hidden: string[] }
const LAYOUT_KEY = 'today:layout'
export const getLayout = () => kvGet<TodayLayout | null>(LAYOUT_KEY, null)
export const saveLayout = (l: TodayLayout) => kvSet(LAYOUT_KEY, l)
