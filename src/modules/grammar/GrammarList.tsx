/** DANH SÁCH MẪU NGỮ PHÁP theo cấp JLPT, lọc theo nhóm và theo chữ. */
import { useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useLang, useT } from '@/core/i18n'
import { normalize } from '@/modules/search/normalize'
import type { GrammarCat, GrammarPoint, JlptLevel } from './types'
import { CAT_ORDER, LEVELS } from './lib/content'
import { addGrammarCards, type GrammarState } from './lib/progress'
import { plainText } from './lib/parse'
import { CAT_LABEL, S } from './strings'

const BATCH = 5

export function GrammarList({ points, level, onLevel, onOpen, state }: {
  points: GrammarPoint[]; level: JlptLevel; onLevel: (l: JlptLevel) => void
  onOpen: (id: string) => void; state: GrammarState | undefined
}) {
  const t = useT(S)
  const lang = useLang()
  const [cat, setCat] = useState<GrammarCat | 'all'>('all')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  const inLevel = useMemo(() => points.filter((p) => p.level === level), [points, level])
  const cats = CAT_ORDER.filter((c) => inLevel.some((p) => p.cat === c))
  const shown = useMemo(() => {
    const nq = normalize(q.trim())
    return inLevel.filter((p) => (cat === 'all' || p.cat === cat) && (!nq || normalize(
      [p.pattern, p.meaning, ...p.examples.flatMap((e) => [plainText(e[0]), e[1]])].join(' '),
    ).includes(nq)))
  }, [inLevel, cat, q])

  const learned = inLevel.filter((p) => state?.progress[p.id]?.learned || state?.inReview.has(p.id)).length
  const inReview = inLevel.filter((p) => state?.inReview.has(p.id)).length
  const nextBatch = inLevel.filter((p) => !state?.inReview.has(p.id)).slice(0, BATCH)

  const addNext = async () => {
    const n = await addGrammarCards(nextBatch)
    setMsg(n ? t('added', { n }) : t('nothingToAdd'))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<string> label={t('pLevel')} value={String(level)}
          onChange={(v) => { const l = Number(v) as JlptLevel; if (LEVELS.find((x) => x.level === l)?.ready) onLevel(l) }}
          options={LEVELS.map((l) => ({ value: String(l.level), label: l.ready ? `N${l.level}` : `N${l.level} · ${t('soon')}` }))} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3" />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <div className="min-w-48 flex-1">
          <p className="text-sm font-medium">{t('learnedOf', { n: learned, total: inLevel.length })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${inLevel.length ? (learned / inLevel.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{t('inReviewN', { n: inReview })}</p>
        </div>
        {nextBatch.length > 0 && <Button variant="soft" onClick={addNext}>{t('addNext', { n: nextBatch.length })}</Button>}
        {msg && <p className="w-full text-sm text-muted" role="status">{msg}</p>}
      </Card>

      <div className="mb-3 flex flex-wrap gap-2">
        {(['all', ...cats] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`min-h-9 rounded-full border px-3 text-sm transition ${cat === c ? 'border-primary bg-primary-soft text-text' : 'border-border text-muted hover:text-text'}`}>
            {c === 'all' ? t('allCats') : CAT_LABEL[c][lang]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className="py-8 text-center text-muted">{t('empty')}</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shown.map((p) => {
            const st = state?.progress[p.id]
            const srs = state?.inReview.has(p.id)
            return (
              <li key={p.id}>
                <button onClick={() => onOpen(p.id)}
                  className="flex h-full w-full items-start gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card transition hover:border-primary">
                  <span className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full text-xs ${st?.learned || srs ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted'}`} aria-hidden>
                    {st?.learned || srs ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="jp block text-lg font-semibold">{p.pattern}</span>
                    <span className="block text-sm text-muted">{p.meaning}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
                      <span className="rounded bg-surface-2 px-1.5">{CAT_LABEL[p.cat][lang]}</span>
                      {p.lessons?.minna && <span className="rounded bg-surface-2 px-1.5">Minna {p.lessons.minna}</span>}
                      {p.lessons?.genki && <span className="rounded bg-surface-2 px-1.5">Genki {p.lessons.genki}</span>}
                      {srs && <span className="text-primary">●</span>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
