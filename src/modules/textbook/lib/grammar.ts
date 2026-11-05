/**
 * NGỮ PHÁP CỦA BÀI (lấy từ module Ngữ pháp, không chép nội dung sách)
 * Mặc định: các mẫu mà module Ngữ pháp ghi là "dạy lần đầu ở bài N" của sách (trường `lessons`).
 * Bạn sửa danh sách cho bài thì bài lưu riêng `grammarIds` (kể cả danh sách rỗng).
 */
import { listGrammarPoints, type GrammarPoint } from '@/modules/grammar/api'
import type { Lesson, Textbook } from '../types'

export const loadAllGrammar = () => listGrammarPoints()

/** Mã các mẫu ngữ pháp của bài, theo thứ tự học. */
export function lessonGrammarIds(b: Textbook, l: Lesson, all: GrammarPoint[]): string[] {
  if (l.grammarIds) return l.grammarIds
  const book = b.grammarBook
  if (!book) return []
  return all.filter((p) => p.lessons?.[book] === l.number).map((p) => p.id)
}

/** Danh sách đang là mặc định của sách (chưa sửa tay)? */
export const isDefaultGrammar = (l: Lesson) => !l.grammarIds
