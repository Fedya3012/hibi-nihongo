/**
 * POPUP TRA TỪ — khung nổi hiện kết quả tra, đặt cạnh chữ được bấm/di chuột.
 * Máy tính: nổi ngay dưới (hoặc trên) chữ. Điện thoại (màn hẹp): trượt lên từ cạnh dưới màn hình.
 * Đóng bằng phím Esc, bấm ra ngoài, hoặc nút ✕.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WordResult } from '../types'
import { WordEntry } from './WordEntry'
import { useDictPacks } from '../lib/packs'

export interface WordPopupProps {
  anchor: DOMRect
  query: string
  results: WordResult[] | null // null = đang tra
  onClose: () => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  /** Nội dung thêm ở đầu popup (ví dụ các từ trong câu để chọn). */
  header?: React.ReactNode
}

const WIDTH = 380

export function WordPopup({ anchor, query, results, onClose, onPointerEnter, onPointerLeave, header }: WordPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const packs = useDictPacks()
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' })
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640

  // Tính vị trí sau khi biết chiều cao thật của popup
  useLayoutEffect(() => {
    if (narrow) { setStyle({}); return }
    const h = ref.current?.offsetHeight ?? 300
    const vw = window.innerWidth, vh = window.innerHeight
    const w = Math.min(WIDTH, vw - 16)
    const left = Math.max(8, Math.min(anchor.left, vw - w - 8))
    const below = vh - anchor.bottom - 8
    const top = below >= Math.min(h, 320) || anchor.top < below ? anchor.bottom + 6 : Math.max(8, anchor.top - h - 6)
    setStyle({ left, top, width: w, maxHeight: Math.max(200, top > anchor.top ? vh - top - 8 : anchor.top - 14) })
  }, [anchor, results, narrow])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (ref.current?.contains(t) || t.closest?.('[data-jp-seg]')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [onClose])

  const body = (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Tra từ ${query}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={style}
      className={`fixed z-50 overflow-y-auto border border-border bg-surface text-text shadow-card ${
        narrow ? 'inset-x-0 bottom-0 max-h-[70dvh] rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'rounded-card p-4'
      }`}
    >
      <button onClick={onClose} aria-label="Đóng" className="float-right -mr-1 -mt-1 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">✕</button>
      {header}
      {!packs.loading && !packs.ready ? (
        <div className="space-y-2 text-sm">
          <p>Chưa có dữ liệu từ điển trên máy.</p>
          <a href="#/dictionary?tab=data" className="font-medium text-primary hover:underline" onClick={onClose}>Mở Từ điển để tải về →</a>
        </div>
      ) : results === null ? (
        <p className="text-sm text-muted">Đang tra <span className="jp">{query}</span>…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted">Không tìm thấy <span className="jp">{query}</span> trong từ điển.</p>
      ) : (
        <div className="space-y-4">
          {results.slice(0, 3).map((r, i) => (
            <div key={r.id} className={i ? 'border-t border-border pt-3' : ''}>
              <WordEntry r={r} compact showKanji={i === 0} />
            </div>
          ))}
          {/* Dùng thẻ <a> với đường dẫn dạng #/... (app dùng HashRouter) để popup chạy được cả ngoài khung app */}
          <a
            href={`#/dictionary?q=${encodeURIComponent(results[0].matched)}`}
            onClick={onClose}
            className="block text-sm text-muted hover:text-primary"
          >
            Xem đầy đủ trong Từ điển →
          </a>
        </div>
      )}
    </div>
  )
  return createPortal(body, document.body)
}
