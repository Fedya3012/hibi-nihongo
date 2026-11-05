/**
 * BẢNG CHỮ: Hiragana hoặc Katakana, chia 3 nhóm (cơ bản, âm đục, âm ghép).
 * - Bấm một chữ: nghe đọc + xem thứ tự nét + nút luyện viết / đưa vào Ôn tập.
 * - Màu viền cho biết tiến độ: chưa học · đang học · đã thuộc.
 * - Mỗi hàng có nút "+ Ôn tập" để đưa cả hàng vào SRS.
 */
import { useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { COLUMN_LABEL, GROUP_LABEL, KANA_BY_CHAR, TABLES, type Kana, type KanaGroup, type Script } from './data'
import { addKanaToSrs, levelOf, useKanaProgress, type KanaProgress } from './progress'
import { speak } from './speech'
import { StrokeView, hasStrokes, strokesOf } from './StrokeView'

const LEVEL_CLASS = {
  new: 'border-border',
  learning: 'border-warn',
  known: 'border-good bg-surface-2',
} as const

export function Chart({ script, onScript, onWrite }: {
  script: Script
  onScript: (s: Script) => void
  onWrite: (char: string) => void
}) {
  const progress = useKanaProgress() ?? {}
  const [group, setGroup] = useState<KanaGroup>('basic')
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const rows = TABLES[script][group]
  const cols = COLUMN_LABEL[group]
  const sel = selected ? KANA_BY_CHAR.get(selected) : undefined
  // Đổi bảng chữ: giữ chữ đang chọn ở cùng vị trí (あ ↔ ア)
  const changeScript = (s: Script) => {
    if (sel) {
      const twin = TABLES[s][sel.group].flatMap((r) => r.cells).find((k) => k?.romaji === sel.romaji && k.row === sel.row)
      setSelected(twin?.char ?? null)
    }
    onScript(s)
  }

  const known = rows.flatMap((r) => r.cells).filter((k) => k && levelOf(progress[k.char]) === 'known').length
  const total = rows.flatMap((r) => r.cells).filter(Boolean).length

  const addRow = async (cells: (Kana | null)[], row: string) => {
    const n = await addKanaToSrs(cells.filter((k): k is Kana => !!k).map((k) => k.char))
    setToast(n ? `Đã thêm ${n} chữ hàng ${row} vào Ôn tập.` : `Hàng ${row} đã có trong Ôn tập.`)
    window.setTimeout(() => setToast(null), 2500)
  }

  const pick = (k: Kana) => {
    setSelected(k.char)
    speak(k.char)
    // Màn hẹp: khung chi tiết nằm dưới bảng, cuộn xuống cho thấy
    if (matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <Card className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Segmented<Script> label="Bảng chữ" value={script} onChange={changeScript}
            options={[{ value: 'hiragana', label: 'Hiragana' }, { value: 'katakana', label: 'Katakana' }]} />
          <Segmented<KanaGroup> label="Nhóm chữ" value={group} onChange={setGroup}
            options={(Object.keys(GROUP_LABEL) as KanaGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))} />
        </div>
        <p className="mb-3 text-sm text-muted">
          Đã thuộc {known}/{total} chữ. Bấm vào chữ để nghe và xem cách viết.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1.5">
            <thead>
              <tr className="text-xs text-muted">
                {cols.map((c) => <th key={c} className="font-normal">{c}</th>)}
                <th className="sr-only">Thêm cả hàng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, cells }) => (
                <tr key={row}>
                  {cells.map((k, i) => (
                    <td key={i} className="p-0">
                      {k ? <KanaCell k={k} progress={progress} active={k.char === selected} onClick={() => pick(k)} />
                        : <div className="min-h-16" />}
                    </td>
                  ))}
                  <td className="w-10 p-0 text-center">
                    <button onClick={() => void addRow(cells, row)} title={`Đưa hàng ${row} vào Ôn tập`}
                      className="rounded-lg px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text">
                      +Ôn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <Legend className={LEVEL_CLASS.new} label="Chưa học" />
          <Legend className={LEVEL_CLASS.learning} label="Đang học" />
          <Legend className={LEVEL_CLASS.known} label="Đã thuộc" />
          <span>• = đã có trong Ôn tập</span>
        </div>
        {toast && <p className="mt-3 text-sm text-good" role="status">{toast}</p>}
      </Card>

      <div ref={detailRef} className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
        {sel ? (
          <Detail k={sel} progress={progress} onWrite={() => onWrite(sel.char)} />
        ) : (
          <Card className="text-sm text-muted">
            <p className="font-medium text-text">Mẹo học</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Học từng hàng (5 chữ), đọc to và viết mỗi chữ vài lần.</li>
              <li>Sau đó làm <b>Nhận diện nhanh</b> chỉ với hàng vừa học.</li>
              <li>Chữ đã thuộc sẽ tự vào <b>Ôn tập</b>, app nhắc ôn đúng lúc sắp quên.</li>
              <li>Hiragana dùng cho từ thuần Nhật, Katakana cho từ mượn nước ngoài (コーヒー = cà phê).</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

function KanaCell({ k, progress, active, onClick }: { k: Kana; progress: KanaProgress; active: boolean; onClick: () => void }) {
  const s = progress[k.char]
  const lv = levelOf(s)
  return (
    <button onClick={onClick} aria-pressed={active}
      aria-label={`${k.char}, đọc là ${k.romaji}${lv === 'known' ? ', đã thuộc' : ''}`}
      className={`relative flex min-h-16 w-full flex-col items-center justify-center rounded-xl border-2 transition hover:border-primary ${active ? 'border-primary! bg-primary-soft!' : LEVEL_CLASS[lv]}`}>
      <span className="jp text-2xl leading-tight">{k.char}</span>
      <span className="text-xs text-muted">{k.romaji}</span>
      {s?.srs && <span className="absolute right-1.5 top-0.5 text-primary" aria-hidden>•</span>}
    </button>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`size-3 rounded border-2 ${className}`} />{label}</span>
}

function Detail({ k, progress, onWrite }: { k: Kana; progress: KanaProgress; onWrite: () => void }) {
  const [play, setPlay] = useState(0)
  const [added, setAdded] = useState<string | null>(null)
  const s = progress[k.char]
  const strokes = strokesOf(k.char)
  // Âm ghép (きゃ) gồm 2 chữ: hiện thứ tự nét của từng chữ
  const parts = [...k.char]

  return (
    <Card className="space-y-3" key={k.char}>
      <div className="flex items-center justify-between">
        <div>
          <div className="jp text-5xl leading-none">{k.char}</div>
          <div className="mt-1 text-lg font-semibold text-primary">
            {k.romaji}{k.alt.length > 0 && <span className="text-sm font-normal text-muted"> (gõ: {k.alt.join(', ')})</span>}
          </div>
        </div>
        <Button variant="soft" onClick={() => speak(k.char, { force: true })} aria-label="Nghe đọc">🔊 Nghe</Button>
      </div>

      {k.sound !== k.romaji && (
        <p className="text-sm text-muted">Đọc giống <b>{k.sound}</b>{k.char === 'を' || k.char === 'ヲ' ? ', chỉ dùng làm trợ từ chỉ tân ngữ.' : '.'}</p>
      )}

      <div className="flex justify-center gap-2">
        {parts.map((c, i) => (
          <StrokeView key={i} char={c} playKey={play}
            className={`aspect-square rounded-xl bg-surface-2 ${parts.length > 1 ? 'w-1/2' : 'w-full max-w-56'}`} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{strokes ? `${strokes.length} nét` : 'Âm ghép'}</span>
        <Button variant="ghost" onClick={() => setPlay(play + 1)}>▶ Xem lại thứ tự nét</Button>
      </div>

      <p className="text-sm text-muted">
        {s && s.c + s.w > 0
          ? `Đã luyện: đúng ${s.c}, sai ${s.w}${s.wr ? `, viết đúng ${s.wr} lần` : ''}.`
          : 'Chưa luyện chữ này.'}
      </p>

      <div className="flex flex-wrap gap-2">
        {hasStrokes(k.char) && <Button onClick={onWrite}>Luyện viết</Button>}
        <Button variant="soft" disabled={!!s?.srs || added !== null}
          onClick={async () => setAdded((await addKanaToSrs([k.char])) ? 'Đã thêm' : 'Đã có')}>
          {s?.srs ? 'Đã có trong Ôn tập' : added ?? '+ Ôn tập'}
        </Button>
      </div>
    </Card>
  )
}
