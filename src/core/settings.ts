/**
 * CÀI ĐẶT CHUNG CỦA APP
 * Lưu trên máy (localStorage) nên vẫn còn khi tắt app hoặc mất mạng.
 * Mọi module đều đọc cài đặt từ đây: useSettings((s) => s.theme)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from './i18n'
import type { AccentId } from './accent'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type FuriganaMode = 'on' | 'off' | 'unknown-only' // unknown-only: chỉ hiện cho Kanji chưa thuộc

export interface Settings {
  theme: ThemeChoice
  fontScale: number // 0.8 – 2.0
  furigana: FuriganaMode
  highContrast: boolean
  verticalText: boolean
  sound: boolean
  haptics: boolean
  /** Ngôn ngữ giao diện: 'vi' (mặc định) | 'en' | 'ja'. Xem src/core/i18n. */
  lang: Lang
  /** Màu chủ đạo: bảng có sẵn hoặc 'custom' (dùng customAccent). Xem src/core/accent.ts. */
  accent: AccentId
  /** Màu tự chọn, dạng #rrggbb. */
  customAccent: string
  set: (patch: Partial<Omit<Settings, 'set'>>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      theme: 'system',
      fontScale: 1,
      furigana: 'on',
      highContrast: false,
      verticalText: false,
      sound: true,
      haptics: true,
      lang: 'vi',
      accent: 'amber',
      customAccent: '#3a8fb7',
      set: (patch) => set(patch),
    }),
    { name: 'hibi-settings' },
  ),
)
