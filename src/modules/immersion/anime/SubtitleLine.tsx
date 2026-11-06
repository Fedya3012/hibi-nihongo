/**
 * MỘT DÒNG PHỤ ĐỀ TƯƠNG TÁC
 * Giống <JapaneseText> của module Từ điển (bấm / di chuột để tra), thêm:
 *  - tô màu theo trạng thái từ: MỚI (gạch chân màu chủ đạo), ĐANG HỌC (màu vàng), ĐÃ BIẾT (bình thường)
 *  - furigana chỉ cho từ chưa thuộc (khi Cài đặt chọn "chỉ Kanji chưa thuộc")
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Furigana, WordPopup, hasJapanese, lookupAt, searchWords, tokenize, useTokenizerStatus,
  type Segment, type WordResult,
} from '@/modules/dictionary'
import { useDictPrefs } from '@/modules/dictionary/prefs'
import { useSettings } from '@/core/settings'
import { isStudyWord, wordStatus, type Knowledge, type WordStatus } from './analysis'
import { pickResult } from './dict'

const charSegments = (text: string): Segment[] => {
  let i = 0
  return [...text].map((ch) => {
    const s = { surface: ch, base: ch, reading: '', pos: '', posDetail: '', start: i, end: i + ch.length, parts: [] }
    i += ch.length
    return s
  })
}

const STATUS_CLASS: Record<WordStatus, string> = {
  new: 'underline decoration-primary decoration-2 underline-offset-[0.3em]',
  learning: 'text-warn',
  known: '',
}

interface Open { seg: Segment; rect: DOMRect; pinned: boolean; results: WordResult[] | null; length: number }

export function SubtitleLine({ text, furigana, k, highlight, onLookup }: {
  text: string
  furigana: boolean
  k?: Knowledge
  highlight: boolean
  onLookup?: (seg: Segment) => void
}) {
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [open, setOpen] = useState<Open | null>(null)
  const hover = useDictPrefs((s) => s.hover)
  const furiMode = useSettings((s) => s.furigana)
  const tok = useTokenizerStatus((s) => s.status)
  const timer = useRef<number | undefined>(undefined)
  const reqId = useRef(0)

  useEffect(() => {
    let alive = true
    setSegments(null)
    tokenize(text).then((s) => alive && setSegments(s), () => alive && setSegments(charSegments(text)))
    return () => { alive = false }
  }, [text])

  const show = useCallback(async (seg: Segment, el: HTMLElement, pinned: boolean) => {
    const id = ++reqId.current
    setOpen({ seg, rect: el.getBoundingClientRect(), pinned, results: null, length: seg.surface.length })
    onLookup?.(seg)
    let results = await lookupAt(text, seg.start).catch(() => [] as WordResult[])
    if (!results.length && seg.base !== seg.surface) results = await searchWords(seg.base, 5).catch(() => [])
    // Khớp đúng bằng "từ" đã tách thì tin thể từ điển của bộ tách từ (行って → 行く, không phải 行う)
    if (results[0]?.length === [...seg.surface].length) {
      const best = pickResult(results, seg.base)
      if (best) results = [best, ...results.filter((r) => r !== best)]
    }
    if (id !== reqId.current) return
    setOpen((o) => (o && o.seg === seg ? { ...o, results, length: results[0]?.length ?? seg.surface.length } : o))
  }, [text, onLookup])

  const close = useCallback(() => { reqId.current++; setOpen(null) }, [])
  const cancelTimer = () => window.clearTimeout(timer.current)

  const segs = segments ?? charSegments(text)
  const hiStart = open?.seg.start ?? -1
  const hiEnd = open ? open.seg.start + open.length : -1

  return (
    <span className="jp" data-tokenizer={tok}>
      {segs.map((seg) => {
        if (!hasJapanese(seg.surface)) return <span key={seg.start}>{seg.surface}</span>
        const st: WordStatus | undefined = highlight && k && segments && isStudyWord(seg)
          ? wordStatus({ w: seg.base || seg.surface, r: seg.reading, s: seg.surface }, k) : undefined
        const active = seg.start < hiEnd && seg.end > hiStart
        // furigana "chỉ cho từ chưa thuộc": ẩn với từ đã biết
        const showRuby = furigana && seg.reading && !(furiMode === 'unknown-only' && st === 'known')
        return (
          <span
            key={seg.start}
            role="button"
            tabIndex={0}
            data-jp-seg=""
            data-status={st}
            className={`cursor-pointer rounded-sm transition-colors ${st ? STATUS_CLASS[st] : ''} ${active ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}
            onClick={(e) => { cancelTimer(); show(seg, e.currentTarget, true) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(seg, e.currentTarget, true) } }}
            onPointerEnter={(e) => {
              if (!hover || e.pointerType !== 'mouse' || open?.pinned) return
              cancelTimer()
              const el = e.currentTarget
              timer.current = window.setTimeout(() => show(seg, el, false), 250)
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== 'mouse') return
              cancelTimer()
              if (open && !open.pinned) timer.current = window.setTimeout(close, 300)
            }}
          >
            {showRuby ? <Furigana text={seg.surface} reading={seg.reading} /> : seg.surface}
          </span>
        )
      })}
      {open && (
        <WordPopup
          anchor={open.rect}
          query={open.seg.surface}
          results={open.results}
          onClose={close}
          onPointerEnter={cancelTimer}
          onPointerLeave={() => { if (!open.pinned) timer.current = window.setTimeout(close, 300) }}
        />
      )}
    </span>
  )
}
