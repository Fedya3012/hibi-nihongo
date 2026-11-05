/**
 * NHÓM HOẠT ĐỘNG HỌC
 * ------------------
 * Thời gian học được chia theo nhóm, dựa vào trang bạn đang mở.
 * Thứ tự trong CATEGORIES là cố định: biểu đồ luôn tô cùng một màu cho cùng một nhóm
 * (màu nằm trong src/modules/me/chart.css, biến --cat-<id>).
 */

export const CATEGORIES = ['review', 'manga', 'anime', 'kana', 'kanji', 'grammar', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABEL: Record<Category, string> = {
  review: 'Ôn tập',
  manga: 'Manga',
  anime: 'Anime',
  kana: 'Kana',
  kanji: 'Kanji',
  grammar: 'Ngữ pháp',
  other: 'Khác (từ điển, giáo trình…)',
}

/** Tên ngắn cho chú thích biểu đồ. */
export const CATEGORY_SHORT: Record<Category, string> = { ...CATEGORY_LABEL, other: 'Khác' }

/** Đường dẫn → nhóm. Trang không nằm ở đây (Hôm nay, Tôi, Cài đặt...) không tính giờ học. */
const ROUTES: [string, Category][] = [
  ['/review', 'review'],
  ['/immersion/manga', 'manga'],
  ['/immersion/anime', 'anime'],
  ['/learn/kana', 'kana'],
  ['/learn/kanji', 'kanji'],
  ['/learn/grammar', 'grammar'],
  ['/learn/textbook', 'other'],
  ['/learn/roadmap', 'other'],
  ['/dictionary', 'other'],
  ['/assistant', 'other'],
]

export function categoryOfPath(path: string): Category | null {
  for (const [prefix, cat] of ROUTES) {
    if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) return cat
  }
  return null
}

/** Màu của nhóm, dùng trong style của SVG: fill={catColor('manga')}. */
export const catColor = (c: Category) => `var(--cat-${c})`
