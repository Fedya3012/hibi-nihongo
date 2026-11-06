/**
 * TRONG CHUYẾN BAY: đồng hồ tới nơi, quãng đường còn lại, bản đồ hoặc cửa sổ ngắm cảnh theo vùng đang bay qua,
 * thẻ "Đang bay qua" với giới thiệu, địa danh và từ vựng của vùng đó.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/design/components/Button'
import { useNow } from '../HeaderTimer'
import { airport, mode, SKY_WORDS, type SceneId } from './places'
import { along, regionAt } from './geo'
import { flightRemaining, useFlight } from './store'
import { RouteMap } from './RouteMap'
import { AirplaneWindow } from './scenes'
import { SpeakButton } from './Airport'

const clock = (ms: number) => {
  const t = Math.ceil(ms / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`
}

function RoundBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active}
      className={`grid size-11 place-items-center rounded-full text-lg backdrop-blur transition focus-visible:outline-2 focus-visible:outline-white ${active ? 'bg-white text-[#0b1730]' : 'bg-white/15 text-white hover:bg-white/25'}`}>
      {children}
    </button>
  )
}

export function InFlightStep() {
  const s = useFlight()
  const b = s.booking!
  const now = useNow(s.status === 'flying')
  const left = flightRemaining(s, now)
  const total = b.minutes * 60_000
  const progress = Math.min(1, Math.max(0, 1 - left / total))
  const from = airport(b.from), to = airport(b.to)
  const pos = along(from, to, progress)
  const region = regionAt(pos)
  const scene: SceneId = region?.id ?? 'ocean'
  const words = region?.words ?? SKY_WORDS
  const m = mode(b.mode)
  const box = useRef<HTMLDivElement>(null)
  const [confirmAbort, setConfirmAbort] = useState(false)
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => { const id = setInterval(() => setHour(new Date().getHours()), 60_000); return () => clearInterval(id) }, [])

  // Tiêu đề tab trình duyệt: thời gian còn lại
  useEffect(() => {
    const old = document.title
    document.title = `✈ ${clock(left)} · ${b.to}`
    return () => { document.title = old }
  }, [left, b.to])

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void box.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div ref={box} className="relative overflow-hidden rounded-3xl bg-[#070b1c] text-white shadow-card [&:fullscreen]:rounded-none [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center">
        <div className="relative z-[2] flex items-start justify-between px-5 pt-5">
          <div>
            <p className="text-3xl font-bold tabular-nums md:text-4xl" role="timer">{clock(left)}</p>
            <p className="text-xs text-white/60">Thời gian tới {to.code}{s.status === 'paused' ? ' · đang tạm dừng' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums md:text-4xl">{Math.round(b.km * (1 - progress)).toLocaleString('vi-VN')} <span className="text-base font-normal">km</span></p>
            <p className="text-xs text-white/60">Còn lại tới {to.city}</p>
          </div>
        </div>

        <div className="relative">
          {s.view === 'map' ? (
            <div className="mt-3">
              <RouteMap from={b.from} to={b.to} progress={progress} width={720} height={460} />
            </div>
          ) : (
            <div className="px-6 pb-6 pt-8"><AirplaneWindow scene={scene} hour={hour} /></div>
          )}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <RoundBtn label={s.view === 'map' ? 'Xem cửa sổ' : 'Xem bản đồ'} onClick={() => s.setView(s.view === 'map' ? 'window' : 'map')}>{s.view === 'map' ? '◐' : '🗺'}</RoundBtn>
            <RoundBtn label={s.cabinSound ? 'Tắt tiếng cabin' : 'Bật tiếng cabin'} active={s.cabinSound} onClick={() => s.setCabinSound(!s.cabinSound)}>♪</RoundBtn>
            <RoundBtn label="Toàn màn hình" onClick={fullscreen}>⤢</RoundBtn>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-sm">
          <span className="text-white/70">{b.from} → {b.to} · {b.flightNo} · ghế {b.seat}</span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/15" aria-label={`Đã bay ${Math.round(progress * 100)}%`} role="progressbar" aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-[#a5b4fc]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button className="min-w-36" onClick={s.toggle}>{s.status === 'flying' ? '❚❚ Tạm dừng' : '▶ Bay tiếp'}</Button>
        {m.to && <ButtonLink to={m.to} variant="soft"><span className="jp">{m.icon}</span> Mở {m.label}</ButtonLink>}
        {confirmAbort
          ? <Button variant="ghost" className="text-[var(--bad)]" onClick={s.abort} onBlur={() => setConfirmAbort(false)}>Bấm lần nữa: hủy chuyến, không ghi sổ</Button>
          : <Button variant="ghost" onClick={() => setConfirmAbort(true)}>Hạ cánh khẩn cấp</Button>}
      </div>

      <section className="mt-4 rounded-3xl border border-border bg-surface p-5 shadow-card" aria-live="polite">
        <p className="text-xs uppercase tracking-wide text-muted">Đang bay qua</p>
        {region ? (
          <>
            <h2 className="mt-1 text-xl font-bold">{region.name} <span className="jp font-normal text-muted">{region.ja}（{region.kana}）</span></h2>
            <p className="mt-1 text-sm">{region.intro}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">{region.sights.map((x) => <li key={x} className="rounded-full bg-surface-2 px-2.5 py-1">{x}</li>)}</ul>
          </>
        ) : (
          <>
            <h2 className="mt-1 text-xl font-bold">Trên biển <span className="jp font-normal text-muted">海の上</span></h2>
            <p className="mt-1 text-sm">Máy bay đang ở độ cao 11.000 m. Khi tới gần Nhật Bản, cảnh ngoài cửa sổ và thông tin vùng sẽ tự đổi.</p>
          </>
        )}
        <p className="mt-4 text-sm font-medium">Từ vựng của vùng này</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {words.map((w) => (
            <li key={w.w} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <ruby className="jp text-lg">{w.w}<rt>{w.r}</rt></ruby>
              <span className="flex-1 text-sm text-muted">{w.vi}</span>
              <SpeakButton text={w.w} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
