/**
 * PHẦN THÊM Ở TAB "ÔN TẬP"
 *  - VacationCard: chế độ nghỉ (vacation.ts)
 *  - CustomStudyCard: ôn thêm theo bộ lọc, không đổi lịch ôn thật (buildCustomQueue trong queue.ts)
 */
import { useState } from 'react'
import { useDbQuery } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { DAY } from './fsrs'
import { buildCustomQueue, CUSTOM_LABEL, type CustomKind, type CustomStudy } from './queue'
import { getSettings, startOfStudyDay } from './store'
import { activeVacation, dayKeyOf, endVacation, getVacations, startVacation } from './vacation'
import type { SrsCard } from './types'

const fmtDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

const inputCls = 'min-h-10 rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary'

/** Đang nghỉ thì hiện băng thông báo; không thì nút mở form bật chế độ nghỉ. */
export function VacationCard() {
  const { data } = useDbQuery(async () => {
    const s = await getSettings()
    const todayStart = startOfStudyDay(Date.now(), s.dayStartHour)
    return { s, todayStart, active: activeVacation(await getVacations(), dayKeyOf(todayStart)) }
  }, [], ['kv', 'srsCards'])
  const [open, setOpen] = useState(false)
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (!data) return null
  const { s, todayStart, active } = data
  const todayKey = dayKeyOf(todayStart)

  const begin = async () => {
    if (!end) return
    setBusy(true)
    try {
      const n = await startVacation(end, todayStart, s.dayStartHour)
      setMsg(`Đã dời ${n} thẻ sang sau kỳ nghỉ. Nghỉ ngơi vui vẻ!`)
      setOpen(false)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const finish = async () => {
    setBusy(true)
    try {
      const sameDay = active?.start === todayKey
      const n = await endVacation(todayStart)
      setMsg(sameDay ? `Đã hủy kỳ nghỉ, ${n} thẻ trở lại hạn cũ.` : `Chào mừng trở lại! ${n} thẻ được dàn đều từ hôm nay.`)
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    return (
      <Card className="border-primary/40 bg-primary-soft">
        <p className="font-semibold">🏖 Đang nghỉ đến hết {fmtDay(active.end)}</p>
        <p className="mt-1 text-sm text-muted">
          Thẻ đến hạn trong kỳ nghỉ đã được dời sang những ngày sau đó, không mở thẻ mới, và streak không bị đứt.
        </p>
        <Button variant="soft" className="mt-3" disabled={busy} onClick={() => void finish()}>
          {active.start === todayKey ? 'Hủy kỳ nghỉ' : 'Về sớm: kết thúc nghỉ'}
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Chế độ nghỉ</h2>
          <p className="text-sm text-muted">Đi xa, ốm, bận thi? Tạm dừng ôn mà không bị dồn thẻ và không đứt streak.</p>
        </div>
        {!open && <Button variant="soft" onClick={() => { setOpen(true); setMsg(null) }}>Nghỉ vài ngày</Button>}
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm text-muted">
            Nghỉ từ hôm nay đến hết ngày
            <input type="date" className={inputCls} value={end} min={todayKey}
              max={dayKeyOf(todayStart + 90 * DAY)} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <Button disabled={!end || busy} onClick={() => void begin()}>Bắt đầu nghỉ</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Thôi</Button>
          <p className="w-full text-xs text-muted">
            Muốn ôn trước khi đi? Dùng “Ôn thêm → Ôn trước thẻ sắp đến hạn” bên dưới trước khi bật.
          </p>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </Card>
  )
}

/** Ôn thêm theo bộ lọc. Bấm Bắt đầu thì gọi onStart với danh sách thẻ (buổi ôn chạy ở chế độ practice). */
export function CustomStudyCard({ decks, onStart }: { decks: string[]; onStart: (cards: SrsCard[]) => void }) {
  const [open, setOpen] = useState(false)
  const [opt, setOpt] = useState<CustomStudy>({ kind: 'ahead', deck: null, tag: '', days: 3, limit: 30 })
  const [empty, setEmpty] = useState(false)
  const set = (p: Partial<CustomStudy>) => { setOpt((o) => ({ ...o, ...p })); setEmpty(false) }
  const start = async () => {
    const cards = await buildCustomQueue(opt)
    if (!cards.length) { setEmpty(true); return }
    onStart(cards)
  }
  const usesDays = opt.kind === 'ahead' || opt.kind === 'forgot'

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Ôn thêm</h2>
          <p className="text-sm text-muted">Ôn ngoài lịch (ôn trước, thẻ vừa quên, thẻ khó…). Không làm thay đổi lịch ôn thật.</p>
        </div>
        {!open && <Button variant="soft" onClick={() => setOpen(true)}>Chọn thẻ</Button>}
      </div>
      {open && (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(CUSTOM_LABEL) as CustomKind[]).map((k) => (
              <label key={k} className={`flex cursor-pointer gap-2 rounded-xl border p-3 ${opt.kind === k ? 'border-primary bg-primary-soft' : 'border-border'}`}>
                <input type="radio" name="custom-kind" checked={opt.kind === k} onChange={() => set({ kind: k })} className="mt-1 accent-[var(--primary)]" />
                <span>
                  <span className="font-medium">{CUSTOM_LABEL[k].label}</span>
                  <span className="block text-xs text-muted">{CUSTOM_LABEL[k].hint}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm text-muted">
            {usesDays && (
              <label className="grid gap-1">
                {opt.kind === 'ahead' ? 'Đến hạn trong (ngày tới)' : 'Đã quên trong (ngày qua)'}
                <input type="number" min={1} max={365} value={opt.days} className={`${inputCls} w-24`}
                  onChange={(e) => set({ days: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })} />
              </label>
            )}
            <label className="grid gap-1">
              Bộ thẻ
              <select value={opt.deck ?? ''} onChange={(e) => set({ deck: e.target.value || null })} className={`${inputCls} text-text`}>
                <option value="">Tất cả</option>
                {decks.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              Nhãn (không bắt buộc)
              <input value={opt.tag} placeholder="vd minna-5" className={`${inputCls} w-36 text-text`} onChange={(e) => set({ tag: e.target.value })} />
            </label>
            <label className="grid gap-1">
              Tối đa
              <input type="number" min={1} max={500} value={opt.limit} className={`${inputCls} w-24`}
                onChange={(e) => set({ limit: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void start()}>Bắt đầu ôn thêm</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Đóng</Button>
            {empty && <span className="text-sm text-muted">Không có thẻ nào khớp. Thử đổi bộ lọc.</span>}
          </div>
        </div>
      )}
    </Card>
  )
}
