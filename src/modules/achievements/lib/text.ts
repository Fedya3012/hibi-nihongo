/** Ghép chữ hiển thị cho huy hiệu, hạng cáo, bậc (dùng chung cho trang, khối Hôm nay và thông báo). */
import type { Lang, TFunction } from '@/core/i18n'
import { BADGE_BY_ID, fmtTier, tierName, type BadgeDef } from './badges'
import type { Rank } from './level'
import type { Key } from '../strings'

type T = TFunction<Key>

export const badgeTitle = (t: T, b: BadgeDef) => t(`b_${b.id}` as Key)

/** Mô tả của bậc thứ i, ví dụ "Học 30 ngày liên tiếp". */
export const badgeDesc = (t: T, b: BadgeDef, i: number) =>
  t(`d_${b.id}` as Key, { n: fmtTier(b, b.tiers[Math.min(i, b.tiers.length - 1)]) })

export const tierLabel = (t: T, b: BadgeDef, i: number) => t(`t_${tierName(b, i)}` as Key)

/** Tên đầy đủ của một bậc đã đạt từ khóa "id:bậc", ví dụ "Lửa bền bỉ (Vàng)". */
export function tierKeyTitle(t: T, key: string): string | null {
  const [id, i] = key.split(':')
  const b = BADGE_BY_ID.get(id)
  if (!b) return null
  const idx = Number(i)
  return b.tiers.length > 1 ? `${badgeTitle(t, b)} (${tierLabel(t, b, idx)})` : badgeTitle(t, b)
}

export const rankName = (t: T, r: Rank) => t(`r_${r.id}` as Key)

const LOCALE: Record<Lang, string> = { vi: 'vi-VN', en: 'en-GB', ja: 'ja-JP' }
export const fmtDate = (ts: number, lang: Lang) =>
  new Date(ts).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'numeric', year: 'numeric' })
export const fmtNum = (n: number, lang: Lang) => Math.round(n).toLocaleString(LOCALE[lang])
