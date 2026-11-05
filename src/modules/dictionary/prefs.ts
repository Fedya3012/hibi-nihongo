/** Tùy chọn riêng của từ điển (lưu trên máy, localStorage). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DictPrefs {
  /** true = di chuột qua chữ là hiện popup (máy tính). false = phải bấm. Điện thoại luôn là bấm. */
  hover: boolean
  /** Số nghĩa tối đa hiện trong popup. */
  popupSenses: number
  set: (p: Partial<Omit<DictPrefs, 'set'>>) => void
}

export const useDictPrefs = create<DictPrefs>()(
  persist((set) => ({ hover: true, popupSenses: 3, set: (p) => set(p) }), { name: 'hibi-dictionary' }),
)
