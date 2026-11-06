/** KIỂU DỮ LIỆU CỦA TRUYỆN ĐỌC THEO CẤP ĐỘ */

/** Một câu: chữ Nhật + bản dịch tiếng Việt. Giọng máy đọc từng câu một. */
export interface Line {
  ja: string
  vi: string
}

/** Câu hỏi đọc hiểu cuối truyện (trắc nghiệm, `answer` là vị trí đáp án đúng, đếm từ 0). */
export interface Question {
  q: string
  options: string[]
  answer: number
}

export type Level = 5 | 4 | 3

export interface Story {
  id: string
  level: Level
  /** Tên tiếng Nhật. */
  title: string
  /** Tên tiếng Việt. */
  titleVi: string
  /** Một dòng giới thiệu (tiếng Việt). */
  blurb: string
  /** Các đoạn văn, mỗi đoạn là vài câu. */
  paras: Line[][]
  quiz: Question[]
}

/** Tiến độ của một truyện (lưu trên máy, khóa kv `stories:progress`). */
export interface StoryProgress {
  openedAt?: number
  finishedAt?: number
  /** Số câu hỏi trả lời đúng lần làm gần nhất. */
  score?: number
  total?: number
}
