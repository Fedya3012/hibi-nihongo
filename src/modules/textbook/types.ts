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
  /** Bài N bắt đầu ở trang nào của file sách (bạn tự gắn trong trình đọc). Trang đếm từ 0. */
  lessonPages?: Record<number, { fileId: string; page: number }>
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

/** Ghi chú và ví dụ riêng cho một mẫu ngữ pháp trong bài. */
export interface GrammarExtra {
  note?: string
  /** Ví dụ trong sách: [câu tiếng Nhật, nghĩa]. */
  examples?: [string, string][]
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
  /** Phần riêng của bạn cho từng mẫu ngữ pháp trong bài: ghi chú, ví dụ chép từ sách. Khóa = mã mẫu. */
  grammarExtra?: Record<string, GrammarExtra>
  /** Kanji thêm tay (ngoài các chữ tự rút ra từ từ vựng). */
  kanjiExtra?: string
  /** Hội thoại, bài nghe, bài đọc bạn chép từ sách (mục Hội thoại / Luyện nghe / Đọc hiểu). */
  tracks?: Track[]
  /** Bài viết của bạn (mục Đọc hiểu · Viết). */
  writing?: string
  /** Bài tập bạn chép từ sách (mục Bài tập). */
  exercises?: ExerciseSet[]
  /** Kết quả làm bài tập theo từng câu: đúng / sai bao nhiêu lần, câu trả lời sai gần nhất. */
  exStats?: Record<string, ExStat>
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

/**
 * File sách gốc của bạn (PDF hoặc ảnh scan), để đọc ngay trong app. Bảng `textbookMedia`
 * (không sao lưu vì nặng; ghi chú trên sách thì có sao lưu, xem BookNote).
 */
export interface BookFile {
  id: string
  bookId: string
  /** Luôn là `${bookId}:book` (chỉ mục by_lesson của bảng textbookMedia dùng chung với audio của bài). */
  lessonId: string
  kind: 'pdf' | 'images'
  name: string
  size: number
  pageCount: number
  /** File PDF. */
  blob?: Blob
  /** Ảnh scan, mỗi ảnh một trang, theo thứ tự tên file. */
  images?: Blob[]
  createdAt: number
  lastPage?: number
}

/** Vùng trên trang, tính theo tỉ lệ 0–1 của chiều rộng / cao trang (không phụ thuộc mức phóng to). */
export interface Rect { x: number; y: number; w: number; h: number }

export type NoteColor = 'yellow' | 'green' | 'red' | 'gray'

/**
 * Tô sáng / ghi chú / đánh dấu trang trên file sách. Bảng `textbookNotes` (có sao lưu).
 * - highlight: tô một vùng (kéo chuột) hoặc đoạn chữ đã chọn (nhiều ô `rects`), có thể kèm ghi chú
 * - note: ghim ghi chú tại một điểm
 * - bookmark: đánh dấu cả trang
 */
export interface BookNote {
  id: string
  bookId: string
  fileId: string
  page: number
  kind: 'highlight' | 'note' | 'bookmark'
  rects?: Rect[]
  color?: NoteColor
  /** Chữ đã chọn trên trang (PDF có chữ). */
  quote?: string
  text?: string
  createdAt: number
  updatedAt: number
}

/** Một câu trong đoạn hội thoại / bài nghe / bài đọc. */
export interface TrackLine {
  id: string
  speaker?: string
  jp: string
  vi?: string
  /** Giây bắt đầu của câu trong file audio (có sau khi bạn "đồng bộ"). */
  t?: number
}

/** Mục chứa đoạn văn: Hội thoại, Luyện nghe hay Đọc hiểu. */
export type TrackSection = 'dialogue' | 'listening' | 'reading'

/** Một đoạn hội thoại / bài nghe / bài đọc trong bài, có thể kèm file audio của bạn. */
export interface Track {
  id: string
  section: TrackSection
  title?: string
  lines: TrackLine[]
  /** Mã file audio trong bảng textbookMedia (LessonAudio). */
  audioId?: string
  createdAt: number
}

/** File audio bạn gắn cho một đoạn. Bảng `textbookMedia` (không sao lưu), `lessonId` = mã bài. */
export interface LessonAudio {
  id: string
  lessonId: string
  kind: 'audio'
  name: string
  size: number
  blob: Blob
  createdAt: number
}

/** Dạng câu bài tập: chọn đáp án · điền (một hoặc nhiều đáp án đúng) · sắp xếp các mảnh thành câu. */
export type ExKind = 'choice' | 'fill' | 'order'

export interface ExItem {
  id: string
  kind: ExKind
  /** Đề (câu có chỗ trống ＿＿ / （　）, hoặc câu hỏi). Dạng sắp xếp: có thể để trống. */
  q: string
  /** Dạng chọn: các lựa chọn. */
  options?: string[]
  /** choice: [lựa chọn đúng] · fill: các đáp án được chấp nhận · order: các mảnh theo đúng thứ tự. */
  answer: string[]
  explain?: string
}

export interface ExerciseSet {
  id: string
  title?: string
  items: ExItem[]
  createdAt: number
}

export interface ExStat { right: number; wrong: number; last: number; lastWrong?: string }
