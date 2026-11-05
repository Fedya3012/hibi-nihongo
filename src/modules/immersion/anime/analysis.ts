/**
 * PHÂN TÍCH PHỤ ĐỀ VÀ ĐIỂM HIỂU (Comprehension Score)
 *
 * 1. Tách từng dòng phụ đề thành từ (bộ tách từ của module Từ điển), đếm mỗi từ xuất hiện bao nhiêu lần.
 *    Bỏ qua trợ từ (は, が...), đuôi câu, dấu câu, số, tên riêng: những thứ này không cần "học" như từ vựng.
 * 2. So với Kho từ của tôi (module vocab, dùng chung cả app: gộp từ bạn tự đánh dấu + thẻ Ôn tập):
 *      - "Đã biết":  bạn đánh dấu "Đã biết"/"Bỏ qua", hoặc thẻ đã qua giai đoạn học (trạng thái Review).
 *      - "Đang học": bạn đánh dấu "Đang học", hoặc đã có thẻ nhưng chưa thuộc.
 *      - "Mới":      còn lại.
 * 3. Điểm hiểu = số lần gặp từ đã biết / tổng số lần gặp từ (tính theo lượt, nên từ hay gặp quan trọng hơn).
 *    Nghiên cứu về đọc hiểu cho thấy biết ~95–98% từ thì xem/đọc khá thoải mái.
 */
import { isKanji, tokenize } from '@/modules/dictionary'
import {
  isStudyWord, kanjiStatus as sharedKanjiStatus, loadKnowledge as loadShared, useKnowledge as useShared,
  wordStatus as sharedWordStatus, type Knowledge, type WordStatus,
} from '@/modules/vocab/api'
import { getSubs, putSubs, updateEpisode } from './store'
import type { AnimeEpisode, Cue, SubAnalysis, WordStat } from './types'

export const ANALYSIS_VERSION = 1

// Từ nào tính là "từ vựng" (bỏ trợ từ, dấu câu, số, tên riêng...): dùng chung với Kho từ
export { isStudyWord }

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

// ---------- So với Kho từ của tôi (module vocab) ----------
// Trước đây Anime tự gom thẻ Ôn tập + danh sách "Đã biết" riêng (kv 'anime:known').
// Nay dùng kho chung; danh sách cũ được module vocab tự chuyển sang ở lần mở đầu tiên.

export type { Knowledge, WordStatus }

export const loadKnowledge = (): Promise<Knowledge> => loadShared()

export function wordStatus(w: Pick<WordStat, 'w' | 'r' | 's'>, k: Knowledge): WordStatus {
  return sharedWordStatus(k, { w: w.w, alt: w.s && w.s !== w.w ? [w.s] : undefined })
}

export const kanjiStatus = (ch: string, k: Knowledge): WordStatus => sharedKanjiStatus(k, ch)

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

/** Hook React: bảng "từ → trạng thái", tự cập nhật khi bạn ôn thẻ, thêm thẻ hoặc đánh dấu từ. */
export const useKnowledge = (): Knowledge | undefined => useShared()
