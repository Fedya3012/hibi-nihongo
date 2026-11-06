/** Mảnh giao diện dùng chung của các phần luyện nghe. */
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { resetStats, useListeningStats, type DrillKind } from './lib/stats'

/** Nút bật/tắt nhỏ (chọn cấp N5…N1, bật 午前/午後…). */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-9 rounded-lg border px-3 text-sm transition ${on ? 'border-primary bg-primary-soft text-text' : 'border-border text-muted hover:text-text'}`}>
      {children}
    </button>
  )
}

/** Một hàng cài đặt: nhãn bên trái, nút bên phải (xuống dòng trên điện thoại). */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="w-24 shrink-0 text-sm text-muted">{label}</span>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

/** Nút Nghe / Nghe chậm. */
export function ListenButtons({ onPlay, disabled }: { onPlay: (rate: number) => void; disabled?: boolean }) {
  const t = useT(S)
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={disabled} onClick={() => onPlay(1)}>🔊 {t('listen')}</Button>
      <Button type="button" variant="soft" disabled={disabled} onClick={() => onPlay(0.7)}>🐢 {t('slow')}</Button>
    </div>
  )
}

/** "Đã làm 40 câu · đúng 75%" của một phần. */
export function StatLine({ kind }: { kind: DrillKind }) {
  const t = useT(S)
  const s = useListeningStats((x) => x[kind])
  return <span className="text-xs text-muted">{s.total ? t('stat', { n: s.total, p: Math.round((100 * s.right) / s.total) }) : t('statNone')}</span>
}

export function ResetStats() {
  const t = useT(S)
  const [sure, setSure] = useState(false)
  return (
    <Button type="button" variant="ghost" className="min-h-9 text-sm" onClick={() => { if (sure) { resetStats(); setSure(false) } else setSure(true) }} onBlur={() => setSure(false)}>
      {sure ? t('resetConfirm') : t('reset')}
    </Button>
  )
}

/** Mẹo cách đọc (mở/đóng). */
export function Tips({ text }: { text: string }) {
  const t = useT(S)
  return (
    <details className="rounded-xl bg-surface-2 p-3 text-sm">
      <summary className="cursor-pointer font-medium">💡 {t('tips')}</summary>
      <p className="jp mt-2 leading-relaxed text-muted">{text}</p>
    </details>
  )
}

/** Ctrl+Space = nghe lại (dùng được cả khi đang gõ trong ô trả lời). */
export const isReplayKey = (e: KeyboardEvent | ReactKeyboardEvent) => e.ctrlKey && (e.code === 'Space' || e.key === ' ')
