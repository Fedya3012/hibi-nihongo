/**
 * TRUYỆN ĐỌC THEO CẤP ĐỘ — trang chính (/immersion/stories)
 *   /immersion/stories             → danh sách truyện, lọc theo cấp (?level=5)
 *   /immersion/stories?s=<id>      → đọc một truyện
 * Hướng dẫn: README.md
 */
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useDbQuery } from '@/core/db'
import { useT } from '@/core/i18n'
import { LEVELS, STORIES, readMinutes, storyLines } from './data'
import { getProgress } from './store'
import { S } from './strings'
import { StoryView } from './StoryView'

export default function StoriesPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('s')
  if (id) {
    return <StoryView key={id} id={id} onClose={() => setParams({})} openStory={(next) => setParams({ s: next })} />
  }
  return <Library level={params.get('level') ?? 'all'} setLevel={(l) => setParams(l === 'all' ? {} : { level: l })}
    openStory={(s) => setParams({ s })} />
}

function Library({ level, setLevel, openStory }: { level: string; setLevel: (l: string) => void; openStory: (id: string) => void }) {
  const t = useT(S)
  const { data: prog } = useDbQuery(getProgress, [], ['kv'])
  const list = level === 'all' ? STORIES : STORIES.filter((s) => `${s.level}` === level)
  const doneCount = STORIES.filter((s) => prog?.[s.id]?.finishedAt).length

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted">{t('hint')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label={t('level')} value={level} onChange={setLevel}
          options={[{ value: 'all', label: t('all') }, ...LEVELS.map((l) => ({ value: `${l}`, label: `N${l}` }))]} />
        <span className="text-sm text-muted">{t('countDone', { d: doneCount, n: STORIES.length })}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const p = prog?.[s.id]
          return (
            <Card key={s.id} className="flex flex-col gap-2 p-4">
              <button className="text-left outline-none focus-visible:underline" onClick={() => openStory(s.id)}>
                <div className="flex items-start gap-2">
                  <span className="rounded bg-primary-soft px-1.5 text-xs font-semibold leading-5">N{s.level}</span>
                  <div className="min-w-0">
                    <p className="jp text-lg font-semibold leading-snug">{s.title}</p>
                    <p className="text-sm text-muted">{s.titleVi}</p>
                  </div>
                </div>
              </button>
              <p className="text-sm">{s.blurb}</p>
              <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                <span>{t('sentences', { n: storyLines(s).length })}</span>
                <span>{t('minutes', { n: readMinutes(s) })}</span>
                {p?.finishedAt && <span className="text-good">✓ {t('done')}</span>}
                {p?.total ? <span>{t('score', { s: p.score ?? 0, t: p.total })}</span> : null}
              </p>
              <div className="mt-auto flex justify-end pt-1">
                <Button variant={p?.finishedAt ? 'ghost' : 'soft'} className="min-h-9 text-sm" onClick={() => openStory(s.id)}>
                  {p?.finishedAt ? t('reread') : p?.openedAt ? t('continue') : t('read')}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
