/**
 * Cổng mục Học: các module học, chia theo nhóm cho dễ chọn.
 * Module mới tự hiện ở nhóm "Khác" (nếu chưa được xếp nhóm bên dưới), module chưa làm hiện ở "Sắp có".
 */
import { Link } from 'react-router-dom'
import { learnModules, type AppModule } from '@/modules/registry'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { APP } from '@/app/strings'

type Key = 'groupCourse' | 'groupBasics' | 'groupTools'
const GROUPS: { key: Key; hint: `${Key}Hint`; ids: string[] }[] = [
  { key: 'groupCourse', hint: 'groupCourseHint', ids: ['textbook', 'grammar'] },
  { key: 'groupBasics', hint: 'groupBasicsHint', ids: ['kana', 'kanji'] },
  { key: 'groupTools', hint: 'groupToolsHint', ids: ['dictionary'] },
]

function ModuleCard({ m }: { m: AppModule }) {
  const mt = useModuleText()
  const t = useT(APP)
  return (
    <Link to={m.path} className="group block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
      <Card className="flex h-full items-start gap-4 transition group-hover:border-primary">
        <span aria-hidden className="jp grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-2xl text-primary">{m.icon}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-semibold">{mt(m).title}</span>
            {m.status === 'building' && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t('building')}</span>}
          </span>
          <span className="mt-1 block text-sm text-muted">{mt(m).description}</span>
        </span>
      </Card>
    </Link>
  )
}

export default function LearnPage() {
  const t = useT(APP)
  const mt = useModuleText()
  const usable = learnModules.filter((m) => m.status !== 'planned')
  const planned = learnModules.filter((m) => m.status === 'planned')
  const grouped = new Set(GROUPS.flatMap((g) => g.ids))
  const groups = [
    ...GROUPS.map((g) => ({ title: t(g.key), hint: t(g.hint), items: g.ids.map((id) => usable.find((m) => m.id === id)).filter((m): m is AppModule => !!m) })),
    { title: '', hint: '', items: usable.filter((m) => !grouped.has(m.id)) },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t('learnTitle')}</h1>
        <p className="text-sm text-muted">{t('learnHint')}</p>
      </div>

      {groups.map((g, i) => (
        <section key={i} aria-labelledby={g.title ? `learn-g${i}` : undefined}>
          {g.title && (
            <div className="mb-3">
              <h2 id={`learn-g${i}`} className="font-semibold">{g.title}</h2>
              <p className="text-sm text-muted">{g.hint}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((m) => <ModuleCard key={m.id} m={m} />)}
          </div>
        </section>
      ))}

      {planned.length > 0 && (
        <section aria-labelledby="learn-soon">
          <h2 id="learn-soon" className="mb-3 font-semibold text-muted">{t('soon')}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {planned.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
                <span aria-hidden className="jp text-lg">{m.icon}</span>
                <span><span className="font-medium text-text">{mt(m).title}</span> · {t('plannedPhase', { n: m.phase })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
