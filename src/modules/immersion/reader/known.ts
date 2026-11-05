/**
 * CẦU NỐI VỚI "KHO TỪ ĐÃ BIẾT"
 * ----------------------------
 * Trình đọc chỉ hỏi kho từ qua file này. Hiện tại kho từ dùng chung (module vocab) đang được làm
 * ở PR khác, nên tạm dùng cách của module anime: từ "đã biết" = thẻ Ôn tập đã thuộc, hoặc từ bạn
 * bấm "Đã biết" (lưu chung với anime ở kv `anime:known`).
 *
 * Khi module vocab có trên main: thay phần thân các hàm dưới đây bằng `@/modules/vocab/api`
 * (useKnowledge, segmentStatus, isStudyWord, coverageOf, setWordStatus). Tên hàm đã đặt giống.
 */
import type { Segment } from '@/modules/dictionary'
import {
  isStudyWord as animeIsStudyWord, useKnowledge as animeUseKnowledge, wordStatus, type Knowledge, type WordStatus,
} from '../anime/analysis'
import { setKnownWords } from '../anime/store'

export type { Knowledge, WordStatus }

export const useKnowledge = animeUseKnowledge
export const isStudyWord = animeIsStudyWord

/** Trạng thái của một "từ" do bộ tách từ đưa ra. */
export function segmentStatus(k: Knowledge, seg: Segment): WordStatus {
  const base = seg.base || seg.surface
  const st = wordStatus({ w: base, r: seg.reading || undefined }, k)
  if (st !== 'new' || base === seg.surface) return st
  return wordStatus({ w: seg.surface }, k)
}

export interface Coverage {
  /** Số lượt từ (bỏ trợ từ, dấu câu, tên riêng). */
  tokens: number
  /** Tỉ lệ 0..1 theo lượt. */
  known: number
  learning: number
  /** Các từ mới khác nhau (thể từ điển). */
  newWords: string[]
}

export function coverageOf(segs: Segment[], k: Knowledge): Coverage {
  let tokens = 0, known = 0, learning = 0
  const fresh = new Set<string>()
  for (const s of segs) {
    if (!isStudyWord(s)) continue
    tokens++
    const st = segmentStatus(k, s)
    if (st === 'known') known++
    else if (st === 'learning') learning++
    else fresh.add(s.base || s.surface)
  }
  const t = tokens || 1
  return { tokens, known: known / t, learning: learning / t, newWords: [...fresh] }
}

/** Đánh dấu / bỏ đánh dấu "Đã biết". */
export async function markKnown(word: string, known: boolean): Promise<void> {
  await setKnownWords([word], known)
}
