/**
 * CHỮ NHẬT BẤM ĐỂ TRA — component dùng chung cho mọi module (manga, anime, ngữ pháp...).
 *
 *   <JapaneseText text="昨日ケーキを食べさせられた" />
 *   <JapaneseText text={line} furigana />          // hiện furigana trên Kanji
 *
 * Câu được tách từ; mỗi từ bấm được (máy tính: di chuột cũng được, chỉnh trong Từ điển → Tùy chọn).
 * Popup tra từ dài nhất bắt đầu ở chỗ bấm, tự chia động từ ngược (食べさせられた → 食べる).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Segment, WordResult } from '../types'
import { tokenize } from '../tokenizer'
import { lookupAt, preferBase, searchWords } from '../lib/search'
import { hasJapanese } from '../lib/kana'
import { useDictPrefs } from '../prefs'
import { Furigana } from './Furigana'
import { WordPopup } from './WordPopup'

export interface JapaneseTextProps {
  text: string
  /** Hiện furigana (theo cách đọc của bộ tách từ). Mặc định: không. */
  furigana?: boolean
  className?: string
  /** Gọi khi người dùng tra một từ (ví dụ để đếm từ đã tra). */
  onLookup?: (segment: Segment, results: WordResult[]) => void
}

/** Khi bộ tách từ chưa sẵn sàng: mỗi ký tự là một "từ", vẫn tra được. */
const charSegments = (text: string): Segment[] => {
  let i = 0
  return [...text].map((ch) => {
    const s = { surface: ch, base: ch, reading: '', pos: '', posDetail: '', start: i, end: i + ch.length, parts: [] }
    i += ch.length
    return s
  })
}

interface Open { seg: Segment; rect: DOMRect; pinned: boolean; results: WordResult[] | null; length: number }

export function JapaneseText({ text, furigana = false, className = '', onLookup }: JapaneseTextProps) {
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [open, setOpen] = useState<Open | null>(null)
  const hover = useDictPrefs((s) => s.hover)
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
    // Tra dài nhất từ chỗ bấm; nếu không có thì tra thể từ điển bộ tách từ đưa ra
    let results = await lookupAt(text, seg.start).catch(() => [] as WordResult[])
    if (!results.length && seg.base !== seg.surface) results = await searchWords(seg.base, 5).catch(() => [])
    // Khớp đúng bằng "từ" đã tách thì tin thể từ điển của bộ tách từ (行って → 行く, không phải 行う)
    if (results[0]?.length === [...seg.surface].length) results = preferBase(results, seg.base)
    if (id !== reqId.current) return
    setOpen((o) => (o && o.seg === seg ? { ...o, results, length: results[0]?.length ?? seg.surface.length } : o))
    onLookup?.(seg, results)
  }, [text, onLookup])

  const close = useCallback(() => { reqId.current++; setOpen(null) }, [])
  const cancelTimer = () => window.clearTimeout(timer.current)

  const segs = segments ?? charSegments(text)
  const hiStart = open?.seg.start ?? -1
  const hiEnd = open ? open.seg.start + open.length : -1

  return (
    <span className={`jp ${className}`}>
      {segs.map((seg) => {
        if (!hasJapanese(seg.surface)) return <span key={seg.start}>{seg.surface}</span>
        const active = seg.start < hiEnd && seg.end > hiStart
        return (
          <span
            key={seg.start}
            role="button"
            tabIndex={0}
            data-jp-seg=""
            className={`cursor-pointer rounded-sm transition-colors ${active ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}
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
            {furigana && seg.reading ? <Furigana text={seg.surface} reading={seg.reading} /> : seg.surface}
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
