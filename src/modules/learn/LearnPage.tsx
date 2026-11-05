/** Cổng mục Học: liệt kê các module học từ registry. */
import { Link } from 'react-router-dom'
import { learnModules } from '@/modules/registry'
import { Card } from '@/design/components/Card'
import { useModuleText } from '@/core/i18n/modules'

export default function LearnPage() {
  const mt = useModuleText()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {learnModules.map((m) => (
        <Link key={m.id} to={m.path} className="group">
          <Card className="h-full transition group-hover:border-primary">
            <div className="jp text-3xl text-primary">{m.icon}</div>
            <h2 className="mt-2 font-semibold">{mt(m).title}</h2>
            <p className="mt-1 text-sm text-muted">{mt(m).description}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
