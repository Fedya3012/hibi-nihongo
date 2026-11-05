/**
 * CHỖ NỐI VỚI MODULE KHÁC: OCR (đọc chữ trong bong bóng thoại) và Từ điển (popup tra từ).
 *
 * Trình đọc manga không tự làm OCR hay từ điển. Nó chỉ gọi tới "nhà cung cấp" đã đăng ký ở đây:
 *
 *   // Module OCR (giai đoạn 3) đăng ký khi khởi động:
 *   import { registerMangaOcr } from '@/modules/immersion/manga/integrations'
 *   registerMangaOcr({ id: 'tesseract', name: 'Tesseract', recognize: async (img, opts) => [{ text: '…' }] })
 *
 *   // Từ điển: trình đọc TỰ tìm file src/modules/dictionary/api.ts. Nếu file đó export
 *   //   openLookup(text: string, anchor?: { x: number; y: number })
 *   // thì nút "Tra từ" và chữ OCR sẽ mở popup của từ điển. Module khác cũng có thể tự đăng ký
 *   // bằng registerMangaLookup().
 *
 * Chưa có nhà cung cấp nào: nút OCR hiện "sắp có", ô tra từ vẫn dùng được khi từ điển xong.
 */
import { useSyncExternalStore } from 'react'

/** Một khối chữ OCR đọc được. box tính theo tỉ lệ 0–1 của ảnh được gửi vào. */
export interface OcrBlock {
  text: string
  box?: { x: number; y: number; w: number; h: number }
  vertical?: boolean
}

export interface MangaOcrProvider {
  id: string
  name: string
  /** image: ảnh vùng người dùng khoanh (hoặc cả trang). vertical: gợi ý chữ dọc. */
  recognize(image: Blob, opts?: { vertical?: boolean }): Promise<OcrBlock[]>
}

export interface MangaLookupProvider {
  /** Mở popup tra từ cho một từ/cụm/câu. anchor: vị trí trên màn hình (px) để đặt popup. */
  lookup(text: string, anchor?: { x: number; y: number }): void | Promise<void>
}

interface State {
  ocr: MangaOcrProvider | null
  lookup: MangaLookupProvider | null
}

let state: State = { ocr: null, lookup: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const registerMangaOcr = (p: MangaOcrProvider | null) => set({ ocr: p })
export const registerMangaLookup = (p: MangaLookupProvider | null) => set({ lookup: p })

// Tự nối với module Từ điển nếu nó đã có api.ts (import.meta.glob trả về rỗng khi file chưa tồn tại,
// nên code này build được cả trước lẫn sau khi module Từ điển xong).
const dictionaryApi = import.meta.glob<Record<string, unknown>>('/src/modules/dictionary/api.ts')
let autoTried = false
function tryDictionary() {
  if (autoTried) return
  autoTried = true
  const load = Object.values(dictionaryApi)[0]
  if (!load) return
  load().then((mod) => {
    const fn = mod.openLookup
    if (typeof fn === 'function' && !state.lookup) {
      set({ lookup: { lookup: (text, anchor) => fn(text, anchor) } })
    }
  }, (e) => console.warn('[manga] Không nối được với Từ điển:', e))
}

const subscribe = (l: () => void) => {
  tryDictionary()
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Hook React: nhà cung cấp OCR và tra từ hiện có (null nếu chưa có). */
export function useMangaIntegrations(): State {
  return useSyncExternalStore(subscribe, () => state)
}
