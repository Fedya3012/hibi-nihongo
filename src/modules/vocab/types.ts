/**
 * KIỂU DỮ LIỆU CỦA KHO TỪ DÙNG CHUNG
 */

/**
 * Mức độ biết một từ, như mọi module nhìn thấy:
 *   - 'known':    đã biết (tự đánh dấu, đánh dấu "Bỏ qua", hoặc thẻ Ôn tập đã thuộc)
 *   - 'learning': đang học (tự đánh dấu, hoặc đã có thẻ Ôn tập nhưng chưa thuộc)
 *   - 'new':      chưa gặp / chưa học
 */
export type WordStatus = 'known' | 'learning' | 'new'

/**
 * Trạng thái bạn TỰ đánh dấu (lưu trong bảng knownWords).
 * 'ignored' = "Bỏ qua": tên riêng, từ tượng thanh... không cần học, được tính như đã biết
 * nhưng hiện riêng trong danh sách để dễ tìm lại.
 */
export type ManualStatus = 'known' | 'learning' | 'ignored'

/** Một dòng trong bảng `knownWords`. */
export interface KnownWord {
  /** Chữ viết chính của từ (thể từ điển), cũng là khóa của bảng. Ví dụ 食べる. */
  w: string
  status: ManualStatus
  /** Cách đọc kana (không bắt buộc). */
  r?: string
  /** Mã từ trong Từ điển (JMdict), nếu biết. Khớp theo mã chắc chắn hơn khớp theo chữ. */
  id?: string
  /** Các cách viết khác cũng tính là từ này (vd viết bằng kana: わかる cho 分かる). */
  alt?: string[]
  /** Nơi đánh dấu: 'popup', 'anime', 'textbook', 'import'... (để biết từ đâu ra). */
  src?: string
  /** Thời điểm đánh dấu gần nhất (Date.now()). */
  at: number
}

/** Dữ liệu vào khi đánh dấu một từ. Chỉ cần `w`, các trường khác giúp khớp chính xác hơn. */
export interface WordInput {
  w: string
  r?: string
  id?: string
  alt?: string[]
}
