/**
 * TRA KANJI KHI KHÔNG BIẾT CÁCH ĐỌC (gặp chữ lạ trong sách giấy, biển hiệu, ảnh chụp…)
 *  - Bộ thủ: bấm các bộ phận nhìn thấy trong chữ (ví dụ 亻 + 木 → 休, 体…). Bộ nào chọn thêm mà
 *    không còn chữ nào thì bị làm mờ.
 *  - Vẽ tay: vẽ chữ bằng chuột / bút / ngón tay, app gợi ý các chữ giống nhất sau mỗi nét.
 * Bấm một chữ kết quả → `onPick(chữ)` (trang Kanji: mở chi tiết; trang Từ điển: thêm vào ô tra).
 * Cách hoạt động và nguồn dữ liệu: lib/lookup.ts.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { RADICALS } from './data/radicals'
import { hanViet, shortMeaning, useKanjiDicMany, useKanjiPacks, useStudyIndex } from './lib/data'
import { loadRadk, loadTemplates, radkMatch, recognize, type Pt, type RadkIndex, type Template } from './lib/lookup'
import { KanjiSetup } from './components/KanjiSetup'

type Mode = 'radical' | 'draw'

export function KanjiLookup({ onPick, pickHint, initialMode = 'radical' }: {
  onPick: (char: string) => void
  /** Dòng nhắc bấm chữ để làm gì, ví dụ "Bấm chữ để xem chi tiết". */
  pickHint?: string
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented<Mode> label="Cách tra" value={mode} onChange={setMode}
          options={[{ value: 'radical', label: 'Theo bộ thủ' }, { value: 'draw', label: 'Vẽ tay' }]} />
        {pickHint && <p className="text-xs text-muted">{pickHint}</p>}
      </div>
      {mode === 'radical' ? <RadicalPicker onPick={onPick} /> : <DrawLookup onPick={onPick} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kết quả: ô chữ nhỏ có âm Hán Việt
// ---------------------------------------------------------------------------

function ResultChars({ chars, onPick, empty }: { chars: string[]; onPick: (c: string) => void; empty: string }) {
  const dic = useKanjiDicMany(chars.join(''))
  if (!chars.length) return <p className="py-3 text-sm text-muted">{empty}</p>
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Chữ tìm được">
      {chars.map((c) => {
        const d = dic?.get(c)
        return (
          <li key={c}>
            <button onClick={() => onPick(c)} title={shortMeaning(c, d)}
              className="flex w-14 flex-col items-center rounded-lg border border-border bg-surface py-1 transition hover:border-primary">
              <span className="jp text-2xl leading-tight">{c}</span>
              <span className="h-3.5 max-w-full truncate px-0.5 text-[10px] font-semibold text-primary">{hanViet(d)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Tra theo bộ thủ
// ---------------------------------------------------------------------------

/** Tên Hán Việt của bộ (nếu là một trong 214 bộ Khang Hy hoặc dạng biến thể của nó). */
const radicalName = (() => {
  const map = new Map<string, string>()
  RADICALS.forEach(([ch, name, meaning, variants]) => {
    if (!ch) return
    const label = `${name} (${meaning})`
    map.set(ch, label)
    for (const v of variants ?? '') if (!map.has(v)) map.set(v, label)
  })
  // Một số dạng RADKFILE viết khác bảng 214 bộ
  map.set('丷', map.get('八')!)
  map.set('⺌', map.get('小')!)
  map.set('𠆢', map.get('人')!)
  map.set('辶', map.get('辵')!)
  map.set('阝', 'Ấp / Phụ (gò đất, vùng đất)')
  return (c: string) => map.get(c)
})()

const MAX_SHOWN = 120

function RadicalPicker({ onPick }: { onPick: (c: string) => void }) {
  const [ix, setIx] = useState<RadkIndex | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [strokeFilter, setStrokeFilter] = useState<number | null>(null)

  useEffect(() => {
    loadRadk().then(setIx, (e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const match = useMemo(() => (ix ? radkMatch(ix, selected) : null), [ix, selected])
  const hits = useMemo(() => {
    if (!ix || !match) return []
    const list = strokeFilter ? match.hits.filter((k) => ix.strokes[k] === strokeFilter) : match.hits
    return list.map((k) => ix.chars[k])
  }, [ix, match, strokeFilter])
  // Số nét có trong kết quả, để lọc nhanh khi kết quả còn nhiều
  const hitStrokes = useMemo(() => (ix && match ? [...new Set(match.hits.map((k) => ix.strokes[k]))] : []), [ix, match])
  // Nhóm bộ theo số nét
  const groups = useMemo(() => {
    const g = new Map<number, number[]>()
    ix?.parts.forEach((p, i) => { const l = g.get(p.strokes); if (l) l.push(i); else g.set(p.strokes, [i]) })
    return [...g]
  }, [ix])

  if (error) return <p className="text-sm text-bad">Không đọc được dữ liệu bộ thủ: {error}</p>
  if (!ix || !match) return <p className="text-sm text-muted">Đang tải danh sách bộ thủ…</p>

  const toggle = (i: number) => {
    setStrokeFilter(null)
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  return (
    <div className="space-y-3">
      {/* Dính ở trên khi cuộn bảng bộ thủ, để luôn thấy kết quả */}
      <Card className="sticky top-2 z-10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {selected.length ? (
              <>
                Đã chọn <span className="jp text-lg">{selected.map((i) => ix.parts[i].char).join(' + ')}</span>
                {' '}· <b>{match.hits.length}</b> chữ
              </>
            ) : (
              <span className="text-muted">Bấm các bộ phận bạn nhìn thấy trong chữ (chọn được nhiều bộ).</span>
            )}
          </p>
          {selected.length > 0 && <Button variant="ghost" className="min-h-9" onClick={() => { setSelected([]); setStrokeFilter(null) }}>Bỏ chọn</Button>}
        </div>
        {selected.length > 0 && hitStrokes.length > 1 && match.hits.length > 20 && (
          <div className="flex flex-wrap items-center gap-1 text-xs" role="group" aria-label="Lọc theo số nét">
            <span className="text-muted">Số nét:</span>
            {[null, ...hitStrokes].map((n) => (
              <button key={n ?? 0} onClick={() => setStrokeFilter(n)} aria-pressed={strokeFilter === n}
                className={`min-h-7 min-w-7 rounded-md px-1.5 ${strokeFilter === n ? 'bg-primary text-on-primary' : 'bg-surface-2 hover:text-text'}`}>
                {n ?? 'Tất cả'}
              </button>
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <>
            <div className="max-h-48 overflow-y-auto">
              <ResultChars chars={hits.slice(0, MAX_SHOWN)} onPick={onPick} empty="Không có chữ nào chứa đủ các bộ này." />
            </div>
            {hits.length > MAX_SHOWN && (
              <p className="text-xs text-muted">Còn {hits.length - MAX_SHOWN} chữ nữa: chọn thêm bộ hoặc lọc theo số nét để thu hẹp.</p>
            )}
          </>
        )}
      </Card>

      <div className="space-y-1" aria-label="Bảng bộ thủ">
        {groups.map(([strokes, list]) => (
          <div key={strokes} className="flex flex-wrap items-center gap-1">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-xs font-semibold text-on-primary" title={`${strokes} nét`}>
              {strokes}
            </span>
            {list.map((i) => {
              const p = ix.parts[i]
              const on = selected.includes(i)
              const can = match.possible.has(i)
              const name = radicalName(p.char)
              return (
                <button key={i} onClick={() => toggle(i)} disabled={!can} aria-pressed={on}
                  title={[name, p.hint, `${p.strokes} nét`].filter(Boolean).join(' · ')}
                  className={`jp relative grid size-8 place-items-center rounded-md border text-lg transition ${
                    on ? 'border-primary bg-primary-soft text-text'
                      : can ? 'border-border bg-surface hover:border-primary' : 'border-transparent text-muted opacity-30'}`}>
                  {p.char}
                  {p.hint && <span className="absolute -bottom-0.5 right-0.5 text-[8px] text-muted">{p.hint === 'bên phải' ? 'P' : 'T'}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Dữ liệu bộ phận: RADKFILE © EDRDG, CC BY-SA 3.0. Các bộ được viết theo dạng hay gặp trong chữ (亻, 氵, 扌…);
        ô có chữ P/T là bộ 阝 đứng bên phải / bên trái.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vẽ tay
// ---------------------------------------------------------------------------

function DrawLookup({ onPick }: { onPick: (c: string) => void }) {
  const packs = useKanjiPacks()
  const index = useStudyIndex()
  const svgRef = useRef<SVGSVGElement>(null)
  const [strokes, setStrokes] = useState<Pt[][]>([])
  const [drawing, setDrawing] = useState<Pt[] | null>(null)
  const [templates, setTemplates] = useState<Map<number, Template[]> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!packs.ready) return
    loadTemplates().then(setTemplates, (e) => setError(e instanceof Error ? e.message : String(e)))
  }, [packs.ready])

  // Ưu tiên nhẹ chữ hay gặp (có trong JLPT, cấp càng dễ càng ưu tiên) khi hai chữ giống gần bằng nhau
  const bonus = useMemo(() => {
    const m = new Map<string, number>()
    if (index) for (const [lv, chars] of Object.entries(index.jlpt)) for (const c of chars) m.set(c, 0.01 + Number(lv) * 0.004)
    return (c: string) => m.get(c) ?? 0
  }, [index])

  const candidates = useMemo(
    () => (templates && strokes.length ? recognize(templates, strokes, 18, bonus) : []),
    [templates, strokes, bonus],
  )

  if (!packs.loading && !packs.ready) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">Vẽ tay cần dữ liệu nét viết Kanji (KanjiVG) trên máy.</p>
        <KanjiSetup />
      </div>
    )
  }

  const toLocal = (e: PointerEvent<SVGSVGElement>): Pt => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return [0, 0]
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
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
    // Chạm một chấm cũng tính là một nét (nét chấm 丶): nhân đôi điểm để có độ dài
    const s = drawing.length === 1 ? [drawing[0], [drawing[0][0] + 0.5, drawing[0][1] + 0.5] as Pt] : drawing
    setStrokes((list) => [...list, s])
    setDrawing(null)
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="space-y-2">
        <svg ref={svgRef} viewBox="0 0 109 109"
          className="aspect-square w-full touch-none select-none rounded-2xl border border-border bg-surface-2"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrawing(null)}
          aria-label="Ô vẽ chữ Kanji">
          <g className="text-border" stroke="currentColor" strokeWidth={0.5} strokeDasharray="2 2">
            <line x1={54.5} y1={0} x2={54.5} y2={109} />
            <line x1={0} y1={54.5} x2={109} y2={54.5} />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" className="text-text">
            {strokes.map((s, i) => <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} />)}
            {drawing && drawing.length > 1 && (
              <polyline points={drawing.map((p) => p.join(',')).join(' ')} className="text-primary" />
            )}
          </g>
          {!strokes.length && !drawing && (
            <text x={54.5} y={58} textAnchor="middle" className="fill-muted text-[7px]">Vẽ chữ vào đây</text>
          )}
        </svg>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="soft" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>Xóa nét cuối</Button>
          <Button variant="ghost" disabled={!strokes.length} onClick={() => setStrokes([])}>Xóa hết</Button>
          <span className="text-sm text-muted">{strokes.length} nét</span>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Chữ giống nhất</h3>
        {error ? <p className="text-sm text-bad">Không đọc được nét mẫu: {error}</p>
          : !templates ? <p className="text-sm text-muted">Đang chuẩn bị nét mẫu…</p>
          : <ResultChars chars={candidates} onPick={onPick} empty="Vẽ từng nét theo đúng thứ tự, gợi ý hiện ngay sau mỗi nét." />}
        <p className="text-xs text-muted">
          Viết đủ số nét và đúng thứ tự thì tìm chính xác nhất. Thiếu hoặc thừa 1–2 nét vẫn gợi ý được.
          Chữ được so với nét mẫu KanjiVG (© Ulrich Apel, CC BY-SA 3.0), chạy hoàn toàn trên máy.
        </p>
      </div>
    </div>
  )
}
