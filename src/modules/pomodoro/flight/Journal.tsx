/**
 * HỘ CHIẾU (dấu nhập cảnh + dấu sân bay, bộ sưu tập 9 vùng) và SỔ VÉ (thống kê + vé lưu niệm từng chuyến).
 */
import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { REGIONS, REGION_ORDER, airport, mode } from './places'
import { getPassport, savePassport, useFlights, type FlightRecord } from './log'
import { RouteMap } from './RouteMap'
import { Stamp, fmtDuration } from './Ticket'

// ---------------------------------------------------------------------------------------------
// Hộ chiếu

export function PassportTab() {
  const flights = useFlights()
  const [name, setName] = useState<string | null>(null)
  useEffect(() => { void getPassport().then((p) => setName(p.name)) }, [])
  const list = flights ?? []
  const visitedRegions = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of list) { const r = airport(f.to).region; if (r && !m.has(r)) m.set(r, f.landedAt) }
    return m
  }, [list])
  const airportsVisited = new Set(list.map((f) => f.to)).size
  const entries = list.filter((f) => f.intl).length

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Bìa hộ chiếu */}
        <div className="flex aspect-[3/4] flex-col items-center justify-between rounded-2xl bg-[#3b2a5c] p-5 text-center text-[#e9d9a6] shadow-card">
          <p className="text-xs tracking-[0.3em]">HIBI NIHONGO</p>
          <div>
            <p className="jp text-4xl" aria-hidden>旅</p>
            <p className="mt-2 text-lg font-semibold tracking-widest">PASSPORT</p>
            <p className="jp text-sm">旅券</p>
          </div>
          <div className="w-full">
            <label htmlFor="pp-name" className="text-[0.65rem] tracking-widest opacity-80">HỌ TÊN / NAME</label>
            <input id="pp-name" value={name ?? ''} onChange={(e) => setName(e.target.value)} onBlur={() => void savePassport({ name: name ?? '' })}
              placeholder="Tên của bạn" maxLength={30}
              className="mt-1 w-full rounded-lg border border-[#e9d9a6]/40 bg-transparent px-2 py-1 text-center text-sm text-[#f5ecd0] placeholder:text-[#e9d9a6]/50 outline-none focus-visible:ring-2 focus-visible:ring-[#e9d9a6]" />
          </div>
        </div>

        <Card>
          <h2 className="font-semibold">Thông tin hộ chiếu</h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-muted">Vùng đã tới</dt><dd className="text-2xl font-bold">{visitedRegions.size}/9</dd></div>
            <div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-muted">Sân bay</dt><dd className="text-2xl font-bold">{airportsVisited}</dd></div>
            <div className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-muted">Lần nhập cảnh</dt><dd className="text-2xl font-bold">{entries}</dd></div>
          </dl>
          <h3 className="mt-5 text-sm font-semibold">Bộ sưu tập 9 vùng Nhật Bản</h3>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {REGION_ORDER.map((id) => {
              const r = REGIONS[id]
              const at = visitedRegions.get(id)
              return (
                <li key={id} className={`rounded-xl border p-2 text-center ${at ? 'border-primary bg-primary-soft' : 'border-dashed border-border text-muted'}`}>
                  <p className="jp text-lg">{r.ja}</p>
                  <p className="text-xs">{r.name}</p>
                  <p className="text-[0.65rem] text-muted">{at ? new Date(at).toLocaleDateString('vi-VN') : 'chưa tới'}</p>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold">Trang đóng dấu</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Chưa có dấu nào. Hoàn thành một chuyến bay để nhận dấu đầu tiên. Bay từ nước ngoài tới Nhật sẽ có dấu nhập cảnh <span className="jp">入国</span>.</p>
        ) : (
          <div className="mt-3 flex flex-wrap justify-center gap-3 rounded-2xl bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,var(--border)_24px)] p-4">
            {[...list].reverse().map((f) => <Stamp key={f.id} code={f.to} date={f.landedAt} entry={f.intl} size="sm" />)}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Sổ vé + thống kê

function StubCard({ f }: { f: FlightRecord }) {
  const from = airport(f.from), to = airport(f.to)
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <RouteMap from={f.from} to={f.to} progress={1} width={360} height={200} showPlane={false} />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-xl font-black">{from.code} <span className="text-sm font-normal text-muted">→</span> {to.code}</p>
          <p className="text-xs text-muted">{new Date(f.landedAt).toLocaleDateString('vi-VN')}</p>
        </div>
        <p className="text-xs text-muted">{from.city} → {to.city} · {f.flightNo} · ghế {f.seat}</p>
        <p className="mt-1 text-sm"><span className="jp text-primary">{mode(f.mode).icon}</span> {mode(f.mode).label} · {fmtDuration(f.minutes)} · {f.km.toLocaleString('vi-VN')} km</p>
        {f.note && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm">{f.note}</p>}
      </div>
    </li>
  )
}

export function LogbookTab() {
  const flights = useFlights()
  const list = flights ?? []
  const minutes = list.reduce((n, f) => n + f.minutes, 0)
  const km = list.reduce((n, f) => n + f.km, 0)
  const dest = new Set(list.map((f) => f.to)).size
  // 14 ngày gần nhất: số phút bay mỗi ngày
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i))
    const end = d.getTime() + 86_400_000
    return { d, min: list.filter((f) => f.landedAt >= d.getTime() && f.landedAt < end).reduce((n, f) => n + f.minutes, 0) }
  })
  const max = Math.max(1, ...days.map((x) => x.min))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Thời gian bay', fmtDuration(minutes)],
          ['Quãng đường', `${km.toLocaleString('vi-VN')} km`],
          ['Chuyến bay', String(list.length)],
          ['Điểm đến', String(dest)],
        ].map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-xl font-bold">{v}</p></Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="font-semibold">Phút bay 14 ngày qua</h2>
        <div className="mt-3 flex h-28 items-end gap-1">
          {days.map(({ d, min }) => (
            <div key={d.getTime()} className="flex flex-1 flex-col items-center gap-1" title={`${d.toLocaleDateString('vi-VN')}: ${min} phút`}>
              <div className="w-full rounded-t bg-primary" style={{ height: `${(min / max) * 80}px`, opacity: min ? 1 : 0.15, minHeight: 2 }} />
              <span className="text-[0.6rem] text-muted">{d.getDate()}</span>
            </div>
          ))}
        </div>
      </Card>
      <h2 className="mb-2 mt-5 font-semibold">Vé lưu niệm</h2>
      {list.length === 0
        ? <p className="text-sm text-muted">Chưa có chuyến bay nào. Mỗi lần hạ cánh, vé của chuyến đó sẽ được giữ ở đây.</p>
        : <ul className="grid gap-3 sm:grid-cols-2">{[...list].reverse().map((f) => <StubCard key={f.id} f={f} />)}</ul>}
    </div>
  )
}
