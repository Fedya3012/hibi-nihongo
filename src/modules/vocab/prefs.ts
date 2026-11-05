/**
 * TÙY CHỌN TÔ MÀU (lưu trên máy, localStorage) + lớp CSS cho từng mức độ biết.
 * Chỉ dùng màu token để Sáng/Tối và đổi màu chủ đạo luôn đúng.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WordStatus } from './types'

/** 'all' = tô từ mới và đang học, 'new' = chỉ từ mới, 'off' = tắt. */
export type HighlightMode = 'all' | 'new' | 'off'

export const useVocabPrefs = create<{ highlight: HighlightMode; set: (p: { highlight?: HighlightMode }) => void }>()(
  persist((set) => ({ highlight: 'all', set: (p) => set(p) }), { name: 'hibi-vocab' }),
)

/**
 * Lớp CSS gạch chân theo mức độ biết.
 *   từ mới:   gạch liền màu chủ đạo
 *   đang học: gạch chấm màu chủ đạo
 *   đã biết:  không gạch
 */
export function statusUnderline(st: WordStatus | undefined, mode: HighlightMode): string {
  if (!st || mode === 'off' || st === 'known') return ''
  if (st === 'new') return 'underline decoration-primary decoration-2 underline-offset-[0.3em]'
  return mode === 'all' ? 'underline decoration-primary decoration-dotted decoration-2 underline-offset-[0.3em]' : ''
}
