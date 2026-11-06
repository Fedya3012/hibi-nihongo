/**
 * SO SÁNH CÂU BẠN GÕ / NÓI VỚI CÂU GỐC (chép chính tả, shadowing)
 * Đưa cả hai về hiragana (Kanji → cách đọc nhờ bộ tách từ), bỏ dấu câu, rồi so từng chữ.
 */
import { hasJapanese, kataToHira, romajiToHiragana, tokenize } from '@/modules/dictionary'

const PUNCT = /[\s、。，．,.！？!?「」『』（）()【】・…‥〜~ー―\-"'“”♪☆★]/g

/** Cách đọc hiragana của một câu tiếng Nhật. */
export async function toReading(text: string): Promise<string> {
  const segs = await tokenize(text.replace(/\n/g, ' ')).catch(() => [])
  const r = segs.length ? segs.map((s) => s.reading || kataToHira(s.surface)).join('') : kataToHira(text)
  return r.replace(PUNCT, '')
}

/** Câu người dùng gõ: chấp nhận romaji (tự đổi), kana hoặc Kanji. */
export async function inputReading(input: string): Promise<string> {
  const t = input.trim()
  if (!t) return ''
  if (!hasJapanese(t)) return (romajiToHiragana(t) ?? t).replace(PUNCT, '')
  return toReading(t)
}

/** Bảng LCS để biết chữ nào của câu gốc đã có trong câu trả lời. */
function lcsMarks(target: string[], answer: string[]): boolean[] {
  const n = target.length, m = answer.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = target[i] === answer[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  }
  const marks = new Array(n).fill(false)
  let i = 0, j = 0
  while (i < n && j < m) {
    if (target[i] === answer[j]) { marks[i] = true; i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return marks
}

export interface MatchResult {
  /** 0..1: tỉ lệ chữ đúng (theo cách đọc). */
  score: number
  target: string
  answer: string
  /** Từng chữ của cách đọc gốc, đúng hay thiếu/sai. */
  chars: { ch: string; ok: boolean }[]
}

export function compareReadings(target: string, answer: string): MatchResult {
  const t = [...kataToHira(target)], a = [...kataToHira(answer)]
  const marks = lcsMarks(t, a)
  const hits = marks.filter(Boolean).length
  // Gõ thừa nhiều cũng bị trừ điểm
  const score = t.length ? hits / Math.max(t.length, a.length) : 0
  return { score, target, answer, chars: t.map((ch, i) => ({ ch, ok: marks[i] })) }
}
