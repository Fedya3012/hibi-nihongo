/**
 * LUYỆN VIẾT THEO THỨ TỰ NÉT
 * --------------------------
 * Người học viết từng nét bằng chuột, bút hoặc ngón tay. Sau mỗi nét, app so với nét mẫu KanjiVG:
 *  - Lấy 24 điểm cách đều trên nét vừa viết và trên nét mẫu, tính khoảng cách trung bình.
 *  - Gần đủ (dưới ~14% khung) → nhận nét, vẽ lại cho gọn bằng nét mẫu.
 *  - Khớp khi đảo ngược → báo "viết ngược chiều" (ví dụ kéo từ phải sang trái).
 *  - Lệch → nháy nét đúng để gợi ý, viết lại nét đó.
 * Không chấm "đẹp/xấu", chỉ kiểm tra đúng thứ tự, đúng hướng và đúng vị trí tương đối.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { KANA_BY_CHAR, TABLES, type Script } from './data'
import { recordWriting } from './progress'
import { speak } from './speech'
import { GuideGrid, StrokeView, hasStrokes, strokesOf } from './StrokeView'

type Pt = [number, number]
const SAMPLES = 24
const OK_DIST = 15 // đơn vị trong khung 109

/** Lấy n điểm cách đều nhau theo chiều dài một đường gấp khúc. */
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

/** Lấy điểm trên nét mẫu bằng chính trình duyệt (SVGPathElement đo được chiều dài đường cong). */
function samplePath(el: SVGPathElement, n: number): Pt[] {
  const len = el.getTotalLength()
  return Array.from({ length: n }, (_, k) => {
    const p = el.getPointAtLength((k / (n - 1)) * len)
    return [p.x, p.y] as Pt
  })
}

type Verdict = 'ok' | 'reverse' | 'off'

function judge(user: Pt[], model: SVGPathElement): Verdict {
  const u = resample(user, SAMPLES)
  const m = samplePath(model, SAMPLES)
  const fwd = meanDist(u, m)
  const rev = meanDist([...u].reverse(), m)
  if (fwd <= OK_DIST) return 'ok'
  if (rev <= OK_DIST) return 'reverse'
  return 'off'
}

/** Danh sách chữ có dữ liệu nét, theo thứ tự bảng (cơ bản → âm đục). */
function writableChars(script: Script): { row: string; chars: string[] }[] {
  const t = TABLES[script]
  return [...t.basic, ...t.dakuten].map((r) => ({
    row: r.row,
    chars: r.cells.filter((k) => k && hasStrokes(k.char)).map((k) => k!.char),
  }))
}

