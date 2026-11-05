/**
 * ĐỌC NỘI DUNG NGỮ PHÁP. Dữ liệu được tải một lần (tách thành file riêng khi build), rồi giữ trong bộ nhớ.
 */
import type { GrammarPoint, JlptLevel } from '../types'

let cache: Promise<{ list: GrammarPoint[]; byId: Map<string, GrammarPoint> }> | null = null

export function loadGrammar() {
  cache ??= import('../data').then(({ ALL_POINTS }) => ({
    list: ALL_POINTS,
    byId: new Map(ALL_POINTS.map((p) => [p.id, p])),
  }))
  return cache
}

/** Các cấp đã có nội dung, và các cấp sẽ có. */
export const LEVELS: { level: JlptLevel; ready: boolean }[] = [
  { level: 5, ready: true }, { level: 4, ready: true },
  { level: 3, ready: false }, { level: 2, ready: false }, { level: 1, ready: false },
]

export const CAT_ORDER = ['particle', 'verb', 'adjective', 'connect', 'ending', 'compare', 'demonstrative', 'expression'] as const
