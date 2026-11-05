/**
 * THỐNG KÊ LUYỆN CHIA
 * -------------------
 * Lưu trong kv (tự có trong file sao lưu), không thêm bảng mới:
 *   "conjugation:stats" → { forms: { [mã thể]: {right, wrong} }, words: { [từ|đọc]: {right, wrong} }, last }
 *   "conjugation:prefs" → lựa chọn lần trước ở màn hình chuẩn bị (cấp, loại từ, thể, kiểu trả lời, số câu)
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import type { ConjWord, FormId } from '../types'
import { wordKey } from '../data/words'
import type { Mode } from './quiz'

export interface Tally { right: number; wrong: number }
export interface ConjStats {
  forms: Partial<Record<FormId, Tally>>
  words: Record<string, Tally>
  last?: number
}

const STATS = 'conjugation:stats'
const PREFS = 'conjugation:prefs'

const empty = (): ConjStats => ({ forms: {}, words: {} })

export const getStats = () => kvGet<ConjStats>(STATS, empty())

export function useConjStats(): ConjStats | undefined {
  return useDbQuery(getStats, [], ['kv']).data
}

/** Ghi kết quả một bài luyện. */
export async function recordResults(list: { word: ConjWord; form: FormId; ok: boolean }[]) {
  if (!list.length) return
  const s = await getStats()
  for (const { word, form, ok } of list) {
    const f = (s.forms[form] ??= { right: 0, wrong: 0 })
    const w = (s.words[wordKey(word)] ??= { right: 0, wrong: 0 })
    if (ok) { f.right++; w.right++ } else { f.wrong++; w.wrong++ }
  }
  s.last = Date.now()
  await kvSet(STATS, s)
}

export const resetStats = () => kvSet(STATS, empty())

export type ClassGroup = 'v5' | 'v1' | 'v3' | 'i' | 'na'
export interface ConjPrefs {
  levels: (5 | 4)[]
  classes: ClassGroup[]
  forms: FormId[]
  mode: Mode
  count: number
  weak: boolean
  /** Hiện nhóm động từ trong câu hỏi (gợi ý) */
  hint: boolean
}

export const DEFAULT_PREFS: ConjPrefs = {
  levels: [5], classes: ['v5', 'v1', 'v3'], forms: ['masu', 'nai', 'te', 'ta'], mode: 'type', count: 10, weak: false, hint: true,
}

export const getPrefs = async () => ({ ...DEFAULT_PREFS, ...(await kvGet<Partial<ConjPrefs>>(PREFS, {})) })
export const savePrefs = (p: ConjPrefs) => kvSet(PREFS, p)

/** Tỉ lệ đúng (0–1), undefined nếu chưa luyện. */
export const accuracy = (t?: Tally) => (t && t.right + t.wrong ? t.right / (t.right + t.wrong) : undefined)
