/**
 * API CÔNG KHAI CỦA TÌM KIẾM TOÀN CỤC (Ctrl+K). File này nhẹ: không kéo theo từ điển hay giao diện.
 *
 *   import { openSearch, registerSearchSource } from '@/modules/search/api'
 *   openSearch()            // mở ô tìm kiếm
 *   openSearch('食べる')     // mở và điền sẵn chữ
 *
 * THÊM NGUỒN TÌM KIẾM CHO MODULE MỚI (ví dụ Ngữ pháp, Giáo trình):
 *   1. Trong module của bạn, tạo file `search.ts` export default một SearchSource (xem types.ts).
 *   2. Thêm MỘT dòng vào MODULE_SOURCES bên dưới:
 *        { id: 'grammar-points', load: () => import('@/modules/grammar/search') },
 *   File chỉ được tải khi người dùng mở ô tìm kiếm, nên không làm app khởi động chậm.
 */
import { create } from 'zustand'
import type { SearchSource } from './types'

export type { SearchSource, SearchHit, SearchQuery } from './types'

/** Nguồn tìm kiếm của các module khác (tải khi mở ô tìm kiếm). */
export const MODULE_SOURCES: { id: string; load: () => Promise<{ default: SearchSource }> }[] = [
  // { id: 'grammar-points', load: () => import('@/modules/grammar/search') },
]

/** Nguồn đăng ký lúc chạy (ít dùng; ưu tiên MODULE_SOURCES ở trên). */
export const runtimeSources = new Map<string, SearchSource>()
export function registerSearchSource(src: SearchSource): () => void {
  runtimeSources.set(src.id, src)
  return () => { runtimeSources.delete(src.id) }
}

export const useSearchUi = create<{ open: boolean; initial: string; n: number }>(() => ({ open: false, initial: '', n: 0 }))

export function openSearch(initial = ''): void {
  useSearchUi.setState((s) => ({ open: true, initial, n: s.n + 1 }))
}

export function closeSearch(): void {
  useSearchUi.setState({ open: false })
}
