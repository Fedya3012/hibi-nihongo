/**
 * CÂU VÍ DỤ: tra trong gói `tatoeba-ja` đã cài trên máy (offline).
 *   getExamples('1358280')   → các câu ví dụ của 食べる, câu tốt nhất trước
 *   exampleParts(ex)         → chia câu thành từng mảnh để hiện furigana và tô đậm từ đang học
 */
import { findByKey } from '@/core/db'
import { EXAMPLE_PACK, type Example, type ExampleData } from '../types'

const cache = new Map<string, Promise<Example[]>>()

/** Các câu ví dụ của một từ (id JMdict), sắp theo thứ hạng. Chưa cài gói thì trả về []. */
export function getExamples(wordId: string, limit = 5): Promise<Example[]> {
  let p = cache.get(wordId)
  if (!p) {
    p = findByKey<ExampleData>(wordId, { pack: EXAMPLE_PACK }).then((items) =>
      items
        .flatMap((it) => {
          const w = it.data.w.find((x) => x[0] === wordId)
          return w ? [{ ex: { id: it.id, data: it.data, start: w[1], length: w[2] }, rank: w[3] }] : []
        })
        .sort((a, b) => a.rank - b.rank)
        .map((x) => x.ex))
    cache.set(wordId, p)
    if (cache.size > 500) cache.delete(cache.keys().next().value as string)
    p.catch(() => cache.delete(wordId))
  }
  return p.then((l) => l.slice(0, limit))
}

/** Xóa bộ đệm (gọi sau khi cài/cập nhật gói). */
export const clearExampleCache = () => cache.clear()

export interface ExamplePart {
  text: string
  rt?: string // furigana
  hit?: boolean // thuộc từ đang tra
}

/** Chia câu thành mảnh: cụm Kanji có furigana, và đánh dấu phần là từ đang tra (để tô đậm). */
export function exampleParts(ex: Example): ExamplePart[] {
  const { t, r = [] } = ex.data
  const a = ex.start, b = ex.start + ex.length
  // Các điểm cắt: ranh giới furigana và ranh giới từ được tô
  const cuts = new Set([0, t.length, a, b])
  for (const [s, l] of r) { cuts.add(s); cuts.add(s + l) }
  const points = [...cuts].filter((x) => x >= 0 && x <= t.length).sort((x, y) => x - y)
  const rubyAt = new Map(r.map(([s, l, rt]) => [s, { end: s + l, rt }]))
  const out: ExamplePart[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const s = points[i]
    const ruby = rubyAt.get(s)
    // Cụm Kanji có furigana giữ nguyên một khối (không cắt giữa chừng)
    const e = ruby ? ruby.end : points[i + 1]
    if (ruby) while (points[i + 1] < e) i++
    out.push({ text: t.slice(s, e), rt: ruby?.rt, hit: s >= a && e <= b && a < b })
  }
  return out
}

/** Câu dạng điền chỗ trống cho thẻ Ôn tập: 卵を{{食べる}}と… */
export function exampleCloze(ex: Example): string {
  const { t } = ex.data
  return t.slice(0, ex.start) + '{{' + t.slice(ex.start, ex.start + ex.length) + '}}' + t.slice(ex.start + ex.length)
}

/** Đường dẫn câu trên Tatoeba (ghi công nguồn). */
export const tatoebaUrl = (id: string) => `https://tatoeba.org/vi/sentences/show/${id}`
