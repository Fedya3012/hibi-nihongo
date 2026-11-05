/**
 * NGHĨA TIẾNG VIỆT (gói jmdict-vi, tùy chọn)
 *   getVi(id)             → nghĩa tiếng Việt của một từ (undefined nếu chưa có / chưa cài gói)
 *   useVi(id)             → như trên, dạng hook cho giao diện
 *   viSense(vi, i)        → nghĩa tiếng Việt của nghĩa thứ i
 *   shortMeaning(id, d)   → nghĩa ngắn gọn (ưu tiên tiếng Việt) để ghi lên thẻ ôn tập, danh sách từ...
 * Gói được tạo bởi tools/build-vi-pack.mjs. Từ nào chưa có tiếng Việt thì app hiện tiếng Anh như cũ.
 */
import { getItem, useDbQuery } from '@/core/db'
import { VI_PACK, type ViData, type WordData } from '../types'

const cache = new Map<string, Promise<ViData | undefined>>()

export function getVi(id: string): Promise<ViData | undefined> {
  let p = cache.get(id)
  if (!p) {
    p = getItem<ViData>(VI_PACK, id).then((it) => it?.data).catch(() => undefined)
    cache.set(id, p)
    if (cache.size > 3000) cache.delete(cache.keys().next().value as string)
  }
  return p
}

/** Xóa bộ đệm (gọi sau khi cài/cập nhật gói). */
export const clearViCache = () => cache.clear()

/** Hook: nghĩa tiếng Việt của từ `id` (tự cập nhật khi gói được cài). */
export function useVi(id: string): ViData | undefined {
  return useDbQuery(() => getVi(id), [id], ['packs']).data ?? undefined
}

/** Nghĩa tiếng Việt cho nghĩa thứ i (mảng rỗng nếu chưa có). */
export function viSense(vi: ViData | undefined, i: number): string[] {
  return vi?.s?.[i] ?? []
}

/** Nghĩa ngắn gọn của từ: tiếng Việt nếu có, không thì tiếng Anh. Ví dụ 食べる → "ăn; sống nhờ vào". */
export async function shortMeaning(id: string, d: WordData, senses = 3, perSense = 3): Promise<string> {
  const vi = await getVi(id)
  return d.s.slice(0, senses).map((s, i) => {
    const v = viSense(vi, i)
    return (v.length ? v : s.g).slice(0, perSense).join(', ')
  }).join('; ')
}
