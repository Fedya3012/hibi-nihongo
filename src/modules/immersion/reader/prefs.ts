/** Tùy chọn của trình đọc (lưu trên máy bằng localStorage, giống tùy chọn Từ điển). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ReaderPrefs {
  furigana: boolean
  /** Chữ dọc (縦書き), đọc từ phải sang trái như sách Nhật. */
  vertical: boolean
  /** Cỡ chữ (px). */
  size: number
  set: (p: Partial<Omit<ReaderPrefs, 'set'>>) => void
}

export const SIZES = [16, 18, 20, 22, 26, 30]

export const useReaderPrefs = create<ReaderPrefs>()(
  persist((set) => ({ furigana: false, vertical: false, size: 20, set: (p) => set(p) }), { name: 'hibi-reader' }),
)
