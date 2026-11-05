/** Chuẩn bị dữ liệu cho biểu đồ và heatmap từ thống kê (dùng chung cho Hôm nay và Tiến độ). */
import type { BarRow, HeatCell, Series } from '../components/charts'
import { CATEGORIES, CATEGORY_SHORT, catColor } from './categories'
import { addDays, dayRange, fmtDayLong, fmtDayShort, fmtMinutes, parseDay, weekStart, weekdayShort } from './days'
import type { DaySummary, StudyStats } from './stats'

export const CATEGORY_SERIES: Series[] = CATEGORIES.map((c) => ({ key: c, label: CATEGORY_SHORT[c], color: catColor(c) }))

/** Cột phút học theo ngày (chồng theo nhóm) cho n ngày gần nhất. */
export function dailyMinuteRows(stats: StudyStats, n: number): BarRow[] {
  const days = dayRange(addDays(stats.today, -(n - 1)), stats.today)
  return days.map((d) => {
    const s = stats.days.get(d)
    return {
      label: n <= 7 ? weekdayShort(d) : fmtDayShort(d),
      title: fmtDayLong(d) + (s?.frozen ? ' ❄' : ''),
      values: CATEGORIES.map((c) => (s ? s.seconds[c] / 60 : 0)),
    }
  })
}

/** Cột theo tuần (cho khoảng dài như 1 năm): cộng giá trị 7 ngày của mỗi tuần. */
export function weeklyRows(stats: StudyStats, weeks: number, values: (d: DaySummary) => number[], width: number): BarRow[] {
  const end = weekStart(stats.today)
  const rows: BarRow[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(end, -7 * i)
    const sum = new Array<number>(width).fill(0)
    for (const d of dayRange(ws, addDays(ws, 6))) {
      const s = stats.days.get(d)
      if (s) values(s).forEach((v, k) => { sum[k] += v })
    }
    rows.push({ label: fmtDayShort(ws), title: `Tuần ${fmtDayShort(ws)} – ${fmtDayShort(addDays(ws, 6))}`, values: sum })
  }
  return rows
}

const minutesByCat = (s: DaySummary) => CATEGORIES.map((c) => s.seconds[c] / 60)

export const weeklyMinuteRows = (stats: StudyStats, weeks: number) =>
  weeklyRows(stats, weeks, minutesByCat, CATEGORIES.length)

export const weeklyCardRows = (stats: StudyStats, weeks: number) =>
  weeklyRows(stats, weeks, (s) => [s.cards], 1)

function level(min: number, goal: number): HeatCell['level'] {
  if (min < 1) return 0
  const r = min / Math.max(1, goal)
  if (r < 0.5) return 1
  if (r < 1) return 2
  if (r < 2) return 3
  return 4
}

/**
 * Ô heatmap cho `weeks` tuần gần nhất. Đậm nhạt theo mục tiêu phút:
 * < ½ mục tiêu · < mục tiêu · đạt · gấp đôi.
 */
export function heatmapCells(stats: StudyStats, weeks: number) {
  const goalMin = stats.settings.goalType === 'minutes' ? stats.settings.goalMinutes : 15
  const start = addDays(weekStart(stats.today), -7 * (weeks - 1))
  const end = addDays(weekStart(stats.today), 6)
  const cells: HeatCell[] = dayRange(start, end).map((d) => {
    const s: DaySummary | undefined = stats.days.get(d)
    const min = s?.totalMin ?? 0
    const extra = s?.cards ? ` · ${s.cards} thẻ` : ''
    return {
      day: d,
      level: level(min, goalMin),
      frozen: s?.frozen,
      future: d > stats.today,
      title: `${fmtDayLong(d)}: ${min >= 1 ? fmtMinutes(min) : 'không học'}${extra}${s?.frozen ? ' · ❄ đóng băng' : ''}`,
    }
  })
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  for (let col = 0; col < weeks; col++) {
    const m = parseDay(cells[col * 7].day).getMonth()
    if (m !== lastMonth) {
      if (col < weeks - 1 || monthLabels.length === 0) monthLabels.push({ col, label: `Th${m + 1}` })
      lastMonth = m
    }
  }
  // Bỏ nhãn tháng đầu nếu sát nhãn kế tiếp (tránh chữ đè nhau)
  if (monthLabels.length > 1 && monthLabels[1].col - monthLabels[0].col < 3) monthLabels.shift()
  return { cells, monthLabels }
}
