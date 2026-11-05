/**
 * TẠO BÀI LUYỆN: chọn ngẫu nhiên các cặp (từ, thể), tạo đáp án nhiễu cho dạng trắc nghiệm.
 * Đáp án nhiễu ưu tiên "lỗi hay gặp": chia nhóm 1 như nhóm 2 (帰る → 帰ない), sai biến âm て (書く → 書って),
 * chia tính từ -な đuôi い như tính từ -い (きれい → きれくない); thiếu thì lấy thể khác của cùng từ.
 */
import type { ConjResult, ConjWord, FormId } from '../types'
import { conjugate, conjugateAs, wrongTe } from './conjugate'
import { FORMS, formApplies, type FormInfo } from './forms'
import { wordKey } from '../data/words'
import type { ConjStats } from './progress'

export type Mode = 'type' | 'choice'

export interface Question {
  word: ConjWord
  form: FormInfo
  res: ConjResult
  /** Chỉ có ở dạng trắc nghiệm: 4 đáp án (cách viết như từ gốc), đã xáo */
  options?: string[]
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const CLASSES: ConjWord['c'][] = ['v5', 'v1', 'i', 'na']

/** 3 đáp án nhiễu cho một câu. */
export function distractors(w: ConjWord, f: FormId, res: ConjResult): string[] {
  const right = new Set([res.w, res.r, ...res.alt])
  const mistakes: string[] = []
  for (const c of CLASSES) {
    const x = conjugateAs(w, c, f)
    if (x) mistakes.push(x)
  }
  if (f === 'te' || f === 'ta' || f === 'tara') mistakes.push(...shuffle(wrongTe(w, f)).slice(0, 2))
  const others = shuffle(FORMS.filter((x) => x.id !== f && formApplies(w, x)).map((x) => conjugate(w, x.id)?.w).filter((x): x is string => !!x))
  const out: string[] = []
  for (const x of [...shuffle(mistakes), ...others]) {
    if (out.length >= 3) break
    if (!right.has(x) && !out.includes(x)) out.push(x)
  }
  return out
}

/** Độ "yếu" của một cặp: sai nhiều → hay được hỏi lại. */
function weight(stats: ConjStats | undefined, w: ConjWord, f: FormId): number {
  const s = stats?.forms[f]
  const k = stats?.words[wordKey(w)]
  const miss = (x?: { right: number; wrong: number }) => (x ? (x.wrong + 1) / (x.right + x.wrong + 2) : 0.5)
  return 0.2 + miss(s) + miss(k)
}

/**
 * Tạo bài luyện.
 * weak = true: ưu tiên thể / từ hay sai (theo thống kê), không thì chọn đều.
 */
export function buildQuiz(opts: {
  words: ConjWord[]; forms: FormInfo[]; count: number; mode: Mode; weak?: boolean; stats?: ConjStats
}): Question[] {
  const pairs: { w: ConjWord; f: FormInfo; wt: number }[] = []
  for (const w of opts.words) {
    for (const f of opts.forms) {
      if (!formApplies(w, f)) continue
      pairs.push({ w, f, wt: opts.weak ? weight(opts.stats, w, f.id) ** 2 : 1 })
    }
  }
  const out: Question[] = []
  const usedWord = new Map<string, number>()
  while (out.length < opts.count && pairs.length) {
    // Chọn theo trọng số; tránh lặp một từ quá nhiều lần trong một bài
    const total = pairs.reduce((s, p) => s + p.wt / (1 + (usedWord.get(wordKey(p.w)) ?? 0) * 3), 0)
    let r = Math.random() * total
    let i = 0
    for (; i < pairs.length - 1; i++) {
      r -= pairs[i].wt / (1 + (usedWord.get(wordKey(pairs[i].w)) ?? 0) * 3)
      if (r <= 0) break
    }
    const { w, f } = pairs.splice(i, 1)[0]
    const res = conjugate(w, f.id)
    if (!res) continue
    usedWord.set(wordKey(w), (usedWord.get(wordKey(w)) ?? 0) + 1)
    const q: Question = { word: w, form: f, res }
    if (opts.mode === 'choice') q.options = shuffle([res.w, ...distractors(w, f.id, res)])
    out.push(q)
  }
  return out
}
