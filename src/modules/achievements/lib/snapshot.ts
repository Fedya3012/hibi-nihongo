/**
 * ẢNH CHỤP SỐ LIỆU HỌC (để tính XP, cấp độ và huy hiệu)
 * ---------------------------------------------------
 * Mọi thứ ở module này được TÍNH LẠI từ dữ liệu học đã có, không cộng dồn riêng. Nhờ vậy:
 *   - học từ trước khi có tính năng này vẫn được tính (huy hiệu "đuổi kịp" ngay lần đầu mở),
 *   - khôi phục file sao lưu là cấp độ và huy hiệu đúng theo dữ liệu trong file,
 *   - không có cách nào "cày" XP sai lệch so với việc học thật.
 *
 * Nguồn (chỉ đọc): thống kê của module Hôm nay (giờ học, streak, thẻ ôn, đã học),
 * bảng knownWords (kho từ đã biết), mangaChapters / animeEpisodes (đã đọc / xem xong),
 * textbookLessons (bài đã xong), kv "exam:history" (đề thi thử).
 */
import { getAll } from '@/core/db'
import { getStudyStats, CATEGORIES } from '@/modules/today/api'
import { addDays } from '@/modules/today/lib/days'
import type { KnownWord } from '@/modules/vocab/api'
import { getHistory as getExamHistory } from '@/modules/exam/lib/store'

export interface Snapshot {
  /** Streak dài nhất từ trước tới nay (để huy hiệu không mất khi đứt streak). */
  streakBest: number
  streakCurrent: number
  activeDays: number
  minutes: number
  reviews: number
  vocab: number
  kanji: number
  grammar: number
  kana: number
  goalDays: number
  /** Số ngày đạt mục tiêu liên tiếp dài nhất. */
  goalRun: number
  /** Ngày học lâu nhất (phút). */
  bestDayMin: number
  /** Số ngày ôn ≥ 30 thẻ mà không quên thẻ nào. */
  perfectDays: number
  /** Số phiên học bắt đầu trong khoảng 23:00–03:59 / 05:00–06:59. */
  nightSessions: number
  morningSessions: number
  /** Số loại hoạt động (Ôn tập, Manga, Anime, Kana, Kanji, Ngữ pháp) đã học ít nhất 10 phút. */
  categories: number
  knownWords: number
  mangaDone: number
  animeDone: number
  lessonsDone: number
  examsTaken: number
  examsPassed: number
  /** Cấp cao nhất đã đỗ đề thi thử: 0 = chưa đỗ, 1 = N5, 2 = N4 … 5 = N1. */
  examBest: number
}

interface Finished { finishedAt?: number }
interface LessonRow { status?: string }

export async function getSnapshot(): Promise<Snapshot> {
  const [stats, known, chapters, episodes, lessons, exams] = await Promise.all([
    getStudyStats(),
    getAll<KnownWord>('knownWords').catch(() => [] as KnownWord[]),
    getAll<Finished>('mangaChapters').catch(() => [] as Finished[]),
    getAll<Finished>('animeEpisodes').catch(() => [] as Finished[]),
    getAll<LessonRow>('textbookLessons').catch(() => [] as LessonRow[]),
    getExamHistory().catch(() => []),
  ])

  const days = [...stats.days.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
  let goalDays = 0
  let goalRun = 0
  let run = 0
  let prev: string | null = null
  let bestDayMin = 0
  let perfectDays = 0
  let nightSessions = 0
  let morningSessions = 0
  const catSeconds: Record<string, number> = {}
  for (const d of days) {
    if (d.goalMet) {
      goalDays++
      // Liên tiếp = ngày hôm trước cũng đạt (ngày đóng băng không làm đứt chuỗi, cũng không cộng)
      run = prev && isNextDay(prev, d.day) ? run + 1 : 1
      goalRun = Math.max(goalRun, run)
      prev = d.day
    } else if (d.frozen && prev && isNextDay(prev, d.day)) {
      prev = d.day
    }
    bestDayMin = Math.max(bestDayMin, d.totalMin)
    if (d.cards >= 30 && d.correct === d.cards) perfectDays++
    for (const c of CATEGORIES) catSeconds[c] = (catSeconds[c] ?? 0) + d.seconds[c]
    for (const s of d.sessions) {
      const h = new Date(s.s).getHours()
      if (h >= 23 || h < 4) nightSessions++
      else if (h >= 5 && h < 7) morningSessions++
    }
  }
  const categories = CATEGORIES.filter((c) => c !== 'other' && (catSeconds[c] ?? 0) >= 600).length

  const passed = exams.filter((e) => e.passed)
  return {
    streakBest: stats.streak.best,
    streakCurrent: stats.streak.current,
    activeDays: stats.totals.activeDays,
    minutes: stats.totals.minutes,
    reviews: stats.totals.cards,
    vocab: stats.learnedTotal.vocab,
    kanji: stats.learnedTotal.kanji,
    grammar: stats.learnedTotal.grammar,
    kana: stats.learnedTotal.kana,
    goalDays, goalRun, bestDayMin, perfectDays, nightSessions, morningSessions, categories,
    knownWords: known.filter((w) => w.status === 'known').length,
    mangaDone: chapters.filter((c) => c.finishedAt).length,
    animeDone: episodes.filter((e) => e.finishedAt).length,
    lessonsDone: lessons.filter((l) => l.status === 'done').length,
    examsTaken: exams.length,
    examsPassed: passed.length,
    examBest: passed.reduce((m, e) => Math.max(m, 6 - e.level), 0),
  }
}

/** b có phải ngày ngay sau a không (khóa ngày dạng YYYY-MM-DD). */
const isNextDay = (a: string, b: string) => addDays(a, 1) === b

export { SNAPSHOT_STORES } from './stores'
