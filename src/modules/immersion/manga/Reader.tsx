/**
 * TRÌNH ĐỌC MANGA (toàn màn hình)
 *
 * Đọc:
 *   - Bấm/chạm mép trái, mép phải để lật trang; bấm giữa để ẩn/hiện thanh công cụ; chạm 2 lần ở giữa để zoom
 *   - Vuốt ngang để lật trang, kéo để di chuyển khi đang phóng to, chụm 2 ngón để zoom
 *   - Ctrl + lăn chuột: zoom. Lăn chuột khi trang vừa khung: lật trang
 * Học (chế độ "Học sâu"):
 *   - Giữ ngón tay/chuột trên trang, hoặc nút ＋: khoanh một bong bóng thoại rồi gõ/dán chữ
 *   - Bấm khung bong bóng: tra từng từ, nghe đọc, shadowing, ngữ pháp, lưu vào Ôn tập
 * Phím: ← → lật trang, Space/PageDown, Home/End, + − 0 zoom, D 1/2 trang, R chiều đọc, F toàn màn hình,
 *       M đổi chế độ Chill/Học, N thêm bong bóng, B đánh dấu trang, Esc thoát
 * Trang đang đọc, bong bóng, ghi chú đều tự lưu ngay.
 */
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent,
} from 'react'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useDbQuery } from '@/core/db'
import {
  getChapter, getSeries, getSeriesPrefs, listChapters, saveProgress, setDefaultPrefs, updateSeries,
} from './store'
import { openPageSource, type PageSource } from './pages'
import { buildSpreads, clampZoom, spreadSize } from './layout'
import { chapterLabel } from './naming'
import { useMangaIntegrations, type OcrBlock } from './integrations'
import { addBubble, addPin, deleteNote, listChapterNotes, readingOrder, saveNote, toggleBookmark } from './notes'
import { BubbleCard } from './study/BubbleCard'
import { BubblesTab, MarksTab, PinCard, PracticeTab, WordsTab } from './study/Panels'
import type {
  Box, FitMode, MangaBookmark, MangaBubble, MangaChapter, MangaPin, MangaSeries, PageLayout, ReadDirection, ReaderPrefs,
} from './types'
import { actionFor } from '@/modules/shortcuts/keymap'

interface Props {
  chapterId: string
  startPage?: number
  onClose: () => void
  onOpenChapter: (chapterId: string, page?: number) => void
}

