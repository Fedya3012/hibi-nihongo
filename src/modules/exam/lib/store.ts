/**
 * LƯU TRÊN MÁY (kho kv, nên tự có trong file sao lưu):
 *   "exam:current" → bài đang làm (đóng app mở lại vẫn làm tiếp, đồng hồ dừng khi app đóng)
 *   "exam:history" → các lần thi đã chấm, mới nhất trước. Chỉ giữ bài làm chi tiết của KEEP_DETAIL lần gần nhất.
 */
import { kvDelete, kvGet, kvSet, useDbQuery } from '@/core/db'
import type { ExamResult, ExamSession } from '../types'

const CUR = 'exam:current'
const HIST = 'exam:history'
const KEEP = 100
const KEEP_DETAIL = 5

export const getCurrent = () => kvGet<ExamSession | null>(CUR, null)
export const saveCurrent = (s: ExamSession) => kvSet(CUR, s)
export const clearCurrent = () => kvDelete(CUR)

export const getHistory = () => kvGet<ExamResult[]>(HIST, [])

export function useHistory() {
  return useDbQuery(getHistory, [], ['kv']).data
}

export function useCurrent() {
  return useDbQuery(getCurrent, [], ['kv'])
}

export async function addResult(r: ExamResult): Promise<void> {
  const list = [r, ...(await getHistory()).filter((x) => x.id !== r.id)].slice(0, KEEP)
  await kvSet(HIST, list.map((x, i) => (i < KEEP_DETAIL ? x : { ...x, session: undefined })))
}

export async function removeResult(id: string): Promise<void> {
  await kvSet(HIST, (await getHistory()).filter((x) => x.id !== id))
}
