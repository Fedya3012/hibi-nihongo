/**
 * API MỞ POPUP TRA TỪ TỪ BẤT KỲ ĐÂU (không cần đặt component vào trang)
 * -------------------------------------------------------------------
 *   import { openLookup, closeLookup } from '@/modules/dictionary/api'
 *   openLookup('食べさせられた')                       // popup giữa màn hình
 *   openLookup(textFromOcr, { x: e.clientX, y: e.clientY })  // popup cạnh vị trí bấm (tọa độ màn hình, px)
 *
 * `text` có thể là một từ hoặc cả câu (từ OCR, phụ đề...). Nếu là câu, popup hiện các từ trong câu
 * để bấm chọn, mặc định tra từ đầu tiên (từ dài nhất khớp được, có chia động từ ngược).
 * Popup tự gắn vào document.body nên không phụ thuộc trang đang mở.
 */
import { createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { create } from 'zustand'
import type { Segment, WordResult } from './types'
import { WordPopup } from './components/WordPopup'
import { lookupAt, searchWords } from './lib/search'
import { tokenize } from './tokenizer'
import { hasJapanese } from './lib/kana'

interface LookupRequest { text: string; anchor?: { x: number; y: number }; n: number }
const useLookup = create<{ req: LookupRequest | null }>(() => ({ req: null }))

let root: Root | null = null
function ensureHost() {
  if (root) return
  const el = document.createElement('div')
  el.id = 'hibi-dictionary-lookup'
  document.body.appendChild(el)
  root = createRoot(el)
  root.render(createElement(LookupHost))
}

let counter = 0
/** Mở popup tra từ cho `text`. anchor: tọa độ màn hình (px) để đặt popup gần đó. */
export function openLookup(text: string, anchor?: { x: number; y: number }): void {
  const t = text.trim()
  if (!t) return
  ensureHost()
  useLookup.setState({ req: { text: t, anchor, n: ++counter } })
}

export function closeLookup(): void {
  useLookup.setState({ req: null })
}

function LookupHost() {
  const req = useLookup((s) => s.req)
  if (!req) return null
  return createElement(LookupPopup, { key: req.n, req })
}

function LookupPopup({ req }: { req: LookupRequest }) {
  const [segs, setSegs] = useState<Segment[] | null>(null)
  const [start, setStart] = useState(0)
  const [results, setResults] = useState<WordResult[] | null>(null)

  // Câu dài thì tách từ để người dùng chọn từ muốn tra
  useEffect(() => {
    if ([...req.text].length <= 1) return
    tokenize(req.text).then((s) => setSegs(s.filter((x) => hasJapanese(x.surface))), () => setSegs([]))
  }, [req.text])

  useEffect(() => {
    let alive = true
    setResults(null)
    ;(async () => {
      let r = await lookupAt(req.text, start).catch(() => [] as WordResult[])
      if (!r.length) {
        const seg = segs?.find((s) => s.start === start)
        r = await searchWords(seg?.base ?? req.text.slice(start), 5).catch(() => [])
      }
      if (alive) setResults(r)
    })()
    return () => { alive = false }
  }, [req.text, start, segs])

  const a = req.anchor
  const anchor = a
    ? new DOMRect(a.x, a.y, 0, 0)
    : new DOMRect(Math.max(8, window.innerWidth / 2 - 190), window.innerHeight * 0.2, 0, 0)
  const matchedEnd = start + (results?.[0]?.length ?? 1)

  const header = segs && segs.length > 1
    ? createElement('div', { className: 'jp mb-3 mr-8 flex flex-wrap gap-1 text-lg', 'aria-label': 'Các từ trong câu' },
      segs.map((s) => createElement('button', {
        key: s.start,
        onClick: () => setStart(s.start),
        className: `rounded-md px-1.5 transition ${s.start >= start && s.start < matchedEnd ? 'bg-primary-soft' : 'hover:bg-surface-2'}`,
      }, s.surface)))
    : null

  return createElement(WordPopup, {
    anchor, query: req.text.slice(start), results, header, onClose: closeLookup,
  })
}
