/**
 * KIỂU DỮ LIỆU CỦA MODULE GIÁO TRÌNH
 * App chỉ có "khung" sách (tên, số bài). Từ vựng, ghi chú, audio của từng bài do người dùng tự nhập
 * từ sách của mình, vì nội dung Minna no Nihongo / Genki có bản quyền.
 */

/** Sách mà module Ngữ pháp biết số bài (để tự gợi ý mẫu ngữ pháp theo bài). */
export type GrammarBook = 'minna' | 'genki'

/** Một cuốn giáo trình trên kệ sách. Bảng `textbooks`. */
export interface Textbook {
  id: string // khung có sẵn: id của khung (vd 'minna-1'); sách tự tạo: id ngẫu nhiên
  title: string // tên đầy đủ, vd "Minna no Nihongo Sơ cấp I"
  short: string // tên ngắn cho tên bộ thẻ, vd "Minna I"
  edition?: string // vd "bản 2 (第2版)"
  template?: string // id khung gốc, nếu tạo từ khung có sẵn
  grammarBook?: GrammarBook
  /** Tiền tố nhãn thẻ Ôn tập, vd "minna" → thẻ của bài 5 có nhãn "minna-5". */
  tagPrefix: string
  firstLesson: number // số của bài đầu tiên (Minna II bắt đầu từ bài 26)
  lessonCount: number
  createdAt: number
  /** Học tuần tự: bài sau bị khóa cho tới khi bài trước xong hoặc thuộc đủ từ. */
  sequential?: boolean
  /** Tỉ lệ từ đã thuộc để mở khóa bài sau (0–1, mặc định 0.8). */
  unlockAt?: number
  /** Bài mở gần nhất (để "Tiếp tục bài…"). */
  lastLesson?: number
  lastOpenedAt?: number
}

export type LessonStatus = 'new' | 'learning' | 'done'

/** 7 mục cố định của một bài (thứ tự hiển thị). */
export const SECTIONS = ['vocab', 'grammar', 'dialogue', 'listening', 'exercise', 'kanji', 'reading'] as const
export type Section = (typeof SECTIONS)[number]

/** Loại từ (tự lấy từ Từ điển, sửa được). */
export type WordClass = 'noun' | 'verb' | 'i-adj' | 'na-adj' | 'adverb' | 'particle' | 'expression' | 'other'

/** Một từ trong bài, do người dùng nhập. */
export interface LessonWord {
  id: string
  word: string // chữ viết như trong sách, vd 食べます
  reading?: string // cách đọc kana, vd たべます
  meaning: string // nghĩa tiếng Việt (có thể trống nếu chưa nhập)
  /** Mã từ trong Từ điển (JMdict), nếu tìm thấy. Dùng để tra từ và để không tạo thẻ ôn trùng. */
  jmId?: string
  /** Gợi ý nghĩa tiếng Anh từ Từ điển, hiện khi chưa có nghĩa tiếng Việt. */
  en?: string
  wordClass?: WordClass
  /** Người dùng tự đánh dấu: true = đã thuộc, false = chưa thuộc. Không có = theo kết quả Ôn tập. */
  known?: boolean
  /** Ghi chú riêng cho từ này. */
  note?: string
}

/** Một bài của giáo trình. Bảng `textbookLessons`, khóa `${bookId}:${number}`. */
export interface Lesson {
  id: string
  bookId: string
  number: number
  title?: string // tên bài do người dùng tự đặt
  status: LessonStatus
  words: LessonWord[]
  notes?: string
  /** Mã mẫu ngữ pháp của bài (module Ngữ pháp). Không có = tự lấy theo số bài của sách. */
  grammarIds?: string[]
  /** Kanji thêm tay (ngoài các chữ tự rút ra từ từ vựng). */
  kanjiExtra?: string
  updatedAt: number
}

/** Khung sách có sẵn trong app (chỉ là thông tin sự thật: tên, phiên bản, số bài). */
export interface BookTemplate {
  id: string
  title: string
  short: string
  edition: string
  grammarBook: GrammarBook
  tagPrefix: string
  firstLesson: number
  lessonCount: number
}
