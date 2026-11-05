/**
 * Cổng mục Immersion: liệt kê các module con có đường dẫn bắt đầu bằng /immersion/
 * (Đọc manga, và Xem anime khi module đó được thêm vào registry).
 */
import { Link } from 'react-router-dom'
import { modules } from '@/modules/registry'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { APP } from '@/app/strings'

export default function ImmersionPage() {
  const t = useT(APP)
  const mt = useModuleText()
  const self = modules.find((m) => m.id === 'immersion')
  const subs = modules.filter((m) => m.path.startsWith('/immersion/'))
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">{self ? mt(self).title : 'Immersion'}</h1>
        <p className="text-sm text-muted">{t('immersionHint')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subs.map((m) => (
          <Link key={m.id} to={m.path} className="group">
            <Card className="h-full transition group-hover:border-primary">
              <div className="jp text-3xl text-primary">{m.icon}</div>
              <h2 className="mt-2 font-semibold">{mt(m).title}</h2>
              <p className="mt-1 text-sm text-muted">{mt(m).description}</p>
              {m.status !== 'ready' && <p className="mt-2 text-xs text-muted">{t('building')}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
