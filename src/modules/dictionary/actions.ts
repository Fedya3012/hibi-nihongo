/**
 * THÊM TỪ VÀO ÔN TẬP (SRS)
 * Dùng API công khai của module Ôn tập. Thẻ trùng (cùng id từ điển) tự được bỏ qua.
 */
import { addReviewCards } from '@/modules/review/api'
import type { Example, KanjiData, WordData } from './types'
import { exampleCloze } from './lib/examples'

/** Chữ viết chính và cách đọc chính của một từ (ưu tiên dạng thông dụng). */
export function headword(d: WordData): { word: string; reading: string } {
  const reading = (d.r.find((r) => r.c) ?? d.r[0]).t
  const usuallyKana = d.s[0]?.m?.includes('uk')
  const k = d.k?.find((x) => x.c) ?? d.k?.[0]
  return { word: k && !usuallyKana ? k.t : reading, reading }
}

/**
 * Thêm từ vào Ôn tập. Truyền `example` (câu ví dụ) thì thẻ có thêm câu đó với từ được chừa trống,
 * nên khi ôn có cả dạng câu hỏi "Điền vào chỗ trống". Cùng một từ chỉ có một thẻ (id từ điển).
 */
export async function addWordToReview(id: string, d: WordData, example?: Example): Promise<boolean> {
  const { word, reading } = headword(d)
  const meaning = d.s.slice(0, 3).map((s) => s.g.slice(0, 3).join(', ')).join('; ')
  const n = await addReviewCards([{
    deck: 'Từ vựng của tôi', kind: 'vocab', front: word, reading: word === reading ? undefined : reading,
    meaning, tags: d.j ? [`N${d.j}`] : undefined, source: { module: 'dictionary', ref: id },
    ...(example && {
      example: exampleCloze(example),
      exampleMeaning: example.data.v ?? example.data.e,
      notes: `Câu ví dụ: Tatoeba #${example.id} (CC BY 2.0 FR)`,
    }),
  }])
  return n > 0
}

export async function addKanjiToReview(char: string, d: KanjiData): Promise<boolean> {
  const n = await addReviewCards([{
    deck: 'Kanji của tôi', kind: 'kanji', front: char,
    reading: [...(d.on ?? []), ...(d.kun ?? [])].join('、') || undefined,
    meaning: [d.hv?.length ? d.hv.join(', ').toUpperCase() : '', (d.m ?? []).join(', ')].filter(Boolean).join(' · '),
    tags: d.j ? [`N${d.j}`] : undefined, source: { module: 'dictionary', ref: 'kanji:' + char },
  }])
  return n > 0
}
