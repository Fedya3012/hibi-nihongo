/**
 * KIỂU DỮ LIỆU CỦA MODULE LUYỆN CHIA (động từ, tính từ)
 * File này không import gì, để script kiểm tra (tools/check.mjs) chạy được bằng Node.
 */

/**
 * Loại từ:
 *   v5 = động từ nhóm 1 (godan): 書く, 帰る
 *   v1 = động từ nhóm 2 (ichidan): 食べる, 見る
 *   vs = động từ nhóm 3 する (cả 勉強する)
 *   vk = động từ nhóm 3 来る
 *   i  = tính từ -い: 高い, いい
 *   na = tính từ -な: 静か (lưu KHÔNG kèm な)
 */
export type WordClass = 'v5' | 'v1' | 'vs' | 'vk' | 'i' | 'na'

export interface ConjWord {
  /** Cách viết thường gặp (có Kanji nếu có), thể từ điển: 書く, 静か */
  w: string
  /** Cách đọc hiragana: かく, しずか */
  r: string
  c: WordClass
  /** Cấp JLPT của từ: 5 hoặc 4 */
  lv: 5 | 4
  /** Nghĩa tiếng Việt ngắn */
  m: string
  /** Các thể KHÔNG dùng với từ này (vd ある không có thể khả năng) */
  no?: FormId[]
}

/** Mã các thể luyện. Đừng đổi mã đã phát hành: thống kê lưu theo mã này. */
export type FormId =
  | 'masu' | 'masen' | 'mashita' | 'masendeshita' | 'mashou'
  | 'nai' | 'ta' | 'nakatta' | 'te' | 'tai' | 'adv'
  | 'pot' | 'vol' | 'ba' | 'tara' | 'imp' | 'pass' | 'caus'

/** Kết quả chia một từ sang một thể. */
export interface ConjResult {
  /** Đáp án chuẩn, viết như từ gốc (có Kanji nếu từ có Kanji) */
  w: string
  /** Đáp án chuẩn bằng hiragana */
  r: string
  /** Các cách viết khác cũng đúng (hiragana và Kanji), vd ではない cho じゃない */
  alt: string[]
  /** Giải thích cách chia, tiếng Việt */
  rule: string
}
