/**
 * LƯU CÂU VÀO ÔN TẬP (sentence mining)
 * Người dùng tra một từ trong câu → tạo thẻ từ vựng có câu đó làm ví dụ (dạng điền chỗ trống {{từ}}).
 * Thẻ dùng cùng nguồn với nút "Thêm vào ôn tập" của Từ điển (id JMdict), nên không bị tạo trùng.
 */
import { headword, type Segment, type WordResult } from '@/modules/dictionary'
import { addReviewCards } from '@/modules/review/api'

const ENDS = '。！？!?…\n'
const CLOSE = '」』）)】〉》”’'

/** Câu chứa vị trí `i` trong đoạn văn (cắt theo 。！？). */
export function sentenceAt(para: string, i: number): string {
  let a = i
  while (a > 0 && !ENDS.includes(para[a - 1])) a--
  let b = i
  while (b < para.length && !ENDS.includes(para[b])) b++
  while (b < para.length && ENDS.includes(para[b]) && para[b] !== '\n') b++
  while (b < para.length && CLOSE.includes(para[b])) b++
  let s = para.slice(a, b).trim()
  // Câu bắt đầu bằng 」 thừa từ câu trước thì bỏ
  while (s && CLOSE.includes(s[0])) s = s.slice(1).trim()
  // Câu quá dài (văn không có dấu chấm): lấy khoảng 60 ký tự quanh từ
  if ([...s].length > 120) {
    const from = Math.max(0, i - a - 40)
    s = para.slice(a + from, Math.min(b, a + from + 80)).trim()
  }
  return s
}

export const glossOf = (r: WordResult) => r.data.s.slice(0, 3).map((s) => s.g.slice(0, 3).join(', ')).join('; ')

/** Thêm thẻ. Trả về false nếu từ đã có thẻ. */
export async function mineSentence(opts: { result: WordResult; seg: Segment; sentence: string; docTitle: string }): Promise<{ added: boolean; deck: string }> {
  const { result: r, seg, sentence, docTitle } = opts
  const { word, reading } = headword(r.data)
  const deck = `Đọc · ${docTitle}`.slice(0, 60)
  const example = sentence.includes(seg.surface) ? sentence.replace(seg.surface, `{{${seg.surface}}}`) : sentence
  const n = await addReviewCards([{
    deck, kind: 'vocab', front: word, reading: word === reading ? undefined : reading,
    meaning: glossOf(r), example, tags: ['reader', ...(r.data.j ? [`N${r.data.j}`] : [])],
    source: { module: 'dictionary', ref: r.id },
  }])
  return { added: n > 0, deck }
}
