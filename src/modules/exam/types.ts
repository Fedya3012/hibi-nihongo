/**
 * KIỂU DỮ LIỆU CỦA MODULE THI THỬ JLPT
 * Một đề = nhiều "buổi thi" (section, có giờ riêng, giống tờ đề thật), mỗi buổi gồm nhiều "dạng câu" (part,
 * giống 問題1, 問題2…). Mọi câu đều là trắc nghiệm 4 đáp án, nên một kiểu ExamQuestion dùng cho tất cả.
 * Đề được tạo tự động từ nội dung có sẵn trong app (từ điển, Kanji, Ngữ pháp, câu ví dụ Tatoeba).
 */

/** Cấp JLPT: 5 = N5 (dễ nhất) … 1 = N1. */
export type Level = 5 | 4 | 3 | 2 | 1

/** 'full' = đủ số câu và đủ giờ như đề thật; 'mini' = khoảng 1/3 đề, 1/3 thời gian. */
export type ExamMode = 'full' | 'mini'

/** Các dạng câu hỏi. */
export type PartId =
  | 'kanji' // 漢字読み: chữ gạch chân đọc là gì
  | 'writing' // 表記: chữ hiragana gạch chân viết bằng Kanji thế nào
  | 'context' // 文脈規定: chọn từ điền vào câu
  | 'meaning' // nghĩa của từ gạch chân (thay cho 言い換え: app chưa có dữ liệu từ đồng nghĩa)
  | 'grammar' // 文法形式の判断: chọn mẫu ngữ pháp điền vào chỗ trống
  | 'order' // 文の組み立て: sắp xếp, chọn cụm ở vị trí ★
  | 'reading' // đọc hiểu câu: chọn nghĩa đúng
  | 'passage' // 読解: đọc một đoạn văn, trả lời câu hỏi
  | 'listenWord' // nghe một từ, chọn cách viết đúng
  | 'listenSentence' // nghe một câu, chọn nghĩa (hoặc câu) đúng
  | 'dialogue' // 聴解: nghe hội thoại, trả lời câu hỏi

/** Nhóm tính điểm (giống bảng điểm JLPT). */
export type GroupId = 'langRead' | 'lang' | 'read' | 'listen'

/** Từ / mẫu ngữ pháp mà câu hỏi kiểm tra (để mở xem và thêm vào Ôn tập khi làm sai). */
export type QuestionRef =
  | { kind: 'word'; id: string; word: string; reading: string }
  | { kind: 'grammar'; id: string; pattern: string }

export interface ExamQuestion {
  id: string
  part: PartId
  /** Câu hỏi tiếng Nhật (có thể rỗng với bài nghe). */
  stem: string
  /** Đoạn gạch chân trong `stem`: [vị trí bắt đầu, vị trí kết thúc]. */
  mark?: [number, number]
  /** Câu/từ được đọc to (bài nghe), bằng giọng tiếng Nhật có sẵn trong máy. */
  audio?: string
  /** Đoạn văn của bài đọc dài (nhiều câu hỏi dùng chung một đoạn). */
  passage?: string
  /** Bài nghe hội thoại: tình huống + các lượt nói ('M' nam, 'F' nữ). */
  dialogue?: { intro: string; lines: ['M' | 'F', string][] }
  options: string[]
  /** Đáp án là chữ tiếng Nhật (hiện bằng font Nhật) hay tiếng Việt. */
  optionsJp: boolean
  /** Vị trí đáp án đúng trong `options`. */
  answer: number
  /** Giải thích / bản dịch, hiện khi xem lại. */
  explain?: string
  ref?: QuestionRef
}

/** Một buổi thi đã tạo câu hỏi. */
export interface ExamSection {
  id: string
  /** Tên buổi thi tiếng Nhật, ví dụ 言語知識（文字・語彙）. */
  title: string
  seconds: number
  questions: ExamQuestion[]
}

/** Bài thi đang làm (lưu trên máy để đóng app vẫn làm tiếp được). */
export interface ExamSession {
  id: string
  level: Level
  mode: ExamMode
  startedAt: number
  sections: ExamSection[]
  /** answers[buổi][câu] = vị trí đáp án đã chọn, null = chưa chọn. */
  answers: (number | null)[][]
  flags: boolean[][]
  /** Buổi đang làm. */
  current: number
  /** Số giây còn lại của buổi đang làm. */
  left: number
  /** Giây đã dùng của từng buổi (để xem lại). */
  used: number[]
  /** Đang nghỉ giữa hai buổi. */
  onBreak?: boolean
  /** Dạng câu thiếu nội dung: số câu ít hơn đề chuẩn. */
  short?: Partial<Record<PartId, number>>
}

/** Điểm một nhóm (đã quy về thang điểm JLPT). */
export interface GroupScore { id: GroupId; score: number; max: number; min: number; right: number; total: number }

/** Kết quả đã chấm, lưu vào lịch sử. */
export interface ExamResult {
  id: string
  level: Level
  mode: ExamMode
  at: number
  total: number
  max: number
  passMark: number
  passed: boolean
  groups: GroupScore[]
  parts: Partial<Record<PartId, { right: number; total: number }>>
  /** Thời gian đã dùng (giây) / thời gian cho phép. */
  used: number
  allowed: number
  /** Bài làm đầy đủ (để xem lại câu sai). Chỉ giữ cho vài lần gần nhất để kho dữ liệu không phình to. */
  session?: ExamSession
}
