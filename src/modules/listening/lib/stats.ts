/**
 * THỐNG KÊ LUYỆN NGHE: số câu đúng / đã làm của từng phần, lưu trong kv 'listening:stats' (có trong sao lưu).
 */
import { create } from 'zustand'
import { kvGet, kvSet } from '@/core/db'

export type DrillKind = 'sentence' | 'number' | 'time' | 'date'
export type Tally = { right: number; total: number }
type Stats = Record<DrillKind, Tally>

const KEY = 'listening:stats'
const EMPTY: Stats = { sentence: { right: 0, total: 0 }, number: { right: 0, total: 0 }, time: { right: 0, total: 0 }, date: { right: 0, total: 0 } }

export const useListeningStats = create<Stats>(() => EMPTY)
void kvGet<Partial<Stats>>(KEY, {}).then((s) => useListeningStats.setState({ ...EMPTY, ...s }))

export function recordResult(kind: DrillKind, right: boolean) {
  const s = useListeningStats.getState()
  const next = { ...s, [kind]: { right: s[kind].right + (right ? 1 : 0), total: s[kind].total + 1 } }
  useListeningStats.setState(next)
  void kvSet(KEY, next)
}

export function resetStats() {
  useListeningStats.setState(EMPTY)
  void kvSet(KEY, EMPTY)
}
