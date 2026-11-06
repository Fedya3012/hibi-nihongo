/** TIẾN ĐỘ ĐỌC TRUYỆN: một khóa kv `stories:progress` (có trong file sao lưu). Không thêm bảng mới. */
import { kvGet, kvSet } from '@/core/db'
import type { StoryProgress } from './types'

const KEY = 'stories:progress'

export const getProgress = () => kvGet<Record<string, StoryProgress>>(KEY, {})

export async function updateProgress(id: string, patch: Partial<StoryProgress>): Promise<void> {
  const all = await getProgress()
  await kvSet(KEY, { ...all, [id]: { ...all[id], ...patch } })
}
