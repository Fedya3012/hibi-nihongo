/**
 * TRÌNH ĐỌC: hiện văn bản theo trang, mỗi từ bấm được để tra (dùng <JapaneseText> của Từ điển).
 *   - Furigana, chữ dọc (縦書き), cỡ chữ: thanh công cụ phía trên, nhớ cho lần sau.
 *   - "Hiểu x% từ trên trang": so các từ trên trang với kho từ đã biết (xem known.ts).
 *   - Thanh dưới: từ vừa tra → tạo thẻ Ôn tập kèm câu đang đọc, hoặc đánh dấu "Đã biết".
 *   - Văn bản loại Clipboard: tự thêm câu mới mỗi khi bạn sao chép chữ Nhật rồi quay lại app (hoặc Ctrl+V).
 * Phím: ← → (hoặc PageUp/PageDown) đổi trang.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import {
  JapaneseText, hasJapanese, headword, tokenize, useDictPacks, useTokenizerStatus, type Segment, type WordResult,
} from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { ProgressBar } from '../manga/ui'
import { coverageOf, markKnown, useKnowledge, type Coverage } from './known'
import { PreStudyButton } from '@/modules/vocab/api'
import { glossOf, mineSentence, sentenceAt } from './mining'
import { SIZES, useReaderPrefs } from './prefs'
import { textToParas } from './importers'
import { getDocBody, getDocMeta, paginate, saveDocBody, updateDocMeta } from './store'
import { S } from './strings'
import type { DocBody, DocMeta } from './types'

interface LastLookup { seg: Segment; result?: WordResult; sentence: string }

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** Một đoạn văn. Tách riêng (memo) để đổi trang/tra từ không vẽ lại cả trang. */
const Para = memo(function Para({ text, furigana, onLookup }: {
  text: string
  furigana: boolean
  onLookup: (para: string, seg: Segment, results: WordResult[]) => void
}) {
  const handle = useCallback((seg: Segment, results: WordResult[]) => onLookup(text, seg, results), [text, onLookup])
  return <p className="mb-[0.9em]"><JapaneseText text={text} furigana={furigana} onLookup={handle} /></p>
})

