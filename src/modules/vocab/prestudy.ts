/**
 * HỌC TRƯỚC TỪ CỦA MỘT CHƯƠNG / BÀI ĐỌC ("học 30 từ này để hiểu 90%")
 *
 * 1. analyzeLines(): tách từ cả chương, đếm mỗi từ gặp bao nhiêu LƯỢT (bỏ trợ từ, dấu câu, số, tên riêng).
 * 2. planPreStudy(): so với Kho từ (đã biết / đang học / mới), rồi chọn các từ MỚI gặp nhiều nhất
 *    cho đến khi đủ mục tiêu (ví dụ 90% lượt từ). Từ gặp nhiều được ưu tiên vì mỗi từ "mua" được nhiều %.
 *
 * Độ phủ tính theo lượt từ, giống điểm hiểu ở anime và trình đọc: biết ~90–95% thì đọc khá trôi.
 * Từ "đang học" (đã có thẻ Ôn tập) được tính vào độ phủ dự kiến, vì bạn đang ôn chúng rồi.
 */
import { tokenize } from '@/modules/dictionary/tokenizer'
import { kataToHira } from '@/modules/dictionary/lib/kana'
import { isStudyWord, wordStatus, type Knowledge } from './knowledge'
import type { WordStatus } from './types'

export interface StudyWord {
  /** Thể từ điển (食べる). */
  w: string
  /** Chữ đúng như lần gặp đầu tiên trong văn bản (食べた). */
  s: string
  /** Cách đọc (hiragana) do bộ tách từ đoán, chỉ khi chữ trong câu đúng là thể từ điển. Giúp chọn đúng 中 (なか) thay vì 中 (うち). */
  r?: string
  /** Số lượt gặp. */
  n: number
  /** Câu đầu tiên chứa từ (để làm câu ví dụ trên thẻ). */
  ex: string
}

export interface TextAnalysis {
  /** Tổng số lượt từ vựng. */
  tokens: number
  /** Xếp theo số lượt gặp, nhiều trước. */
  words: StudyWord[]
}

const ENDS = '。！？!?…'

/** Câu chứa vị trí i trong dòng (cắt theo 。！？), tối đa ~80 ký tự. */
function sentenceAround(line: string, i: number): string {
  let a = i
  while (a > 0 && !ENDS.includes(line[a - 1])) a--
  let b = i
  while (b < line.length && !ENDS.includes(line[b])) b++
  while (b < line.length && ENDS.includes(line[b])) b++
  if (b < line.length && /[」』）)]/.test(line[b])) b++
  let s = line.slice(a, b).trim().replace(/^[」』）)]+/, '')
  if (s.length > 100) s = line.slice(Math.max(a, i - 40), Math.min(b, i + 40)).trim()
  return s
}

// Phân tích tốn thời gian (tách từ cả chương) → nhớ kết quả theo nội dung, mở lại là có ngay
const cache = new Map<string, TextAnalysis>()

export async function analyzeLines(lines: string[], onProgress?: (p: number) => void): Promise<TextAnalysis> {
  const clean = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const key = clean.join('\n')
  const hit = cache.get(key)
  if (hit) return hit

  const words = new Map<string, StudyWord>()
  let tokens = 0
  const BATCH = 20
  for (let i = 0; i < clean.length; i += BATCH) {
    const chunk = clean.slice(i, i + BATCH)
    const lists = await Promise.all(chunk.map((l) => tokenize(l)))
    lists.forEach((segs, j) => {
      for (const seg of segs) {
        if (!isStudyWord(seg)) continue
        tokens++
        const w = seg.base && seg.base !== '*' ? seg.base : seg.surface
        const st = words.get(w)
        if (st) st.n++
        else words.set(w, {
          w, s: seg.surface, n: 1, ex: sentenceAround(chunk[j], seg.start),
          r: seg.surface === w && seg.reading && seg.reading !== '*' ? kataToHira(seg.reading) : undefined,
        })
      }
    })
    onProgress?.(Math.min(1, (i + BATCH) / clean.length))
  }
  const a: TextAnalysis = { tokens, words: [...words.values()].sort((x, y) => y.n - x.n) }
  if (cache.size > 20) cache.delete(cache.keys().next().value as string)
  cache.set(key, a)
  return a
}

/** Trạng thái của một từ trong bảng phân tích (thử cả thể từ điển lẫn chữ trong câu). */
export const studyWordStatus = (k: Knowledge, w: StudyWord): WordStatus =>
  wordStatus(k, { w: w.w, alt: w.s !== w.w ? [w.s] : undefined })

export interface PreStudyPlan {
  /** Tỉ lệ (0..1) lượt từ đã biết. */
  known: number
  /** Tỉ lệ lượt từ đang học. */
  learning: number
  /** Mục tiêu (0..1). */
  target: number
  /** Các từ mới nên học trước, theo thứ tự ưu tiên. Rỗng nếu đã đạt mục tiêu. */
  pick: StudyWord[]
  /** Độ phủ (0..1) nếu học hết pick (tính cả từ đang học). */
  after: number
  /** false nếu học hết mọi từ mới vẫn chưa tới mục tiêu (hiếm, ví dụ văn bản quá ngắn). */
  reachable: boolean
  /** Mọi từ mới trong văn bản (để xem thêm ngoài kế hoạch). */
  allNew: StudyWord[]
}

export function planPreStudy(a: TextAnalysis, k: Knowledge, target: number): PreStudyPlan {
  let known = 0, learning = 0
  const allNew: StudyWord[] = []
  for (const w of a.words) {
    const st = studyWordStatus(k, w)
    if (st === 'known') known += w.n
    else if (st === 'learning') learning += w.n
    else allNew.push(w)
  }
  const t = a.tokens || 1
  let covered = known + learning
  const pick: StudyWord[] = []
  for (const w of allNew) {
    if (covered / t >= target) break
    pick.push(w)
    covered += w.n
  }
  return {
    known: known / t, learning: learning / t, target, pick, allNew,
    after: covered / t, reachable: covered / t >= target - 1e-9,
  }
}

/** Câu ví dụ dạng điền chỗ trống cho thẻ: 水が{{飲みたい}}です。 */
export const clozeOf = (w: StudyWord): string | undefined =>
  !w.ex ? undefined : w.ex.includes(w.s) ? w.ex.replace(w.s, `{{${w.s}}}`) : w.ex
