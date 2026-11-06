/**
 * Ở SÂN BAY: đặt vé → làm thủ tục (chọn ghế) → cửa an ninh → cửa ra máy bay.
 * Sau khi hạ cánh: nhập cảnh + hải quan (bay từ nước ngoài) → đóng dấu hộ chiếu → vé lưu niệm.
 */
import { useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button, ButtonLink } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { usePomodoro } from '../store'
import { ABROAD, JAPAN, MODES, REGIONS, airport, destinationsFrom, mode, type ModeId } from './places'
import { focusMinutes } from './geo'
import { useFlight } from './store'
import { RouteMap } from './RouteMap'
import { BoardingPass, Stamp, fmtDuration } from './Ticket'
import { CUSTOMS, IMMIGRATION, SECURITY, pick, type Question } from './phrases'
import { updateFlight, useFlights } from './log'

/** Đọc câu tiếng Nhật bằng giọng có sẵn của máy. */
export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = 0.9
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch { /* máy không có giọng đọc */ }
}

export function SpeakButton({ text }: { text: string }) {
  return (
    <button type="button" onClick={() => speak(text)} aria-label="Nghe đọc"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary">🔊</button>
  )
}

function Steps({ at }: { at: number }) {
  const names = ['Đặt vé', 'Làm thủ tục', 'An ninh', 'Cửa ra máy bay', 'Bay']
  return (
    <ol className="mb-4 flex flex-wrap gap-1.5 text-xs" aria-label="Các bước ở sân bay">
      {names.map((n, i) => (
        <li key={n} aria-current={i === at ? 'step' : undefined}
          className={`rounded-full px-2.5 py-1 ${i === at ? 'bg-primary text-on-primary' : i < at ? 'bg-primary-soft text-text' : 'bg-surface-2 text-muted'}`}>
          {i < at ? '✓ ' : ''}{n}
        </li>
      ))}
    </ol>
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Đặt vé

export function BookStep() {
  const { home, speed, setHome, setSpeed, book } = useFlight()
  const flights = useFlights()
  const visited = useMemo(() => new Set((flights ?? []).map((f) => f.to)), [flights])
  const [target, setTarget] = useState(60)
  const [all, setAll] = useState(false)
  const a = airport(home)

  const options = destinationsFrom(home)
    .map((b) => ({ b, min: focusMinutes(a, b, speed) }))
    .sort((x, y) => Math.abs(x.min - target) - Math.abs(y.min - target))
  const near = options.filter((o) => Math.abs(o.min - target) <= Math.max(10, target * 0.3))
  const list = all ? [...options].sort((x, y) => x.min - y.min) : near.length ? near : options.slice(0, 5)
  const [pickCode, setPickCode] = useState<string | null>(null)
  const picked = pickCode && list.some((o) => o.b.code === pickCode) ? pickCode : list[0]?.b.code

  return (
    <>
      <Steps at={0} />
      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden p-0">
          <RouteMap from={home} to={picked ?? undefined} showPlane={false} width={640} height={440}
            markers={list.map((o) => ({ code: o.b.code, visited: visited.has(o.b.code) }))} onPick={setPickCode} />
          <p className="px-4 py-2 text-xs text-muted">Bấm vào một sân bay trên bản đồ để chọn. Chấm tím nhạt: nơi bạn đã từng tới.</p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <label className="block text-sm font-medium" htmlFor="fl-home">Bạn đang ở sân bay</label>
            <select id="fl-home" value={home} onChange={(e) => setHome(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <optgroup label="Nhật Bản">{JAPAN.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.city} ({x.ja})</option>)}</optgroup>
              <optgroup label="Nước ngoài (bay tới Nhật)">{ABROAD.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.city}, {x.country}</option>)}</optgroup>
            </select>
            {!a.region && <p className="mt-2 text-xs text-muted">Bay từ nước ngoài: khi tới Nhật bạn sẽ làm thủ tục nhập cảnh và hải quan bằng tiếng Nhật.</p>}

            <p className="mt-4 text-sm font-medium">Tốc độ bay</p>
            <div className="mt-1">
              <Segmented<string> label="Tốc độ bay" value={String(speed)} onChange={(v) => setSpeed(Number(v))}
                options={[{ value: '1', label: 'Thật 1×' }, { value: '2', label: 'Nhanh 2×' }, { value: '4', label: 'Siêu tốc 4×' }]} />
            </div>
            <p className="mt-1 text-xs text-muted">1× = đúng thời gian bay thật. Chuyến dài từ nước ngoài nên chọn 2× hoặc 4×.</p>

            <label className="mt-4 block text-sm font-medium" htmlFor="fl-target">Muốn tập trung khoảng <b>{fmtDuration(target)}</b></label>
            <input id="fl-target" type="range" min={10} max={240} step={5} value={target} disabled={all}
              onChange={(e) => setTarget(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary)]" />
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[var(--primary)]" /> Xem tất cả điểm đến
            </label>
          </Card>
        </div>
      </div>

      <h2 className="mt-5 mb-2 font-semibold">Điểm đến {all ? '' : 'hợp với thời gian bạn chọn'}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ b, min }) => {
          const r = REGIONS[b.region!]
          const sel = b.code === picked
          return (
            <li key={b.code}>
              <button type="button" onClick={() => setPickCode(b.code)} aria-pressed={sel}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${sel ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary'}`}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-text text-sm font-black text-bg">{b.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.city} <span className="jp font-normal text-muted">{b.ja}</span></span>
                  <span className="block text-xs text-muted">{r.name} <span className="jp">{r.ja}</span>{visited.has(b.code) ? ' · ✓ đã tới' : ''}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold">{fmtDuration(min)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {picked && (
        <div className="sticky bottom-24 z-[5] mt-4 flex justify-center md:bottom-4">
          <Button className="min-w-56 text-base shadow-card" onClick={() => book(picked)}>
            Đặt vé {home} → {picked}
          </Button>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. Làm thủ tục: chọn chế độ học (hạng ghế) + chọn ghế

const ROWS = 8
const COLS = ['A', 'B', 'C', 'D']

export function CheckInStep() {
  const { booking, checkIn, cancel } = useFlight()
  const [m, setM] = useState<ModeId>(booking?.mode ?? 'vocab')
  // Ghế đã có người ngồi: cố định theo chuyến bay
  const taken = useMemo(() => {
    const t = new Set<string>()
    let h = 0
    for (const c of booking?.flightNo ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0
    for (let r = 1; r <= ROWS; r++) for (const c of COLS) { h = (h * 1103515245 + 12345) >>> 0; if (h % 3 === 0) t.add(`${r}${c}`) }
    return t
  }, [booking?.flightNo])
  const [seat, setSeat] = useState('')
  if (!booking) return null
  const occupiedIcon = (id: string) => MODES[id.charCodeAt(0) % (MODES.length - 1)].icon

  return (
    <>
      <Steps at={1} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Quầy làm thủ tục <span className="jp text-sm font-normal text-muted">チェックイン</span></h2>
          <p className="mt-1 text-sm text-muted">Hạng ghế là việc bạn sẽ làm trong chuyến bay. Khi đang bay có nút mở thẳng phần học đó.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODES.map((x) => (
              <button key={x.id} type="button" onClick={() => setM(x.id)} aria-pressed={m === x.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${m === x.id ? 'border-primary bg-primary-soft font-semibold' : 'border-border hover:border-primary'}`}>
                <span className="jp text-lg text-primary" aria-hidden>{x.icon}</span>{x.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm">
            <p><b>{booking.from} → {booking.to}</b> · {booking.flightNo} · cổng {booking.gate}</p>
            <p className="text-muted">{fmtDuration(booking.minutes)} · {booking.km.toLocaleString('vi-VN')} km</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Chọn ghế <span className="text-sm font-normal text-muted">(A, D: cạnh cửa sổ)</span></h2>
          <div className="mx-auto mt-3 w-fit rounded-t-[50%] border border-border bg-surface-2 px-5 pb-4 pt-10">
            <div className="mb-2 grid grid-cols-[repeat(2,2.5rem)_1.5rem_repeat(2,2.5rem)] gap-1.5 text-center text-xs text-muted">
              <span>A</span><span>B</span><span /><span>C</span><span>D</span>
            </div>
            {Array.from({ length: ROWS }, (_, i) => i + 1).map((r) => (
              <div key={r} className="mb-1.5 grid grid-cols-[repeat(2,2.5rem)_1.5rem_repeat(2,2.5rem)] gap-1.5">
                {COLS.map((c, ci) => {
                  const id = `${r}${c}`
                  const busy = taken.has(id)
                  const mine = seat === id
                  const cell = (
                    <button key={id} type="button" disabled={busy} onClick={() => setSeat(id)} aria-pressed={mine}
                      aria-label={`Ghế ${id}${busy ? ', đã có người' : ''}${c === 'A' || c === 'D' ? ', cạnh cửa sổ' : ''}`}
                      className={`jp grid size-10 place-items-center rounded-lg border text-sm transition ${
                        mine ? 'border-primary bg-primary text-on-primary' : busy ? 'border-transparent bg-border/60 text-muted' : 'border-border bg-surface hover:border-primary'
                      }`}>
                      {mine ? mode(m).icon : busy ? occupiedIcon(id) : ''}
                    </button>
                  )
                  return ci === 2 ? [<span key={`a${r}`} className="grid place-items-center text-xs text-muted">{r}</span>, cell] : cell
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={cancel}>Đổi chuyến</Button>
        <Button className="min-w-48" disabled={!seat} onClick={() => checkIn(m, seat)}>{seat ? `Làm thủ tục · ghế ${seat}` : 'Chọn một ghế'}</Button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Câu hỏi tiếng Nhật (an ninh, nhập cảnh, hải quan)

function Quiz({ title, officer, questions, onDone }: {
  title: string
  officer: string
  questions: Question[]
  onDone: (correct: number) => void
}) {
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [showVi, setShowVi] = useState(false)
  const q = questions[i]
  const answer = (k: number) => {
    if (chosen != null) return
    setChosen(k)
    if (k === q.ok) setScore((s) => s + 1)
    speak(q.choices[k].ja)
  }
  const next = () => {
    if (i + 1 < questions.length) { setI(i + 1); setChosen(null); setShowVi(false) }
    else onDone(score)
  }
  return (
    <Card className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted">{i + 1}/{questions.length}</span>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <span className="jp grid size-12 shrink-0 place-items-center rounded-2xl bg-text text-xl text-bg" aria-hidden>{officer}</span>
        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface-2 p-3">
          <div className="flex items-start gap-2">
            <p className="jp flex-1 text-lg">{q.ja}</p>
            <SpeakButton text={q.ja} />
          </div>
          <p className="jp text-xs text-muted">{q.kana}</p>
          {showVi || chosen != null
            ? <p className="mt-1 text-sm text-muted">→ {q.vi}</p>
            : <button type="button" onClick={() => setShowVi(true)} className="mt-1 text-xs text-muted underline">Xem nghĩa</button>}
        </div>
      </div>
      <p className="mt-4 text-sm font-medium">Bạn trả lời:</p>
      <div className="mt-2 grid gap-2">
        {q.choices.map((c, k) => {
          const state = chosen == null ? '' : k === q.ok ? 'border-[var(--good)] bg-[var(--good)]/10' : k === chosen ? 'border-[var(--bad)] bg-[var(--bad)]/10' : 'opacity-60'
          return (
            <button key={k} type="button" onClick={() => answer(k)} disabled={chosen != null}
              className={`rounded-xl border border-border p-3 text-left transition hover:border-primary ${state}`}>
              <span className="jp block">{c.ja}</span>
              {chosen != null && <span className="block text-xs text-muted">{c.vi}</span>}
            </button>
          )
        })}
      </div>
      {chosen != null && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm">{chosen === q.ok ? '✓ Chính xác!' : '✗ Chưa đúng, câu đúng được tô xanh.'}</p>
          <Button onClick={next}>{i + 1 < questions.length ? 'Câu tiếp' : 'Xong'}</Button>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. An ninh

export function SecurityStep() {
  const { passSecurity, cancel } = useFlight()
  const [qs] = useState(() => pick(SECURITY, 2))
  return (
    <>
      <Steps at={2} />
      <p className="mb-3 text-center text-sm text-muted">Cửa an ninh <span className="jp">保安検査場</span>: nghe nhân viên nói và chọn câu đáp lại phù hợp.</p>
      <Quiz title="Kiểm tra an ninh" officer="検" questions={qs} onDone={passSecurity} />
      <div className="mt-3 text-center"><Button variant="ghost" onClick={cancel}>Hủy chuyến</Button></div>
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Cửa ra máy bay

export function GateStep() {
  const { booking, takeOff, cancel } = useFlight()
  if (!booking) return null
  const m = mode(booking.mode)
  return (
    <>
      <Steps at={3} />
      <p className="mb-3 text-center text-sm text-muted">Cổng <b>{booking.gate}</b> · mời hành khách chuyến <b>{booking.flightNo}</b> lên máy bay. <span className="jp">ご搭乗ください。</span></p>
      <BoardingPass b={booking} />
      <div className="mt-4 flex flex-col items-center gap-2">
        <Button className="min-w-64 text-base" onClick={takeOff}>Lên máy bay · bắt đầu {fmtDuration(booking.minutes)} {m.label.toLowerCase()}</Button>
        <p className="text-xs text-muted">Đồng hồ vẫn chạy khi bạn chuyển sang trang khác để học.</p>
        <Button variant="ghost" onClick={cancel}>Hủy chuyến</Button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 6. Tới nơi: nhập cảnh + hải quan (nếu từ nước ngoài), đóng dấu hộ chiếu

export function ArrivalStep() {
  const { booking, lastFlightId, finishArrival } = useFlight()
  const intl = booking ? !airport(booking.from).region : false
  const [phase, setPhase] = useState<'immigration' | 'customs' | 'stamp'>(intl ? 'immigration' : 'stamp')
  const [qs] = useState(() => ({ imm: pick(IMMIGRATION, 3), cus: pick(CUSTOMS, 1) }))
  const [score, setScore] = useState(0)
  if (!booking) return null
  const to = airport(booking.to)
  const region = REGIONS[to.region!]
  const finish = async (total: number) => {
    if (lastFlightId && intl) await updateFlight(lastFlightId, { immigration: { correct: total, total: qs.imm.length + qs.cus.length } })
    setPhase('stamp')
  }

  if (phase === 'immigration') return (
    <>
      <p className="mb-3 text-center text-sm text-muted">🛬 Đã tới {to.city}. Mời qua quầy nhập cảnh <span className="jp">入国審査</span>.</p>
      <Quiz key="imm" title="Nhập cảnh" officer="入" questions={qs.imm} onDone={(c) => { setScore(c); setPhase('customs') }} />
    </>
  )
  if (phase === 'customs') return (
    <>
      <p className="mb-3 text-center text-sm text-muted">Lấy hành lý xong, đi qua hải quan <span className="jp">税関</span>.</p>
      <Quiz key="cus" title="Hải quan" officer="税" questions={qs.cus} onDone={(c) => void finish(score + c)} />
    </>
  )
  return (
    <Card className="mx-auto max-w-xl text-center">
      <p className="text-sm text-muted">{intl ? 'Chào mừng tới Nhật Bản!' : 'Chào mừng tới'}</p>
      <h2 className="mt-1 text-2xl font-bold">{to.city} <span className="jp">{to.ja}</span></h2>
      <p className="jp text-muted">ようこそ、{to.ja}へ！</p>
      <div className="my-5 flex justify-center gap-4">
        <div className="animate-[hibi-stamp_0.5s_ease-out]"><Stamp code={to.code} date={Date.now()} entry={intl} size="lg" /></div>
      </div>
      <style>{'@keyframes hibi-stamp { 0% { transform: scale(2.2); opacity: 0 } 70% { transform: scale(0.95); opacity: 1 } 100% { transform: scale(1) } }'}</style>
      <p className="text-sm">Hộ chiếu của bạn vừa có thêm dấu <b>{intl ? 'nhập cảnh' : region.name}</b>.</p>
      <Button className="mt-4" onClick={finishArrival}>Nhận vé lưu niệm</Button>
    </Card>
  )
}

// ---------------------------------------------------------------------------------------------
// 7. Vé lưu niệm + ghi chú

export function LandedStep({ onPassport }: { onPassport: () => void }) {
  const { booking, lastFlightId, done } = useFlight()
  const flights = useFlights()
  const rec = flights?.find((f) => f.id === lastFlightId)
  const [note, setNote] = useState<string | null>(null)
  if (!booking) return null
  const to = airport(booking.to)
  const region = REGIONS[to.region!]
  const breakNow = () => {
    const p = usePomodoro.getState()
    p.choose('short')
    p.start()
    done()
  }
  return (
    <div className="mx-auto max-w-xl">
      <BoardingPass b={booking} landed={rec?.landedAt ?? Date.now()} />
      <Card className="mt-4">
        <label htmlFor="fl-note" className="font-semibold">Ghi chú chuyến bay</label>
        <p className="text-xs text-muted">Bạn đã học được gì trên chuyến này? Ghi chú được lưu cùng vé trong Sổ vé.</p>
        <textarea id="fl-note" rows={3} value={note ?? rec?.note ?? ''} onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (lastFlightId && note != null) void updateFlight(lastFlightId, { note }) }}
          placeholder="Ví dụ: Ôn xong 40 thẻ, nhớ được 富士山 và 湖."
          className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        {rec?.immigration && <p className="mt-2 text-sm text-muted">Quầy nhập cảnh + hải quan: đúng {rec.immigration.correct}/{rec.immigration.total} câu.</p>}
      </Card>
      <Card className="mt-4">
        <p className="text-sm text-muted">Gợi ý ở {region.name}:</p>
        <ul className="mt-1 flex flex-wrap gap-1.5 text-sm">{region.sights.map((x) => <li key={x} className="rounded-full bg-surface-2 px-2.5 py-1">{x}</li>)}</ul>
      </Card>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="soft" onClick={breakNow}>Nghỉ 5 phút</Button>
        <Button variant="soft" onClick={onPassport}>Xem hộ chiếu</Button>
        <Button onClick={() => { if (lastFlightId && note != null) void updateFlight(lastFlightId, { note }); done() }}>Bay tiếp từ {to.code}</Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Chuyến bay đã được tính vào thống kê Pomodoro hôm nay.</p>
      <div className="mt-2 text-center"><ButtonLink to="/" variant="ghost">Về Hôm nay</ButtonLink></div>
    </div>
  )
}
