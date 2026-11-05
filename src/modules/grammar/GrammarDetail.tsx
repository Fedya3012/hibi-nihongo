/** TRANG MỘT MẪU NGỮ PHÁP: cách ghép, giải thích, lưu ý, ví dụ (tra từ được), liên quan, giáo trình. */
import { useEffect, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useLang, useT } from '@/core/i18n'
import type { GrammarPoint } from './types'
import { addGrammarCards, setLearned, type GrammarState } from './lib/progress'
import { ExampleRow } from './components/Example'
import { BOOK_NAME, CAT_LABEL, S } from './strings'

export function GrammarDetail({ point: p, byId, state, onOpen, onPractice, prev, next }: {
  point: GrammarPoint; byId: Map<string, GrammarPoint>; state: GrammarState | undefined
  onOpen: (id: string) => void; onPractice: () => void; prev?: string; next?: string
}) {
  const t = useT(S)
  const lang = useLang()
  const [msg, setMsg] = useState('')
  const learned = !!state?.progress[p.id]?.learned
  const srs = !!state?.inReview.has(p.id)
  const stat = state?.progress[p.id]
  const related = (p.related ?? []).flatMap((id) => byId.get(id) ?? [])

  // Phím ← → chuyển mẫu (trừ khi đang gõ chữ)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[contenteditable]')) return
      if (e.key === 'ArrowLeft' && prev) onOpen(prev)
      if (e.key === 'ArrowRight' && next) onOpen(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onOpen])

  return (
    <article className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">N{p.level} · {CAT_LABEL[p.cat][lang]}</p>
            <h2 className="jp mt-1 text-3xl font-bold md:text-4xl">{p.pattern}</h2>
            <p className="mt-2 text-lg">{p.meaning}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={learned ? 'soft' : 'primary'} onClick={() => setLearned(p.id, !learned)} aria-pressed={learned}>
              {learned ? t('learned') : t('markLearned')}
            </Button>
            <Button variant="soft" disabled={srs}
              onClick={async () => { const n = await addGrammarCards([p]); setMsg(n ? t('added', { n }) : t('nothingToAdd')) }}>
              {srs ? t('inReview') : t('addReview')}
            </Button>
            <Button variant="ghost" onClick={onPractice}>{t('practiceThis')}</Button>
          </div>
        </div>
        {msg && <p className="mt-2 text-sm text-muted" role="status">{msg}</p>}
        {stat && (stat.right || stat.wrong) ? (
          <p className="mt-2 text-xs text-muted">✓ {stat.right ?? 0} · ✗ {stat.wrong ?? 0}</p>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">{t('form')}</h3>
        <ul className="grid gap-1.5">
          {p.form.map((f, i) => <li key={i} className="jp rounded-lg bg-surface-2 px-3 py-2">{f}</li>)}
        </ul>
        <h3 className="mb-2 mt-5 font-semibold">{t('explain')}</h3>
        <div className="grid gap-2 leading-relaxed">
          {p.explain.split('\n\n').map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
        </div>
        {p.notes?.length ? (
          <>
            <h3 className="mb-2 mt-5 font-semibold">{t('notes')}</h3>
            <ul className="grid list-disc gap-1 pl-5">{p.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{t('examples')}</h3>
          <p className="text-xs text-muted">{t('lookupHint')}</p>
        </div>
        <ul>{p.examples.map((e, i) => <ExampleRow key={i} src={e[0]} vi={e[1]} listenLabel={t('listen')} />)}</ul>
      </Card>

      {(related.length > 0 || p.lessons) && (
        <Card className="grid gap-4">
          {related.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">{t('related')}</h3>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onOpen(r.id)} title={r.meaning}
                    className="rounded-xl border border-border px-3 py-1.5 text-sm transition hover:border-primary">
                    <span className="jp font-medium">{r.pattern}</span>
                    {r.level !== p.level && <span className="ml-1.5 text-xs text-muted">N{r.level}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {p.lessons && (
            <div>
              <h3 className="mb-2 font-semibold">{t('textbooks')}</h3>
              <p className="text-sm text-muted">
                {Object.entries(p.lessons).map(([b, n]) => t('lesson', { book: BOOK_NAME[b] ?? b, n })).join(' · ')}
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" disabled={!prev} onClick={() => prev && onOpen(prev)}>{t('prev')}</Button>
        <Button variant="ghost" disabled={!next} onClick={() => next && onOpen(next)}>{t('next')}</Button>
      </div>
    </article>
  )
}
