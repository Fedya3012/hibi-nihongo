/**
 * KẾT QUẢ: tổng điểm theo thang JLPT, đỗ/chưa đỗ, điểm từng phần so với điểm liệt, tỉ lệ đúng theo dạng câu,
 * xem lại từng câu (có giải thích), thêm từ / mẫu ngữ pháp làm sai vào Ôn tập.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { addWordToReview, getWord } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { addGrammarCards, getGrammarPoints, grammarPath } from '@/modules/grammar/api'
import { PART_VI, S } from './strings'
import type { ExamQuestion, ExamResult, PartId } from './types'
import { Passage, Stem, Transcript } from './Runner'

export function ResultView({ result: r, onBack }: { result: ExamResult; onBack: () => void }) {
  const t = useT(S)
  const tp = useT(PART_VI)
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong')
  const [msg, setMsg] = useState('')
  const sumOk = r.total >= r.passMark

  // Mọi câu kèm đáp án đã chọn
  const items = useMemo(() => (r.session?.sections ?? []).flatMap((sec, i) =>
    sec.questions.map((q, j) => ({ q, chosen: r.session!.answers[i][j], ok: r.session!.answers[i][j] === q.answer }))), [r])
  const wrong = items.filter((x) => !x.ok)
  const wrongWords = [...new Map(wrong.flatMap((x) => (x.q.ref?.kind === 'word' ? [[x.q.ref.id, x.q.ref] as const] : []))).values()]
  const wrongGrammar = [...new Set(wrong.flatMap((x) => (x.q.ref?.kind === 'grammar' ? [x.q.ref.id] : [])))]

  async function addWords() {
    let n = 0
    for (const w of wrongWords) {
      const d = await getWord(w.id).catch(() => undefined)
      if (d && (await addWordToReview(w.id, d).catch(() => false))) n++
    }
    setMsg(t('added', { n }))
  }
  async function addGrammar() {
    const n = await addGrammarCards(await getGrammarPoints(wrongGrammar)).catch(() => 0)
    setMsg(t('added', { n }))
  }

  const parts = (Object.keys(r.parts) as PartId[])
  const shown = filter === 'wrong' ? wrong : items

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Card className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{t('resultTitle', { lv: `N${r.level}` })}</h1>
            <p className="text-sm text-muted">{new Date(r.at).toLocaleString()} · {r.mode === 'full' ? t('modeFull') : t('modeMini')}</p>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-lg font-bold ${r.passed ? 'bg-good/15 text-good' : 'bg-bad/10 text-bad'}`}>
            {r.passed ? t('passed') : t('failed')}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-sm text-muted">{t('total')}</p>
            <p className="text-5xl font-bold tabular-nums">{r.total}<span className="text-2xl text-muted">/{r.max}</span></p>
          </div>
          <p className="pb-2 text-sm text-muted">{t('passMark', { n: r.passMark })} · {t('timeUsed', { used: Math.ceil(r.used / 60), allowed: Math.round(r.allowed / 60) })}</p>
        </div>
        {!r.passed && sumOk && <p className="text-sm text-bad">{t('failedBySection')}</p>}

        <ul className="grid gap-3">
          {r.groups.map((g) => {
            const under = g.total > 0 && g.score < g.min
            return (
              <li key={g.id} className="grid gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{tp(g.id)}</span>
                  <span className="tabular-nums"><span className={`font-semibold ${under ? 'text-bad' : ''}`}>{g.score}</span>/{g.max} · <span className="text-muted">{t('minMark', { n: g.min })}</span></span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className={`h-full ${under ? 'bg-bad' : 'bg-primary'}`} style={{ width: `${(g.score / g.max) * 100}%` }} />
                  <div className="absolute inset-y-0 w-0.5 bg-text/60" style={{ left: `${(g.min / g.max) * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted">{t('scoreNote')}</p>
      </Card>

      <Card className="grid gap-3">
        <h2 className="font-semibold">{t('byPart')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {parts.map((p) => {
            const x = r.parts[p]!
            const pct = x.total ? x.right / x.total : 0
            return (
              <li key={p} className="grid gap-1 rounded-xl bg-surface-2 p-3 text-sm">
                <div className="flex justify-between gap-2"><span>{tp(p)}</span><span className="tabular-nums text-muted">{t('rightOf', { r: x.right, t: x.total })}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                  <div className={`h-full ${pct >= 0.6 ? 'bg-good' : 'bg-bad'}`} style={{ width: `${pct * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        {r.session?.short && Object.keys(r.session.short).length > 0 && (
          <p className="text-xs text-muted">{t('shortNote', { parts: (Object.keys(r.session.short) as PartId[]).map((p) => `${tp(p)} (−${r.session!.short![p]})`).join(', ') })}</p>
        )}
      </Card>

      {r.session ? (
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t('reviewTitle')}</h2>
            <Segmented label={t('reviewTitle')} value={filter} onChange={setFilter}
              options={[{ value: 'wrong', label: `${t('showWrong')} (${wrong.length})` }, { value: 'all', label: t('showAll') }]} />
          </div>
          {(wrongWords.length > 0 || wrongGrammar.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {wrongWords.length > 0 && <Button variant="soft" onClick={addWords}>{t('addWords', { n: wrongWords.length })}</Button>}
              {wrongGrammar.length > 0 && <Button variant="soft" onClick={addGrammar}>{t('addGrammar', { n: wrongGrammar.length })}</Button>}
              {msg && <span role="status" className="text-sm text-good">{msg}</span>}
            </div>
          )}
          <ol className="grid gap-3">
            {shown.map(({ q, chosen, ok }) => <ReviewItem key={q.id} q={q} chosen={chosen} ok={ok} />)}
          </ol>
        </Card>
      ) : <p className="text-sm text-muted">{t('noDetail')}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onBack}>{t('back')}</Button>
      </div>
    </div>
  )
}

function ReviewItem({ q, chosen, ok }: { q: ExamQuestion; chosen: number | null; ok: boolean }) {
  const t = useT(S)
  const tp = useT(PART_VI)
  const jp = q.optionsJp ? 'jp text-base' : ''
  return (
    <li className={`grid gap-2 rounded-xl border p-3 text-sm ${ok ? 'border-good/50' : 'border-bad/50'}`}>
      <p className="text-xs text-muted">{ok ? '✓' : '✗'} {tp(q.part)}</p>
      {q.passage && (
        <details>
          <summary className="cursor-pointer text-muted">{t('showPassage')}</summary>
          <div className="mt-2"><Passage text={q.passage} /></div>
        </details>
      )}
      {q.audio && <p lang="ja" className="jp text-base">🔊 {q.audio}</p>}
      {q.dialogue && (
        <details>
          <summary className="cursor-pointer text-muted">🔊 {t('showTranscript')}</summary>
          <div className="mt-2 rounded-xl bg-surface-2 p-3"><Transcript q={q} /></div>
        </details>
      )}
      {q.stem && <Stem q={q} className="!text-left !text-lg" />}
      <p className={ok ? 'text-good' : 'text-bad'}>{t('yourAnswer')}: <span lang={q.optionsJp ? 'ja' : undefined} className={jp}>{chosen === null ? t('noAnswer') : q.options[chosen]}</span></p>
      {!ok && <p className="text-good">{t('correct')}: <span lang={q.optionsJp ? 'ja' : undefined} className={jp}>{q.options[q.answer]}</span></p>}
      {q.explain && <p className="whitespace-pre-line text-muted">{q.explain}</p>}
      <div className="flex flex-wrap gap-2">
        {q.ref?.kind === 'word' && (
          <Button variant="ghost" className="min-h-9" onClick={(e) => openLookup(q.ref!.kind === 'word' ? q.ref!.word : '', { x: e.clientX, y: e.clientY })}>{t('lookUp')}: <span lang="ja" className="jp">{q.ref.word}</span></Button>
        )}
        {q.ref?.kind === 'grammar' && (
          <Link to={grammarPath(q.ref.id)} className="inline-flex min-h-9 items-center rounded-xl px-3 text-primary hover:bg-surface-2">{t('openGrammar')}</Link>
        )}
      </div>
    </li>
  )
}
