/**
 * ĐỌC CÂU VÍ DỤ VIẾT THEO QUY ƯỚC CỦA MODULE (xem GrammarExample trong ../types.ts):
 *   漢字[かんじ] = furigana · {{ }} = phần ngữ pháp chính · dấu cách = ranh giới cụm
 */

/** Một mảnh chữ: thường, hoặc Kanji có furigana. `hl` = nằm trong {{ }}. */
export interface Piece { text: string; rt?: string; hl: boolean }
/** Một cụm (giữa hai dấu cách). */
export type Chunk = Piece[]

const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/

/** Tách câu thành các cụm, mỗi cụm gồm các mảnh. */
export function parseExample(src: string): Chunk[] {
  const chunks: Chunk[] = []
  let cur: Chunk = []
  let hl = false
  let buf = ''
  const flush = () => { if (buf) { cur.push({ text: buf, hl }); buf = '' } }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (src.startsWith('{{', i)) { flush(); hl = true; i++; continue }
    if (src.startsWith('}}', i)) { flush(); hl = false; i++; continue }
    if (c === ' ') { flush(); if (cur.length) chunks.push(cur); cur = []; continue }
    if (c === '[') {
      const end = src.indexOf(']', i)
      if (end > i) {
        // Furigana cho cụm Kanji ngay trước dấu [
        let j = buf.length
        while (j > 0 && KANJI.test(buf[j - 1])) j--
        const base = buf.slice(j)
        buf = buf.slice(0, j)
        flush()
        cur.push({ text: base, rt: src.slice(i + 1, end), hl })
        i = end
        continue
      }
    }
    buf += c
  }
  flush()
  if (cur.length) chunks.push(cur)
  return chunks
}

/** Câu chữ thường, không furigana, không dấu cách (để đọc to, tra từ, sao chép). */
export const plainText = (src: string) => src.replace(/\[[^\]]*\]/g, '').replace(/\{\{|\}\}/g, '').replace(/ /g, '')

/** Câu cho thẻ Ôn tập: giữ {{ }} (dạng câu hỏi "Điền vào chỗ trống"), bỏ furigana và dấu cách. */
export const clozeText = (src: string) => src.replace(/\[[^\]]*\]/g, '').replace(/ /g, '')

/** Các phần nằm trong {{ }} (chữ thường). */
export const blanks = (src: string) => [...src.matchAll(/\{\{(.*?)\}\}/g)].map((m) => plainText(m[1]))

/** Chữ thường của một cụm. */
export const chunkText = (ch: Chunk) => ch.map((p) => p.text).join('')
