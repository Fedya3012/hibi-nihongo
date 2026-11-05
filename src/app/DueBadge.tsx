/** Huy hiệu số thẻ đến hạn trên mục Ôn tập (thanh bên và thanh dưới). */
import { useReviewOverview } from '@/modules/review/api'
import { useT } from '@/core/i18n'
import { APP } from './strings'

export function useDueCount(): number {
  return useReviewOverview()?.dueNow ?? 0
}

export function DueBadge({ n, compact }: { n: number; compact?: boolean }) {
  const t = useT(APP)
  if (n <= 0) return null
  const label = n > 99 ? '99+' : String(n)
  return (
    <span
      className={`inline-grid min-w-5 place-items-center rounded-full bg-primary px-1.5 font-semibold leading-none text-on-primary tabular-nums ${
        compact ? 'h-4 text-[0.65rem]' : 'h-5 text-xs'
      }`}
    >
      <span aria-hidden>{label}</span>
      <span className="sr-only">{t('due', { n })}</span>
    </span>
  )
}