export function Reader({ chapterId, startPage, onClose, onOpenChapter }: Props) {
  const [chapter, setChapter] = useState<MangaChapter>()
  const [series, setSeries] = useState<MangaSeries>()
  const [chapters, setChapters] = useState<MangaChapter[]>([])
  const [prefs, setPrefs] = useState<ReaderPrefs>()
  const [source, setSource] = useState<PageSource>()
  const [error, setError] = useState<string>()
  const [page, setPage] = useState(0)

  useEffect(() => {
    let alive = true
    let src: PageSource | undefined
    setSource(undefined)
    setError(undefined)
    ;(async () => {
      const c = await getChapter(chapterId)
      if (!c) throw new Error('Không tìm thấy chương này.')
      const [s, list] = await Promise.all([getSeries(c.seriesId), listChapters(c.seriesId)])
      const p = await getSeriesPrefs(s)
      src = await openPageSource(c)
      if (!alive) { src.dispose(); return }
      const resumeAt = startPage ?? (c.finishedAt && c.lastPage >= c.pageCount - 1 ? 0 : c.lastPage)
      setChapter(c); setSeries(s); setChapters(list); setPrefs(p)
      setPage(Math.min(Math.max(0, resumeAt), c.pageCount - 1))
      setSource(src)
    })().catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => { alive = false; src?.dispose() }
  }, [chapterId, startPage])

  if (error) {
    return (
      <Shell>
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <p className="text-bad">{error}</p>
            <Button className="mt-4" variant="soft" onClick={onClose}>Quay lại</Button>
          </div>
        </div>
      </Shell>
    )
  }
  if (!chapter || !source || !prefs) {
    return <Shell><p className="grid h-full place-items-center text-muted">Đang mở…</p></Shell>
  }
  return (
    <ReaderView
      key={chapter.id}
      chapter={chapter} series={series} chapters={chapters} source={source}
      prefs={prefs} setPrefs={setPrefs} initialPage={page}
      onClose={onClose} onOpenChapter={onOpenChapter}
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 bg-bg text-text">{children}</div>
}

type Panel = 'settings' | 'lookup' | 'bubble' | 'pin' | 'bubbles' | 'words' | 'marks' | 'practice'
const STUDY_TABS: { id: Panel; label: string }[] = [
  { id: 'bubbles', label: 'Bong bóng' },
  { id: 'words', label: 'Từ & Kanji' },
  { id: 'practice', label: 'Luyện' },
  { id: 'marks', label: 'Đánh dấu' },
]

function ReaderView({
  chapter, series, chapters, source, prefs, setPrefs, initialPage, onClose, onOpenChapter,
}: {
  chapter: MangaChapter
  series?: MangaSeries
  chapters: MangaChapter[]
  source: PageSource
  prefs: ReaderPrefs
  setPrefs: (p: ReaderPrefs) => void
  initialPage: number
  onClose: () => void
  onOpenChapter: (chapterId: string, page?: number) => void
}) {
  const [page, setPage] = useState(initialPage)
  const [ui, setUi] = useState(true)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [atEnd, setAtEnd] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [draw, setDraw] = useState<DrawMode | null>(null)
  const [ocrResult, setOcrResult] = useState<{ blocks: OcrBlock[]; busy: boolean; error?: string }>()
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [selected, setSelected] = useState<{ id: string; editing?: boolean } | null>(null)
  const [pinId, setPinId] = useState<string>()
  const [highlight, setHighlight] = useState<string>()
  const [rate, setRate] = useState(1)
  const [toast, setToast] = useState<{ text: string; undo?: () => void }>()
  const viewport = useRef<HTMLDivElement>(null)
  const integrations = useMangaIntegrations()
  const panelRef = useRef(panel)
  panelRef.current = panel

  const rtl = prefs.direction === 'rtl'
  const study = prefs.mode === 'study'
  const layout: Exclude<PageLayout, 'auto'> =
    prefs.layout === 'auto' ? (size.w > size.h * 1.15 && size.w >= 900 ? 'double' : 'single') : prefs.layout
  const spreads = useMemo(
    () => buildSpreads(chapter.pages, layout === 'double', prefs.coverAlone),
    [chapter.pages, layout, prefs.coverAlone],
  )
  const spreadIdx = Math.max(0, spreads.findIndex((s) => s.includes(page)))
  const spread = spreads[spreadIdx] ?? [0]
  const idx = chapters.findIndex((c) => c.id === chapter.id)
  const prevChapter = idx > 0 ? chapters[idx - 1] : undefined
  const nextChapter = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : undefined

  // ----- Bong bóng và đánh dấu của chương (tự cập nhật khi lưu) -----
  const { data: notes = [] } = useDbQuery(() => listChapterNotes(chapter.id), [chapter.id], ['mangaNotes'])
  const bubbles = useMemo(
    () => readingOrder(notes.filter((n): n is MangaBubble => n.kind === 'bubble' && !!n.text.trim()), rtl),
    [notes, rtl],
  )
  const allBubbles = useMemo(() => notes.filter((n): n is MangaBubble => n.kind === 'bubble'), [notes])
  const marks = useMemo(() => notes.filter((n): n is MangaBookmark => n.kind === 'bookmark'), [notes])
  const pins = useMemo(() => notes.filter((n): n is MangaPin => n.kind === 'pin'), [notes])
  const selectedPin = pins.find((p) => p.id === pinId)
  const selectedBubble = selected ? allBubbles.find((b) => b.id === selected.id) : undefined
  const markHere = marks.find((m) => spread.includes(m.page))

  const flash = useCallback((text: string, undo?: () => void) => {
    setToast({ text, undo })
    window.setTimeout(() => setToast((t) => (t?.text === text ? undefined : t)), undo ? 6000 : 2500)
  }, [])

  // ----- Cài đặt (lưu riêng cho series) -----
  const changePrefs = (patch: Partial<ReaderPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    if (series) void updateSeries(series.id, { prefs: { ...series.prefs, ...patch } })
  }

  // ----- Lưu trang đang đọc (giãn nhịp 400ms; khi đóng/ẩn app thì lưu ngay) -----
  const lastVisible = Math.max(...spread)
  const pending = useRef<number | null>(null)
  useEffect(() => {
    pending.current = lastVisible
    const t = setTimeout(() => {
      if (pending.current != null) { void saveProgress(chapter.id, pending.current); pending.current = null }
    }, 400)
    return () => clearTimeout(t)
  }, [chapter.id, lastVisible])
  useEffect(() => {
    const flush = () => { if (pending.current != null) { void saveProgress(chapter.id, pending.current); pending.current = null } }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); flush() }
  }, [chapter.id])

  // ----- Kích thước khung đọc -----
  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [layout])

  // ----- Lật trang -----
  const goTo = useCallback((p: number) => {
    setAtEnd(false)
    setUi((v) => (v && !panelRef.current ? false : v))
    setPage(Math.min(Math.max(0, p), chapter.pageCount - 1))
  }, [chapter.pageCount])

  const next = useCallback(() => {
    if (spreadIdx < spreads.length - 1) goTo(spreads[spreadIdx + 1][0])
    else setAtEnd(true)
  }, [spreadIdx, spreads, goTo])

  const prev = useCallback(() => {
    if (atEnd) { setAtEnd(false); return }
    if (spreadIdx > 0) goTo(spreads[spreadIdx - 1][0])
    else if (prevChapter) onOpenChapter(prevChapter.id, prevChapter.pageCount - 1)
  }, [atEnd, spreadIdx, spreads, goTo, prevChapter, onOpenChapter])

  const left = rtl ? next : prev
  const right = rtl ? prev : next

  // Tải trước trang kế tiếp và trang trước cho mượt
  useEffect(() => {
    for (const s of [spreads[spreadIdx + 1], spreads[spreadIdx + 2], spreads[spreadIdx - 1]]) {
      s?.forEach((i) => void source.url(i).then((u) => { const im = new Image(); im.src = u }, () => {}))
    }
  }, [spreadIdx, spreads, source])

  // ----- Zoom quanh một điểm -----
  const focal = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null)
  const pageMetas = spread.map((i) => chapter.pages[i])
  const dims = spreadSize(pageMetas, prefs.fit, size.w, size.h, zoom)

  const zoomAt = useCallback((z: number, clientX?: number, clientY?: number) => {
    const el = viewport.current
    const nz = clampZoom(z)
    if (el && layout !== 'scroll') {
      const r = el.getBoundingClientRect()
      const px = (clientX ?? r.left + r.width / 2) - r.left
      const py = (clientY ?? r.top + r.height / 2) - r.top
      const offX = Math.max(0, (el.clientWidth - dims.width) / 2)
      const offY = Math.max(0, (el.clientHeight - dims.height) / 2)
      focal.current = { fx: (el.scrollLeft + px - offX) / dims.width, fy: (el.scrollTop + py - offY) / dims.height, px, py }
    }
    setZoom(nz)
  }, [dims.width, dims.height, layout])

  useLayoutEffect(() => {
    const el = viewport.current
    const f = focal.current
    if (!el || !f) return
    focal.current = null
    const offX = Math.max(0, (el.clientWidth - dims.width) / 2)
    const offY = Math.max(0, (el.clientHeight - dims.height) / 2)
    el.scrollLeft = f.fx * dims.width + offX - f.px
    el.scrollTop = f.fy * dims.height + offY - f.py
  }, [dims.width, dims.height])

  useLayoutEffect(() => {
    const el = viewport.current
    if (!el || layout === 'scroll') return
    el.scrollTop = 0
    el.scrollLeft = rtl ? el.scrollWidth : 0
  }, [spreadIdx, layout, rtl])

  // ----- Bong bóng / đánh dấu -----
  const bookmark = () => {
    const p = spread[0]
    void toggleBookmark(chapter.seriesId, chapter.id, markHere?.page ?? p, markHere)
    flash(markHere ? 'Đã bỏ đánh dấu trang' : `🔖 Đã đánh dấu trang ${p + 1}`)
  }
  const openBubble = (b: MangaBubble, editing = false) => {
    setSelected({ id: b.id, editing })
    setPanel('bubble')
    setUi(true)
  }
  const startBubble = () => { setDraw('bubble'); setPanel(null); setUi(true) }
  const openPin = (p: MangaPin) => { setPinId(p.id); setPanel('pin'); setUi(true) }

  // ----- Phím tắt -----
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        if (e.key === 'Escape') t.blur() // Esc trong ô nhập: thoát ô nhập trước
        return
      }
      const scroll = layout === 'scroll'
      // Phím đổi được ở trang Phím tắt (src/modules/shortcuts/keymap.ts, nhóm "manga")
      switch (actionFor(e, 'manga')) {
        case 'manga.left': left(); break
        case 'manga.right': right(); break
        case 'manga.next': if (scroll) return; next(); break
        case 'manga.prev': if (scroll) return; prev(); break
        case 'manga.first': goTo(0); break
        case 'manga.last': goTo(chapter.pageCount - 1); break
        case 'manga.zoomIn': zoomAt(zoom * 1.25); break
        case 'manga.zoomOut': zoomAt(zoom / 1.25); break
        case 'manga.zoomReset': setZoom(1); break
        case 'manga.double': changePrefs({ layout: layout === 'double' ? 'single' : 'double' }); break
        case 'manga.direction': changePrefs({ direction: rtl ? 'ltr' : 'rtl' }); break
        case 'manga.mode': changePrefs({ mode: study ? 'chill' : 'study' }); break
        case 'manga.bubble': startBubble(); break
        case 'manga.bookmark': bookmark(); break
        case 'manga.fullscreen': toggleFullscreen(); break
        case 'manga.close':
          if (draw) setDraw(null)
          else if (panel) setPanel(null)
          else if (document.fullscreenElement) return
          else onClose()
          break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ----- Lăn chuột -----
  const wheelLock = useRef(0)
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomAt(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY)
        return
      }
      if (layout === 'scroll') return
      if (el.scrollHeight > el.clientHeight + 1) return
      e.preventDefault()
      const now = Date.now()
      if (now - wheelLock.current < 350 || Math.abs(e.deltaY) < 4) return
      wheelLock.current = now
      if (e.deltaY > 0) next(); else prev()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoom, zoomAt, next, prev, layout])

  // ----- Chạm / chuột: bấm, chạm 2 lần, giữ, vuốt, kéo, chụm -----
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    x: number; y: number; t: number; moved: boolean; sl: number; st: number
    pinch?: { dist: number; zoom: number }
  } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number; timer?: number }>({ t: 0, x: 0, y: 0 })
  const holdTimer = useRef<number | undefined>(undefined)

  const onTap = (clientX: number, clientY: number) => {
    const el = viewport.current!
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    if (atEnd) return
    if (x < 0.3) { left(); return }
    if (x > 0.7) { right(); return }
    // Vùng giữa: chạm 1 lần = ẩn/hiện thanh công cụ; chạm 2 lần nhanh = zoom
    const lt = lastTap.current
    if (Date.now() - lt.t < 300 && Math.hypot(clientX - lt.x, clientY - lt.y) < 40) {
      window.clearTimeout(lt.timer)
      lastTap.current = { t: 0, x: 0, y: 0 }
      zoomAt(zoom > 1.05 ? 1 : 2.2, clientX, clientY)
      return
    }
    lastTap.current = {
      t: Date.now(), x: clientX, y: clientY,
      timer: window.setTimeout(() => { setUi((v) => !v); setPanel(null) }, 260),
    }
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (draw || (e.pointerType === 'mouse' && e.button !== 0)) return
    const el = viewport.current!
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      gesture.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, sl: el.scrollLeft, st: el.scrollTop }
      // Giữ yên 0,6 giây = khoanh bong bóng mới (chỉ ở chế độ Học sâu)
      if (study) {
        window.clearTimeout(holdTimer.current)
        holdTimer.current = window.setTimeout(() => {
          if (gesture.current && !gesture.current.moved) {
            gesture.current = null
            pointers.current.clear()
            navigator.vibrate?.(15)
            startBubble()
          }
        }, 600)
      }
    } else if (pointers.current.size === 2 && gesture.current) {
      window.clearTimeout(holdTimer.current)
      const [a, b] = [...pointers.current.values()]
      gesture.current.moved = true
      gesture.current.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const el = viewport.current!
    if (pointers.current.size >= 2 && g.pinch) {
      const [a, b] = [...pointers.current.values()]
      zoomAt(g.pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.dist), (a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.moved && Math.abs(dx) + Math.abs(dy) > 8) {
      g.moved = true
      window.clearTimeout(holdTimer.current)
      el.setPointerCapture?.(e.pointerId)
    }
    if (g.moved && layout !== 'scroll') {
      el.scrollLeft = g.sl - dx
      el.scrollTop = g.st - dy
    }
  }

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    window.clearTimeout(holdTimer.current)
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g || pointers.current.size > 0) return
    gesture.current = null
    if (g.pinch) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.moved && Date.now() - g.t < 500) { onTap(e.clientX, e.clientY); return }
    const el = viewport.current!
    const overflowX = el.scrollWidth > el.clientWidth + 1
    if (layout !== 'scroll' && !overflowX && e.pointerType !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) left(); else right()
    }
  }

  // ----- Khoanh vùng: OCR hoặc bong bóng mới -----
  /** Tìm trang nằm dưới vùng khoanh và đổi sang tọa độ 0–1 của trang đó. */
  const regionToPage = (rect: DOMRect): { img: HTMLImageElement; page: number; box: Box } | null => {
    const imgs = [...document.querySelectorAll<HTMLImageElement>('img[data-page]')]
    let best: { img: HTMLImageElement; area: number } | undefined
    for (const img of imgs) {
      const r = img.getBoundingClientRect()
      const w = Math.min(r.right, rect.right) - Math.max(r.left, rect.left)
      const h = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top)
      if (w > 0 && h > 0 && (!best || w * h > best.area)) best = { img, area: w * h }
    }
    if (!best) return null
    const r = best.img.getBoundingClientRect()
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    const x = clamp((rect.left - r.left) / r.width)
    const y = clamp((rect.top - r.top) / r.height)
    return {
      img: best.img, page: Number(best.img.dataset.page),
      box: { x, y, w: clamp((rect.right - r.left) / r.width) - x, h: clamp((rect.bottom - r.top) / r.height) - y },
    }
  }

  const cropFromImg = async (img: HTMLImageElement, box: Box): Promise<Blob | null> => {
    const sx = box.x * img.naturalWidth, sy = box.y * img.naturalHeight
    const sw = Math.max(1, box.w * img.naturalWidth), sh = Math.max(1, box.h * img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = Math.round(sw); c.height = Math.round(sh)
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
    return new Promise((res) => c.toBlob(res, 'image/png'))
  }

  const onRegion = async (rect: DOMRect) => {
    const mode = draw
    setDraw(null)
    const hit = regionToPage(rect)
    if (!hit) { flash('Hãy khoanh vào trong trang truyện.'); return }
    const ocr = integrations.ocr
    if (mode === 'pin') {
      const p = await addPin({ seriesId: chapter.seriesId, chapterId: chapter.id, page: hit.page, x: hit.box.x, y: hit.box.y })
      openPin(p)
      return
    }
    if (mode === 'bubble') {
      let text = ''
      if (ocr) {
        flash('Đang đọc chữ…')
        const blob = await cropFromImg(hit.img, hit.box)
        if (blob) text = (await ocr.recognize(blob, { vertical: hit.box.h > hit.box.w }).catch(() => [])).map((b) => b.text).join('')
      }
      const b = await addBubble({ seriesId: chapter.seriesId, chapterId: chapter.id, page: hit.page, box: hit.box, text })
      openBubble(b, true)
      return
    }
    if (!ocr) return
    setPanel('lookup')
    setOcrResult({ blocks: [], busy: true })
    try {
      const blob = await cropFromImg(hit.img, hit.box)
      if (!blob) throw new Error('Không cắt được ảnh.')
      setOcrResult({ blocks: await ocr.recognize(blob, { vertical: hit.box.h > hit.box.w }), busy: false })
    } catch (e) {
      setOcrResult({ blocks: [], busy: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  // Nghe liên tục: chuyển tới trang của bong bóng đang đọc và tô sáng nó
  const goHighlight = (p: number, id?: string) => {
    setHighlight(id)
    if (!spread.includes(p)) { setAtEnd(false); setPage(p) }
  }

  const label = chapterLabel(chapter)
  const pageText = spread.length > 1 ? `${Math.min(...spread) + 1}–${Math.max(...spread) + 1}` : `${spread[0] + 1}`
  const imgFilter = `${prefs.tone === 'sepia' ? 'sepia(0.35) ' : ''}brightness(${prefs.brightness})`
  const overlayFor = (p: number) => study && (
    <>
      <BubbleOverlay bubbles={allBubbles.filter((b) => b.page === p)} selected={selected?.id} highlight={highlight}
        onOpen={(b) => openBubble(b)} />
      {pins.filter((pin) => pin.page === p).map((pin) => (
        <button key={pin.id} type="button" title={pin.note || 'Ghi chú ghim'} aria-label={`Ghi chú ghim: ${pin.note || 'trống'}`}
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openPin(pin) }}
          className={`absolute z-10 -translate-x-1/2 -translate-y-full text-2xl drop-shadow transition hover:scale-110 ${pin.id === pinId && panel === 'pin' ? 'scale-125' : ''}`}
          style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>📌</button>
      ))}
    </>
  )
  const inStudyTabs = panel && STUDY_TABS.some((t) => t.id === panel)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg text-text" aria-label={`Đang đọc ${series?.title ?? ''} ${label}`}>
      {/* Thanh trên */}
      <header className={`absolute inset-x-0 top-0 z-20 flex items-center gap-1 border-b border-border bg-surface/95 px-2 py-2 backdrop-blur transition ${ui ? '' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <IconBtn label="Quay lại danh sách chương (Esc)" onClick={onClose}>←</IconBtn>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{series?.title ?? ''}</p>
          <p className="truncate text-xs text-muted">{label}{chapter.title && chapter.title !== label ? ` · ${chapter.title}` : ''}</p>
        </div>
        <button onClick={() => changePrefs({ mode: study ? 'chill' : 'study' })} title="Đổi chế độ đọc (M)"
          className="hidden min-h-9 rounded-full bg-surface-2 px-3 text-xs sm:block">
          {study ? '📖 Học sâu' : '☕ Đọc chill'}
        </button>
        {study && <IconBtn label="Thêm bong bóng thoại (N, hoặc giữ trên trang)" active={draw === 'bubble'} onClick={startBubble}>＋</IconBtn>}
        {study && <IconBtn label="Ghim ghi chú lên khung tranh" active={draw === 'pin'} onClick={() => { setDraw((v) => (v === 'pin' ? null : 'pin')); setPanel(null); setUi(true) }}>📌</IconBtn>}
        <IconBtn label={markHere ? 'Bỏ đánh dấu trang (B)' : 'Đánh dấu trang (B)'} active={!!markHere} onClick={bookmark}>🔖</IconBtn>
        {study && <IconBtn label="Bảng học: bong bóng, từ, luyện tập" active={!!inStudyTabs} onClick={() => setPanel(inStudyTabs ? null : 'bubbles')}>📚</IconBtn>}
        <IconBtn label="Tra từ" active={panel === 'lookup'} onClick={() => setPanel(panel === 'lookup' ? null : 'lookup')}><span className="jp">辞</span></IconBtn>
        {integrations.ocr && (
          <IconBtn label={`Khoanh vùng để đọc chữ (${integrations.ocr.name})`} active={draw === 'ocr'}
            onClick={() => { setDraw((v) => (v === 'ocr' ? null : 'ocr')); setPanel(null) }}><span className="jp">読</span></IconBtn>
        )}
        <IconBtn label="Cài đặt đọc" active={panel === 'settings'} onClick={() => setPanel(panel === 'settings' ? null : 'settings')}>⚙</IconBtn>
        <IconBtn label="Toàn màn hình (F)" onClick={toggleFullscreen}>⛶</IconBtn>
      </header>

      {/* Khung đọc */}
      <div className="contents" style={{ ['--page-filter' as string]: imgFilter }}>
        {layout === 'scroll' ? (
          <ScrollView
            viewportRef={viewport} chapter={chapter} source={source} zoom={zoom} width={size.w}
            page={page} onPage={setPage} overlayFor={overlayFor} filter={imgFilter}
            onTap={() => { setUi((v) => !v); setPanel(null) }}
          />
        ) : (
          <div
            ref={viewport}
            className="relative min-h-0 flex-1 select-none overflow-auto overscroll-contain"
            style={{ touchAction: 'none', scrollbarWidth: 'thin' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-center" style={{ minWidth: '100%', minHeight: '100%', width: dims.width, height: dims.height }}>
              <div className={`flex ${rtl ? 'flex-row-reverse' : ''}`} style={{ height: dims.height }}>
                {spread.map((i, k) => (
                  <div key={i} className="relative shrink-0" style={{ width: dims.widths[k], height: dims.height }}>
                    <PageImg source={source} index={i} className="size-full" filter={imgFilter} />
                    {overlayFor(i)}
                    {marks.some((m) => m.page === i) && <span className="pointer-events-none absolute right-2 top-1 text-xl drop-shadow" aria-hidden>🔖</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {draw && <RegionSelect mode={draw} onDone={onRegion} onCancel={() => setDraw(null)} />}

      {/* Hết chương */}
      {atEnd && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-sm text-muted">Đã đọc hết</p>
            <h2 className="mt-1 text-lg font-semibold">{label}</h2>
            {bubbles.length > 0 && <p className="mt-1 text-xs text-muted">{bubbles.length} câu · {bubbles.filter((b) => b.minedAt).length} câu đã lưu vào Ôn tập</p>}
            <div className="mt-5 grid gap-2">
              {nextChapter && <Button onClick={() => onOpenChapter(nextChapter.id, 0)}>Đọc tiếp {chapterLabel(nextChapter)}</Button>}
              {study && bubbles.length >= 2 && <Button variant="soft" onClick={() => { setAtEnd(false); setPanel('practice'); setUi(true) }}>Luyện câu trong chương</Button>}
              <Button variant="soft" onClick={onClose}>Về danh sách chương</Button>
              <Button variant="ghost" onClick={() => setAtEnd(false)}>Xem lại trang cuối</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bảng bên (máy tính) / bảng dưới (điện thoại) */}
      {panel && (
        <aside
          className="absolute inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-card border border-border bg-surface p-4 shadow-card sm:inset-x-auto sm:bottom-auto sm:right-2 sm:top-16 sm:max-h-[calc(100dvh-9rem)] sm:w-[24rem] sm:rounded-card"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {inStudyTabs && (
            <div className="mb-3 flex items-center gap-1 overflow-x-auto" role="tablist">
              {STUDY_TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={panel === t.id} onClick={() => setPanel(t.id)}
                  className={`min-h-9 shrink-0 rounded-lg px-3 text-sm ${panel === t.id ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2'}`}>
                  {t.label}
                </button>
              ))}
              <button className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Đóng" onClick={() => setPanel(null)}>✕</button>
            </div>
          )}
          {panel === 'settings' && <SettingsPanel prefs={prefs} change={changePrefs} onMakeDefault={() => void setDefaultPrefs(prefs)} />}
          {panel === 'lookup' && <LookupPanel ocr={ocrResult} hasOcr={!!integrations.ocr} lookup={integrations.lookup?.lookup} />}
          {panel === 'bubble' && selectedBubble && (
            <BubbleCard
              bubble={selectedBubble} series={series} chapter={chapter} editing={selected?.editing}
              pageBlob={() => source.blob(selectedBubble.page)} rate={rate} setRate={setRate}
              onClose={() => { setPanel(null); setSelected(null) }}
              onDeleted={(b) => {
                setPanel(null); setSelected(null)
                flash('Đã xóa bong bóng', () => { void saveNote(b); setToast(undefined) })
              }}
            />
          )}
          {panel === 'bubbles' && <BubblesTab bubbles={bubbles} series={series} page={spread[0]} rate={rate} onOpen={(b) => { goHighlight(b.page); openBubble(b) }} onGo={goHighlight} />}
          {panel === 'words' && <WordsTab bubbles={bubbles} chapter={chapter} series={series} />}
          {panel === 'practice' && <PracticeTab bubbles={bubbles} pageBlob={(p) => source.blob(p)} />}
          {panel === 'marks' && <MarksTab marks={marks} pins={pins} page={spread[0]} onGo={(p) => goTo(p)} onToggle={bookmark} onOpenPin={(p) => { goTo(p.page); openPin(p) }} />}
          {panel === 'pin' && selectedPin && (
            <PinCard pin={selectedPin} onClose={() => { setPanel(null); setPinId(undefined) }}
              onDelete={async () => {
                const p = selectedPin
                await deleteNote(p.id)
                setPanel(null); setPinId(undefined)
                flash('Đã xóa ghi chú ghim', () => { void saveNote(p); setToast(undefined) })
              }} />
          )}
        </aside>
      )}

      {/* Thông báo nhỏ, có Hoàn tác */}
      {toast && (
        <div role="status" className="absolute left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-text px-4 py-2 text-sm text-bg shadow-card">
          {toast.text}
          {toast.undo && <button className="font-semibold underline" onClick={toast.undo}>Hoàn tác</button>}
        </div>
      )}

      {/* Thanh dưới */}
      <footer className={`absolute inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur transition ${ui && !(panel && size.w < 640) ? '' : 'pointer-events-none translate-y-full opacity-0'}`}>
        <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
          <IconBtn label={prevChapter ? `Chương trước: ${chapterLabel(prevChapter)}` : 'Không có chương trước'} disabled={!prevChapter}
            onClick={() => prevChapter && onOpenChapter(prevChapter.id, 0)}>{rtl ? '⇥' : '⇤'}</IconBtn>
          <input
            type="range" min={0} max={chapter.pageCount - 1} value={page}
            onChange={(e) => goTo(Number(e.target.value))}
            dir={rtl ? 'rtl' : 'ltr'} aria-label="Chọn trang"
            className="min-w-0 flex-1 accent-primary"
          />
          <IconBtn label={nextChapter ? `Chương sau: ${chapterLabel(nextChapter)}` : 'Không có chương sau'} disabled={!nextChapter}
            onClick={() => nextChapter && onOpenChapter(nextChapter.id, 0)}>{rtl ? '⇤' : '⇥'}</IconBtn>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          <span>Trang {pageText} / {chapter.pageCount}</span>
          <div className="flex items-center gap-1">
            <IconBtn small label="Thu nhỏ (−)" onClick={() => zoomAt(zoom / 1.25)}>−</IconBtn>
            <button className="min-w-12 rounded-lg px-1 py-1 hover:bg-surface-2" onClick={() => setZoom(1)} title="Về 100% (0)">{Math.round(zoom * 100)}%</button>
            <IconBtn small label="Phóng to (+)" onClick={() => zoomAt(zoom * 1.25)}>+</IconBtn>
          </div>
          <button className="rounded-lg px-1 py-1 hover:bg-surface-2 sm:hidden" onClick={() => changePrefs({ mode: study ? 'chill' : 'study' })}>
            {study ? '📖 Học' : '☕ Chill'}
          </button>
          <span className="hidden sm:inline">{rtl ? 'Phải → trái' : 'Trái → phải'}</span>
        </div>
      </footer>
    </div>
  )
}

