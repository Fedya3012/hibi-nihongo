/**
 * DANH SÁCH KANJI: theo cấp JLPT (N5 → N1) hoặc theo bộ thủ.
 * Học theo bộ thủ: chọn một bộ (ví dụ 亻 Nhân) → thấy mọi chữ chứa bộ đó, xếp theo cấp JLPT.
 */
import { useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { RADICALS } from './data/radicals'
import { useKanjiDicMany, useStudyIndex, type StudyIndex } from './lib/data'
import { addKanjiCards, useKanjiProgress } from './lib/progress'
import { KanjiTile } from './components/KanjiTile'

export type Level = '5' | '4' | '3' | '2' | '1' | 'joyo'
export const LEVELS: { value: Level; label: string }[] = [
  { value: '5', label: 'N5' }, { value: '4', label: 'N4' }, { value: '3', label: 'N3' },
  { value: '2', label: 'N2' }, { value: '1', label: 'N1' }, { value: 'joyo', label: 'Khác' },
]

export const levelChars = (ix: StudyIndex | undefined, lv: Level) => (lv === 'joyo' ? ix?.joyo : ix?.jlpt[lv]) ?? ''

const BATCH = 10

/** Lưới chữ + thanh tiến độ + nút "Thêm 10 chữ chưa học vào Ôn tập". */
function KanjiGrid({ chars, onOpen, title }: { chars: string; onOpen: (c: string) => void; title: string }) {
  const dic = useKanjiDicMany(chars)
  const progress = useKanjiProgress()
  const [msg, setMsg] = useState('')
  const list = [...chars]
  const inSrs = list.filter((c) => progress?.[c]?.srs).length
  const written = list.filter((c) => (progress?.[c]?.best ?? 0) >= 75).length
  const nextBatch = list.filter((c) => !progress?.[c]?.srs).slice(0, BATCH)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title} · {list.length} chữ</h2>
          <p className="text-xs text-muted">{inSrs} chữ trong Ôn tập · {written} chữ viết đạt ≥ 75 điểm</p>
        </div>
        {nextBatch.length > 0 && (
          <Button variant="soft" onClick={async () => {
            const n = await addKanjiCards(nextBatch)
            setMsg(`Đã thêm ${n} thẻ: ${nextBatch.join(' ')}`)
          }}>+ {nextBatch.length} chữ tiếp theo vào Ôn tập</Button>
        )}
      </div>
      {msg && <p className="jp text-sm text-good">{msg}</p>}
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary" style={{ width: `${list.length ? (inSrs / list.length) * 100 : 0}%` }} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2">
        {list.map((c) => <KanjiTile key={c} char={c} d={dic?.get(c)} stat={progress?.[c]} onClick={() => onOpen(c)} />)}
      </div>
    </div>
  )
}

export function JlptList({ level, onLevel, onOpen }: { level: Level; onLevel: (l: Level) => void; onOpen: (c: string, list: string) => void }) {
  const ix = useStudyIndex()
  const chars = levelChars(ix, level)
  return (
    <div className="space-y-4">
      <Segmented<Level> label="Cấp JLPT" value={level} onChange={onLevel} options={LEVELS} />
      {level === 'joyo' && <p className="text-sm text-muted">Kanji thường dụng (Jōyō) không nằm trong danh sách JLPT.</p>}
      <KanjiGrid chars={chars} title={level === 'joyo' ? 'Jōyō khác' : `JLPT N${level}`} onOpen={(c) => onOpen(c, chars)} />
    </div>
  )
}

/** Thứ tự cấp để xếp chữ trong một bộ: N5 trước, N1 sau, rồi chữ ngoài JLPT. */
function levelRank(ix: StudyIndex) {
  const rank = new Map<string, number>()
  for (const lv of ['5', '4', '3', '2', '1']) for (const c of ix.jlpt[lv] ?? '') rank.set(c, 5 - Number(lv))
  return (c: string) => rank.get(c) ?? 9
}

export function RadicalList({ radical, onRadical, onOpen }: {
  radical?: number
  onRadical: (n: number | undefined) => void
  onOpen: (c: string, list: string) => void
}) {
  const ix = useStudyIndex()
  const [sort, setSort] = useState<'count' | 'number'>('count')
  const radicals = useMemo(() => {
    if (!ix) return []
    const list = Object.entries(ix.rad).map(([n, chars]) => ({ n: Number(n), count: [...chars].length }))
    return sort === 'count' ? list.sort((a, b) => b.count - a.count) : list.sort((a, b) => a.n - b.n)
  }, [ix, sort])

  if (radical && ix) {
    const r = RADICALS[radical]
    const rank = levelRank(ix)
    const chars = [...(ix.rad[radical] ?? '')].sort((a, b) => rank(a) - rank(b)).join('')
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => onRadical(undefined)}>‹ Tất cả bộ thủ</Button>
        <Card className="flex items-center gap-4">
          <span className="jp grid size-20 place-items-center rounded-2xl bg-primary-soft text-5xl">{r[0]}</span>
          <div>
            <h2 className="text-xl font-bold">Bộ {r[1]} <span className="text-base font-normal text-muted">· số {radical}</span></h2>
            <p>Nghĩa: {r[2]}</p>
            {r[3] && <p className="text-sm text-muted">Khi đứng trong chữ khác có thể viết thành: <span className="jp text-lg text-text">{[...r[3]].join('  ')}</span></p>}
          </div>
        </Card>
        <KanjiGrid chars={chars} title={`Chữ thuộc bộ ${r[1]}`} onOpen={(c) => onOpen(c, chars)} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Mỗi Kanji được xếp vào một <b>bộ thủ</b>, thường gợi ý về nghĩa (氵 liên quan đến nước, 亻 đến người).
          Học các bộ hay gặp trước giúp đoán và nhớ chữ mới dễ hơn.
        </p>
        <Segmented label="Sắp xếp" value={sort} onChange={setSort}
          options={[{ value: 'count', label: 'Hay gặp' }, { value: 'number', label: 'Số thứ tự' }]} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
        {radicals.map(({ n, count }) => {
          const r = RADICALS[n]
          return (
            <button key={n} onClick={() => onRadical(n)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 text-left transition hover:border-primary">
              <span className="jp shrink-0 text-2xl">{r[0]}{r[3] && <span className="ml-0.5 text-base text-muted">{[...r[3]][0]}</span>}</span>
              <span className="min-w-0 text-xs leading-tight">
                <span className="block font-semibold">{r[1]}</span>
                <span className="block truncate text-muted">{r[2]}</span>
                <span className="text-muted">{count} chữ</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
