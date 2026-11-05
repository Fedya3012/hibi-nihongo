/**
 * TẠO CÂU HỎI LUYỆN TẬP từ câu ví dụ (không cần soạn riêng):
 *   - cloze   : câu có ô trống ở phần {{ }}, chọn 1 trong 4 đáp án
 *   - order   : xếp các cụm (ngăn bằng dấu cách) thành câu đúng
 *   - meaning : thấy mẫu ngữ pháp, chọn nghĩa đúng
 * Đáp án sai lấy từ các mẫu khác cùng nhóm, tránh những đáp án cũng đúng (alsoOk, EQUIV).
 */
import type { GrammarExample, GrammarPoint } from '../types'
import { blanks, chunkText, parseExample, plainText } from './parse'

export type QuestionType = 'cloze' | 'order' | 'meaning'

export type Question =
  | { type: 'cloze'; point: GrammarPoint; ex: GrammarExample; answer: string; options: string[] }
  | { type: 'order'; point: GrammarPoint; ex: GrammarExample; chunks: string[]; shuffled: number[] }
  | { type: 'meaning'; point: GrammarPoint; options: GrammarPoint[] }

/** Những đáp án gần như thay thế được cho nhau: không dùng cái này làm đáp án sai của cái kia. */
const EQUIV: string[][] = [
  ['へ', 'に'], ['から', 'ので'], ['が', 'けど'], ['ぐらい', 'くらい'],
  ['なければなりません', 'なければいけません'], ['ていただけませんか', 'てくださいませんか'],
  // N3–N1: các mẫu gần nghĩa, thường điền vào cùng một chỗ được
  ['わけがない', 'はずがない'], ['について', 'に関して'], ['についての', 'に関する'], ['によると', 'によれば'],
  ['ため', 'せいで'], ['にしたがって', 'につれて'], ['ながら', 'つつ'], ['ながらも', 'つつも'],
  ['以上', 'からには'], ['以上は', 'からには'], ['に際して', 'にあたって'], ['に際し', 'にあたり'],
  ['を通して', 'を通じて'], ['てたまらない', 'てならない'], ['でたまらない', 'でならない'],
  ['に限らず', 'だけでなく'], ['ばかりか', 'だけでなく'], ['ばかりか', 'どころか', 'はおろか'],
  ['や否や', 'が早いか', 'なり', 'や'], ['すら', 'さえ'], ['まみれ', 'だらけ'], ['とはいえ', 'といえども'],
]
const equivalents = (a: string) => new Set(EQUIV.filter((g) => g.includes(a)).flat())

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const clozeExamples = (p: GrammarPoint) => p.examples.filter((e) => blanks(e[0]).length === 1)
const orderExamples = (p: GrammarPoint) => p.examples.filter((e) => {
  const n = parseExample(e[0]).length
  return n >= 3 && n <= 7
})

/** Có thể hỏi mẫu này bằng những dạng nào. */
export function typesFor(p: GrammarPoint): QuestionType[] {
  const t: QuestionType[] = ['meaning']
  if (clozeExamples(p).length) t.push('cloze')
  if (orderExamples(p).length) t.push('order')
  return t
}

function makeCloze(p: GrammarPoint, all: GrammarPoint[]): Question | null {
  const ex = pick(clozeExamples(p))
  if (!ex) return null
  const answer = blanks(ex[0])[0]
  const banned = new Set([answer, ...(ex[2] ?? []), ...equivalents(answer)])
  // Đáp án sai: phần {{ }} của các câu khác, ưu tiên cùng nhóm và độ dài gần giống
  // Chỉ lấy từ các mẫu cùng cấp (học N5 thì không gặp đáp án N4); thiếu thì mới lấy cấp khác
  const sameLevel = all.filter((o) => o.level === p.level)
  const src = sameLevel.length > 10 ? sameLevel : all
  const pool = (same: boolean) => [...new Set(src
    .filter((o) => o.id !== p.id && (o.cat === p.cat) === same)
    .flatMap((o) => o.examples.flatMap((e) => blanks(e[0]))))]
    .filter((b) => b && !banned.has(b))
  const byLen = (list: string[]) => shuffle(list)
    .sort((a, b) => Math.abs([...a].length - [...answer].length) - Math.abs([...b].length - [...answer].length))
  const wrong = [...byLen(pool(true)).slice(0, 6), ...byLen(pool(false)).slice(0, 6)]
  const chosen: string[] = []
  for (const w of shuffle(wrong.slice(0, 6)).concat(wrong.slice(6))) {
    if (chosen.length === 3) break
    if (!chosen.includes(w)) chosen.push(w)
  }
  if (chosen.length < 3) return null
  return { type: 'cloze', point: p, ex, answer, options: shuffle([answer, ...chosen]) }
}

function makeOrder(p: GrammarPoint): Question | null {
  const ex = pick(orderExamples(p))
  if (!ex) return null
  const chunks = parseExample(ex[0]).map(chunkText)
  const idx = chunks.map((_, i) => i)
  let shuffled = shuffle(idx)
  for (let k = 0; k < 5 && shuffled.every((v, i) => chunks[v] === chunks[i]); k++) shuffled = shuffle(idx)
  return { type: 'order', point: p, ex, chunks, shuffled }
}

function makeMeaning(p: GrammarPoint, all: GrammarPoint[]): Question | null {
  const others = shuffle(all.filter((o) => o.id !== p.id && o.meaning !== p.meaning))
    .sort((a, b) => Number(b.cat === p.cat && b.level === p.level) - Number(a.cat === p.cat && a.level === p.level))
  if (others.length < 3) return null
  return { type: 'meaning', point: p, options: shuffle([p, ...others.slice(0, 3)]) }
}

/**
 * Tạo `count` câu hỏi từ các mẫu `points`. `all` = mọi mẫu (để lấy đáp án sai).
 * Mỗi mẫu xuất hiện lần lượt trước khi lặp lại; dạng câu hỏi chọn ngẫu nhiên trong `types`.
 */
export function buildQuiz(points: GrammarPoint[], all: GrammarPoint[], count: number, types: QuestionType[]): Question[] {
  const out: Question[] = []
  if (!points.length) return out
  let order = shuffle(points)
  let guard = 0
  while (out.length < count && guard++ < count * 6) {
    if (!order.length) order = shuffle(points)
    const p = order.pop()!
    const usable = typesFor(p).filter((t) => types.includes(t))
    if (!usable.length) continue
    const t = pick(usable)
    const q = t === 'cloze' ? makeCloze(p, all) : t === 'order' ? makeOrder(p) : makeMeaning(p, all)
    if (q) out.push(q)
  }
  return out
}

/** Kiểm tra câu đã xếp: so chữ ghép lại (hai cụm giống nhau đổi chỗ vẫn tính đúng). */
export const orderCorrect = (q: Extract<Question, { type: 'order' }>, picked: number[]) =>
  picked.map((i) => q.chunks[i]).join('') === q.chunks.join('')

export { plainText }
