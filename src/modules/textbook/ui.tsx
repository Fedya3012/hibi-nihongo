/** Mảnh giao diện nhỏ dùng chung trong module Giáo trình. */
import { useT, type TFunction } from '@/core/i18n'
import { S } from './strings'
import type { LessonStatus, WordClass } from './types'

export type Key = keyof typeof S.vi
export const useTx = () => useT(S)

export const inputCls = 'min-h-10 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary'

export const WORD_CLASSES: WordClass[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'particle', 'expression', 'other']
export const classLabel = (t: TFunction<Key>, c?: WordClass) => t((c ? `cls_${c}` : 'cls_none') as Key)

export function statusLabel(t: TFunction<Key>, s: LessonStatus) {
  return t(s === 'done' ? 'statusDone' : s === 'learning' ? 'statusLearning' : 'statusNew')
}

/** Thanh tiến độ mỏng. value: 0–1. */
export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar"
      aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Nhãn nhỏ bo tròn. tone: màu nền theo ý nghĩa. */
export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'primary' | 'good' | 'warn' }) {
  const cls = {
    muted: 'bg-surface-2 text-muted',
    primary: 'bg-primary-soft text-text',
    good: 'bg-good/15 text-good',
    warn: 'bg-warn/15 text-warn',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}
