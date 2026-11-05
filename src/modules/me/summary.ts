/**
 * TÓM TẮT NGÀY / TUẦN / THÁNG và xuất ra Markdown (để dán vào Notion, Obsidian, Discord...).
 */
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/modules/today/lib/categories'
import {
  addDays, dayRange, fmtClock, fmtDayLong, fmtDayShort, fmtMinutes, parseDay, weekStart,
} from '@/modules/today/lib/days'
import type { DaySummary, LearnedCounts, StudyStats } from '@/modules/today/lib/stats'

export type PeriodKind = 'day' | 'week' | 'month'

export interface PeriodSummary {
  kind: PeriodKind
  from: string
  to: string
  title: string
  /** Số ngày đã qua trong khoảng (không tính ngày tương lai). */
  elapsedDays: number
  days: DaySummary[] // chỉ ngày có dữ liệu, tăng dần
  totalMin: number
  activeDays: number
  goalDays: number
  frozenDays: number
  cards: number
  correct: number
  newCards: number
  learned: LearnedCounts
  byCat: Record<Category, number> // phút
  bestDay?: DaySummary
  prevTotalMin: number
}

/** Khoảng thời gian chứa ngày `anchor`. */
export function periodRange(kind: PeriodKind, anchor: string): { from: string; to: string } {
  if (kind === 'day') return { from: anchor, to: anchor }
  if (kind === 'week') {
    const from = weekStart(anchor)
    return { from, to: addDays(from, 6) }
  }
  const d = parseDay(anchor)
  const from = `${anchor.slice(0, 7)}-01`
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return { from, to: `${anchor.slice(0, 7)}-${String(last).padStart(2, '0')}` }
}