/** Khung các bong bóng đã có trên một trang (chỉ hiện ở chế độ Học sâu). */
function BubbleOverlay({ bubbles, selected, highlight, onOpen }: {
  bubbles: MangaBubble[]; selected?: string; highlight?: string; onOpen: (b: MangaBubble) => void
}) {
  return (
    <>
      {bubbles.map((b) => {
        const on = b.id === selected || b.id === highlight
        return (
          <button
            key={b.id}
            type="button"
            aria-label={b.text ? `Bong bóng: ${b.text}` : 'Bong bóng chưa có chữ'}
            title={b.text}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpen(b) }}
            className={`absolute rounded-lg border-2 transition ${on ? 'border-primary bg-primary/15'
              : b.mark === 'good' ? 'border-good/70 hover:bg-good/10' : b.mark === 'hard' ? 'border-warn hover:bg-warn/10'
              : 'border-primary/50 border-dashed hover:bg-primary/10'}`}
            style={{ left: `${b.box.x * 100}%`, top: `${b.box.y * 100}%`, width: `${b.box.w * 100}%`, height: `${b.box.h * 100}%` }}
          >
            {(b.minedAt || b.mark) && (
              <span className="absolute -right-1 -top-2 text-xs text-primary" aria-hidden>
                {b.mark === 'good' ? '⭐' : b.mark === 'hard' ? '⚠' : ''}{b.minedAt ? '★' : ''}
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

/** Một trang ảnh: tải đường dẫn từ nguồn trang, giữ chỗ đúng kích thước khi đang tải, có nút thử lại khi lỗi. */
function PageImg({ source, index, style, className = '', filter }: {
  source: PageSource; index: number; style?: React.CSSProperties; className?: string; filter?: string
}) {
  const [url, setUrl] = useState<string>()
  const [err, setErr] = useState(false)
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    setErr(false)
    source.url(index).then((u) => alive && setUrl(u), () => alive && setErr(true))
    return () => { alive = false }
  }, [source, index, n])
  if (!url) {
    return (
      <div style={style} className={`grid shrink-0 place-items-center bg-surface-2 text-sm text-muted ${className}`}>
        {err
          ? <button className="rounded-lg px-3 py-2 hover:bg-surface" onPointerDown={(e) => e.stopPropagation()} onClick={() => setN((x) => x + 1)}>Không mở được trang {index + 1} · Thử lại</button>
          : `Trang ${index + 1}…`}
      </div>
    )
  }
  return (
    <img src={url} data-page={index} alt={`Trang ${index + 1}`} draggable={false}
      style={{ ...style, filter }} className={`block shrink-0 object-contain ${className}`} />
  )
}

/** Chế độ cuộn dọc liên tục. */
function ScrollView({ viewportRef, chapter, source, zoom, width, page, onPage, onTap, overlayFor, filter }: {
  viewportRef: React.RefObject<HTMLDivElement | null>
  chapter: MangaChapter; source: PageSource; zoom: number; width: number
  page: number; onPage: (p: number) => void; onTap: () => void
  overlayFor: (p: number) => React.ReactNode
  filter: string
}) {
  const items = useRef<(HTMLDivElement | null)[]>([])
  const reported = useRef(page)
  const colW = Math.min(width, 960) * zoom

  useLayoutEffect(() => {
    if (page === reported.current && items.current[page]?.dataset.ready) return
    items.current[page]?.scrollIntoView({ block: 'start' })
    if (items.current[page]) items.current[page]!.dataset.ready = '1'
    reported.current = page
  }, [page])

  const onScroll = () => {
    const el = viewportRef.current
    if (!el) return
    const mid = el.scrollTop + el.clientHeight * 0.35
    let p = 0
    for (let i = 0; i < items.current.length; i++) {
      const it = items.current[i]
      if (it && it.offsetTop <= mid) p = i
    }
    if (p !== reported.current) { reported.current = p; onPage(p) }
  }

  return (
    <div ref={viewportRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto" style={{ touchAction: 'pan-x pan-y' }}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onTap() }}>
      <div className="mx-auto" style={{ width: colW }}>
        {chapter.pages.map((m, i) => (
          <div key={i} ref={(el) => { items.current[i] = el }} className="relative" style={{ aspectRatio: `${m.w || 7} / ${m.h || 10}` }}>
            <LazyPage source={source} index={i} near={Math.abs(i - page) <= 3} filter={filter} />
            {overlayFor(i)}
          </div>
        ))}
      </div>
    </div>
  )
}

function LazyPage({ source, index, near, filter }: { source: PageSource; index: number; near: boolean; filter: string }) {
  const [show, setShow] = useState(near)
  useEffect(() => { if (near) setShow(true) }, [near])
  return show ? <PageImg source={source} index={index} className="size-full" filter={filter} /> : <div className="size-full bg-surface-2" />
}

/** Lớp phủ để khoanh một vùng (bong bóng mới, hoặc OCR). */
type DrawMode = 'ocr' | 'bubble' | 'pin'

function RegionSelect({ mode, onDone, onCancel }: { mode: DrawMode; onDone: (r: DOMRect) => void; onCancel: () => void }) {
  const [start, setStart] = useState<{ x: number; y: number }>()
  const [cur, setCur] = useState<{ x: number; y: number }>()
  const rect = start && cur
    ? new DOMRect(Math.min(start.x, cur.x), Math.min(start.y, cur.y), Math.abs(cur.x - start.x), Math.abs(cur.y - start.y))
    : undefined
  return (
    <div className="absolute inset-0 z-30 cursor-crosshair" style={{ touchAction: 'none' }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setStart({ x: e.clientX, y: e.clientY }); setCur({ x: e.clientX, y: e.clientY }) }}
      onPointerMove={(e) => start && setCur({ x: e.clientX, y: e.clientY })}
      onPointerUp={() => {
        if (mode === 'pin' && start) onDone(new DOMRect(start.x, start.y, 1, 1))
        else if (rect && rect.width > 8 && rect.height > 8) onDone(rect)
        else if (start) onCancel()
        setStart(undefined)
      }}>
      <div className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm shadow-card">
        {mode === 'bubble' ? 'Kéo để khoanh bong bóng thoại' : mode === 'pin' ? 'Chạm vào chỗ muốn ghim ghi chú' : 'Kéo để khoanh vùng chữ cần đọc'}
        <button className="rounded-full px-2 text-muted hover:text-text" onPointerDown={(e) => e.stopPropagation()} onClick={onCancel}>Hủy</button>
      </div>
      {rect && mode !== 'pin' && (
        <div className="pointer-events-none fixed rounded border-2 border-primary bg-primary-soft/30"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />
      )}
    </div>
  )
}

function SettingsPanel({ prefs, change, onMakeDefault }: {
  prefs: ReaderPrefs; change: (p: Partial<ReaderPrefs>) => void; onMakeDefault: () => void
}) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="grid gap-4 text-sm">
      <Row title="Chế độ">
        <Segmented<'study' | 'chill'> label="Chế độ đọc" value={prefs.mode} onChange={(v) => change({ mode: v })}
          options={[{ value: 'study', label: '📖 Học sâu' }, { value: 'chill', label: '☕ Đọc chill' }]} />
      </Row>
      <p className="-mt-2 text-xs text-muted">Đọc chill: ẩn khung bong bóng, chỉ đọc. Học sâu: hiện bong bóng để tra từ, nghe, lưu câu.</p>
      <Row title="Chiều đọc">
        <Segmented<ReadDirection> label="Chiều đọc" value={prefs.direction} onChange={(v) => change({ direction: v })}
          options={[{ value: 'rtl', label: 'Phải → trái' }, { value: 'ltr', label: 'Trái → phải' }]} />
      </Row>
      <Row title="Cách xếp trang">
        <Segmented<PageLayout> label="Cách xếp trang" value={prefs.layout} onChange={(v) => change({ layout: v })}
          options={[{ value: 'auto', label: 'Tự động' }, { value: 'single', label: '1 trang' }, { value: 'double', label: '2 trang' }, { value: 'scroll', label: 'Cuộn' }]} />
      </Row>
      {prefs.layout !== 'scroll' && (
        <Row title="Kích thước trang">
          <Segmented<FitMode> label="Kích thước trang" value={prefs.fit} onChange={(v) => change({ fit: v })}
            options={[{ value: 'page', label: 'Vừa khung' }, { value: 'width', label: 'Vừa ngang' }, { value: 'height', label: 'Vừa cao' }]} />
        </Row>
      )}
      {prefs.layout !== 'single' && prefs.layout !== 'scroll' && (
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-primary" checked={prefs.coverAlone} onChange={(e) => change({ coverAlone: e.target.checked })} />
          Trang bìa đứng riêng khi xem 2 trang
        </label>
      )}
      <Row title="Màu giấy">
        <Segmented<'normal' | 'sepia'> label="Màu giấy" value={prefs.tone} onChange={(v) => change({ tone: v })}
          options={[{ value: 'normal', label: 'Bình thường' }, { value: 'sepia', label: 'Sepia' }]} />
      </Row>
      <label className="grid gap-1">
        <span className="text-xs text-muted">Độ sáng trang: {Math.round(prefs.brightness * 100)}%</span>
        <input type="range" min={0.5} max={1} step={0.05} value={prefs.brightness} className="accent-primary"
          onChange={(e) => change({ brightness: Number(e.target.value) })} />
      </label>
      <p className="text-xs text-muted">Cài đặt này lưu riêng cho series đang đọc. Giao diện sáng/tối và cỡ chữ đổi trong Cài đặt của app.</p>
      <Button variant="soft" onClick={() => { onMakeDefault(); setSaved(true) }}>
        {saved ? '✓ Đã đặt làm mặc định' : 'Dùng làm mặc định cho series mới'}
      </Button>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Phím tắt và thao tác</summary>
        <ul className="mt-2 grid gap-1">
          <li>← → lật trang theo chiều đọc · Space trang sau · Home/End</li>
          <li>+ − zoom · 0 về 100% · Ctrl + lăn chuột · chạm 2 lần ở giữa để zoom</li>
          <li>N hoặc giữ trên trang: thêm bong bóng · B đánh dấu trang · M đổi Chill/Học</li>
          <li>D đổi 1/2 trang · R đổi chiều đọc · F toàn màn hình · Esc thoát</li>
          <li>Đây là phím mặc định. <a href="#/shortcuts" className="underline hover:text-text">Đổi phím tắt</a> · bấm ? để xem phím đang dùng.</li>
        </ul>
      </details>
    </div>
  )
}

function LookupPanel({ ocr, hasOcr, lookup }: {
  ocr?: { blocks: OcrBlock[]; busy: boolean; error?: string }
  hasOcr: boolean
  lookup?: (text: string, anchor?: { x: number; y: number }) => void | Promise<void>
}) {
  const [text, setText] = useState('')
  const go = (t: string, el?: HTMLElement | null) => {
    if (!t.trim() || !lookup) return
    const r = el?.getBoundingClientRect()
    void lookup(t.trim(), r ? { x: r.left, y: r.bottom } : undefined)
  }
  return (
    <div className="grid gap-3 text-sm">
      <h3 className="font-semibold">Tra từ</h3>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go(text, e.currentTarget) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} lang="ja" placeholder="Gõ hoặc dán chữ…"
          className="jp min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 outline-none focus:border-primary" />
        <Button type="submit" disabled={!lookup || !text.trim()}>Tra</Button>
      </form>
      {!lookup && <p className="text-xs text-muted">Không mở được module Từ điển.</p>}
      {ocr && (
        <div className="grid gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted">Chữ đọc được</p>
          {ocr.busy && <p className="text-muted">Đang đọc chữ…</p>}
          {ocr.error && <p className="text-bad">{ocr.error}</p>}
          {!ocr.busy && !ocr.error && ocr.blocks.length === 0 && <p className="text-muted">Không thấy chữ nào.</p>}
          {ocr.blocks.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="jp flex-1 text-base">{b.text}</p>
              <button className="rounded-lg px-2 py-1 text-primary hover:bg-surface-2 disabled:opacity-50" disabled={!lookup}
                onClick={(e) => go(b.text, e.currentTarget)}>Tra</button>
              <button className="rounded-lg px-2 py-1 text-muted hover:bg-surface-2" onClick={() => setText(b.text)}>Sửa</button>
            </div>
          ))}
        </div>
      )}
      {!hasOcr && <p className="text-xs text-muted">Mẹo: ở chế độ Học sâu, giữ ngón tay trên một bong bóng thoại để thêm chữ, rồi bấm từng từ để tra. Đọc chữ tự động (OCR) sẽ có ở giai đoạn 3.</p>}
    </div>
  )
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted">{title}</span>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function IconBtn({ label, onClick, children, active, disabled, small }: {
  label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean; small?: boolean
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`grid shrink-0 place-items-center rounded-lg transition disabled:opacity-40 ${small ? 'size-8' : 'size-10'} ${active ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
      {children}
    </button>
  )
}
