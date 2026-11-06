/** Tùy chọn của trang Truyện (lưu trên máy bằng localStorage). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StoryPrefs {
  /** Furigana trên Kanji. Mặc định bật vì truyện dành cho người mới. */
  furigana: boolean
  /** Hiện bản dịch tiếng Việt dưới mỗi câu. */
  translate: boolean
  /** Tốc độ giọng đọc. */
  rate: number
  /** Cỡ chữ (px). */
  size: number
  set: (p: Partial<Omit<StoryPrefs, 'set'>>) => void
}

export const RATES = [0.7, 0.85, 1] as const
export const SIZES = [18, 20, 22, 26, 30]

export const useStoryPrefs = create<StoryPrefs>()(
  persist((set) => ({ furigana: true, translate: false, rate: 0.85, size: 22, set: (p) => set(p) }), { name: 'hibi-stories' }),
)
