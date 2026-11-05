/**
 * API CÔNG KHAI CỦA KHO TỪ DÙNG CHUNG (module vocab) cho mọi module khác.
 *
 *   import { useKnowledge, segmentStatus, setWordStatus } from '@/modules/vocab/api'
 *
 *   // Biết một từ đang ở mức nào (tự đánh dấu > thẻ Ôn tập > mới):
 *   const k = useKnowledge()                          // hook, tự cập nhật
 *   const k2 = await loadKnowledge()                  // ngoài React
 *   wordStatus(k, '食べる')                            // 'known' | 'learning' | 'new'
 *   wordStatus(k, { w: '分かる', id: '1606560' })     // có mã JMdict thì khớp chắc chắn hơn
 *   segmentStatus(k, seg)                             // cho "từ" từ tokenize()
 *
 *   // Đánh dấu (null = bỏ đánh dấu). src = nơi đánh dấu, để biết từ đâu ra:
 *   await setWordStatus({ w: '食べる', r: 'たべる', id: '1358280' }, 'known', 'popup')
 *   await importWords(parseWordList(text), 'known', 'anki')   // nhập cả danh sách
 *
 *   // Tô màu: lớp CSS gạch chân theo tùy chọn của người dùng
 *   const mode = useVocabPrefs((s) => s.highlight)
 *   <span className={statusUnderline(segmentStatus(k, seg), mode)}>…</span>
 *
 *   // Tỉ lệ hiểu một đoạn văn (cho trình đọc văn bản, chọn bài đọc vừa sức...):
 *   const c = await textCoverage('昨日ケーキを食べた')  // c.known (0..1), c.newWords
 *
 *   // Tự vẽ câu (furigana riêng...): trạng thái từng ký tự
 *   const st = useCharStatus(sentence); statusUnderline(worstStatus(st, from, to), mode)
 *
 * Chi tiết: src/modules/vocab/README.md
 */
import { useEffect, useMemo, useState } from 'react'
import { tokenize } from '@/modules/dictionary/tokenizer'
import { coverageOf, isStudyWord, loadKnowledge, segmentStatus, useKnowledge, type Coverage } from './knowledge'
import type { WordStatus } from './types'

export type { WordStatus, ManualStatus, KnownWord, WordInput } from './types'
export {
  loadKnowledge, useKnowledge, wordStatus, manualStatus, srsStatus, segmentStatus, kanjiStatus,
  isStudyWord, coverageOf, normKey, type Knowledge, type Coverage,
} from './knowledge'
export { setWordStatus, importWords, parseWordList, listKnownWords, clearKnownWords, exportWordsText } from './actions'
export { useVocabPrefs, statusUnderline, type HighlightMode } from './prefs'
export { WordStatusPicker } from './components/StatusPicker'
export { HighlightSetting } from './components/HighlightSetting'

/** Tỉ lệ hiểu của một đoạn văn bất kỳ (tách từ + so với kho từ). */
export async function textCoverage(text: string): Promise<Coverage> {
  const [segs, k] = await Promise.all([tokenize(text), loadKnowledge()])
  return coverageOf(segs, k)
}

const RANK: Record<WordStatus, number> = { known: 0, learning: 1, new: 2 }

/**
 * Hook: trạng thái của TỪNG KÝ TỰ trong câu (theo từ chứa ký tự đó). undefined ở ký tự không thuộc
 * từ vựng nào (trợ từ, dấu câu). Dùng khi giao diện tự vẽ câu (có furigana riêng, tô màu ngữ pháp...)
 * thay vì dùng <JapaneseText>, ví dụ câu ví dụ Ngữ pháp.
 *   const st = useCharStatus(sentence)      // st?.[i] = trạng thái ký tự thứ i
 */
export function useCharStatus(text: string, enabled = true): (WordStatus | undefined)[] | undefined {
  const k = useKnowledge()
  const [segs, setSegs] = useState<Awaited<ReturnType<typeof tokenize>> | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    tokenize(text).then((s) => alive && setSegs(s), () => alive && setSegs([]))
    return () => { alive = false }
  }, [text, enabled])
  return useMemo(() => {
    if (!enabled || !k || !segs) return undefined
    const out: (WordStatus | undefined)[] = new Array(text.length).fill(undefined)
    for (const s of segs) {
      if (!isStudyWord(s)) continue
      const st = segmentStatus(k, s)
      for (let i = s.start; i < s.end && i < out.length; i++) out[i] = st
    }
    return out
  }, [enabled, k, segs, text.length])
}

/** Trạng thái "khó" nhất trong một khoảng ký tự (có từ mới → 'new', có từ đang học → 'learning'). */
export function worstStatus(list: (WordStatus | undefined)[] | undefined, from = 0, to = list?.length ?? 0): WordStatus | undefined {
  let worst: WordStatus | undefined
  for (let i = from; i < to; i++) {
    const st = list?.[i]
    if (st && (!worst || RANK[st] > RANK[worst])) worst = st
  }
  return worst
}
