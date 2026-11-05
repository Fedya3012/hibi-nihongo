/**
 * LỰA CHỌN CỦA NGƯỜI HỌC (chặng bắt đầu, mục tiêu, giáo trình, kết quả xếp lớp).
 * Lưu trong kv "roadmap:state" nên tự có trong file sao lưu, không cần bảng riêng.
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import { LEVELS, type LevelId, type RoadmapState } from '../types'

const KEY = 'roadmap:state'

export const getRoadmapState = () => kvGet<RoadmapState | null>(KEY, null)

/** Hook: undefined = đang đọc, null = chưa làm quen (chưa chọn gì). */
export function useRoadmapState() {
  return useDbQuery(getRoadmapState, [], ['kv']).data
}

export const saveRoadmapState = (s: RoadmapState) => kvSet(KEY, s)

export async function patchRoadmapState(patch: Partial<RoadmapState>) {
  const cur = await getRoadmapState()
  if (!cur) return
  const next = { ...cur, ...patch }
  // Mục tiêu không được thấp hơn chặng bắt đầu
  if (levelIndex(next.goal) < levelIndex(next.start)) next.goal = next.start
  await kvSet(KEY, next)
}

/** Xóa để làm lại từ bước làm quen. Không đụng tới tiến độ của các module khác. */
export const resetRoadmap = () => kvSet(KEY, null)

export const levelIndex = (l: LevelId) => LEVELS.indexOf(l)
