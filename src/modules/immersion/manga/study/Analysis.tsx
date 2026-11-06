/**
 * PHÂN TÍCH MỘT CÂU THOẠI ngay trong ngữ cảnh: tô màu đúng chỗ ngữ pháp / từ tượng thanh / khẩu ngữ
 * xuất hiện trong câu, giải thích từng chỗ, và gợi ý cách nói lịch sự tương đương.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { grammarPath } from '@/modules/grammar/api'
import { findNotes, type FoundNote } from './notes-data'
import { findSfx, findSlang, SFX_KIND_LABEL } from './sfx-data'
import { politeVersion } from './polite'

type Kind = 'grammar' | 'sfx' | 'slang' | 'style' | 'culture'

interface Item {
  kind: Kind
  index: number
  match: string
  label: string
  vi: string
  extra?: string
  gid?: string
  jlpt?: number
}

const KIND_INFO: Record<Kind, { label: string; mark: string; chip: string }> = {
  grammar: { label: 'Ngữ pháp', mark: 'underline decoration-primary decoration-2 underline-offset-4', chip: 'bg-primary-soft text-text' },
  sfx: { label: 'Tượng thanh', mark: 'rounded bg-warn/25', chip: 'bg-warn/25 text-text' },
  slang: { label: 'Khẩu ngữ', mark: 'rounded bg-bad/15', chip: 'bg-bad/15 text-text' },
  style: { label: 'Giọng nói', mark: '', chip: 'bg-surface text-primary' },
  culture: { label: 'Văn hóa', mark: '', chip: 'bg-surface text-muted' },
}

export function analyze(text: string): Item[] {
  const notes = findNotes(text)
  const fromNote = (n: FoundNote): Item => ({ kind: n.group, index: n.index, match: n.match, label: n.label, vi: n.vi, gid: n.gid, jlpt: n.jlpt })
  const items: Item[] = [
    ...findSfx(text).map(({ sfx, form, index }) => ({ kind: 'sfx' as const, index, match: form, label: sfx.w, vi: sfx.vi, extra: SFX_KIND_LABEL[sfx.kind] })),
    ...findSlang(text).map(({ slang, match, index }) => ({ kind: 'slang' as const, index, match, label: slang.w, vi: slang.vi, extra: `Lịch sự: ${slang.polite}` })),
    ...notes.filter((n) => n.group === 'grammar').map(fromNote),
    ...notes.filter((n) => n.group !== 'grammar').map(fromNote),
  ]
  return items
}

/** Câu với các đoạn được tô màu (ưu tiên tượng thanh > khẩu ngữ > ngữ pháp khi chồng nhau). */
function Highlighted({ text, items, active, onPick }: { text: string; items: Item[]; active?: number; onPick: (i: number) => void }) {
  const marks = new Array<number>(text.length).fill(-1)
  items.forEach((it, i) => {
    if (!KIND_INFO[it.kind].mark || it.index < 0) return
    for (let k = it.index; k < Math.min(text.length, it.index + it.match.length); k++) if (marks[k] < 0) marks[k] = i
  })
  const runs: { from: number; to: number; item: number }[] = []
  for (let k = 0; k < text.length; k++) {
    const last = runs[runs.length - 1]
    if (last && last.item === marks[k]) last.to = k + 1
    else runs.push({ from: k, to: k + 1, item: marks[k] })
  }
  return (
    <p className="jp text-lg leading-loose">
      {runs.map((r) => r.item < 0 ? <span key={r.from}>{text.slice(r.from, r.to)}</span> : (
        <button key={r.from} type="button" onClick={() => onPick(r.item)}
          className={`${KIND_INFO[items[r.item].kind].mark} ${active === r.item ? 'ring-2 ring-primary' : ''} rounded-sm`}>
          {text.slice(r.from, r.to)}
        </button>
      ))}
    </p>
  )
}

export function SentenceAnalysis({ text, onSpeak }: { text: string; onSpeak?: (t: string) => void }) {
  const items = useMemo(() => analyze(text), [text])
  const [active, setActive] = useState<number>()
  const [polite, setPolite] = useState<string | null>()
  useEffect(() => {
    let alive = true
    setPolite(undefined)
    politeVersion(text).then((p) => alive && setPolite(p), () => alive && setPolite(null))
    return () => { alive = false }
  }, [text])
  const hasMarks = items.some((it) => KIND_INFO[it.kind].mark)

  if (!items.length && !polite) return null
  return (
    <div className="grid gap-2 rounded-xl border border-border p-2">
      <p className="text-xs font-semibold text-muted">Trong câu này</p>
      {hasMarks && <Highlighted text={text} items={items} active={active} onPick={(i) => setActive(i === active ? undefined : i)} />}
      <ul className="grid gap-1.5">
        {items.map((it, i) => (
          <li key={`${it.kind}-${it.label}`}>
            <details open={i === active} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setActive(i) }}
              className="rounded-lg bg-surface-2 px-2.5 py-1.5">
              <summary className="cursor-pointer">
                <span className={`mr-1 rounded px-1 text-xs ${KIND_INFO[it.kind].chip}`}>{KIND_INFO[it.kind].label}</span>
                <span className="jp">{it.kind === 'grammar' && it.match ? <><b>{it.match}</b> <span className="text-xs text-muted">({it.label})</span></> : it.label}</span>
                {it.jlpt ? <span className="text-xs text-muted"> · N{it.jlpt}</span> : null}
              </summary>
              <div className="mt-1 grid gap-1 text-muted">
                {it.kind === 'grammar' && it.match && (
                  <p>Trong câu: <span className="jp rounded bg-primary-soft px-1 text-text">{it.match}</span> → {it.vi}</p>
                )}
                {it.kind !== 'grammar' && <p>{it.vi}</p>}
                {it.extra && <p className="text-xs">{it.extra}</p>}
                <div className="flex flex-wrap gap-3 text-xs">
                  {it.gid && <Link to={grammarPath(it.gid)} className="text-primary underline">Mở bài ngữ pháp đầy đủ</Link>}
                  {(it.kind === 'sfx' || it.kind === 'slang') && (
                    <Link to={`/immersion/manga?view=sfx&tab=${it.kind}&q=${encodeURIComponent(it.label)}`} className="text-primary underline">Xem trong thư viện</Link>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {polite && (
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <p className="text-xs text-muted">Cách nói lịch sự tương đương (gợi ý tự động)</p>
          <p className="jp mt-0.5 text-base">
            {polite}
            {onSpeak && <button type="button" onClick={() => onSpeak(polite)} title="Nghe câu lịch sự" aria-label="Nghe câu lịch sự" className="ml-1 text-muted hover:text-primary">🔊</button>}
          </p>
        </div>
      )}
    </div>
  )
}
