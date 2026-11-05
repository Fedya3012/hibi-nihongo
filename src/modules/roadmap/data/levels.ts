/**
 * KHUNG LỘ TRÌNH: mỗi chặng (N5 → N1) gồm những gì.
 * Đây là số liệu ước lượng phổ biến, không phải con số chính thức của kỳ thi JLPT
 * (JLPT không công bố danh sách từ / kanji từ năm 2010).
 */
import type { LevelId, Series } from '../types'

/** Số từ vựng nên biết để xong chặng (cộng dồn từ đầu). */
export const VOCAB_TARGET: Partial<Record<LevelId, number>> = {
  n5: 800,
  n4: 1500,
  n3: 3700,
  n2: 6000,
  n1: 10000,
}

/** Cấp JLPT dạng số (dùng cho Kanji, Ngữ pháp). */
export const JLPT_NUM: Partial<Record<LevelId, 5 | 4 | 3 | 2 | 1>> = { n5: 5, n4: 4, n3: 3, n2: 2, n1: 1 }

/**
 * Sách giáo trình (khung có sẵn ở module Giáo trình) ứng với chặng.
 * Minna I ≈ N5, Minna II ≈ N4; Genki I ≈ N5, Genki II ≈ N4. Từ N3 trở lên chưa có khung sách.
 */
export const BOOK_FOR: Record<Exclude<Series, 'none'>, Partial<Record<LevelId, string>>> = {
  minna: { n5: 'minna-1', n4: 'minna-2' },
  genki: { n5: 'genki-1', n4: 'genki-2' },
}

/** Một bước được coi là xong khi đạt từ tỉ lệ này trở lên. */
export const DONE_AT = 0.9

export const LEVEL_LABEL: Record<LevelId, string> = {
  kana: 'Kana', n5: 'N5', n4: 'N4', n3: 'N3', n2: 'N2', n1: 'N1',
}
