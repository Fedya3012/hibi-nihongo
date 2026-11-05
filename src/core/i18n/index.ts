/**
 * NGÔN NGỮ GIAO DIỆN (i18n): Tiếng Việt · English · 日本語
 * --------------------------------------------------------
 * Ngôn ngữ đang chọn nằm trong Cài đặt (`useSettings((s) => s.lang)`), mặc định là tiếng Việt.
 *
 * CÁCH DỊCH MỘT MÀN HÌNH (mỗi module tự giữ bảng chữ của mình, không sửa file chung):
 *
 *   import { defineStrings, useT } from '@/core/i18n'
 *
 *   const S = defineStrings({
 *     vi: { title: 'Ôn tập', due: 'Còn {n} thẻ đến hạn' },   // tiếng Việt: BẮT BUỘC đủ mọi khóa
 *     en: { title: 'Review', due: '{n} cards due' },          // tiếng Anh, tiếng Nhật: thiếu khóa nào
 *     ja: { title: '復習' },                                   // thì tự dùng ngôn ngữ dự phòng
 *   })
 *
 *   function Page() {
 *     const t = useT(S)
 *     return <h1>{t('title')} · {t('due', { n: 5 })}</h1>
 *   }
 *
 * THỨ TỰ DỰ PHÒNG (khi một câu chưa được dịch):
 *   日本語 → English → Tiếng Việt
 *   English → Tiếng Việt
 * Tiếng Việt luôn đủ (TypeScript báo lỗi nếu thiếu), nên không bao giờ hiện ra khóa trống.
 * Màn hình chưa dùng hệ thống này sẽ hiện tiếng Việt như cũ.
 */
import { useCallback } from 'react'
import { useSettings } from '../settings'

export type Lang = 'vi' | 'en' | 'ja'

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'ja', label: '日本語', short: 'JA' },
]

/** Khi thiếu bản dịch: thử lần lượt các ngôn ngữ này. */
export const FALLBACK: Record<Lang, Lang[]> = {
  vi: ['vi'],
  en: ['en', 'vi'],
  ja: ['ja', 'en', 'vi'],
}

/** Bảng chữ của một màn hình. Tiếng Việt đủ khóa; tiếng Anh, Nhật có thể thiếu. */
export interface StringTable<K extends string> {
  vi: Record<K, string>
  en?: Partial<Record<K, string>>
  ja?: Partial<Record<K, string>>
}

export type Vars = Record<string, string | number>
export type TFunction<K extends string> = (key: K, vars?: Vars) => string

/** Khai báo bảng chữ (chỉ để TypeScript kiểm tra và gợi ý tên khóa). */
export function defineStrings<K extends string>(table: StringTable<K>): StringTable<K> {
  return table
}

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s

/** Dịch một khóa theo ngôn ngữ `lang`, có dự phòng. Dùng ngoài React (ví dụ trong hàm thường). */
export function translate<K extends string>(table: StringTable<K>, lang: Lang, key: K, vars?: Vars): string {
  for (const l of FALLBACK[lang] ?? FALLBACK.vi) {
    const s = table[l]?.[key]
    if (s != null) return fill(s, vars)
  }
  return key
}

/** Ngôn ngữ đang chọn (hook React, tự cập nhật khi đổi trong Cài đặt). */
export function useLang(): Lang {
  return useSettings((s) => s.lang) ?? 'vi'
}

/** Ngôn ngữ đang chọn, dùng ngoài React. */
export const currentLang = (): Lang => useSettings.getState().lang ?? 'vi'

/** Hook React: trả về hàm t(khóa, biến?) theo ngôn ngữ đang chọn. */
export function useT<K extends string>(table: StringTable<K>): TFunction<K> {
  const lang = useLang()
  return useCallback((key: K, vars?: Vars) => translate(table, lang, key, vars), [table, lang])
}

/**
 * Bao nhiêu phần trăm câu của bảng đã có bản dịch thật (không phải dự phòng).
 * Dùng để hiện "đã dịch 80%" trong Cài đặt.
 */
export function coverage(tables: StringTable<string>[], lang: Lang): number {
  let total = 0
  let done = 0
  for (const t of tables) {
    for (const k of Object.keys(t.vi)) {
      total++
      if (t[lang]?.[k] != null) done++
    }
  }
  return total ? done / total : 1
}

// Gắn ngôn ngữ vào thẻ <html lang="..."> (giúp trình đọc màn hình và font chữ đúng ngôn ngữ)
function applyHtmlLang(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
applyHtmlLang(currentLang())
useSettings.subscribe((s) => applyHtmlLang(s.lang ?? 'vi'))
