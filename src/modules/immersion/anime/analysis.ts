/**
 * PHÂN TÍCH PHỤ ĐỀ VÀ ĐIỂM HIỂU (Comprehension Score)
 *
 * 1. Tách từng dòng phụ đề thành từ (bộ tách từ của module Từ điển), đếm mỗi từ xuất hiện bao nhiêu lần.
 *    Bỏ qua trợ từ (は, が...), đuôi câu, dấu câu, số, tên riêng: những thứ này không cần "học" như từ vựng.
 * 2. So với thẻ Ôn tập (SRS) của bạn:
 *      - "Đã biết":  thẻ đã qua giai đoạn học (trạng thái Review), hoặc bạn đánh dấu "Đã biết".
 *      - "Đang học": đã có thẻ nhưng chưa thuộc.
 *      - "Mới":      chưa có thẻ.
 * 3. Điểm hiểu = số lần gặp từ đã biết / tổng số lần gặp từ (tính theo lượt, nên từ hay gặp quan trọng hơn).
 *    Nghiên cứu về đọc hiểu cho thấy biết ~95–98% từ thì xem/đọc khá thoải mái.
 */
import { getAll, useDbQuery } from '@/core/db'
import { hasJapanese, isKanji, kataToHira, tokenize, type Segment } from '@/modules/dictionary'
import { CardState, type SrsCard } from '@/modules/review/types'
import { getKnownWords, getSubs, putSubs, updateEpisode } from './store'
import type { AnimeEpisode, Cue, SubAnalysis, WordStat } from './types'

export const ANALYSIS_VERSION = 1

/** Từ loại không tính là "từ vựng cần học". */
const SKIP_POS = new Set(['助詞', '助動詞', '記号', '補助記号', 'フィラー', '感動詞', 'その他', '接頭詞'])
const SKIP_NOUN = new Set(['数', '固有名詞', '接尾'])

export function isStudyWord(seg: Segment): boolean {
  if (!hasJapanese(seg.surface) || SKIP_POS.has(seg.pos)) return false
  if (seg.pos === '名詞' && SKIP_NOUN.has(seg.posDetail)) return false
  // の, ん, こ... (danh từ phụ thuộc chỉ một chữ kana) là ngữ pháp, không phải từ vựng
  if (seg.posDetail === '非自立' && /^[぀-ゟ]$/.test(seg.surface)) return false
  // Chỉ có ー, っ, ッ (tiếng kêu kéo dài)
  if (/^[ーっッ〜]+$/.test(seg.surface)) return false
  return true
}

/** Phân tích toàn bộ phụ đề một tập. onProgress(0..1) để hiện thanh tiến độ. */
export async function analyzeCues(cues: Cue[], onProgress?: (p: number) => void): Promise<SubAnalysis> {
  const words = new Map<string, WordStat>()
  const kanji = new Map<string, number>()
  let tokens = 0
  const BATCH = 25
  for (let i = 0; i < cues.length; i += BATCH) {
    const chunk = cues.slice(i, i + BATCH)
    const segLists = await Promise.all(chunk.map((c) => tokenize(c.t.replace(/\n/g, ' '))))
    segLists.forEach((segs, j) => {
      for (const seg of segs) {
        if (!isStudyWord(seg)) continue
        tokens++
        const w = seg.base || seg.surface
        const st = words.get(w)
        if (st) st.n++
        else words.set(w, {
          w, s: seg.surface, n: 1, c: i + j, p: seg.pos,
          r: seg.surface === w && seg.reading ? seg.reading : undefined,
        })
      }
    })
    for (const c of chunk) for (const ch of c.t) if (isKanji(ch)) kanji.set(ch, (kanji.get(ch) ?? 0) + 1)
    onProgress?.(Math.min(1, (i + BATCH) / cues.length))
  }
  return {
    v: ANALYSIS_VERSION,
    tokens,
    words: [...words.values()].sort((a, b) => b.n - a.n),
    kanji: [...kanji].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n),
  }
}

