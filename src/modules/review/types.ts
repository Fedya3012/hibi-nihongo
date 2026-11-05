/**
 * KIỂU DỮ LIỆU CỦA MODULE ÔN TẬP
 * Một "thẻ" (SrsCard) gồm phần nội dung (chữ, cách đọc, nghĩa...) và phần lịch ôn (FSRS).
 */

/** Loại thẻ: quyết định cách hiển thị và các dạng câu hỏi dùng được. */
export type CardKind = 'vocab' | 'kanji' | 'grammar'

/** Trạng thái thẻ trong FSRS. */
export const CardState = {
  New: 0, // chưa học lần nào
  Learning: 1, // đang học lần đầu (nhắc lại sau vài phút)
  Review: 2, // đã thuộc, ôn theo ngày
  Relearning: 3, // đã quên, đang học lại
} as const
export type CardState = (typeof CardState)[keyof typeof CardState]

/** 4 mức tự chấm sau khi xem đáp án. */
export type Rating = 1 | 2 | 3 | 4 // 1 Again (Quên) · 2 Hard (Khó) · 3 Good (Được) · 4 Easy (Dễ)

/** Phần lịch ôn của thẻ, do thuật toán FSRS tính. */
export interface Schedule {
  state: CardState
  due: number // thời điểm đến hạn (Date.now())
  stability: number // "độ bền trí nhớ", tính bằng ngày: sau S ngày khả năng nhớ còn 90%
  difficulty: number // độ khó của thẻ, từ 1 (dễ) đến 10 (khó)
  reps: number // số lần đã ôn
  lapses: number // số lần quên (bấm Again khi đã thuộc)
  lastReview?: number
}

export interface SrsCard extends Schedule {
  id: string
  deck: string // tên bộ thẻ, ví dụ "Từ vựng N5"
  kind: CardKind
  /** Mặt chính bằng tiếng Nhật: từ, chữ Kanji hoặc mẫu ngữ pháp. */
  front: string
  /** Cách đọc bằng kana (từ vựng), hoặc âm On/Kun (kanji). */
  reading?: string
  /** Nghĩa tiếng Việt. */
  meaning: string
  /**
   * Câu ví dụ tiếng Nhật. Bọc phần cần điền trong {{ }} để có câu hỏi "Điền vào chỗ trống",
   * ví dụ: "水が{{飲みたい}}です。"
   */
  example?: string
  exampleMeaning?: string
  notes?: string
  /** Ảnh minh họa (vd ảnh panel manga), lưu dạng data URL JPEG để sao lưu được cùng file .json. */
  image?: string
  /** Tiếng nói gốc (vd đoạn thoại cắt từ anime), lưu dạng data URL (webm/opus hoặc mp4) để sao lưu được. */
  audio?: string
  tags?: string[]
  /** Thẻ được tạo từ module khác (từ điển, anime...), để không tạo trùng. */
  source?: { module: string; ref: string }
  suspended?: boolean // tạm ẩn khỏi lịch ôn
  /** "Chôn": tạm cất thẻ tới thời điểm này (thường là đầu ngày mai), sau đó tự quay lại. */
  buriedUntil?: number
  createdAt: number
}

/** Một dòng lịch sử ôn tập (dùng cho thống kê, heatmap, undo). */
export interface SrsLog {
  id?: number // tự tăng
  cardId: string
  rating: Rating
  reviewedAt: number
  stateBefore: CardState
  elapsedDays: number // số ngày kể từ lần ôn trước
  scheduledDays: number // khoảng cách tới lần ôn tiếp theo (ngày, có thể là số lẻ)
  durationMs: number // thời gian suy nghĩ
  question: QuestionType
}

/** Các dạng câu hỏi. */
export type QuestionType =
  | 'recognize' // thấy chữ Nhật → nhớ nghĩa
  | 'recall' // thấy nghĩa → nhớ chữ Nhật
  | 'choice' // thấy chữ Nhật → chọn nghĩa đúng trong 4
  | 'typing' // thấy chữ → gõ cách đọc (gõ romaji tự đổi sang kana)
  | 'cloze' // điền vào chỗ trống trong câu ví dụ

export type QuestionMode = 'mixed' | QuestionType

export interface ReviewSettings {
  /** Tỉ lệ nhớ mong muốn khi đến hạn (0.8–0.97). Cao hơn = ôn nhiều hơn nhưng nhớ chắc hơn. */
  retention: number
  newPerDay: number // số thẻ mới tối đa mỗi ngày
  maxInterval: number // khoảng cách tối đa giữa hai lần ôn (ngày)
  questionMode: QuestionMode
  /** Giờ bắt đầu "ngày mới" (0–23). 4 = sau 4 giờ sáng mới tính là ngày mới, hợp với người học khuya. */
  dayStartHour: number
  /**
   * Thẻ "khó nhớ" (leech): quên tới chừng này lần thì gắn nhãn "leech".
   * Học mãi không vào thường là do thẻ viết chưa tốt: nên sửa lại (thêm mẹo nhớ, ảnh, câu ví dụ).
   */
  leechThreshold: number
  leechAction: 'suspend' | 'tag' // tự tạm ẩn, hay chỉ gắn nhãn
}

export const DEFAULT_SETTINGS: ReviewSettings = {
  retention: 0.9,
  newPerDay: 10,
  maxInterval: 3650,
  questionMode: 'mixed',
  dayStartHour: 4,
  leechThreshold: 8,
  leechAction: 'tag',
}