export function ReaderView({ docId, onClose }: { docId: string; onClose: () => void }) {
  const t = useT(S)
  const prefs = useReaderPrefs()
  const packs = useDictPacks()
  const tokStatus = useTokenizerStatus((s) => s.status)
  const k = useKnowledge()

  const [meta, setMeta] = useState<DocMeta | null>()
  const [body, setBody] = useState<DocBody | null>()
  const [page, setPage] = useState(0)
  const [cov, setCov] = useState<Coverage | null>(null)
  const [last, setLast] = useState<LastLookup | null>(null)
  const [msg, setMsg] = useState('')
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState('')
  const topRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lastClip = useRef<string | null>(null)

  // Tải văn bản
  useEffect(() => {
    let alive = true
    Promise.all([getDocMeta(docId), getDocBody(docId)]).then(([m, b]) => {
      if (!alive) return
      setMeta(m ?? null)
      setBody(b ?? null)
      if (m) {
        setPage(m.page)
        setLive(m.source === 'clipboard')
        updateDocMeta(docId, { openedAt: Date.now() })
      }
    })
    return () => { alive = false }
  }, [docId])

  const pages = useMemo(() => (body ? paginate(body.chapters) : []), [body])
  const pageIdx = Math.min(page, Math.max(0, pages.length - 1))
  const cur = pages[pageIdx]
  const chapterStarts = useMemo(() => {
    const out: { title: string; page: number }[] = []
    pages.forEach((p, i) => { if (p.firstOfChapter && p.title) out.push({ title: p.title, page: i }) })
    return out
  }, [pages])

  const goTo = useCallback((p: number) => {
    const n = Math.max(0, Math.min(p, pages.length - 1))
    setPage(n)
    setLast(null)
    updateDocMeta(docId, { page: n, openedAt: Date.now() })
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [docId, pages.length])

  // Tỉ lệ hiểu của trang đang đọc
  useEffect(() => {
    if (!cur || !k) return
    let alive = true
    setCov(null)
    Promise.all(cur.paras.map((p) => tokenize(p))).then(
      (lists) => alive && setCov(coverageOf(lists.flat(), k)),
      () => alive && setCov(null),
    )
    return () => { alive = false }
  }, [cur, k])

  // Phím đổi trang. Chữ dọc đọc từ phải sang trái nên ← là trang sau.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return
      const fwd = prefs.vertical ? 'ArrowLeft' : 'ArrowRight'
      const bwd = prefs.vertical ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === fwd || e.key === 'PageDown') { e.preventDefault(); goTo(pageIdx + 1) }
      else if (e.key === bwd || e.key === 'PageUp') { e.preventDefault(); goTo(pageIdx - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, pageIdx, prefs.vertical])

  // ----- Chế độ clipboard: thêm câu mới vào cuối -----
  const appendText = useCallback((raw: string) => {
    const s = raw.trim()
    if (!s || s === lastClip.current) return
    lastClip.current = s
    if (!hasJapanese(s)) return
    setBody((b) => {
      if (!b) return b
      const chs = b.chapters.length ? b.chapters.map((c) => ({ ...c })) : [{ title: '', paras: [] }]
      const lastCh = chs[chs.length - 1]
      const add = textToParas(s)
      // Không thêm trùng câu vừa thêm (ví dụ mở lại văn bản khi clipboard vẫn còn câu cũ)
      if (add.join('\n') === lastCh.paras.slice(-add.length).join('\n')) return b
      lastCh.paras = [...lastCh.paras, ...add]
      const next = { ...b, chapters: chs }
      saveDocBody(next)
      const n = paginate(next.chapters).length - 1
      setPage(n)
      updateDocMeta(b.id, { page: n })
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }))
      return next
    })
  }, [])

  useEffect(() => {
    if (!live) return
    let stopped = false
    const tick = async () => {
      if (stopped || document.hidden || !document.hasFocus() || !navigator.clipboard?.readText) return
      try {
        appendText(await navigator.clipboard.readText())
        setLiveError('')
      } catch {
        setLiveError('Chưa được phép đọc clipboard. Hãy cho phép khi trình duyệt hỏi, hoặc nhấn Ctrl+V tại đây.')
      }
    }
    const id = window.setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    tick()
    return () => { stopped = true; window.clearInterval(id); window.removeEventListener('focus', tick) }
  }, [live, appendText])

  // Ctrl+V trong trình đọc (chạy cả khi trình duyệt không cho đọc clipboard tự động)
  useEffect(() => {
    if (meta?.source !== 'clipboard') return
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const s = e.clipboardData?.getData('text/plain')
      if (s) { e.preventDefault(); lastClip.current = null; appendText(s) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [meta?.source, appendText])

  // ----- Tra từ → thanh lưu thẻ -----
  const onLookup = useCallback((para: string, seg: Segment, results: WordResult[]) => {
    setMsg('')
    setLast({ seg, result: results[0], sentence: sentenceAt(para, seg.start) })
  }, [])

  const addCard = async () => {
    if (!last?.result || !meta) return
    const r = await mineSentence({ result: last.result, seg: last.seg, sentence: last.sentence, docTitle: meta.title })
    setMsg(r.added ? t('added', { deck: r.deck }) : t('dup'))
  }
  const known = async () => {
    if (!last) return
    const base = last.seg.base || last.seg.surface
    if (last.result) {
      const { word, reading } = headword(last.result.data)
      await markKnown({ w: word, r: reading, id: last.result.id, alt: base !== word ? [base] : undefined }, true)
      setMsg(t('marked', { w: word }))
    } else {
      await markKnown({ w: base, r: last.seg.reading || undefined }, true)
      setMsg(t('marked', { w: base }))
    }
  }

  if (meta === undefined || body === undefined) return <p className="text-muted">{t('loading')}</p>
  if (!meta || !body) {
    return (
      <div className="grid gap-3">
        <p>{t('notFound')}</p>
        <div><Button variant="soft" onClick={onClose}>{t('back')}</Button></div>
      </div>
    )
  }

  const isLast = pageIdx >= pages.length - 1
  const pct = (x: number) => Math.round(x * 100)
  const btnToggle = (on: boolean) => `min-h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`

  return (
    <div className="grid gap-3 pb-28" ref={topRef}>
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="min-h-9 px-2" onClick={onClose}>{t('back')}</Button>
        <h1 className="jp min-w-0 flex-1 truncate text-lg font-bold">{meta.title}</h1>
        {chapterStarts.length > 1 && (
          <select
            aria-label={t('chapters')}
            className="min-h-9 max-w-48 rounded-lg border border-border bg-surface-2 px-2 text-sm"
            value={[...chapterStarts].reverse().find((c) => c.page <= pageIdx)?.page ?? 0}
            onChange={(e) => goTo(Number(e.target.value))}
          >
            {chapterStarts.map((c) => <option key={c.page} value={c.page}>{c.title}</option>)}
          </select>
        )}
        <button className={btnToggle(prefs.furigana)} aria-pressed={prefs.furigana} onClick={() => prefs.set({ furigana: !prefs.furigana })}>{t('furigana')}</button>
        <button className={btnToggle(prefs.vertical)} aria-pressed={prefs.vertical} onClick={() => prefs.set({ vertical: !prefs.vertical })}>{t('vertical')}</button>
        <select aria-label={t('size')} className="min-h-9 rounded-lg border border-border bg-surface-2 px-2 text-sm"
          value={prefs.size} onChange={(e) => prefs.set({ size: Number(e.target.value) })}>
          {SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        {/* Học trước từ của chương đang đọc (cả văn bản nếu chỉ có một chương) */}
        {cur && body.chapters[cur.chapter]?.paras.length ? (
          <PreStudyButton variant="ghost" className="min-h-9 px-3 text-sm"
            name={(body.chapters.length > 1 && body.chapters[cur.chapter].title) || meta.title}
            lines={body.chapters[cur.chapter].paras} deck={`Đọc · ${meta.title}`.slice(0, 60)} tags={['reader']} src="reader" />
        ) : null}
        {meta.source === 'clipboard' && (
          <button className={btnToggle(live)} aria-pressed={live} onClick={() => setLive(!live)}>
            {live ? `● ${t('listening')}` : t('listen')}
          </button>
        )}
      </div>

      {/* Tỉ lệ hiểu */}
      {cur && cur.paras.length > 0 && (
        <div className="grid gap-1 text-sm">
          {cov && cov.tokens > 0 ? (
            <>
              <div className="flex flex-wrap gap-x-3 text-muted">
                <span><b className="text-text">{t('coverage', { pct: pct(cov.known) })}</b></span>
                {cov.learning > 0 && <span>{t('learningPct', { pct: pct(cov.learning) })}</span>}
                {cov.newWords.length > 0 && <span>{t('newWords', { n: cov.newWords.length })}</span>}
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="bg-good" style={{ width: `${cov.known * 100}%` }} />
                <div className="bg-warn" style={{ width: `${cov.learning * 100}%` }} />
              </div>
              {cov.newWords.length > 0 && (
                <details className="text-muted">
                  <summary className="cursor-pointer select-none">{t('newWords', { n: cov.newWords.length })}</summary>
                  <div className="jp mt-2 flex flex-wrap gap-1.5">
                    {cov.newWords.slice(0, 60).map((w) => (
                      <button key={w} className="rounded-md bg-primary-soft px-2 py-0.5 text-text hover:opacity-80"
                        onClick={(e) => openLookup(w, { x: e.clientX, y: e.clientY })}>{w}</button>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : tokStatus === 'loading' ? (
            <p className="text-muted">{t('preparing')}</p>
          ) : cov ? <p className="text-muted">{t('noWords')}</p> : null}
        </div>
      )}

      {!packs.loading && !packs.ready && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm">
          {t('noDict')} <a className="font-medium text-primary hover:underline" href="#/dictionary?tab=data">{t('openDict')}</a>
        </p>
      )}

      {/* Nội dung */}
      <Card className="p-5 sm:p-8">
        <div
          lang="ja"
          className={`jp leading-[1.9] ${prefs.vertical ? 'h-[70dvh] overflow-x-auto' : 'mx-auto max-w-[42em]'}`}
          style={{ fontSize: prefs.size, ...(prefs.vertical ? { writingMode: 'vertical-rl' as const } : {}) }}
        >
          {cur?.firstOfChapter && cur.title && <h2 className="mb-[0.9em] text-[1.2em] font-bold">{cur.title}</h2>}
          {cur?.paras.map((p, i) => <Para key={`${pageIdx}-${i}`} text={p} furigana={prefs.furigana} onLookup={onLookup} />)}
          {meta.source === 'clipboard' && !cur?.paras.length && <p className="text-base text-muted">{t('liveEmpty')}</p>}
          <div ref={endRef} />
        </div>
        {pageIdx === 0 && cur?.paras.length ? <p className="mt-4 text-xs text-muted">{t('tapHint')}</p> : null}
        {liveError && live && <p className="mt-3 text-sm text-bad">{liveError}</p>}
      </Card>

      {/* Đổi trang */}
      {pages.length > 1 && (
        <div className="grid gap-2">
          <ProgressBar value={(pageIdx + 1) / pages.length} />
          <div className="flex items-center justify-between gap-2">
            <Button variant="soft" disabled={pageIdx === 0} onClick={() => goTo(pageIdx - 1)}>{t('prev')}</Button>
            <span className="text-sm text-muted">{t('pageOf', { i: pageIdx + 1, n: pages.length })}</span>
            {isLast ? (
              <Button variant={meta.finishedAt ? 'ghost' : 'primary'} disabled={!!meta.finishedAt}
                onClick={async () => { const f = Date.now(); await updateDocMeta(docId, { finishedAt: f }); setMeta({ ...meta, finishedAt: f }) }}>
                {meta.finishedAt ? `✓ ${t('done')}` : t('finish')}
              </Button>
            ) : (
              <Button variant="soft" onClick={() => goTo(pageIdx + 1)}>{t('next')}</Button>
            )}
          </div>
        </div>
      )}

      {/* Thanh dưới: từ vừa tra */}
      {last && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-4 md:left-auto md:right-4 md:max-w-xl">
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{t('lastWord')}</p>
              <p className="truncate">
                <span className="jp font-semibold">{last.result ? headword(last.result.data).word : last.seg.base || last.seg.surface}</span>
                {last.result && <span className="ml-2 text-sm text-muted">{glossOf(last.result)}</span>}
              </p>
              {msg && <p role="status" className="text-xs text-good">{msg}</p>}
            </div>
            <Button className="min-h-9 text-sm" disabled={!last.result} onClick={addCard}>{t('addCard')}</Button>
            <Button variant="soft" className="min-h-9 text-sm" onClick={known}>{t('markKnown')}</Button>
            <button aria-label="Đóng" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" onClick={() => setLast(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