/** Đảm bảo tập đã được phân tích (phân tích lại nếu cách phân tích đã đổi). Trả về undefined nếu chưa có phụ đề. */
export async function ensureAnalysis(ep: AnimeEpisode, onProgress?: (p: number) => void): Promise<SubAnalysis | undefined> {
  const subs = await getSubs(ep.id, 'jp')
  if (!subs) return undefined
  if (subs.analysis?.v === ANALYSIS_VERSION) return subs.analysis
  const analysis = await analyzeCues(subs.cues, onProgress)
  await putSubs({ ...subs, analysis })
  await updateEpisode(ep.id, { stats: { tokens: analysis.tokens, unique: analysis.words.length, lines: subs.cues.length } })
  return analysis
}

// ---------- So với thẻ ôn tập ----------

export type WordStatus = 'known' | 'learning' | 'new'

export interface Knowledge {
  vocab: Map<string, WordStatus>
  kanji: Map<string, WordStatus>
  /** Từ bạn đánh dấu "Đã biết" (không cần tạo thẻ). */
  manual: Set<string>
}

const better = (a: WordStatus | undefined, b: WordStatus): WordStatus => (a === 'known' || b === 'known' ? 'known' : 'learning')
const onlyKana = (s: string) => /^[぀-ヿー]+$/.test(s)

/** Đọc toàn bộ thẻ ôn tập một lần, gom thành bảng tra "từ → đã biết / đang học". */
export async function loadKnowledge(): Promise<Knowledge> {
  const [cards, manual] = await Promise.all([getAll<SrsCard>('srsCards'), getKnownWords()])
  const vocab = new Map<string, WordStatus>()
  const kanji = new Map<string, WordStatus>()
  for (const c of cards) {
    const st: WordStatus = c.state === CardState.Review && !c.suspended ? 'known' : 'learning'
    if (c.kind === 'kanji') {
      for (const ch of c.front) if (isKanji(ch)) kanji.set(ch, better(kanji.get(ch), st))
      continue
    }
    if (c.kind !== 'vocab') continue
    const front = c.front.trim()
    vocab.set(front, better(vocab.get(front), st))
    // Thẻ viết bằng kana: khớp cả bản hiragana (thẻ ケーキ vẫn khớp từ ケーキ trong phụ đề)
    if (onlyKana(front)) vocab.set(kataToHira(front), better(vocab.get(kataToHira(front)), st))
  }
  return { vocab, kanji, manual }
}

export function wordStatus(w: Pick<WordStat, 'w' | 'r'>, k: Knowledge): WordStatus {
  if (k.manual.has(w.w)) return 'known'
  const direct = k.vocab.get(w.w) ?? (onlyKana(w.w) ? k.vocab.get(kataToHira(w.w)) : undefined)
  return direct ?? 'new'
}

export const kanjiStatus = (ch: string, k: Knowledge): WordStatus => k.kanji.get(ch) ?? 'new'

export interface Comprehension {
  /** Tỉ lệ (0..1) lượt từ đã biết. */
  known: number
  /** Tỉ lệ lượt từ đang học. */
  learning: number
  /** Số từ khác nhau chưa có thẻ. */
  newUnique: number
  totalUnique: number
}

export function comprehension(a: SubAnalysis, k: Knowledge): Comprehension {
  let known = 0, learning = 0, newUnique = 0
  for (const w of a.words) {
    const st = wordStatus(w, k)
    if (st === 'known') known += w.n
    else if (st === 'learning') learning += w.n
    else newUnique++
  }
  const t = a.tokens || 1
  return { known: known / t, learning: learning / t, newUnique, totalUnique: a.words.length }
}

/** Lời nhận xét ngắn theo điểm hiểu. */
export function comprehensionLabel(known: number): string {
  if (known >= 0.95) return 'Xem thoải mái'
  if (known >= 0.85) return 'Vừa sức: hợp để học'
  if (known >= 0.65) return 'Hơi khó: nên học trước từ hay gặp'
  return 'Khó: nên học trước một số từ'
}

/** Hook React: bảng "từ → trạng thái", tự cập nhật khi bạn ôn thẻ hoặc thêm thẻ. */
export function useKnowledge(): Knowledge | undefined {
  return useDbQuery(loadKnowledge, [], ['srsCards', 'kv']).data
}
