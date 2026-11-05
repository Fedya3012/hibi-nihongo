/**
 * THỨ TỰ NÉT KANJI (dữ liệu KanjiVG, CC BY-SA 3.0)
 * - Hoạt ảnh vẽ lần lượt từng nét, số thứ tự ở điểm bắt đầu nét.
 * - Chế độ "từng nét": bấm ‹ › để xem nét 1, 2, 3… (nét đang xem tô màu chủ đạo).
 * - Tô màu bộ thủ: các nét thuộc bộ thủ hiện màu chủ đạo nhạt để thấy chữ được ghép thế nào.
 */
import { useState } from 'react'
import { Button } from '@/design/components/Button'
import type { Component } from '../lib/data'

/** Điểm bắt đầu của nét: lấy từ lệnh "M x,y" đầu tiên. */
export function startPoint(d: string): [number, number] {
  const m = /M\s*([-\d.]+)[ ,]*([-\d.]+)/i.exec(d)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/** Lưới chữ thập mờ như vở tập viết. */
export function GuideGrid() {
  return (
    <g className="text-border" stroke="currentColor" strokeWidth={0.6} strokeDasharray="2 2" fill="none">
      <line x1="54.5" y1="0" x2="54.5" y2="109" />
      <line x1="0" y1="54.5" x2="109" y2="54.5" />
    </g>
  )
}

export function StrokeAnimation({ strokes, char, playKey = 0, numbers = true, speed = 1, radical, className = '' }: {
  strokes: string[]
  char: string
  playKey?: number
  numbers?: boolean
  speed?: number
  /** Chỉ số các nét thuộc bộ thủ (tô màu khác). */
  radical?: Set<number>
  className?: string
}) {
  // Kanji nhiều nét: vẽ nhanh hơn một chút để không phải chờ lâu
  const dur = (strokes.length > 12 ? 0.45 : 0.6) / speed
  return (
    <svg viewBox="0 0 109 109" className={className} role="img" aria-label={`Thứ tự nét chữ ${char}`} key={`${char}-${playKey}`}>
      <style>{'@keyframes kanji-draw{to{stroke-dashoffset:0}}'}</style>
      <GuideGrid />
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-border">
        {strokes.map((d, i) => <path key={i} d={d} />)}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        {strokes.map((d, i) => (
          <path key={i} d={d} pathLength={1}
            className={radical?.has(i) ? 'text-primary' : 'text-text'}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `kanji-draw ${dur}s ease-in-out ${i * (dur + 0.12)}s forwards` }} />
        ))}
      </g>
      {numbers && <StrokeNumbers strokes={strokes} />}
    </svg>
  )
}

/** Vị trí số thứ tự nét; hai nét bắt đầu sát nhau thì đẩy số sau sang phải để không đè lên nhau. */
function numberPositions(strokes: string[]): [number, number][] {
  const out: [number, number][] = []
  for (const d of strokes) {
    let [x, y] = startPoint(d)
    x -= 6; y -= 1.5
    while (out.some(([a, b]) => Math.abs(a - x) < 6 && Math.abs(b - y) < 6)) x += 6
    out.push([x, y])
  }
  return out
}

function StrokeNumbers({ strokes, only }: { strokes: string[]; only?: number }) {
  const pos = numberPositions(strokes)
  return (
    <g fill="currentColor" fontSize={7} fontWeight={700} fontFamily="sans-serif">
      {strokes.map((_, i) => {
        if (only != null && i > only) return null
        const [x, y] = pos[i]
        return <text key={i} x={x} y={y} className={i === only ? 'text-primary' : 'text-muted'}>{i + 1}</text>
      })}
    </g>
  )
}

/** Xem từng nét một (tĩnh): nét đã viết màu mực, nét đang xem màu chủ đạo, nét sau mờ. */
export function StrokeSteps({ strokes, step, className = '' }: { strokes: string[]; step: number; className?: string }) {
  return (
    <svg viewBox="0 0 109 109" className={className} role="img" aria-label={`Nét ${step + 1}/${strokes.length}`}>
      <defs>
        <marker id="kanji-step-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
        </marker>
      </defs>
      <GuideGrid />
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {strokes.map((d, i) => (
          <path key={i} d={d} className={i < step ? 'text-text' : i === step ? 'text-primary' : 'text-border'}
            strokeWidth={i === step ? 3.6 : 3} markerEnd={i === step ? 'url(#kanji-step-arrow)' : undefined} />
        ))}
      </g>
      <StrokeNumbers strokes={strokes} only={step} />
    </svg>
  )
}

/** Khối thứ tự nét đầy đủ: hoạt ảnh + xem từng nét + tô bộ thủ. */
export function StrokeOrder({ char, strokes, components }: { char: string; strokes: string[]; components?: Component[] }) {
  const [play, setPlay] = useState(0)
  const [step, setStep] = useState<number | null>(null)
  const [showRad, setShowRad] = useState(true)
  const radical = new Set(components?.filter((c) => c.r).flatMap((c) => c.s) ?? [])
  const box = 'aspect-square w-full max-w-64 rounded-2xl border border-border bg-surface-2'

  return (
    <div className="flex flex-col items-center gap-2">
      {step == null
        ? <StrokeAnimation char={char} strokes={strokes} playKey={play} radical={showRad ? radical : undefined} className={box} />
        : <StrokeSteps strokes={strokes} step={step} className={box} />}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {step == null ? (
          <>
            <Button variant="soft" onClick={() => setPlay(play + 1)}>▶ Xem lại</Button>
            <Button variant="ghost" onClick={() => setStep(0)}>Từng nét</Button>
            {radical.size > 0 && (
              <Button variant="ghost" aria-pressed={showRad} onClick={() => setShowRad(!showRad)}>
                {showRad ? 'Bỏ tô bộ thủ' : 'Tô bộ thủ'}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" aria-label="Nét trước" disabled={step === 0} onClick={() => setStep(step - 1)}>‹</Button>
            <span className="min-w-20 text-center text-sm text-muted">Nét {step + 1}/{strokes.length}</span>
            <Button variant="ghost" aria-label="Nét sau" disabled={step >= strokes.length - 1} onClick={() => setStep(step + 1)}>›</Button>
            <Button variant="soft" onClick={() => { setStep(null); setPlay(play + 1) }}>Hoạt ảnh</Button>
          </>
        )}
      </div>
    </div>
  )
}
