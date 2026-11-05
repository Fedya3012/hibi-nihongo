/** Trang tạm cho module chưa làm: hiện tên, mô tả và giai đoạn dự kiến. */
import { useLocation } from 'react-router-dom'
import { modules } from '@/modules/registry'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { APP } from '@/app/strings'

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const m = modules.find((x) => x.path === pathname)
  const t = useT(APP)
  const tx = useModuleText()(m ?? { id: '', title: t('building'), description: '' })
  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="jp mb-2 text-5xl text-primary">{m?.icon ?? '工'}</div>
      <h1 className="text-xl font-semibold">{tx.title}</h1>
      <p className="mt-2 text-muted">{tx.description}</p>
      <p className="mt-4 inline-block rounded-full bg-primary-soft px-3 py-1 text-sm">
        {t('plannedPhase', { n: m?.phase ?? '?' })}
      </p>
    </Card>
  )
}
