/**
 * Ô LUYỆN VIẾT KANJI, CHẤM ĐIỂM TỪNG NÉT
 * --------------------------------------
 * Cách chấm giống module Kana (lấy 24 điểm cách đều trên nét vừa viết và nét mẫu KanjiVG, so khoảng cách
 * trung bình), thêm phần dành riêng cho Kanji:
 *  - Mỗi nét có điểm 0–100: càng sát nét mẫu càng cao. Viết sai một lần trừ 15 điểm của nét đó.
 *  - Nhận ra lỗi "sai thứ tự": nét vừa viết giống một nét phía sau hơn nét cần viết.
 *  - Nhận ra lỗi "ngược chiều" (ví dụ kéo từ phải sang trái).
 *  - Sai 3 lần ở một nét: app tự điền nét đó (0 điểm) để không bị kẹt.
 * Cuối cùng hiện điểm cả chữ và dải điểm từng nét để biết nét nào cần luyện thêm.
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button } from '@/design/components/Button'
import { GuideGrid, StrokeAnimation } from './StrokeOrder'

type Pt = [number, number]
const SAMPLES = 24
const OK_DIST = 15 // đơn vị trong khung 109
const MAX_TRIES = 3

function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length < 2) return Array.from({ length: n }, () => pts[0] ?? [0, 0])
  const seg: number[] = [0]
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = seg[seg.length - 1] || 1
  const out: Pt[] = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * total
    while (j < pts.length - 1 && seg[j] < t) j++
    const span = seg[j] - seg[j - 1] || 1
    const r = (t - seg[j - 1]) / span
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * r, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * r])
  }
  return out
}
const meanDist = (a: Pt[], b: Pt[]) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / a.length

function samplePath(el: SVGPathElement, n: number): Pt[] {
  const len = el.getTotalLength()
  return Array.from({ length: n }, (_, k) => {
    const p = el.getPointAtLength((k / (n - 1)) * len)
    return [p.x, p.y] as Pt
  })
}

/** Điểm một nét từ khoảng cách trung bình: 0 → 100 điểm, ngưỡng chấp nhận → 55 điểm. */
const distScore = (d: number) => Math.round(Math.max(0, Math.min(100, 100 - (d / OK_DIST) * 45)))

export interface StrokeResult { score: number; tries: number; auto?: boolean }

export function gradeLabel(score: number) {
  return score >= 90 ? 'Tuyệt vời' : score >= 75 ? 'Tốt' : score >= 60 ? 'Khá' : 'Cần luyện thêm'
}
const toneOf = (s: number) => (s >= 75 ? 'bg-good' : s >= 55 ? 'bg-warn' : 'bg-bad')