export function WritePractice({ initialChar, script, onScript }: {
  initialChar?: string
  script: Script
  onScript: (s: Script) => void
}) {
  const rows = useMemo(() => writableChars(script), [script])
  const flat = useMemo(() => rows.flatMap((r) => r.chars), [rows])
  const [char, setChar] = useState(() => (initialChar && hasStrokes(initialChar) ? initialChar : flat[0]))
  useEffect(() => {
    // Đổi Hiragana ↔ Katakana: giữ đúng vị trí chữ (あ ↔ ア)
    if (!flat.includes(char)) {
      const k = KANA_BY_CHAR.get(char)
      const same = k && flat.find((c) => KANA_BY_CHAR.get(c)?.romaji === k.romaji && KANA_BY_CHAR.get(c)?.row === k.row)
      setChar(same ?? flat[0])
    }
  }, [flat])

  const idx = flat.indexOf(char)
  const kana = KANA_BY_CHAR.get(char)
  const next = () => setChar(flat[(idx + 1) % flat.length])
  const prev = () => setChar(flat[(idx - 1 + flat.length) % flat.length])

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
      <Card className="flex flex-col items-center gap-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Segmented<Script> label="Bảng chữ" value={script} onChange={onScript}
            options={[{ value: 'hiragana', label: 'Hiragana' }, { value: 'katakana', label: 'Katakana' }]} />
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={prev} aria-label="Chữ trước">‹</Button>
            <button className="jp min-w-24 rounded-xl px-2 text-center text-lg" onClick={() => speak(char, { force: true })}
              title="Nghe đọc">
              {char} <span className="text-sm text-muted">{kana?.romaji}</span>
            </button>
            <Button variant="ghost" onClick={next} aria-label="Chữ tiếp theo">›</Button>
          </div>
        </div>
        <WritingPad key={char} char={char} onNext={next} />
      </Card>

      <Card className="max-h-[36rem] overflow-y-auto">
        <h3 className="mb-2 text-sm font-semibold text-muted">Chọn chữ</h3>
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.row} className="flex flex-wrap gap-1">
              {r.chars.map((c) => (
                <button key={c} onClick={() => setChar(c)}
                  className={`jp size-10 rounded-lg text-lg transition ${c === char ? 'bg-primary text-on-primary' : 'hover:bg-surface-2'}`}>
                  {c}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function WritingPad({ char, onNext }: { char: string; onNext: () => void }) {
  const strokes = strokesOf(char) ?? []
  const svgRef = useRef<SVGSVGElement>(null)
  const modelRefs = useRef<(SVGPathElement | null)[]>([])
  const [done, setDone] = useState(0) // số nét đã viết đúng
  const [drawing, setDrawing] = useState<Pt[] | null>(null)
  const [hint, setHint] = useState<{ i: number; msg: string } | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [guide, setGuide] = useState(true)
  const [demo, setDemo] = useState(0) // >0: đang xem hoạt ảnh mẫu
  const finished = done >= strokes.length && strokes.length > 0

  useEffect(() => {
    if (finished && mistakes <= 1) void recordWriting(char)
  }, [finished])

  const toLocal = (e: PointerEvent<SVGSVGElement>): Pt => {
    const svg = svgRef.current!
    const ctm = svg.getScreenCTM()
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
  const onUp = () => {
    if (!drawing) return
    const pts = drawing
    setDrawing(null)
    const model = modelRefs.current[done]
    if (!model) return
    // Chạm nhẹ (chưa kéo) thì bỏ qua, không tính lỗi
    const len = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)
    if (len < 3 && model.getTotalLength() > 8) return
    const v = judge(pts, model)
    if (v === 'ok') {
      setDone(done + 1)
    } else {
      setMistakes((m) => m + 1)
      setHint({ i: done, msg: v === 'reverse' ? 'Ngược chiều rồi, viết theo hướng mũi tên nhé.' : `Chưa giống nét ${done + 1}. Xem nét gợi ý rồi viết lại.` })
    }
  }

  const reset = () => { setDone(0); setMistakes(0); setHint(null); setDemo(0) }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative w-full max-w-sm">
        {demo > 0 ? (
          <StrokeView char={char} playKey={demo} className="aspect-square w-full rounded-2xl border border-border bg-surface-2" />
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 109 109"
            className="aspect-square w-full touch-none select-none rounded-2xl border border-border bg-surface-2"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrawing(null)}
            aria-label={`Ô viết chữ ${char}`}
          >
            <defs>
              <marker id="kana-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
              </marker>
            </defs>
            <GuideGrid />
            {/* Nét mẫu: mờ nếu bật "nét mờ", ẩn nếu tắt. Luôn có trong DOM để đo khi chấm. */}
            <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              className={guide ? 'text-border' : 'text-transparent'}>
              {strokes.map((d, i) => <path key={i} d={d} ref={(el) => { modelRefs.current[i] = el }} />)}
            </g>
            {/* Nét kế tiếp cần viết: tô màu chủ đạo nhạt + mũi tên hướng */}
            {!finished && guide && (
              <path d={strokes[done]} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
                className="text-primary opacity-40" markerEnd="url(#kana-arrow)" />
            )}
            {/* Gợi ý khi viết sai: nháy nét đúng */}
            {hint && (
              <path d={strokes[hint.i]} fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round"
                className="animate-pulse text-bad" markerEnd="url(#kana-arrow)" />
            )}
            {/* Các nét đã viết đúng */}
            <g fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round"
              className={finished ? 'text-good' : 'text-text'}>
              {strokes.slice(0, done).map((d, i) => <path key={i} d={d} />)}
            </g>
            {/* Nét đang viết */}
            {drawing && drawing.length > 1 && (
              <polyline points={drawing.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor"
                strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
            )}
          </svg>
        )}
      </div>

      <p className="min-h-6 text-center text-sm" aria-live="polite">
        {demo > 0 ? <span className="text-muted">Đang xem cách viết…</span>
          : finished ? (
            <span className="font-medium text-good">
              Hoàn thành! {mistakes === 0 ? 'Không sai nét nào.' : `Sai ${mistakes} lần.`}
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
            <Button variant="ghost" onClick={() => setGuide(!guide)} aria-pressed={guide}>
              {guide ? 'Tắt nét mờ' : 'Bật nét mờ'}
            </Button>
            {finished && <Button onClick={onNext}>Chữ tiếp theo</Button>}
          </>
        )}
      </div>
    </div>
  )
}
