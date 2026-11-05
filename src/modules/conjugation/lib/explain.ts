/**
 * DÙNG LẠI BỘ CHIA NGƯỢC CỦA TỪ ĐIỂN
 * ----------------------------------
 * - backChain: đưa đáp án về thể từ điển, liệt kê các bước (vd 書かなかった → phủ định → quá khứ),
 *   để người học thấy dạng chia được "ghép" từ những lớp nào.
 * - guessForm: người học gõ sai nhưng vẫn là MỘT dạng chia của từ đó → nói họ đã viết thể gì
 *   (vd hỏi thể て mà gõ 書いた → "quá khứ (~た)").
 * - fromDictionary: biến một kết quả tra từ điển thành từ để chia (cho Bảng chia).
 */
import { deinflect, type WordData } from '@/modules/dictionary'
import { T } from '@/modules/dictionary/lib/deinflect'
import type { ConjWord } from '../types'
import { normalizeKana } from './conjugate'

/** Thể từ điển mà bộ chia ngược sẽ tìm (いい → よい, 勉強する → する). */
// Loại từ của module → loại của bộ chia ngược (để 分かます không bị hiểu là 分かる chia như nhóm 2)
const TYPE: Record<ConjWord['c'], number> = { v5: T.V5, v1: T.V1, vs: T.VS, vk: T.VK, i: T.ADJ, na: 0 }

function target(w: ConjWord, form: string): { form: string; dict: string; type: number } | null {
  if (w.c === 'na') return null // tính từ -な: phần sau là だ/じゃない..., bộ chia ngược không xử lý
  form = form.replace(/くありませんでした$/, 'くなかった').replace(/くありません$/, 'くない').replace(/です$/, '')
  if (w.c === 'i' && w.r.endsWith('いい')) return { form, dict: w.r.slice(0, -2) + 'よい', type: T.ADJ }
  if (w.c === 'vs' && w.r !== 'する') {
    const pre = w.r.slice(0, -2)
    return form.startsWith(pre) ? { form: form.slice(pre.length), dict: 'する', type: T.VS } : null
  }
  return { form, dict: w.r, type: TYPE[w.c] }
}

function chain(w: ConjWord, form: string): string[] | null {
  const t = target(w, form)
  if (!t) return null
  const hit = deinflect(t.form).filter((c) => c.word === t.dict && (c.type & t.type) && c.reasons.length)
  if (!hit.length) return null
  // Ít bước nhất là cách hiểu tự nhiên nhất
  return hit.sort((a, b) => a.reasons.length - b.reasons.length)[0].reasons
}

/** Các bước chia ngược của đáp án (hiragana), hoặc null nếu không áp dụng. */
export const backChain = (w: ConjWord, answerKana: string) => chain(w, answerKana)

/** Người học gõ `input` (đã đổi sang kana): nếu đó là một dạng chia khác của từ này, trả về các bước. */
export function guessForm(w: ConjWord, input: string): string[] | null {
  const x = normalizeKana(input)
  if (!x) return null
  // 来る viết Kanji: bộ chia ngược hiểu thẳng 来ない → 来る
  if (w.c === 'vk' && x.includes('来')) return chain({ ...w, r: w.w }, x)
  // Gõ Kanji: đổi phần đầu Kanji sang cách đọc để chia ngược
  const stemW = w.w.slice(0, -1), stemR = w.r.slice(0, -1)
  const kana = x.startsWith(stemW) && stemW !== stemR ? stemR + x.slice(stemW.length) : x
  return chain(w, kana)
}

/** Từ loại JMdict → loại từ của module. null = không chia được ở đây. */
export function fromDictionary(d: WordData): ConjWord | null {
  const w = d.k?.[0]?.t ?? d.r[0].t
  const r = d.r[0].t
  const pos = d.s.flatMap((s) => s.p ?? [])
  const base = { w, r, lv: (d.j === 4 ? 4 : 5) as 4 | 5, m: '' }
  if (pos.includes('v1')) return { ...base, c: 'v1' }
  const v5 = pos.find((p) => p.startsWith('v5'))
  // v5aru (くださる: ください), v5u-s (問う: 問うて) chia bất quy tắc, không hỗ trợ
  if (v5 && v5 !== 'v5aru' && v5 !== 'v5u-s') return { ...base, c: 'v5' }
  if (pos.includes('vk') && w.endsWith('来る')) return { ...base, c: 'vk' }
  if ((pos.includes('vs-i') || pos.includes('vs-s')) && r.endsWith('する')) return { ...base, c: 'vs' }
  if (pos.includes('adj-i') || pos.includes('adj-ix')) return { ...base, c: 'i' }
  if (pos.includes('adj-na')) return { ...base, c: 'na' }
  if (pos.includes('vs')) return { ...base, w: w + 'する', r: r + 'する', c: 'vs' }
  return null
}
