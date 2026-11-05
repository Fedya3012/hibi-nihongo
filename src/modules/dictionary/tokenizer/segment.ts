/**
 * GỘP MẢNH TÁCH TỪ THÀNH "TỪ" CHO NGƯỜI HỌC
 * Kuromoji tách rất nhỏ: 食べ | させ | られ | た. Người học muốn thấy một từ: 食べさせられた (gốc 食べる).
 * Luật gộp: động từ / tính từ / danh từ + する được nối thêm các trợ động từ, đuôi て/で/ば,
 * và các động từ phụ (いる, しまう...) đứng ngay sau.
 */
import type { IpadicToken } from 'kuromoji/src/Tokenizer'
import type { Segment } from '../types'
import { kataToHira } from '../lib/kana'

const TE_PARTICLES = new Set(['て', 'で', 'ば', 'ちゃ', 'じゃ', 'たり', 'だり', 'ながら'])

/** Mảnh này có được nối vào từ đứng trước (đang là động từ/tính từ) không? */
function attaches(t: IpadicToken): boolean {
  if (t.pos === '助動詞') return true
  if (t.pos === '動詞' && (t.pos_detail_1 === '接尾' || t.pos_detail_1 === '非自立')) return true
  if (t.pos === '形容詞' && t.pos_detail_1 === '非自立') return true
  if (t.pos === '助詞' && t.pos_detail_1 === '接続助詞' && TE_PARTICLES.has(t.surface_form)) return true
  return false
}

const isHead = (t: IpadicToken) => t.pos === '動詞' || t.pos === '形容詞'
const isSuruNoun = (t: IpadicToken) => t.pos === '名詞' && t.pos_detail_1 === 'サ変接続'

export function groupTokens(tokens: IpadicToken[]): Segment[] {
  const out: Segment[] = []
  let pos = 0
  for (let i = 0; i < tokens.length; i++) {
    const head = tokens[i]
    const group = [head]
    let base = head.basic_form && head.basic_form !== '*' ? head.basic_form : head.surface_form
    // danh từ + する: 勉強 + し + ます → 勉強します (gốc 勉強する)
    if (isSuruNoun(head) && tokens[i + 1]?.pos === '動詞' && tokens[i + 1].basic_form === 'する') {
      group.push(tokens[++i])
      base = head.surface_form + 'する'
    }
    if (isHead(group[group.length - 1])) {
      while (i + 1 < tokens.length && attaches(tokens[i + 1])) {
        // Không gộp だ/です sau động từ (ví dụ 食べるんです: ん là danh từ nên đã dừng ở đó)
        const nx = tokens[i + 1]
        if (nx.pos === '助動詞' && (nx.basic_form === 'だ' || nx.basic_form === 'です')) break
        group.push(tokens[++i])
      }
    }
    const surface = group.map((t) => t.surface_form).join('')
    const known = group.every((t) => t.reading && t.reading !== '*')
    const start = pos
    pos += surface.length
    out.push({
      surface, base,
      reading: known ? kataToHira(group.map((t) => t.reading).join('')) : '',
      pos: head.pos, posDetail: head.pos_detail_1 === '*' ? '' : head.pos_detail_1,
      start, end: pos,
      parts: group.map((t) => ({ surface: t.surface_form, pos: t.pos, base: t.basic_form })),
    })
  }
  return out
}
