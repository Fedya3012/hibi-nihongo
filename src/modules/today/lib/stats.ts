/**
 * THỐNG KÊ HỌC TẬP: gộp mọi nguồn dữ liệu thành số liệu theo ngày.
 * --------------------------------------------------------------
 * Nguồn:
 *   - studyDays (đồng hồ đếm giờ học của module này)
 *   - srsLogs, srsCards (module Ôn tập): số thẻ ôn, thẻ mới, từ/kanji/ngữ pháp đã học
 *   - kv "kana:progress", "kanji:progress": số kana đã thuộc, kanji đã viết
 *
 * Thời gian Ôn tập của những ngày TRƯỚC khi có đồng hồ được ước tính từ thời gian suy nghĩ
 * ghi trong lịch sử ôn (durationMs), nên streak và heatmap có cả dữ liệu cũ.
 * Tổng lịch sử ôn của các ngày đã qua được lưu sẵn (logDays.ts), nên mở trang không phải đọc lại cả lịch sử.
 */
import { getAll, kvGet, useDbQuery } from '@/core/db'
import type { SrsCard } from '@/modules/review/api'
import { getProgress as getKanaProgress, levelOf } from '@/modules/kana/progress'
import type { KanjiProgress } from '@/modules/kanji/lib/progress'
import { CATEGORIES, type Category } from './categories'
import { addDays, dayKey, getDayStartHour, HOUR, monthOf, parseDay } from './days'
import { loadLogDays, type LearnedCounts } from './logDays'
import { allStudyDays, getFreezes, getTodaySettings, saveFreezes, type StudySession, type TodaySettings } from './store'

export type { LearnedCounts }

export interface DaySummary {
  day: string
  /** Số giây học theo nhóm (đã gồm ước tính Ôn tập từ lịch sử). */
  seconds: Record<Category, number>
  totalMin: number
  /** Số lượt ôn thẻ, số thẻ mới học, số lượt nhớ đúng (không bấm Quên). */
  cards: number
  newCards: number
  correct: number
  /** Thẻ học lần đầu trong ngày, theo loại. */
  learned: LearnedCounts
  sessions: StudySession[]
  active: boolean
  goalMet: boolean
  frozen: boolean
}

export interface StreakInfo {
  current: number
  best: number
  todayDone: boolean
  freezesLeft: number
  /** Ngày đã dùng đóng băng (để hiện ❄ trên lịch). */
  frozenDays: Set<string>
}

export interface StudyStats {
  today: string
  startHour: number
  settings: TodaySettings
  /** Chỉ chứa những ngày có học hoặc có đóng băng. */
  days: Map<string, DaySummary>
  firstDay: string | null
  streak: StreakInfo
  totals: { minutes: number; cards: number; activeDays: number }
  /** Tổng đã học tới hôm nay. kana: số chữ đã thuộc; kanji: thẻ kanji đã học hoặc chữ đã luyện viết. */
  learnedTotal: LearnedCounts & { kana: number }
}

const emptySeconds = (): Record<Category, number> =>
  Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>

const emptyDay = (day: string): DaySummary => ({
  day, seconds: emptySeconds(), totalMin: 0, cards: 0, newCards: 0, correct: 0,
  learned: { vocab: 0, kanji: 0, grammar: 0 }, sessions: [], active: false, goalMet: false, frozen: false,
})

/** Thẻ kana (do module Kana tạo) không tính là "từ vựng". */
const isKanaCard = (c: SrsCard) => c.source?.module === 'kana'

export function isGoalMet(d: Pick<DaySummary, 'totalMin' | 'cards'>, s: TodaySettings) {
  return s.goalType === 'minutes' ? d.totalMin >= s.goalMinutes : d.cards >= s.goalCards
}

export async function getStudyStats(now = Date.now()): Promise<StudyStats> {
  const [startHour, settings, studyDays, cards, freezes, kana, kanjiProg] = await Promise.all([
    getDayStartHour(), getTodaySettings(), allStudyDays(), getAll<SrsCard>('srsCards'),
    getFreezes(), getKanaProgress(), kvGet<KanjiProgress>('kanji:progress', {}),
  ])
  const today = dayKey(now, startHour)
  const cardById = new Map(cards.map((c) => [c.id, c]))
  const logDays = await loadLogDays(startHour, parseDay(today).getTime() + startHour * HOUR, cardById)
  const days = new Map<string, DaySummary>()
  const dayOf = (d: string) => {
    let x = days.get(d)
    if (!x) { x = emptyDay(d); days.set(d, x) }
    return x
  }

  // 1. Giờ học do đồng hồ ghi
  for (const row of studyDays) {
    const d = dayOf(row.day)
    for (const c of CATEGORIES) d.seconds[c] += row.seconds[c] ?? 0
    d.sessions = row.sessions
  }

  // 2. Lịch sử ôn thẻ (tổng theo ngày)
  for (const [key, l] of logDays) {
    const d = dayOf(key)
    d.cards += l.cards
    d.correct += l.correct
    d.newCards += l.newCards
    d.learned.vocab += l.learned.vocab
    d.learned.kanji += l.learned.kanji
    d.learned.grammar += l.learned.grammar
    d.seconds.review = Math.max(d.seconds.review, l.reviewMs / 1000)
  }

  // 3. Tổng hợp từng ngày
  const frozenDays = new Set(freezes)
  for (const f of freezes) dayOf(f).frozen = true
  let totalSec = 0
  let totalCards = 0
  let activeDays = 0
  for (const d of days.values()) {
    const sec = CATEGORIES.reduce((s, c) => s + d.seconds[c], 0)
    d.totalMin = sec / 60
    d.goalMet = isGoalMet(d, settings)
    d.active = settings.streakRule === 'goal' ? d.goalMet : d.totalMin >= 1 || d.cards >= 1
    totalSec += sec
    totalCards += d.cards
    if (d.active) activeDays++
  }

  const sortedDays = [...days.keys()].sort()
  const firstDay = sortedDays[0] ?? null
  const streak = computeStreak(days, today, firstDay, settings, frozenDays)

  // 4. Tổng đã học
  const learnedTotal = { vocab: 0, kanji: 0, grammar: 0, kana: 0 }
  const kanjiChars = new Set<string>()
  for (const c of cards) {
    if (c.suspended || c.state === 0) continue
    if (isKanaCard(c)) continue
    if (c.kind === 'kanji') kanjiChars.add(c.front)
    else learnedTotal[c.kind]++
  }
  for (const [ch, s] of Object.entries(kanjiProg)) if ((s.w ?? 0) > 0) kanjiChars.add(ch)
  learnedTotal.kanji = kanjiChars.size
  learnedTotal.kana = Object.values(kana).filter((s) => levelOf(s) === 'known').length

  return {
    today, startHour, settings, days, firstDay, streak,
    totals: { minutes: totalSec / 60, cards: totalCards, activeDays },
    learnedTotal,
  }
}

