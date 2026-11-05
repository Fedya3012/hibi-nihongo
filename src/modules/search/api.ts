/**
 * API CÔNG KHAI CỦA TÌM KIẾM TOÀN CỤC (Ctrl+K). File này nhẹ: không kéo theo từ điển hay giao diện.
 *
 *   import { openSearch, registerSearchSource } from '@/modules/search/api'
 *   openSearch()            // mở ô tìm kiếm
 *   openSearch('食べる')     // mở và điền sẵn chữ
 *
 * THÊM NGUỒN TÌM KIẾM CHO MODULE MỚI (ví dụ Ngữ pháp, Giáo trình):
 *   Trong thư mục module, tạo file `search.ts` (ngay dưới src/modules/<id>/) export default một
 *   SearchSource (xem types.ts). Xong: MODULE_SOURCES bên dưới tự tìm thấy, không sửa file này.
 *   File chỉ được tải khi người dùng mở ô tìm kiếm, nên không làm app khởi động chậm.
 */
import { create } from 'zustand'
import type { SearchSource } from './types'

export type { SearchSource, SearchHit, SearchQuery } from './types'

/** Nguồn tìm kiếm của các module khác: mọi file src/modules/<id>/search.ts (tải khi mở ô tìm kiếm). */
const found = import.meta.glob<{ default: SearchSource }>('../*/search.ts')
export const MODULE_SOURCES: { id: string; load: () => Promise<{ default: SearchSource }> }[] =
  Object.entries(found).map(([file, load]) => ({ id: file, load }))

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
