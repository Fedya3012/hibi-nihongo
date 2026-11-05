/**
 * THÊM TỪ VÀO ÔN TẬP (SRS)
 * Dùng API công khai của module Ôn tập. Thẻ trùng (cùng id từ điển) tự được bỏ qua.
 */
import { addReviewCards } from '@/modules/review/api'
import type { KanjiData, WordData } from './types'

/** Chữ viết chính và cách đọc chính của một từ (ưu tiên dạng thông dụng). */
export function headword(d: WordData): { word: string; reading: string } {
  const reading = (d.r.find((r) => r.c) ?? d.r[0]).t
  const usuallyKana = d.s[0]?.m?.includes('uk')
  const k = d.k?.find((x) => x.c) ?? d.k?.[0]
  return { word: k && !usuallyKana ? k.t : reading, reading }
}

export async function addWordToReview(id: string, d: WordData): Promise<boolean> {
  const { word, reading } = headword(d)
  const meaning = d.s.slice(0, 3).map((s) => s.g.slice(0, 3).join(', ')).join('; ')
  const n = await addReviewCards([{
    deck: 'Từ vựng của tôi', kind: 'vocab', front: word, reading: word === reading ? undefined : reading,
    meaning, tags: d.j ? [`N${d.j}`] : undefined, source: { module: 'dictionary', ref: id },
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
