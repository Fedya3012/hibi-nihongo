/** Thông tin một chữ Kanji: âm Hán Việt, On/Kun, nghĩa, số nét, JLPT. compact = dạng một dòng trong popup. */
import { useState } from 'react'
import type { KanjiData } from '../types'
import { addKanjiToReview } from '../actions'
import { Badge } from './Badges'

export function KanjiInfo({ char, d, compact = false }: { char: string; d: KanjiData; compact?: boolean }) {
  const [added, setAdded] = useState<boolean | null>(null)
  const hv = d.hv?.join(', ').toUpperCase()
  if (compact) {
    return (
      <div className="flex items-start gap-3 py-1.5">
        <span className="jp text-2xl leading-none">{char}</span>
        <div className="min-w-0 text-sm">
          {hv && <span className="font-semibold text-primary">{hv}</span>}
          <span className="text-muted">{hv ? ' · ' : ''}{d.m?.slice(0, 3).join(', ')}</span>
          <div className="jp text-xs text-muted">
            {d.on?.slice(0, 3).join('、')}{d.on?.length && d.kun?.length ? ' ／ ' : ''}{d.kun?.slice(0, 3).join('、')}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-4">
      <div className="jp grid size-20 shrink-0 place-items-center rounded-xl bg-surface-2 text-5xl">{char}</div>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {hv && <span className="text-base font-bold text-primary" title="Âm Hán Việt">{hv}</span>}
          {d.j && <Badge tone="primary">JLPT N{d.j}</Badge>}
          {d.g && <Badge tone="plain">{d.g <= 6 ? `Lớp ${d.g}` : d.g === 8 ? 'Trung học' : 'Tên người'}</Badge>}
          {d.s && <Badge tone="plain">{d.s} nét</Badge>}
          {d.f && <Badge tone="plain" title="Thứ hạng trong 2.500 Kanji hay gặp trên báo">#{d.f}</Badge>}
        </div>
        <p>{d.m?.join(', ')}</p>
        {d.on?.length ? <p><span className="text-muted">On: </span><span className="jp">{d.on.join('、')}</span></p> : null}
        {d.kun?.length ? <p><span className="text-muted">Kun: </span><span className="jp">{d.kun.join('、')}</span></p> : null}
        {d.na?.length ? <p><span className="text-muted">Tên người: </span><span className="jp">{d.na.slice(0, 6).join('、')}</span></p> : null}
        <button
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
          disabled={added !== null}
          onClick={async () => setAdded(await addKanjiToReview(char, d))}
        >
          {added === null ? '+ Thêm vào Ôn tập' : added ? '✓ Đã thêm' : 'Đã có trong Ôn tập'}
        </button>
      </div>
    </div>
  )
}
