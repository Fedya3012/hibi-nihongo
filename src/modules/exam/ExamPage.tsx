/**
 * TRANG THI THỬ JLPT: chọn cấp + loại đề, làm tiếp bài dở, lịch sử thi.
 * Ba màn hình: 'home' (trang này), 'run' (đang thi, Runner.tsx), 'result' (kết quả, Result.tsx).
 */
import { useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { PackSetup, useDictPacks } from '@/modules/dictionary'
import { useKanjiPacks } from '@/modules/kanji/lib/data'
import { KanjiSetup } from '@/modules/kanji/components/KanjiSetup'
import { FORMATS, LEVELS, sectionsFor } from './data/format'
import { buildExam } from './lib/build'
import { loadPool } from './lib/pool'
import { scoreSession } from './lib/score'
import { addResult, clearCurrent, removeResult, saveCurrent, useCurrent, useHistory } from './lib/store'
import { PART_VI, S } from './strings'
import type { ExamMode, ExamResult, ExamSession, Level } from './types'
import { Runner } from './Runner'
import { ResultView } from './Result'

export default function ExamPage() {
  const t = useT(S)
  const [view, setView] = useState<{ kind: 'home' } | { kind: 'run'; session: ExamSession } | { kind: 'result'; result: ExamResult }>({ kind: 'home' })

  if (view.kind === 'run') {
    return (
      <Runner
        initial={view.session}
        onQuit={() => setView({ kind: 'home' })}
        onFinish={async (s) => {
          const r = { ...scoreSession(s), session: s }
          await addResult(r)
          await clearCurrent()
          setView({ kind: 'result', result: r })
        }}
      />
    )
  }
  if (view.kind === 'result') {
    return <ResultView result={view.result} onBack={() => setView({ kind: 'home' })} />
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t('intro')}</p>
      </div>
      <Home onRun={(session) => setView({ kind: 'run', session })} onView={(result) => setView({ kind: 'result', result })} />
    </div>
  )
}

function Home({ onRun, onView }: { onRun: (s: ExamSession) => void; onView: (r: ExamResult) => void }) {
  const t = useT(S)
  const tp = useT(PART_VI)
  const dict = useDictPacks()
  const kanji = useKanjiPacks()
  const { data: current } = useCurrent()
  const history = useHistory()
  const [level, setLevel] = useState<Level>(5)
  const [mode, setMode] = useState<ExamMode>('full')
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const ready = dict.ready && kanji.ready
  const sections = sectionsFor(level, mode === 'mini')
  const f = FORMATS[level]

  async function start() {
    setError('')
    setBusy(0)
    try {
      const pool = await loadPool(level, (n) => setBusy(n))
      const session = buildExam(pool, mode)
      if (!session.sections.length) { setError(t('noContent')); return }
      await saveCurrent(session)
      onRun(session)
    } catch (e) {
      setError(e instanceof Error && e.message === 'kanji-pack' ? t('needPacks') : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {current && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary">
          <p>{t('resume', { lv: `N${current.level}`, mode: current.mode === 'full' ? t('modeFull') : t('modeMini') })}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onRun(current)}>{t('resumeBtn')}</Button>
            <Button variant="ghost" onClick={async () => {
              if (!confirmDiscard) { setConfirmDiscard(true); return }
              await clearCurrent(); setConfirmDiscard(false)
            }}>{confirmDiscard ? t('discardConfirm') : t('discard')}</Button>
          </div>
        </Card>
      )}

      {!dict.loading && !kanji.loading && !ready && (
        <div className="grid gap-3">
          <p className="text-sm text-muted">{t('needPacks')}</p>
          {!dict.ready && <PackSetup />}
          <KanjiSetup />
        </div>
      )}

      <Card className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <span className="text-sm font-medium">{t('pickLevel')}</span>
            <Segmented label={t('pickLevel')} value={String(level)} onChange={(v) => setLevel(Number(v) as Level)}
              options={LEVELS.map((l) => ({ value: String(l), label: `N${l}` }))} />
          </div>
          <div className="grid gap-1">
            <span className="text-sm font-medium">{t('pickMode')}</span>
            <Segmented label={t('pickMode')} value={mode} onChange={setMode}
              options={[{ value: 'full', label: t('modeFull') }, { value: 'mini', label: t('modeMini') }]} />
          </div>
        </div>
        <p className="text-sm text-muted">{mode === 'full' ? t('modeFullHint') : t('modeMiniHint')}</p>

        <div>
          <h2 className="mb-2 font-semibold">{t('structure')}</h2>
          <ol className="grid gap-2">
            {sections.map((s, i) => (
              <li key={s.id} className="rounded-xl bg-surface-2 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span><span className="text-muted">{i + 1}. </span><span lang="ja" className="jp font-medium">{s.title}</span></span>
                  <span className="text-sm text-muted">{t('minutes', { n: s.minutes })} · {t('questions', { n: s.parts.reduce((a, p) => a + p.n, 0) })}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{s.parts.map((p) => `${tp(p.part)} (${p.n})`).join(' · ')}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted">
            {t('totalTime', { n: sections.reduce((a, s) => a + s.minutes, 0) })} · {t('passRule', { pass: f.pass, max: f.groups.reduce((a, g) => a + g.max, 0) })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={!ready || busy !== null}>{busy !== null ? t('preparing', { n: busy }) : t('start')}</Button>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </div>
        <p className="text-xs text-muted">{t('credit')}</p>
      </Card>

      <section aria-labelledby="exam-history">
        <h2 id="exam-history" className="mb-3 font-semibold">{t('history')}</h2>
        {!history?.length ? <p className="text-sm text-muted">{t('noHistory')}</p> : (
          <ul className="grid gap-2">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2">
                <span className="w-10 font-semibold">N{r.level}</span>
                <span className="text-sm text-muted">{new Date(r.at).toLocaleString()} · {r.mode === 'full' ? t('modeFull') : t('modeMini')}</span>
                <span className="ml-auto font-semibold tabular-nums">{r.total}/{r.max}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.passed ? 'bg-good/15 text-good' : 'bg-bad/10 text-bad'}`}>{r.passed ? t('pass') : t('fail')}</span>
                <Button variant="soft" className="min-h-9" onClick={() => onView(r)}>{t('view')}</Button>
                <Button variant="ghost" className="min-h-9" onClick={() => removeResult(r.id)}>{t('remove')}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
