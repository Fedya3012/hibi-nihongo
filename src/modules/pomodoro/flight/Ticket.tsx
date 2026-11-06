/**
 * THẺ LÊN MÁY BAY + VÉ LƯU NIỆM + CON DẤU HỘ CHIẾU (chỉ hiển thị)
 */
import type { ReactNode } from 'react'
import { airport, mode, REGIONS, type Airport } from './places'
import type { Booking } from './store'

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
export const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} giờ ${min % 60 ? `${min % 60} phút` : ''}`.trim() : `${min} phút`)

/** Vạch mã vạch giả, cố định theo chuỗi. */
function Barcode({ seed, className = '' }: { seed: string; className?: string }) {
  let h = 7
  const bars: number[] = []
  for (let i = 0; i < 46; i++) { h = (h * 31 + seed.charCodeAt(i % seed.length)) >>> 0; bars.push(1 + (h % 4)) }
  let x = 0
  return (
    <svg viewBox="0 0 160 36" className={`h-9 w-40 ${className}`} aria-hidden>
      {bars.map((w, i) => { const r = <rect key={i} x={x} y={0} width={w * 0.8} height={36} fill={i % 2 ? 'transparent' : 'currentColor'} />; x += w * 0.9; return r })}
    </svg>
  )
}

function Field({ label, value, right }: { label: string; value: ReactNode; right?: boolean }) {
  return (
    <div className={right ? 'text-right' : ''}>
      <p className="text-[0.7rem] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

const cityLine = (a: Airport) => (a.ja ? <><span className="jp">{a.ja}</span> · {a.city}</> : `${a.city}, ${a.country}`)

export function BoardingPass({ b, landed }: { b: Booking; landed?: number }) {
  const from = airport(b.from), to = airport(b.to)
  const m = mode(b.mode)
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between bg-primary-soft px-5 py-3">
        <div>
          <p className="text-lg font-bold leading-tight">Hibi Airline <span className="jp text-sm font-normal text-muted">日々航空</span></p>
          <p className="text-xs text-muted">Mỗi chuyến bay là một phiên tập trung</p>
        </div>
        {landed
          ? <span className="rounded-full bg-[var(--good)]/15 px-2 py-0.5 text-xs font-bold text-[var(--good)]">ĐÃ HẠ CÁNH</span>
          : <span className="text-2xl" aria-hidden>✈</span>}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-2">
          <div><p className="text-4xl font-black tracking-tight">{from.code}</p><p className="text-sm text-muted">{cityLine(from)}</p></div>
          <div className="pb-2 text-center text-xs text-muted"><span aria-hidden className="text-primary">✈</span><br />{fmtDuration(b.minutes)}</div>
          <div className="text-right"><p className="text-4xl font-black tracking-tight">{to.code}</p><p className="text-sm text-muted">{cityLine(to)}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Field label="Chuyến bay" value={b.flightNo} />
          <Field label="Cổng" value={b.gate} />
          <Field label="Ghế" value={b.seat || '—'} right />
          <Field label="Hạng (chế độ)" value={<><span className="jp text-primary">{m.icon}</span> {m.label}</>} />
          <Field label="Quãng đường" value={`${b.km.toLocaleString('vi-VN')} km`} />
          <Field label={landed ? 'Hạ cánh' : 'Ngày'} value={landed ? `${fmtTime(landed)} ${fmtDate(landed)}` : fmtDate(b.bookedAt)} right />
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-border px-5 py-3">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-bg" aria-hidden />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-bg" aria-hidden />
        <div className="flex items-center justify-between gap-3 text-text">
          <Barcode seed={`${b.flightNo}${b.from}${b.to}${b.bookedAt}`} />
          <p className="text-right text-xs text-muted">{from.code} → {to.code}<br />{b.flightNo}</p>
        </div>
      </div>
    </div>
  )
}

/** Con dấu hộ chiếu: tròn cho sân bay trong nước, chữ nhật "入国" cho nhập cảnh từ nước ngoài. */
export function Stamp({ code, date, entry, size = 'md', className = '' }: { code: string; date: number; entry?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const a = airport(code)
  const region = a.region ? REGIONS[a.region] : undefined
  const hue = ['#c0392b', '#1f5fa8', '#2e7d4f', '#7b3fa0', '#b5651d'][code.charCodeAt(0) % 5]
  const px = size === 'sm' ? 84 : size === 'lg' ? 150 : 112
  const d = new Date(date)
  const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  return (
    <svg viewBox="0 0 120 120" width={px} height={px} className={className} style={{ color: hue, transform: `rotate(${(code.charCodeAt(1) % 15) - 7}deg)` }}
      role="img" aria-label={`Dấu ${entry ? 'nhập cảnh' : 'sân bay'} ${a.city}, ${ds}`}>
      <g fill="none" stroke="currentColor" opacity={0.85}>
        {entry ? (
          <>
            <rect x={6} y={14} width={108} height={92} rx={8} strokeWidth={4} />
            <rect x={12} y={20} width={96} height={80} rx={5} strokeWidth={1.5} />
          </>
        ) : (
          <>
            <circle cx={60} cy={60} r={54} strokeWidth={4} />
            <circle cx={60} cy={60} r={46} strokeWidth={1.5} />
          </>
        )}
      </g>
      <g fill="currentColor" opacity={0.9} textAnchor="middle" fontFamily="inherit">
        {entry ? (
          <>
            <text x={60} y={38} fontSize={11} fontWeight={700}>JAPAN · 日本国</text>
            <text x={60} y={62} fontSize={20} fontWeight={900}>入国 {a.code}</text>
            <text x={60} y={78} fontSize={10} fontWeight={700}>{ds}</text>
            <text x={60} y={93} fontSize={9}>{a.ja} · ADMITTED</text>
          </>
        ) : (
          <>
            <text x={60} y={36} fontSize={10} fontWeight={700}>{region?.ja} {region?.name.toUpperCase()}</text>
            <text x={60} y={66} fontSize={24} fontWeight={900}>{a.code}</text>
            <text x={60} y={82} fontSize={12} fontWeight={700}>{a.ja}</text>
            <text x={60} y={96} fontSize={9}>{ds}</text>
          </>
        )}
      </g>
    </svg>
  )
}
