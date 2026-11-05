/**
 * BẢNG "HỌC TRƯỚC TỪ" DÙNG CHUNG (manga, trình đọc văn bản, giáo trình...)
 *
 *   <PreStudyButton name="Chương 3" lines={paras} deck="Đọc · Tên sách" tags={['reader']} src="reader" />
 *
 * Bấm nút → hộp thoại: độ phủ hiện tại, chọn mục tiêu (80/90/95/98%), danh sách từ mới nên học
 * (gặp nhiều trước), thêm thẻ Ôn tập kèm câu trong văn bản, hoặc đánh dấu "Đã biết".
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { headword, searchWords, shortMeaning, useDictPacks, useTokenizerStatus, type WordResult } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { addReviewCards, type ReviewCardInput } from '@/modules/review/api'
import { useKnowledge } from '../knowledge'
import { setWordStatus } from '../actions'
import { analyzeLines, clozeOf, planPreStudy, type StudyWord, type TextAnalysis } from '../prestudy'
import { P } from '../prestudy-strings'

export interface PreStudyProps {
  /** Tên chương / bài, hiện trên tiêu đề hộp thoại. */
  name: string
  /** Chữ của chương: mỗi phần tử một đoạn / một câu. */
  lines: string[]
  /** Bộ thẻ để thêm từ vào. */
  deck: string
  tags?: string[]
  /** Nơi đánh dấu "Đã biết" (ghi vào Kho từ để biết từ đâu ra). */
  src: string
}

const TARGETS = [0.8, 0.9, 0.95, 0.98] as const
const PAGE = 60

/** Chọn kết quả từ điển khớp đúng thể từ điển (行く chứ không phải 行う), ưu tiên khớp cả cách đọc. */
function pickResult(results: WordResult[], w: string, reading?: string): WordResult | undefined {
  const same = results.filter((r) => (r.data.k ?? []).some((x) => x.t === w) || r.data.r.some((x) => x.t === w))
  return (reading ? same.find((r) => r.data.r.some((x) => x.t === reading)) : undefined) ?? same[0] ?? results[0]
}
const lookups = new Map<string, Promise<WordResult | undefined>>()
function lookupWord(w: string, reading?: string) {
  const key = `${w}|${reading ?? ''}`
  let p = lookups.get(key)
  if (!p) {
    p = searchWords(w, 8).then((r) => pickResult(r, w, reading), () => undefined)
    lookups.set(key, p)
    if (lookups.size > 2000) lookups.delete(lookups.keys().next().value as string)
  }
  return p
}

function Meaning({ w, reading: hint }: { w: string; reading?: string }) {
  const t = useT(P)
  const [m, setM] = useState<{ reading?: string; text: string } | null>()
  useEffect(() => {
    let alive = true
    lookupWord(w, hint).then(async (r) => {
      if (!r) { if (alive) setM(null); return }
      const reading = headword(r.data).reading
      const text = await shortMeaning(r.id, r.data, 2, 3)
      if (alive) setM({ reading: reading !== w ? reading : undefined, text })
    })
    return () => { alive = false }
  }, [w, hint])
  if (m === undefined) return <span className="text-muted">…</span>
  if (m === null) return <span className="text-muted">{t('notInDict')}</span>
  return <span>{m.reading && <span className="jp mr-1 text-muted">{m.reading}</span>}{m.text}</span>
}