function computeStreak(
  days: Map<string, DaySummary>, today: string, firstDay: string | null,
  settings: TodaySettings, frozenDays: Set<string>,
): StreakInfo {
  const active = (d: string) => days.get(d)?.active ?? false
  const todayDone = active(today)
  // Streak hiện tại: đếm lùi từ hôm qua (hôm nay chưa học thì streak vẫn còn, chỉ chưa cộng)
  let current = todayDone ? 1 : 0
  if (firstDay) {
    for (let d = addDays(today, -1); d >= firstDay; d = addDays(d, -1)) {
      if (active(d)) current++
      else if (!frozenDays.has(d)) break
    }
  }
  // Streak dài nhất
  let best = 0
  let run = 0
  if (firstDay) {
    for (let d = firstDay; d <= today; d = addDays(d, 1)) {
      if (active(d)) best = Math.max(best, ++run)
      else if (!frozenDays.has(d)) run = 0
    }
  }
  const thisMonth = monthOf(today)
  const used = [...frozenDays].filter((d) => monthOf(d) === thisMonth).length
  return { current, best, todayDone, freezesLeft: Math.max(0, settings.freezesPerMonth - used), frozenDays }
}

/**
 * TỰ ĐỘNG ĐÓNG BĂNG STREAK
 * Xét lùi từ hôm qua: mỗi quãng nghỉ (những ngày không học, nằm giữa hai ngày có học) được đóng băng
 * nếu tháng chứa những ngày đó còn đủ lượt. Gặp quãng nghỉ dài hơn số lượt còn lại thì dừng:
 * streak đã đứt ở đó, không dùng lượt (để dành cho lần sau).
 * Quãng nghỉ ngay trước hôm nay cũng được đóng băng khi bạn mở app (hôm nay chưa học vẫn giữ streak).
 * Chỉ xét 62 ngày gần nhất. Trả về số ngày vừa được đóng băng.
 */
export async function autoFreeze(now = Date.now()): Promise<number> {
  const { days, today, settings, streak, firstDay } = await getStudyStats(now)
  if (settings.freezesPerMonth <= 0 || !firstDay) return 0
  const active = (d: string) => days.get(d)?.active ?? false
  const usedByMonth = new Map<string, number>()
  for (const d of streak.frozenDays) usedByMonth.set(monthOf(d), (usedByMonth.get(monthOf(d)) ?? 0) + 1)
  const toFreeze: string[] = []
  const limit = addDays(today, -62) > firstDay ? addDays(today, -62) : firstDay
  // Quãng nghỉ đang xét; ngày gần hôm nay nhất đứng đầu
  let gap: string[] = []
  const tryCover = (): boolean => {
    const need = new Map<string, number>()
    for (const d of gap) need.set(monthOf(d), (need.get(monthOf(d)) ?? 0) + 1)
    for (const [m, n] of need) if ((usedByMonth.get(m) ?? 0) + n > settings.freezesPerMonth) return false
    for (const [m, n] of need) usedByMonth.set(m, (usedByMonth.get(m) ?? 0) + n)
    toFreeze.push(...gap)
    gap = []
    return true
  }
  for (let d = addDays(today, -1); d >= limit; d = addDays(d, -1)) {
    if (active(d)) {
      if (gap.length && !tryCover()) break
    } else if (!streak.frozenDays.has(d)) {
      gap.push(d)
    }
  }
  if (!toFreeze.length) return 0
  await saveFreezes([...streak.frozenDays, ...toFreeze])
  return toFreeze.length
}

/** Hook React: thống kê đầy đủ, tự cập nhật khi học thêm. */
export function useStudyStats(): StudyStats | undefined {
  return useDbQuery(() => getStudyStats(), [], ['studyDays', 'srsLogs', 'srsCards', 'kv']).data
}
