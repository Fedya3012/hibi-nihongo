/** Mục chưa làm xong: nói rõ sẽ có gì và ở bước nào của kế hoạch. */
import { Card } from '@/design/components/Card'
import { useTx } from '../ui'

export function SoonSection({ step, text }: { step: number; text: string }) {
  const t = useTx()
  return (
    <Card className="text-center">
      <p className="mb-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-sm">{t('soonTitle', { n: step })}</p>
      <p className="mx-auto max-w-xl text-muted">{text}</p>
    </Card>
  )
}
