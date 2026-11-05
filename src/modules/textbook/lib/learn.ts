/**
 * "HỌC BÀI NÀY": đưa từ vựng của bài vào Ôn tập.
 * - Từ đã có thẻ (vd thêm từ manga hay từ điển): KHÔNG tạo thẻ mới, chỉ gắn thêm nhãn của bài.
 * - Từ chưa có: tạo thẻ mới trong bộ thẻ "<Tên sách> · Bài N", có nhãn của bài.
 * Nhãn (vd "minna-5") dùng để tìm / ôn riêng từng bài trong Ôn tập.
 */
import { addReviewCards, tagReviewCards, type ReviewCardInput } from '@/modules/review/api'
import type { Lesson, LessonWord, Textbook } from '../types'

export const lessonTag = (b: Textbook, n: number) => `${b.tagPrefix}-${n}`
export const lessonDeck = (b: Textbook, n: number) => `${b.short} · Bài ${n}`

/** Nguồn của thẻ: dùng mã Từ điển nếu có, để mọi module cùng nhận ra một từ. */
const sourceOf = (l: Lesson, w: LessonWord) =>
  w.jmId ? { module: 'dictionary', ref: w.jmId } : { module: 'textbook', ref: `${l.id}:${w.word}:${w.reading ?? ''}` }

export interface LearnResult {
  added: number // thẻ mới
  tagged: number // từ đã có thẻ, được gắn thêm nhãn bài
  skipped: string[] // từ chưa có nghĩa nào (cả tiếng Việt lẫn gợi ý tiếng Anh) nên chưa tạo thẻ
}

export async function learnLesson(b: Textbook, l: Lesson): Promise<LearnResult> {
  const tag = lessonTag(b, l.number)
  const key = (s: { module: string; ref: string }) => `${s.module}:${s.ref}`
  const have = await tagReviewCards(l.words.map((w) => sourceOf(l, w)), tag)
  const skipped: string[] = []
  const inputs: ReviewCardInput[] = []
  for (const w of l.words) {
    const source = sourceOf(l, w)
    if (have.has(key(source))) continue
    const meaning = w.meaning.trim() || w.en?.trim()
    if (!meaning) { skipped.push(w.word); continue }
    inputs.push({
      deck: lessonDeck(b, l.number), kind: 'vocab', front: w.word,
      reading: w.reading && w.reading !== w.word ? w.reading : undefined,
      meaning, tags: [tag], source,
    })
  }
  const added = inputs.length ? await addReviewCards(inputs) : 0
  return { added, tagged: have.size, skipped }
}
