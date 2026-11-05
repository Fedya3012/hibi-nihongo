/**
 * TẠO ĐÁP ÁN NHIỄU GIỐNG ĐỀ THẬT
 *
 * Câu "đọc chữ Kanji" của JLPT hay đánh lừa bằng những cách đọc gần giống: thêm/bớt trường âm (こう / こ),
 * thêm/bớt âm ngắt (っ), có/không có dấu kêu (か / が), âm ghép to/nhỏ (よ / ょ). readingVariants() tạo
 * đúng những biến thể đó từ cách đọc đúng.
 *
 * Câu "viết Kanji" thì đánh lừa bằng chữ Kanji đồng âm (会議 / 会義). writingVariants() thay một chữ trong
 * từ bằng chữ khác có cùng âm On.
 */
import { shuffle } from './random'

const VOICED: Record<string, string> = {}
const PAIRS = ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つづ', 'てで', 'とど',
  'はば', 'ひび', 'ふぶ', 'へべ', 'ほぼ', 'ぱば', 'ぴび', 'ぷぶ', 'ぺべ', 'ぽぼ']
for (const [a, b] of PAIRS) { VOICED[a] ??= b; VOICED[b] ??= a }
// は↔ぱ cũng hay bị nhầm
for (const p of ['はぱ', 'ひぴ', 'ふぷ', 'へぺ', 'ほぽ']) VOICED[p[0] + '*'] = p[1]

const SMALL: Record<string, string> = { や: 'ゃ', ゆ: 'ゅ', よ: 'ょ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' }
const O_ROW = new Set([...'おこごそぞとどのほぼぽもよろょ'])
const U_ROW = new Set([...'うくぐすずつづぬふぶぷむゆるゅ'])
const E_ROW = new Set([...'えけげせぜてでねへべぺめれ'])
const GEMINATE_BEFORE = new Set([...'かきくけこさしすせそたちつてとぱぴぷぺぽ'])

/** Các cách đọc "gần đúng" của `reading` (không gồm chính nó). */
export function readingVariants(reading: string): string[] {
  const r = [...reading]
  const out = new Set<string>()
  const put = (arr: string[]) => { const s = arr.join(''); if (s && s !== reading) out.add(s) }

  for (let i = 0; i < r.length; i++) {
    const c = r[i]
    // Dấu kêu: か ↔ が, は ↔ ぱ
    if (VOICED[c]) put([...r.slice(0, i), VOICED[c], ...r.slice(i + 1)])
    if (VOICED[c + '*']) put([...r.slice(0, i), VOICED[c + '*'], ...r.slice(i + 1)])
    // Âm ghép: きょ ↔ きよ
    if (SMALL[c] && i > 0) put([...r.slice(0, i), SMALL[c], ...r.slice(i + 1)])
    // Trường âm: bỏ う sau hàng o/u, bỏ い sau hàng e
    if (c === 'う' && i > 0 && (O_ROW.has(r[i - 1]) || U_ROW.has(r[i - 1]))) put([...r.slice(0, i), ...r.slice(i + 1)])
    if (c === 'い' && i > 0 && E_ROW.has(r[i - 1])) put([...r.slice(0, i), ...r.slice(i + 1)])
    // Thêm trường âm sau hàng o/u (không thêm vào cuối từ để đỡ lộ)
    if ((O_ROW.has(c) || U_ROW.has(c)) && r[i + 1] !== 'う' && i < r.length - 1) put([...r.slice(0, i + 1), 'う', ...r.slice(i + 1)])
    // Âm ngắt: bỏ っ, hoặc thêm っ trước hàng k/s/t/p
    if (c === 'っ') put([...r.slice(0, i), ...r.slice(i + 1)])
    if (i > 0 && GEMINATE_BEFORE.has(c) && r[i - 1] !== 'っ' && r[i - 1] !== 'ん') put([...r.slice(0, i), 'っ', ...r.slice(i)])
  }
  return shuffle([...out])
}

/**
 * Các cách viết sai của `word`: thay một chữ Kanji bằng chữ đồng âm (cùng âm On) trong `homophones`.
 * homophones: chữ Kanji → các chữ khác có cùng âm On.
 */
export function writingVariants(word: string, homophones: Map<string, string[]>): string[] {
  const chars = [...word]
  const out = new Set<string>()
  chars.forEach((c, i) => {
    for (const h of homophones.get(c) ?? []) {
      if (chars.includes(h)) continue
      const s = [...chars.slice(0, i), h, ...chars.slice(i + 1)].join('')
      if (s !== word) out.add(s)
    }
  })
  return shuffle([...out])
}
