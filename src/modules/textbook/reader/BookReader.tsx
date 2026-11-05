/**
 * TRÌNH ĐỌC SÁCH GỐC: đọc file PDF / ảnh scan của bạn ngay trong app.
 * - Lật trang (nút, phím ← →), phóng to / thu nhỏ, nhớ trang đang đọc.
 * - "Chọn chữ" (PDF có chữ): bôi đen → Tra từ / Tô sáng / Ghi chú / Sao chép.
 * - "Tô sáng": kéo một vùng (dùng được cả với ảnh scan). "Ghim ghi chú": bấm vào chỗ muốn ghi.
 * - Đánh dấu trang, gắn "trang này là đầu bài N" để mở đúng trang từ màn hình bài học.
 * - Danh sách ghi chú: lọc theo trang, tìm kiếm, tải về dạng Markdown.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { openLookup } from '@/modules/dictionary/api'
import { getBook } from '../store'
import {
  addNote, deleteNote, getFile, lessonOfPage, listNotes, notesToMarkdown, saveNote, setLastPage, setLessonPage,
} from '../lib/files'
import { openPdf, renderPage } from '../lib/pdf'
import { inputCls, useTx, type Key } from '../ui'
import type { BookFile, BookNote, NoteColor, Rect, Textbook } from '../types'
import './reader.css'

type Tool = 'select' | 'mark' | 'note'
const COLORS: NoteColor[] = ['yellow', 'green', 'red', 'gray']
const COLOR_BG: Record<NoteColor, string> = {
  yellow: 'bg-warn/35', green: 'bg-good/30', red: 'bg-bad/25', gray: 'bg-muted/30',
}
const COLOR_DOT: Record<NoteColor, string> = {
  yellow: 'bg-warn', green: 'bg-good', red: 'bg-bad', gray: 'bg-muted',
}
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]

export function BookReader({ bookId, fileId, page: pageParam, onPage, onBack, onLesson }: {
  bookId: string
  fileId: string
  page?: number
  onPage: (p: number) => void
  onBack: () => void
  onLesson: (n: number) => void
}) {
  const t = useTx()
  const { data, loading } = useDbQuery(async () => {
    const [book, file] = await Promise.all([getBook(bookId), getFile(fileId)])
    return { book, file }
  }, [bookId, fileId], ['textbooks', 'textbookMedia'])
  const { data: notes = [] } = useDbQuery(() => listNotes(fileId), [fileId], ['textbookNotes'])

  if (loading && !data) return null
  const book = data?.book
  const file = data?.file
  if (!book || !file) {
    return (
      <Card className="space-y-3">
        <p>{t('rMissing')}</p>
        <Button variant="soft" onClick={onBack}>{t('back')}</Button>
      </Card>
    )
  }
  return <Reader key={file.id} book={book} file={file} notes={notes} pageParam={pageParam}
    onPage={onPage} onBack={onBack} onLesson={onLesson} />
}

function Reader({ book, file, notes, pageParam, onPage, onBack, onLesson }: {
  book: Textbook; file: BookFile; notes: BookNote[]; pageParam?: number
  onPage: (p: number) => void; onBack: () => void; onLesson: (n: number) => void
}) {
  const t = useTx()
  const last = file.pageCount - 1
  const page = Math.min(last, Math.max(0, pageParam ?? file.lastPage ?? 0))
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [err, setErr] = useState('')
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState<NoteColor>('yellow')
  const [editing, setEditing] = useState<string | null>(null)
  const [hasText, setHasText] = useState(true)
  const [showNotes, setShowNotes] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxW, setBoxW] = useState(0)

  // Mở PDF một lần cho mỗi file
  useEffect(() => {
    if (file.kind !== 'pdf' || !file.blob) return
    let alive = true
    let d: PDFDocumentProxy | null = null
    openPdf(file.blob).then((x) => { d = x; if (alive) setDoc(x); else void x.loadingTask.destroy() }).catch((e) => setErr(String(e?.message ?? e)))
    return () => { alive = false; void d?.loadingTask.destroy() }
  }, [file.id, file.kind])

  // Chiều rộng khung đọc (để trang vừa khung khi zoom = 1)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [showNotes])

  // Nhớ trang đang đọc (đợi 0.6 giây để lật nhanh không ghi liên tục)
  useEffect(() => {
    const id = setTimeout(() => void setLastPage(file.id, page), 600)
    return () => clearTimeout(id)
  }, [file.id, page])

  const go = useCallback((p: number) => { setEditing(null); onPage(Math.min(last, Math.max(0, p))) }, [last, onPage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(page + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(page - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, page])

  const pageNotes = useMemo(() => notes.filter((n) => n.page === page), [notes, page])
  const bookmark = pageNotes.find((n) => n.kind === 'bookmark')
  const lessonHere = lessonOfPage(book, file.id, page)
  const startHere = Object.entries(book.lessonPages ?? {}).find(([, v]) => v.fileId === file.id && v.page === page)?.[0]
  const lessons = Array.from({ length: book.lessonCount }, (_, i) => book.firstLesson + i)
  const width = Math.max(240, Math.round((boxW || 600) * zoom))
  const zi = ZOOMS.indexOf(zoom)

  const create = async (n: Pick<BookNote, 'kind' | 'rects' | 'quote'>, edit = false) => {
    const note = await addNote({ ...n, bookId: book.id, fileId: file.id, page, color: n.kind === 'note' ? undefined : color })
    if (edit || n.kind === 'note') setEditing(note.id)
  }

  const exportMd = () => {
    const blob = new Blob([notesToMarkdown(book, file, notes)], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${book.short} - ghi chú.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const editNote = notes.find((n) => n.id === editing)
  const hintKey = (tool === 'select' ? (hasText ? 'rToolHint_select' : 'rToolHint_select_scan') : `rToolHint_${tool}`) as Key

  return (
    <div className="-mx-4 md:mx-0">
      {/* Thanh công cụ */}
      <div className="z-[5] space-y-2 md:sticky md:top-16 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur md:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onBack}>{t('rBack', { book: book.short })}</Button>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{file.name}</span>
          <Button variant="soft" aria-pressed={showNotes} onClick={() => setShowNotes(!showNotes)}>
            {t('rNotes', { n: notes.length })}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="!px-3" aria-label={t('rPrev')} disabled={page <= 0} onClick={() => go(page - 1)}>‹</Button>
            <label className="flex items-center gap-1 text-sm">
              <span className="sr-only">{t('rPage')}</span>
              <input key={page} type="number" min={1} max={file.pageCount} defaultValue={page + 1}
                className={`${inputCls} !w-16 text-center`}
                onKeyDown={(e) => { if (e.key === 'Enter') go(Number((e.target as HTMLInputElement).value) - 1) }}
                onBlur={(e) => { const v = Number(e.target.value) - 1; if (v !== page) go(v) }} />
              <span className="whitespace-nowrap text-muted">/ {file.pageCount}</span>
            </label>
            <Button variant="ghost" className="!px-3" aria-label={t('rNext')} disabled={page >= last} onClick={() => go(page + 1)}>›</Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="!px-3" aria-label={t('rZoomOut')} disabled={zi <= 0} onClick={() => setZoom(ZOOMS[zi - 1])}>−</Button>
            <Button variant="ghost" className="!px-2 text-sm" onClick={() => setZoom(1)}>{zoom === 1 ? t('rFit') : `${Math.round(zoom * 100)}%`}</Button>
            <Button variant="ghost" className="!px-3" aria-label={t('rZoomIn')} disabled={zi >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[zi + 1])}>+</Button>
          </div>
          <div className="overflow-x-auto">
            <Segmented<Tool> label={t('rToolSelect')} value={tool} onChange={setTool}
              options={[{ value: 'select', label: t('rToolSelect') }, { value: 'mark', label: t('rToolMark') }, { value: 'note', label: t('rToolNote') }]} />
          </div>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t('rHighlight')}>
            {COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={color === c} aria-label={t(`rColor_${c}` as Key)} title={t(`rColor_${c}` as Key)}
                onClick={() => setColor(c)}
                className={`size-7 rounded-full ${COLOR_DOT[c]} ${color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-bg' : 'opacity-70'}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant={bookmark ? 'soft' : 'ghost'} className="!min-h-9"
            onClick={() => void (bookmark ? deleteNote(bookmark.id) : create({ kind: 'bookmark' }))}>
            🔖 {bookmark ? t('rBookmarked') : t('rBookmark')}
          </Button>
          <select className={`${inputCls} !min-h-9 !w-auto`} aria-label={t('rLessonStart')}
            value={startHere ?? ''}
            onChange={(e) => {
              const n = e.target.value ? Number(e.target.value) : Number(startHere)
              void setLessonPage(book, n, file.id, e.target.value ? page : undefined)
            }}>
            <option value="">{startHere ? t('rLessonNone') : t('rLessonStart')}</option>
            {lessons.map((n) => <option key={n} value={n}>{t('rLessonIs', { n })}</option>)}
          </select>
          {lessonHere != null && (
            <Button variant="ghost" className="!min-h-9" onClick={() => onLesson(lessonHere)}>{t('rOpenLesson', { n: lessonHere })} ›</Button>
          )}
          <span className="text-muted">{t(hintKey)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 px-4 md:px-0">
          <div ref={boxRef} className="overflow-auto">
          {err ? <Card className="text-bad">{err}</Card>
            : file.kind === 'pdf' && !doc ? <Card className="text-muted">{t('rLoading')}</Card>
            : (
              <PageView file={file} doc={doc} index={page} width={width} tool={tool} color={color}
                notes={pageNotes} selected={editing} onText={setHasText}
                onCreate={create} onSelect={setEditing} />
            )}
          <div className="flex justify-between py-3">
            <Button variant="soft" disabled={page <= 0} onClick={() => go(page - 1)}>‹ {t('rPrev')}</Button>
            <Button variant="soft" disabled={page >= last} onClick={() => go(page + 1)}>{t('rNext')} ›</Button>
          </div>
          </div>
        </div>
        {showNotes && (
          <NotesPanel book={book} file={file} notes={notes} page={page} selected={editing}
            onPick={(n) => { onPage(n.page); setEditing(n.id) }} onExport={exportMd} />
        )}
      </div>

      {editNote && <NoteEditor key={editNote.id} note={editNote} onClose={() => setEditing(null)} />}
    </div>
  )
}

/* ---------------- Một trang ---------------- */

function PageView({ file, doc, index, width, tool, color, notes, selected, onText, onCreate, onSelect }: {
  file: BookFile; doc: PDFDocumentProxy | null; index: number; width: number; tool: Tool; color: NoteColor
  notes: BookNote[]; selected: string | null
  onText: (has: boolean) => void
  onCreate: (n: Pick<BookNote, 'kind' | 'rects' | 'quote'>, edit?: boolean) => void
  onSelect: (id: string | null) => void
}) {
  const t = useTx()
  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Rect | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; text: string; rects: Rect[] } | null>(null)
  const [imgUrl, setImgUrl] = useState<string>()

  // Vẽ trang PDF
  useEffect(() => {
    if (!doc || !canvasRef.current || !textRef.current) return
    let cancel: (() => void) | undefined
    let alive = true
    renderPage(doc, index, width, canvasRef.current, textRef.current, (n) => alive && onText(n > 0))
      .then((c) => { if (alive) cancel = c; else c() }).catch(() => {})
    return () => { alive = false; cancel?.() }
  }, [doc, index, width])

  // Ảnh scan
  useEffect(() => {
    const img = file.images?.[index]
    if (!img) return
    onText(false)
    const url = URL.createObjectURL(img)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, index])

  useEffect(() => setMenu(null), [index, tool])

  const rel = (cx: number, cy: number) => {
    const r = pageRef.current!.getBoundingClientRect()
    return { x: (cx - r.left) / r.width, y: (cy - r.top) / r.height }
  }

  // Chọn chữ → menu nhỏ
  const onSelectEnd = () => {
    if (tool !== 'select') return
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!sel || !text || sel.rangeCount === 0 || !textRef.current?.contains(sel.anchorNode)) { setMenu(null); return }
      const box = pageRef.current!.getBoundingClientRect()
      const rects = mergeRects([...sel.getRangeAt(0).getClientRects()]
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => ({ x: (r.left - box.left) / box.width, y: (r.top - box.top) / box.height, w: r.width / box.width, h: r.height / box.height })))
      const lastR = sel.getRangeAt(0).getBoundingClientRect()
      setMenu({ x: lastR.left + lastR.width / 2, y: lastR.bottom + 8, text, rects })
    }, 10)
  }

  const act = (kind: 'lookup' | 'mark' | 'note' | 'copy') => {
    if (!menu) return
    if (kind === 'lookup') openLookup(menu.text, { x: menu.x, y: menu.y })
    else if (kind === 'copy') void navigator.clipboard?.writeText(menu.text)
    else onCreate({ kind: 'highlight', rects: menu.rects, quote: menu.text }, kind === 'note')
    if (kind !== 'lookup') { window.getSelection()?.removeAllRanges(); setMenu(null) }
  }

  return (
    <div className="relative mx-auto" style={{ width }}>
      <div ref={pageRef} className="relative overflow-hidden rounded-md bg-white shadow-card"
        onMouseUp={onSelectEnd} onTouchEnd={onSelectEnd}>
        {file.kind === 'pdf' ? (
          <>
            <canvas ref={canvasRef} className="block" />
            <div ref={textRef} className="tb-text-layer" />
          </>
        ) : imgUrl && <img src={imgUrl} alt={t('rPage') + ' ' + (index + 1)} className="block w-full select-none" draggable={false} />}

        {/* Lớp tô sáng / ghi chú */}
        <div className={`absolute inset-0 z-[2] ${tool === 'select' ? 'pointer-events-none' : 'touch-none'} ${tool === 'mark' ? 'cursor-crosshair' : tool === 'note' ? 'cursor-copy' : ''}`}
          onPointerDown={(e) => {
            if (tool === 'select' || e.target !== e.currentTarget) return
            const p = rel(e.clientX, e.clientY)
            if (tool === 'note') { onCreate({ kind: 'note', rects: [{ x: p.x, y: p.y, w: 0, h: 0 }] }); return }
            start.current = p
            e.currentTarget.setPointerCapture(e.pointerId)
            setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
          }}
          onPointerMove={(e) => {
            if (!start.current) return
            const p = rel(e.clientX, e.clientY)
            const s = start.current
            setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
          }}
          onPointerUp={() => {
            if (draft && draft.w > 0.01 && draft.h > 0.005) onCreate({ kind: 'highlight', rects: [clamp(draft)] })
            start.current = null
            setDraft(null)
          }}>
          {notes.filter((n) => n.kind !== 'bookmark').map((n) => n.kind === 'note' ? (
            <button key={n.id} title={n.text || t('rAddNote')} aria-label={n.text || t('rAddNote')}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id) }}
              className={`pointer-events-auto absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-sm text-on-primary shadow-card ${selected === n.id ? 'ring-2 ring-text' : ''}`}
              style={{ left: pct(n.rects?.[0]?.x), top: pct(n.rects?.[0]?.y) }}>✎</button>
          ) : n.rects?.map((r, i) => (
            <button key={n.id + i} aria-label={n.quote || n.text || t('rHighlight')} title={n.text || n.quote}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id) }}
              className={`pointer-events-auto absolute rounded-sm mix-blend-multiply ${COLOR_BG[n.color ?? 'yellow']} ${selected === n.id ? 'outline-2 outline-text' : ''}`}
              style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }} />
          )))}
          {notes.filter((n) => n.kind === 'highlight' && n.text).map((n) => (
            <span key={n.id + 'i'} aria-hidden className="absolute grid size-4 -translate-y-1/2 place-items-center rounded-full bg-primary text-[0.6rem] text-on-primary"
              style={{ left: pct((n.rects?.[0]?.x ?? 0) + (n.rects?.[0]?.w ?? 0)), top: pct(n.rects?.[0]?.y) }}>✎</span>
          ))}
          {draft && <div className={`absolute rounded-sm ${COLOR_BG[color]}`} style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h) }} />}
        </div>
      </div>

      {menu && (
        <div role="menu" className="fixed z-30 flex -translate-x-1/2 gap-1 rounded-xl border border-border bg-surface p-1 shadow-card"
          style={{ left: Math.min(Math.max(menu.x, 140), window.innerWidth - 140), top: Math.min(menu.y, window.innerHeight - 56) }}>
          <Button variant="ghost" className="!min-h-9 !px-3 text-sm" onClick={() => act('lookup')}>{t('rLookup')}</Button>
          <Button variant="ghost" className="!min-h-9 !px-3 text-sm" onClick={() => act('mark')}>{t('rHighlight')}</Button>
          <Button variant="ghost" className="!min-h-9 !px-3 text-sm" onClick={() => act('note')}>{t('rAddNote')}</Button>
          <Button variant="ghost" className="!min-h-9 !px-3 text-sm" onClick={() => act('copy')}>{t('rCopy')}</Button>
        </div>
      )}
    </div>
  )
}

const pct = (v = 0) => `${v * 100}%`
const clamp = (r: Rect): Rect => {
  const x = Math.max(0, r.x), y = Math.max(0, r.y)
  return { x, y, w: Math.min(1 - x, r.w), h: Math.min(1 - y, r.h) }
}

/** Gộp các ô chữ cùng dòng nằm sát nhau (pdf.js chia chữ thành nhiều mảnh). */
function mergeRects(rs: Rect[]): Rect[] {
  const out: Rect[] = []
  for (const r of [...rs].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const p = out[out.length - 1]
    if (p && Math.abs(p.y - r.y) < p.h * 0.5 && r.x <= p.x + p.w + 0.01) {
      const x2 = Math.max(p.x + p.w, r.x + r.w), y2 = Math.max(p.y + p.h, r.y + r.h)
      p.x = Math.min(p.x, r.x); p.y = Math.min(p.y, r.y); p.w = x2 - p.x; p.h = y2 - p.y
    } else out.push({ ...r })
  }
  return out
}

/* ---------------- Sửa ghi chú ---------------- */

function NoteEditor({ note, onClose }: { note: BookNote; onClose: () => void }) {
  const t = useTx()
  const [text, setText] = useState(note.text ?? '')
  const save = (patch: Partial<BookNote> = {}) => saveNote({ ...note, text: text.trim() || undefined, ...patch })
  const close = () => { void save(); onClose() }
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 p-3 md:bottom-4 md:left-auto md:right-4 md:w-96">
      <Card className="space-y-3 shadow-card">
        {note.quote && <p className="jp line-clamp-3 border-l-2 border-primary pl-2 text-sm">{note.quote}</p>}
        <textarea autoFocus className={`${inputCls} min-h-24 py-2`} value={text} placeholder={t('rNotePh')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) close() }} />
        <div className="flex flex-wrap items-center gap-2">
          {note.kind === 'highlight' && COLORS.map((c) => (
            <button key={c} aria-label={t(`rColor_${c}` as Key)} aria-pressed={note.color === c} onClick={() => void save({ color: c })}
              className={`size-7 rounded-full ${COLOR_DOT[c]} ${note.color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : 'opacity-70'}`} />
          ))}
          <Button variant="ghost" className="ml-auto !text-bad" onClick={() => { void deleteNote(note.id); onClose() }}>{t('rDelete')}</Button>
          <Button onClick={close}>{t('rDone')}</Button>
        </div>
      </Card>
    </div>
  )
}

/* ---------------- Danh sách ghi chú ---------------- */

function NotesPanel({ book, file, notes, page, selected, onPick, onExport }: {
  book: Textbook; file: BookFile; notes: BookNote[]; page: number; selected: string | null
  onPick: (n: BookNote) => void; onExport: () => void
}) {
  const t = useTx()
  const [scope, setScope] = useState<'all' | 'page'>('all')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return notes
      .filter((n) => scope === 'all' || n.page === page)
      .filter((n) => !s || `${n.quote ?? ''} ${n.text ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => a.page - b.page || a.createdAt - b.createdAt)
  }, [notes, scope, page, q])

  return (
    <Card className="mx-4 space-y-3 md:mx-0 lg:sticky lg:top-40 lg:max-h-[calc(100vh-11rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto">
      <Segmented<'all' | 'page'> label={t('rNotes', { n: notes.length })} value={scope} onChange={setScope}
        options={[{ value: 'all', label: t('rNotesAll') }, { value: 'page', label: t('rNotesPage') }]} />
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rNotesSearch')} />
      {list.length === 0 ? <p className="text-sm text-muted">{t('rNotesEmpty')}</p> : (
        <ul className="space-y-2">
          {list.map((n) => {
            const lesson = lessonOfPage(book, file.id, n.page)
            return (
              <li key={n.id}>
                <button onClick={() => onPick(n)}
                  className={`w-full rounded-xl border p-2 text-left text-sm transition hover:border-primary ${selected === n.id ? 'border-primary' : 'border-border'}`}>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {n.kind === 'bookmark' ? '🔖' : n.kind === 'note' ? '✎' : <span className={`inline-block size-2.5 rounded-full ${COLOR_DOT[n.color ?? 'yellow']}`} />}
                    {t('rPage')} {n.page + 1}{lesson != null && ` · ${t('rInLesson', { n: lesson })}`}
                  </span>
                  {n.quote && <span className="jp mt-1 line-clamp-2 block">{n.quote}</span>}
                  {n.text && <span className="mt-1 line-clamp-3 block whitespace-pre-line text-muted">{n.text}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {notes.length > 0 && <Button variant="soft" className="w-full" onClick={onExport}>{t('rExport')}</Button>}
    </Card>
  )
}
