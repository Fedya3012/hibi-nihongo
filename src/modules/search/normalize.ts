/** Chuẩn hóa chữ để so khớp: không phân biệt hoa/thường, dấu tiếng Việt, hiragana/katakana. */
import { hasJapanese, romajiToHiragana } from '@/modules/dictionary'
import type { SearchQuery } from './types'

export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .normalize('NFC')
}

export function makeQuery(input: string): SearchQuery {
  const raw = input.trim().replace(/\s+/g, ' ')
  const norm = normalize(raw)
  const hasJp = hasJapanese(raw)
  const kana = hasJp ? norm : (/^[a-z' -]+$/.test(norm) && romajiToHiragana(norm.replace(/[' -]/g, ''))) || ''
  return { raw, norm, kana, hasJp }
}

/**
 * Điểm khớp của một chuỗi với câu tìm (0 = không khớp).
 * Trùng hẳn 100 · bắt đầu bằng 80 · một chữ trong đó bắt đầu bằng 60 · chứa ở giữa 40.
 */
export function matchText(text: string | undefined, q: SearchQuery): number {
  if (!text) return 0
  const t = normalize(text)
  let best = 0
  for (const needle of q.kana && q.kana !== q.norm ? [q.norm, q.kana] : [q.norm]) {
    if (!needle) continue
    let s = 0
    if (t === needle) s = 100
    else if (t.startsWith(needle)) s = 80
    else if (t.includes(' ' + needle) || t.includes('\n' + needle)) s = 60
    else if (t.includes(needle)) s = 40
    if (s > best) best = s
  }
  return best
}

/** Điểm cao nhất trong nhiều trường (trường đầu được cộng thêm chút để ưu tiên tiêu đề). */
export function matchFields(q: SearchQuery, ...fields: (string | undefined)[]): number {
  let best = 0
  fields.forEach((f, i) => {
    const s = matchText(f, q)
    if (s) best = Math.max(best, s + (i === 0 ? 5 : 0) - i)
  })
  return best
}

/** Cắt đoạn văn quanh chỗ khớp, để hiện một dòng ngắn. */
export function snippet(text: string, q: SearchQuery, width = 60): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= width) return flat
  const i = normalize(flat).indexOf(q.norm)
  if (i < 0) return flat.slice(0, width - 1) + '…'
  const start = Math.max(0, i - Math.floor(width / 3))
  return (start > 0 ? '…' : '') + flat.slice(start, start + width) + (start + width < flat.length ? '…' : '')
}
