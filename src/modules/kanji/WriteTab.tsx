/**
 * LUYỆN VIẾT KANJI: chọn cấp JLPT, viết lần lượt từng chữ, chấm điểm từng nét.
 * Điểm cao nhất của mỗi chữ được lưu (kv "kanji:progress") và hiện trong danh sách.
 */
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { hanViet, shortMeaning, useKanjiFull, useStudyIndex } from './lib/data'
import { recordWriting, useKanjiProgress } from './lib/progress'
import { LEVELS, levelChars, type Level } from './KanjiBrowser'
import { WritingPad } from './components/WritingPad'

export function WriteTab({ char, level, onChar, onLevel, onDetail }: {
  char?: string
  level: Level
  onChar: (c: string) => void
  onLevel: (l: Level) => void
  onDetail: (c: string) => void
}) {
  const ix = useStudyIndex()
  const progress = useKanjiProgress()
  const list = [...levelChars(ix, level)]
  const current = char ?? list[0]
  const { data: k } = useKanjiFull(current)
  const idx = list.indexOf(current)
  const next = list.length ? list[(idx + 1) % list.length] : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
      <Card className="flex flex-col items-center gap-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button className="flex items-baseline gap-2 text-left hover:text-primary" onClick={() => current && onDetail(current)}
            title="Xem chi tiết chữ">
            <span className="jp text-2xl">{current}</span>
            <span className="font-semibold text-primary">{hanViet(k?.dic)}</span>
            <span className="text-sm text-muted">{current ? shortMeaning(current, k?.dic) : ''}</span>
          </button>
          {k?.study && <span className="text-sm text-muted">{k.study.p.length} nét</span>}
        </div>
        {k?.study?.p.length ? (
          <WritingPad key={current} char={current!} strokes={k.study.p}
            onFinish={(score) => void recordWriting(current!, score)}
            onNext={next ? () => onChar(next) : undefined} />
        ) : <p className="py-16 text-muted">Đang tải nét chữ…</p>}
      </Card>

      <Card className="max-h-[38rem] space-y-3 overflow-y-auto">
        <Segmented<Level> label="Cấp" value={level} onChange={onLevel} options={LEVELS.slice(0, 5)} />
        <div className="flex flex-wrap gap-1">
          {list.map((c) => {
            const best = progress?.[c]?.best
            return (
              <button key={c} onClick={() => onChar(c)} title={best != null ? `Tốt nhất: ${best} điểm` : undefined}
                className={`jp size-10 rounded-lg text-lg transition ${c === current ? 'bg-primary text-on-primary'
                  : best != null && best >= 75 ? 'bg-primary-soft hover:opacity-80' : 'hover:bg-surface-2'}`}>
                {c}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted">Nền vàng nhạt: chữ đã viết đạt từ 75 điểm.</p>
      </Card>
    </div>
  )
}