/** Dời khoảng thời gian tới/lùi một bước. */
export function shiftAnchor(kind: PeriodKind, anchor: string, step: number): string {
  if (kind === 'day') return addDays(anchor, step)
  if (kind === 'week') return addDays(anchor, 7 * step)
  const d = parseDay(anchor)
  const m = new Date(d.getFullYear(), d.getMonth() + step, 1)
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`
}

function titleOf(kind: PeriodKind, from: string, to: string): string {
  if (kind === 'day') return fmtDayLong(from)
  if (kind === 'week') return `Tuần ${fmtDayShort(from)} – ${fmtDayShort(to)}/${to.slice(0, 4)}`
  const d = parseDay(from)
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
}

function sumRange(stats: StudyStats, from: string, to: string) {
  let min = 0
  for (const d of dayRange(from, to)) min += stats.days.get(d)?.totalMin ?? 0
  return min
}

export function summarize(stats: StudyStats, kind: PeriodKind, anchor: string): PeriodSummary {
  const { from, to } = periodRange(kind, anchor)
  const end = to < stats.today ? to : stats.today
  const range = from <= end ? dayRange(from, end) : []
  const days = range.map((d) => stats.days.get(d)).filter((d): d is DaySummary => !!d)
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
  const learned = { vocab: 0, kanji: 0, grammar: 0 }
  let totalMin = 0
  let cards = 0
  let correct = 0
  let newCards = 0
  let bestDay: DaySummary | undefined
  for (const d of days) {
    totalMin += d.totalMin
    cards += d.cards
    correct += d.correct
    newCards += d.newCards
    for (const c of CATEGORIES) byCat[c] += d.seconds[c] / 60
    learned.vocab += d.learned.vocab
    learned.kanji += d.learned.kanji
    learned.grammar += d.learned.grammar
    if (d.totalMin >= 1 && (!bestDay || d.totalMin > bestDay.totalMin)) bestDay = d
  }
  // Kỳ trước: chỉ so cùng số ngày đã qua (tuần này mới qua 3 ngày → so với 3 ngày đầu tuần trước)
  const prev = periodRange(kind, shiftAnchor(kind, from, -1))
  const prevEnd = range.length ? addDays(prev.from, range.length - 1) : prev.from
  const prevTo = prevEnd < prev.to ? prevEnd : prev.to
  return {
    kind, from, to, title: titleOf(kind, from, to), elapsedDays: range.length, days,
    totalMin, activeDays: days.filter((d) => d.active).length, goalDays: days.filter((d) => d.goalMet).length,
    frozenDays: days.filter((d) => d.frozen).length, cards, correct, newCards, learned, byCat, bestDay,
    prevTotalMin: sumRange(stats, prev.from, prevTo),
  }
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

/** So với kỳ trước: "+25% so với tuần trước". */
export function compareText(p: PeriodSummary): string | null {
  const partial = p.elapsedDays < dayRange(p.from, p.to).length
  const name = (p.kind === 'day' ? 'hôm trước' : p.kind === 'week' ? 'tuần trước' : 'tháng trước')
    + (partial ? ` (cùng ${p.elapsedDays} ngày đầu)` : '')
  if (p.prevTotalMin < 1) return null
  const diff = Math.round(((p.totalMin - p.prevTotalMin) / p.prevTotalMin) * 100)
  if (diff === 0) return `bằng ${name}`
  return `${diff > 0 ? '+' : ''}${diff}% so với ${name}`
}

function learnedText(l: LearnedCounts): string {
  const parts = [
    l.vocab && `${l.vocab} từ vựng`, l.kanji && `${l.kanji} kanji`, l.grammar && `${l.grammar} mẫu ngữ pháp`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'chưa có'
}

/** Xuất Markdown. */
export function toMarkdown(p: PeriodSummary, stats: StudyStats): string {
  const goalText = stats.settings.goalType === 'minutes'
    ? `${stats.settings.goalMinutes} phút/ngày` : `${stats.settings.goalCards} thẻ/ngày`
  const L: string[] = []
  L.push(`# ${p.kind === 'day' ? 'Nhật ký học' : 'Tóm tắt'} ${p.title} · Hibi Nihongo`, '')
  const cmp = compareText(p)
  L.push(`- ⏱ **Thời gian học:** ${fmtMinutes(p.totalMin)}${p.kind !== 'day' && p.elapsedDays ? ` (TB ${fmtMinutes(p.totalMin / p.elapsedDays)}/ngày)` : ''}${cmp ? ` · ${cmp}` : ''}`)
  if (p.kind !== 'day') {
    L.push(`- 📅 **Số ngày học:** ${p.activeDays}/${p.elapsedDays} ngày · đạt mục tiêu (${goalText}) ${p.goalDays} ngày${p.frozenDays ? ` · ❄ đóng băng ${p.frozenDays} ngày` : ''}`)
  } else {
    const d = p.days[0]
    L.push(`- 🎯 **Mục tiêu (${goalText}):** ${d?.goalMet ? 'đã đạt ✓' : 'chưa đạt'}${d?.frozen ? ' · ❄ ngày đóng băng' : ''}`)
  }
  L.push(`- 🔥 **Streak hiện tại:** ${stats.streak.current} ngày (dài nhất ${stats.streak.best} ngày)`)
  L.push(`- 🃏 **Ôn thẻ:** ${p.cards} lượt${p.cards ? `, nhớ đúng ${pct(p.correct, p.cards)}%` : ''} · ${p.newCards} thẻ mới`)
  L.push(`- 📚 **Học mới:** ${learnedText(p.learned)}`)
  if (p.kind !== 'day' && p.bestDay) L.push(`- 🏆 **Ngày chăm nhất:** ${fmtDayLong(p.bestDay.day)} (${fmtMinutes(p.bestDay.totalMin)})`)
  L.push('')

  const cats = CATEGORIES.filter((c) => p.byCat[c] >= 0.5)
  if (cats.length) {
    L.push('## Thời gian theo hoạt động', '', '| Hoạt động | Thời gian | Tỉ lệ |', '| --- | ---: | ---: |')
    for (const c of [...cats].sort((a, b) => p.byCat[b] - p.byCat[a])) {
      L.push(`| ${CATEGORY_LABEL[c]} | ${fmtMinutes(p.byCat[c])} | ${pct(p.byCat[c], p.totalMin)}% |`)
    }
    L.push('')
  }

  if (p.kind === 'day') {
    const sessions = p.days[0]?.sessions ?? []
    if (sessions.length) {
      L.push('## Các phiên học', '')
      for (const s of sessions) {
        L.push(`- ${fmtClock(s.s)}–${fmtClock(s.e)} · ${CATEGORY_LABEL[s.c]} (${fmtMinutes((s.e - s.s) / 60_000)})`)
      }
      L.push('')
    }
  } else if (p.days.length) {
    L.push('## Từng ngày', '', '| Ngày | Thời gian | Thẻ ôn | Ghi chú |', '| --- | ---: | ---: | --- |')
    for (const d of p.days) {
      const note = [d.goalMet && '🎯', d.frozen && '❄', learnedText(d.learned) !== 'chưa có' && `+${learnedText(d.learned)}`]
        .filter(Boolean).join(' ')
      L.push(`| ${fmtDayLong(d.day)} | ${fmtMinutes(d.totalMin)} | ${d.cards} | ${note} |`)
    }
    L.push('')
  }
  L.push(`_Xuất từ Hibi Nihongo ngày ${fmtDayLong(stats.today)}_`)
  return L.join('\n')
}

/** Tên file .md, ví dụ "hibi-tom-tat-tuan-2026-11-02.md". */
export function fileName(p: PeriodSummary): string {
  const k = p.kind === 'day' ? 'ngay' : p.kind === 'week' ? 'tuan' : 'thang'
  return `hibi-tom-tat-${k}-${p.kind === 'month' ? p.from.slice(0, 7) : p.from}.md`
}
