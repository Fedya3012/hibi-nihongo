/**
 * Tên và mô tả các module trên thanh điều hướng, theo ngôn ngữ giao diện.
 * Mọi chữ nằm trong file module.ts của từng module (title/description = tiếng Việt,
 * text.en / text.ja = tiếng Anh / Nhật), nên module mới không cần sửa gì ở đây.
 */
import { useCallback } from 'react'
import type { AppModule, ModuleText } from '@/modules/define'
import { FALLBACK, useLang, type Lang } from './index'

type Mod = Pick<AppModule, 'id' | 'title' | 'description' | 'text'>

/** Tên + mô tả của module theo ngôn ngữ `lang` (dự phòng: Nhật → Anh → Việt). */
export function moduleText(m: Mod, lang: Lang): Required<ModuleText> {
  let title: string | undefined
  let description: string | undefined
  for (const l of FALLBACK[lang]) {
    if (l === 'vi') break
    const tx = m.text?.[l]
    title ??= tx?.title
    description ??= tx?.description
  }
  return { title: title ?? m.title, description: description ?? m.description }
}

/** Mọi tên của module ở cả 3 ngôn ngữ (để tìm kiếm "settings" vẫn ra "Cài đặt"). */
export function moduleNames(m: Pick<AppModule, 'title' | 'text'>): string[] {
  return [m.title, m.text?.en?.title, m.text?.ja?.title].filter((x): x is string => !!x)
}

/** Hook React: hàm (module) → { title, description } theo ngôn ngữ đang chọn. */
export function useModuleText() {
  const lang = useLang()
  return useCallback((m: Mod) => moduleText(m, lang), [lang])
}