export function WritingPad({ char, strokes, onFinish, onNext }: {
  char: string
  strokes: string[]
  onFinish?: (score: number) => void
  onNext?: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const modelRefs = useRef<(SVGPathElement | null)[]>([])
  const [results, setResults] = useState<StrokeResult[]>([])
  const [tries, setTries] = useState(0) // số lần sai ở nét hiện tại
  const [drawing, setDrawing] = useState<Pt[] | null>(null)
  const [hint, setHint] = useState<{ i: number; msg: string } | null>(null)
  const [guide, setGuide] = useState(true)
  const [demo, setDemo] = useState(0)
  const done = results.length
  const finished = done >= strokes.length && strokes.length > 0
  const total = finished ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0

  useEffect(() => { if (finished) onFinish?.(total) }, [finished])

  const toLocal = (e: PointerEvent<SVGSVGElement>): Pt => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return [0, 0]
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (finished || demo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setHint(null)
    setDrawing([toLocal(e)])
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drawing) return
    const p = toLocal(e)
    const last = drawing[drawing.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.8) setDrawing([...drawing, p])
  }

  const fail = (msg: string) => {
    const n = tries + 1
    if (n >= MAX_TRIES) {
      // Sai quá 3 lần: tự điền nét này, 0 điểm, chuyển sang nét sau
      setResults([...results, { score: 0, tries: n, auto: true }])
      setTries(0)
      setHint({ i: done, msg: `Nét ${done + 1} đã được điền giúp. Xem kỹ hướng nét rồi viết tiếp nhé.` })
    } else {
      setTries(n)
      setHint({ i: done, msg })
    }
  }

  const onUp = () => {
    if (!drawing) return
    const pts = drawing
    setDrawing(null)
    const model = modelRefs.current[done]
    if (!model) return
    const len = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)
    if (len < 3 && model.getTotalLength() > 8) return // chạm nhẹ, chưa kéo: bỏ qua
    const u = resample(pts, SAMPLES)
    const fwd = meanDist(u, samplePath(model, SAMPLES))
    // Nét này giống một nét phía sau hơn hẳn? → viết sai thứ tự
    let better = -1
    for (let j = done + 1; j < strokes.length; j++) {
      const el = modelRefs.current[j]
      if (!el) continue
      const dj = meanDist(u, samplePath(el, SAMPLES))
      if (dj <= OK_DIST && dj < fwd * 0.6) { better = j; break }
    }
    if (better >= 0) return fail(`Sai thứ tự: đây là nét ${better + 1}. Bây giờ cần viết nét ${done + 1}.`)
    if (fwd <= OK_DIST) {
      setResults([...results, { score: Math.max(0, distScore(fwd) - tries * 15), tries }])
      setTries(0)
      return
    }
    const rev = meanDist([...u].reverse(), samplePath(model, SAMPLES))
    fail(rev <= OK_DIST ? 'Ngược chiều rồi, viết theo hướng mũi tên nhé.' : `Chưa giống nét ${done + 1}. Xem nét gợi ý rồi viết lại.`)
  }

  const reset = () => { setResults([]); setTries(0); setHint(null); setDemo(0) }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative w-full max-w-sm">
        {demo > 0 ? (
          <StrokeAnimation char={char} strokes={strokes} playKey={demo} className="aspect-square w-full rounded-2xl border border-border bg-surface-2" />
        ) : (
          <svg ref={svgRef} viewBox="0 0 109 109"
            className="aspect-square w-full touch-none select-none rounded-2xl border border-border bg-surface-2"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrawing(null)}
            aria-label={`Ô viết chữ ${char}`}>
            <defs>
              <marker id="kanji-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
              </marker>
            </defs>
            <GuideGrid />
            {/* Nét mẫu: luôn có trong DOM để đo khi chấm; ẩn khi tắt nét mờ */}
            <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              className={guide ? 'text-border' : 'text-transparent'}>
              {strokes.map((d, i) => <path key={i} d={d} ref={(el) => { modelRefs.current[i] = el }} />)}
            </g>
            {!finished && guide && (
              <path d={strokes[done]} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
                className="text-primary opacity-40" markerEnd="url(#kanji-arrow)" />
            )}
            {hint && hint.i < strokes.length && (
              <path d={strokes[hint.i]} fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round"
                className="animate-pulse text-bad" markerEnd="url(#kanji-arrow)" />
            )}
            <g fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
              {strokes.slice(0, done).map((d, i) => (
                <path key={i} d={d} className={results[i]?.auto ? 'text-bad' : finished ? 'text-good' : 'text-text'} />
              ))}
            </g>
            {drawing && drawing.length > 1 && (
              <polyline points={drawing.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor"
                strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
            )}
          </svg>
        )}
      </div>

      {/* Dải điểm từng nét */}
      <div className="flex max-w-sm flex-wrap justify-center gap-1" aria-label="Điểm từng nét">
        {strokes.map((_, i) => {
          const r = results[i]
          return (
            <span key={i} title={r ? `Nét ${i + 1}: ${r.score} điểm${r.tries ? `, sai ${r.tries} lần` : ''}` : `Nét ${i + 1}`}
              className={`grid size-6 place-items-center rounded-md text-[11px] font-semibold ${
                r ? `${toneOf(r.score)} text-on-primary` : i === done ? 'bg-primary-soft text-text' : 'bg-surface-2 text-muted'}`}>
              {i + 1}
            </span>
          )
        })}
      </div>

      <p className="min-h-6 text-center text-sm" aria-live="polite">
        {demo > 0 ? <span className="text-muted">Đang xem cách viết…</span>
          : finished ? (
            <span className="font-medium">
              <span className={total >= 75 ? 'text-good' : total >= 55 ? 'text-warn' : 'text-bad'}>{total} điểm · {gradeLabel(total)}</span>
              <span className="text-muted">
                {' '}· {results.filter((r) => r.tries === 0).length}/{strokes.length} nét đúng ngay lần đầu
              </span>
            </span>
          ) : hint ? <span className="text-bad">{hint.msg}</span>
          : <span className="text-muted">Nét {done + 1}/{strokes.length}. Viết theo hướng mũi tên.</span>}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {demo > 0 ? (
          <>
            <Button variant="soft" onClick={() => setDemo(demo + 1)}>Xem lại</Button>
            <Button onClick={() => setDemo(0)}>Tự viết</Button>
          </>
        ) : (
          <>
            <Button variant="soft" onClick={() => setDemo(1)}>Xem cách viết</Button>
            <Button variant="soft" onClick={reset}>Viết lại</Button>
            <Button variant="ghost" onClick={() => setGuide(!guide)} aria-pressed={!guide}>
              {guide ? 'Tắt nét mờ' : 'Bật nét mờ'}
            </Button>
            {finished && onNext && <Button onClick={onNext}>Chữ tiếp theo</Button>}
          </>
        )}
      </div>
    </div>
  )
}