export function PreStudyPanel({ lines, deck, tags, src }: Omit<PreStudyProps, 'name'>) {
  const t = useT(P)
  const k = useKnowledge()
  const packs = useDictPacks()
  const tokStatus = useTokenizerStatus((s) => s.status)
  const [a, setA] = useState<TextAnalysis | null>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<number>(0.9)
  const [showAll, setShowAll] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  // Lưu các từ BỎ chọn (mặc định chọn hết danh sách cần học)
  const [off, setOff] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const text = lines.join('\n')
  useEffect(() => {
    let alive = true
    setA(undefined); setError(''); setProgress(0)
    if (!text.trim()) { setA(null); return }
    analyzeLines(lines, (p) => alive && setProgress(p)).then(
      (r) => alive && setA(r),
      (e) => alive && setError((e as Error).message),
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const plan = useMemo(() => (a && k ? planPreStudy(a, k, target) : undefined), [a, k, target])
  useEffect(() => { setOff(new Set()); setLimit(PAGE) }, [target, showAll])

  if (error) return <p className="text-sm text-bad">{t('error', { msg: error })}</p>
  if (a === null) return <p className="text-sm text-muted">{t('empty')}</p>
  if (!a || !plan) {
    return (
      <div className="grid gap-2 text-sm text-muted">
        <p>{tokStatus === 'loading' && progress === 0 ? t('preparing') : t('analyzing')}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    )
  }
  if (a.tokens === 0) return <p className="text-sm text-muted">{t('empty')}</p>

  const pct = (x: number) => Math.round(x * 100)
  const list = showAll ? plan.allNew : plan.pick
  const shown = list.slice(0, limit)
  const chosen = list.filter((w) => !off.has(w.w))
  const pickedShare = plan.pick.reduce((n, w) => n + w.n, 0) / a.tokens
  const toggle = (w: string) => setOff((s) => { const n = new Set(s); if (n.has(w)) n.delete(w); else n.add(w); return n })

  const addCards = async () => {
    setBusy(true); setMsg('')
    try {
      const inputs: ReviewCardInput[] = []
      let missing = 0
      for (const w of chosen) {
        const r = await lookupWord(w.w, w.r)
        if (!r) { missing++; continue }
        const { word, reading } = headword(r.data)
        inputs.push({
          deck, kind: 'vocab', front: word, reading: reading !== word ? reading : undefined,
          meaning: await shortMeaning(r.id, r.data), example: clozeOf(w),
          tags: [...(tags ?? []), ...(r.data.j ? [`N${r.data.j}`] : [])],
          // Cùng nguồn với nút "Thêm vào ôn tập" của Từ điển → không tạo thẻ trùng
          source: { module: 'dictionary', ref: r.id },
        })
      }
      const added = await addReviewCards(inputs)
      const dup = inputs.length - added
      setMsg([t('added', { n: added, deck }), dup ? t('dup', { n: dup }) : '', missing ? t('missing', { n: missing }) : ''].filter(Boolean).join(' '))
    } catch (e) {
      setMsg(t('error', { msg: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  const markKnown = async () => {
    setBusy(true)
    await setWordStatus(chosen.map((w) => ({ w: w.w, alt: w.s !== w.w ? [w.s] : undefined })), 'known', src)
    setMsg(t('marked', { n: chosen.length }))
    setBusy(false)
  }

  return (
    <div className="grid content-start gap-3">
      {/* Độ phủ: đã biết (xanh) · đang học (vàng) · phần sẽ có nếu học hết danh sách (màu chủ đạo) */}
      <div className="grid gap-1 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <b className="text-base">{t('now', { pct: pct(plan.known) })}</b>
          {plan.learning > 0 && <span className="text-muted">{t('withLearning', { pct: pct(plan.known + plan.learning) })}</span>}
        </div>
        <div className="relative flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="bg-good" style={{ width: `${plan.known * 100}%` }} />
          <div className="bg-warn" style={{ width: `${plan.learning * 100}%` }} />
          <div className="bg-primary opacity-60" style={{ width: `${pickedShare * 100}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-text" style={{ left: `${target * 100}%` }} />
        </div>
        <p className="text-xs text-muted">{t('stats', { tokens: a.tokens, unique: a.words.length, fresh: plan.allNew.length })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('target')}</span>
        <Segmented label={t('target')} value={String(target)} onChange={(v) => setTarget(Number(v))}
          options={TARGETS.map((x) => ({ value: String(x), label: `${pct(x)}%` }))} />
      </div>

      <div className="rounded-xl bg-primary-soft p-3 text-sm">
        {plan.pick.length === 0 ? (
          <><p className="font-medium">{t('reached', { pct: pct(target) })}</p><p className="text-muted">{t('reachedHint')}</p></>
        ) : plan.reachable ? (
          <p className="font-medium">{t('plan', { n: plan.pick.length, pct: pct(target) })}</p>
        ) : (
          <p className="font-medium">{t('planAll', { n: plan.pick.length, pct: pct(plan.after) })}</p>
        )}
      </div>

      {!packs.loading && !packs.ready && <p className="rounded-xl bg-surface-2 p-3 text-sm">{t('noDict')}</p>}

      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <button className="text-primary hover:underline" onClick={() => setOff(new Set())}>{t('selectAll')}</button>
          <button className="text-muted hover:underline" onClick={() => setOff(new Set(list.map((w) => w.w)))}>{t('selectNone')}</button>
          {plan.allNew.length > plan.pick.length && (
            <button className="ml-auto text-muted hover:underline" onClick={() => setShowAll(!showAll)}>
              {showAll ? t('showPlan') : t('showAll', { n: plan.allNew.length })}
            </button>
          )}
        </div>
      )}

      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={addCards} disabled={busy || !packs.ready}>{t('add', { n: chosen.length })}</Button>
          <Button variant="soft" onClick={markKnown} disabled={busy}>{t('known', { n: chosen.length })}</Button>
        </div>
      )}
      {msg && <p role="status" className="text-sm text-good">{msg}</p>}

      {shown.length > 0 && (
        <ul className="grid gap-1">
          {shown.map((w: StudyWord) => (
            <li key={w.w} className={`flex items-start gap-2 rounded-xl px-2 py-1.5 ${off.has(w.w) ? 'hover:bg-surface-2' : 'bg-surface-2'}`}>
              <input type="checkbox" className="mt-2" checked={!off.has(w.w)} onChange={() => toggle(w.w)} aria-label={w.w} />
              <button className="jp min-w-12 shrink-0 text-left text-lg leading-normal hover:text-primary" title={t('lookup')}
                onClick={(e) => openLookup(w.w, { x: e.clientX, y: e.clientY })}>{w.w}</button>
              <span className="min-w-0 flex-1 text-sm leading-snug">
                <Meaning w={w.w} reading={w.r} />
                <span className="mt-0.5 flex min-w-0 gap-2 text-xs text-muted">
                  <span className="shrink-0">{t('times', { n: w.n })}</span>
                  <span className="jp truncate">{w.ex}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {list.length > limit && <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>+ {list.length - limit}</Button>}
      <p className="text-xs text-muted">{t('hint')}</p>
    </div>
  )
}

/** Nút "Học trước từ" + hộp thoại. Host chỉ cần đưa chữ của chương và tên bộ thẻ. */
export function PreStudyButton({ className = '', variant = 'soft', ...props }: PreStudyProps & {
  className?: string
  variant?: 'primary' | 'soft' | 'ghost'
}) {
  const t = useT(P)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const title = t('title', { name: props.name })
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>{t('open')}</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={title}
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-card border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h2 className="truncate font-semibold">{title}</h2>
              <button onClick={() => setOpen(false)} aria-label={t('close')}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">✕</button>
            </div>
            <div className="overflow-y-auto p-5">
              <PreStudyPanel lines={props.lines} deck={props.deck} tags={props.tags} src={props.src} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
