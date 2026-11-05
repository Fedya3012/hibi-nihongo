/**
 * BIỂU ĐỒ VẼ BẰNG SVG (không cần thư viện, chạy offline, tự đổi màu theo Sáng/Tối)
 * - BarChart: cột (có thể chồng nhiều nhóm), rê chuột/chạm để xem số liệu
 * - LineChart: đường tích lũy
 * - Heatmap: lưới ô theo ngày kiểu "lịch đóng góp"
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import '../chart.css'

export interface Series { key: string; label: string; color: string }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Số đẹp cho trục dọc: 0, 5, 10, 20, 25, 50, 100... */
function niceMax(v: number): number {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

const fmtNum = (n: number) => (n >= 10 || Number.isInteger(n) ? Math.round(n).toLocaleString('vi-VN') : n.toFixed(1))

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  // Giữ tooltip trong khung biểu đồ
  const left = Math.min(Math.max(x, 80), Math.max(80, width - 80))
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-card"
      style={{ left, top: y - 8 }}
    >
      {children}
    </div>
  )
}

export interface BarRow {
  label: string // nhãn dưới cột (ngắn)
  title: string // tiêu đề trong tooltip
  values: number[] // theo thứ tự series
}

export function BarChart({
  rows, series, unit, height = 180, format = fmtNum,
}: {
  rows: BarRow[]; series: Series[]; unit: string; height?: number; format?: (n: number) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 36
  const padB = 22
  const padT = 8
  const innerW = Math.max(0, width - padL)
  const innerH = height - padB - padT
  const totals = rows.map((r) => r.values.reduce((a, b) => a + b, 0))
  const max = niceMax(Math.max(0, ...totals))
  const slot = rows.length ? innerW / rows.length : 0
  const barW = Math.max(2, Math.min(28, slot * 0.66))
  const y = (v: number) => padT + innerH - (v / max) * innerH
  // Nhãn trục ngang: hiện thưa ra khi có nhiều cột
  const every = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(innerW / 44))))

  return (
    <div ref={ref} className="relative w-full select-none" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Biểu đồ cột (${unit})`}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeDasharray={t ? '3 3' : undefined} />
              <text x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{format(max * t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = padL + slot * i + slot / 2
            let acc = 0
            const segs = r.values.map((v, si) => {
              if (v <= 0) return null
              const y0 = y(acc)
              acc += v
              const y1 = y(acc)
              const isTop = r.values.slice(si + 1).every((x) => x <= 0)
              // Khe hở 2px giữa các phần chồng nhau; phần trên cùng bo góc 4px
              const h = Math.max(1, y0 - y1 - (acc > v ? 2 : 0))
              return (
                <rect key={si} x={cx - barW / 2} y={y1} width={barW} height={h}
                  rx={isTop ? Math.min(4, barW / 2) : 0} fill={series[si].color} />
              )
            })
            return (
              <g key={i}>
                {segs}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{r.label}</text>
                )}
                <rect
                  x={padL + slot * i} y={padT} width={slot} height={innerH}
                  fill="var(--text)" fillOpacity={hover === i ? 0.06 : 0}
                  onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={padL + slot * hover + slot / 2} y={y(totals[hover])} width={width}>
          <p className="font-semibold text-text">{rows[hover].title}</p>
          {series.length > 1 && rows[hover].values.map((v, si) => v > 0 && (
            <p key={si} className="flex items-center justify-between gap-3 text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm" style={{ background: series[si].color }} />{series[si].label}
              </span>
              <span className="text-text">{format(v)}</span>
            </p>
          ))}
          <p className="mt-0.5 text-text">Tổng: <b>{format(totals[hover])}</b> {unit}</p>
        </Tooltip>
      )}
    </div>
  )
}

export function LineChart({
  labels, titles, series, data, unit, height = 180,
}: {
  labels: string[]; titles: string[]; series: Series[]; data: number[][]; unit: string; height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 36
  const padR = 8
  const padB = 22
  const padT = 8
  const innerW = Math.max(0, width - padL - padR)
  const innerH = height - padB - padT
  const n = labels.length
  const max = niceMax(Math.max(0, ...data.flat()))
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / max) * innerH
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 48))))

  return (
    <div
      ref={ref}
      className="relative w-full select-none"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const i = Math.round(((e.clientX - r.left - padL) / Math.max(1, innerW)) * (n - 1))
        setHover(Math.min(n - 1, Math.max(0, i)))
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Biểu đồ đường (${unit})`}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeDasharray={t ? '3 3' : undefined} />
              <text x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{fmtNum(max * t)}</text>
            </g>
          ))}
          {labels.map((l, i) => i % every === 0 && (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{l}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--text-muted)" strokeWidth="1" />}
          {series.map((s, si) => (
            <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              points={data[si].map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          ))}
          {hover !== null && series.map((s, si) => (
            <circle key={s.key} cx={x(hover)} cy={y(data[si][hover])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
          ))}
        </svg>
      )}
      {hover !== null && n > 0 && (
        <Tooltip x={x(hover)} y={y(Math.max(...series.map((_, si) => data[si][hover])))} width={width}>
          <p className="font-semibold text-text">{titles[hover]}</p>
          {series.map((s, si) => (
            <p key={s.key} className="flex items-center justify-between gap-3 text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
              <span className="text-text">{fmtNum(data[si][hover])}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

export interface HeatCell { day: string; level: 0 | 1 | 2 | 3 | 4; title: string; frozen?: boolean; future?: boolean }

/**
 * Lưới heatmap: mỗi cột là một tuần (Thứ Hai ở trên), mỗi ô một ngày.
 * cells đã được xếp theo ngày tăng dần, bắt đầu từ một ngày Thứ Hai.
 */
export function Heatmap({ cells, monthLabels }: { cells: HeatCell[]; monthLabels: { col: number; label: string }[] }) {
  const [hover, setHover] = useState<HeatCell | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // Trên màn hẹp: cuộn sẵn tới tuần gần nhất (bên phải)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [cells.length])
  const size = 12
  const gap = 3
  const cols = Math.ceil(cells.length / 7)
  const left = 22
  const top = 16
  const w = left + cols * (size + gap)
  const h = top + 7 * (size + gap)
  return (
    <div className="relative">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <svg width={w} height={h} role="img" aria-label="Heatmap số phút học mỗi ngày" className="block">
          {monthLabels.map((m) => (
            <text key={m.col} x={left + m.col * (size + gap)} y={10} fontSize="10" fill="var(--text-muted)">{m.label}</text>
          ))}
          {['T2', '', 'T4', '', 'T6', '', 'CN'].map((l, i) => l && (
            <text key={i} x={0} y={top + i * (size + gap) + size - 2} fontSize="9" fill="var(--text-muted)">{l}</text>
          ))}
          {cells.map((c, i) => {
            if (c.future) return null
            const col = Math.floor(i / 7)
            const row = i % 7
            const cx = left + col * (size + gap)
            const cy = top + row * (size + gap)
            return (
              <g key={c.day} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onClick={() => setHover(c)}>
                <rect x={cx} y={cy} width={size} height={size} rx="3" className={`heat-${c.level}`}>
                  <title>{c.title}</title>
                </rect>
                {c.frozen && <text x={cx + size / 2} y={cy + size - 2.5} fontSize="9" textAnchor="middle" fill="var(--text)">❄</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="min-h-4">{hover?.title ?? ' '}</span>
        <span className="flex items-center gap-1">
          Ít
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-${l} inline-block size-3 rounded-sm`} />)}
          Nhiều · ❄ đóng băng
        </span>
      </div>
    </div>
  )
}
