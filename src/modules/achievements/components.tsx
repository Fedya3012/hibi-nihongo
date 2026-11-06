/** Phần giao diện dùng chung: chú cáo trong vòng XP, huy chương, thanh tiến độ. Chỉ dùng màu token. */
import type { ReactNode } from 'react'
import type { BadgeDef } from './lib/badges'
import type { Rank } from './lib/level'

/** Chú cáo trong vòng tròn tiến độ cấp. size = đường kính (px). */
export function FoxRing({ pct, size = 96, rank, level }: { pct: number; size?: number; rank: Rank; level: number }) {
  const stroke = Math.max(4, size / 14)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: size * 0.4, lineHeight: 1 }} aria-hidden="true">🦊</span>
        <span className="jp mt-0.5 font-semibold text-primary" style={{ fontSize: Math.max(10, size * 0.13) }}>{rank.jp}</span>
      </div>
      <span
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary shadow-card"
        aria-hidden="true"
      >
        {level}
      </span>
    </div>
  )
}

/** Hàng đuôi cáo: đuôi đã có tô đậm, còn lại mờ (tối đa 9). */
export function Tails({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={label} aria-label={label}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`h-2.5 w-1.5 rounded-full ${i < n ? 'bg-primary' : 'bg-surface-2 border border-border'}`} />
      ))}
    </span>
  )
}

export function Bar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} aria-hidden="true">
      <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.round(Math.min(1, pct) * 100)}%` }} />
    </div>
  )
}

/** Huy chương tròn: đã đạt thì nền màu chủ đạo, chưa đạt thì xám mờ. */
export function Medal({ def, earned, size = 52 }: { def: BadgeDef; earned: boolean; size?: number }) {
  const isText = /^\p{Script=Han}|^\p{Script=Hiragana}/u.test(def.icon)
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-2 ${
        earned ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2 opacity-60 grayscale'
      }`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className={isText ? 'jp font-bold text-primary' : ''} style={{ fontSize: size * (isText ? 0.42 : 0.46), lineHeight: 1 }}>
        {def.icon}
      </span>
    </span>
  )
}

/** Sao bậc: ★ đã đạt, ☆ chưa. Huy hiệu 1 bậc không hiện sao. */
export function TierStars({ total, earned }: { total: number; earned: number }) {
  if (total <= 1) return null
  return (
    <span className="text-xs tracking-tight" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < earned ? 'text-primary' : 'text-muted opacity-50'}>{i < earned ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">{children}</span>
}
