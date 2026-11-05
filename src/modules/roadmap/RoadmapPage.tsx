/**
 * TRANG LỘ TRÌNH (module roadmap) — đường dẫn /learn/roadmap
 *  - Lần đầu: làm quen (chọn giáo trình, mục tiêu, điểm bắt đầu hoặc làm bài xếp lớp).
 *  - Sau đó: chặng đang học, "việc nên làm tiếp", các chặng Kana → N5 → … → mục tiêu, tùy chỉnh.
 *  - Bài xếp lớp: /learn/roadmap?tab=test
 * Tiến độ đọc từ các module khác (xem lib/progress.ts), lộ trình chỉ lưu lựa chọn của bạn.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useDbQuery } from '@/core/db'
import { useLang, useT } from '@/core/i18n'
import { LEVEL_LABEL } from './data/levels'
import { buildPlan, currentLevel, loadRaw, nextStep } from './lib/progress'
import { levelIndex, patchRoadmapState, resetRoadmap, saveRoadmapState, useRoadmapState } from './lib/state'
import { Placement } from './Placement'
import { S, type Tr } from './strings'
import { LEVELS, type LevelId, type LevelPlan, type PlacementResult, type RoadmapState, type Series, type Step } from './types'

const ICON: Record<Step['kind'], string> = { kana: 'あ', kanji: '字', grammar: '文', vocab: '語', textbook: '本', immersion: '漫' }

const levelName = (t: Tr, l: LevelId) => (l === 'kana' ? t('levelKana') : t('levelTitle', { lv: LEVEL_LABEL[l] }))
const pct = (r: number) => Math.round(r * 100)

function Bar({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(ratio)}
      className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${ratio >= 1 ? 'bg-good' : 'bg-primary'}`} style={{ width: `${pct(ratio)}%` }} />
    </div>
  )
}

function SeriesPicker({ value, onChange }: { value: Series; onChange: (s: Series) => void }) {
  const t = useT(S)
  return (
    <Segmented<Series> label={t('series')} value={value} onChange={onChange}
      options={[{ value: 'minna', label: t('seriesMinna') }, { value: 'genki', label: t('seriesGenki') }, { value: 'none', label: t('seriesNone') }]} />
  )
}

function LevelPicker({ value, onChange, label, from = 'kana' }: { value: LevelId; onChange: (l: LevelId) => void; label: string; from?: LevelId }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <Segmented<LevelId> label={label} value={value} onChange={onChange}
        options={LEVELS.slice(levelIndex(from)).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
    </div>
  )
}

// ---------------------------------------------------------------- Làm quen

interface Draft { series: Series; goal: LevelId }

function Onboarding({ draft, setDraft, onTest }: { draft: Draft; setDraft: (d: Draft) => void; onTest: () => void }) {
  const t = useT(S)
  const [pick, setPick] = useState<LevelId>('n5')
  const begin = (start: LevelId) => saveRoadmapState({
    start, goal: levelIndex(draft.goal) < levelIndex(start) ? start : draft.goal, series: draft.series, createdAt: Date.now(),
  })

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome')}</h1>
        <p className="mt-1 text-sm text-muted">{t('welcomeHint')}</p>
      </div>
      <Card className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="font-semibold">{t('qSeries')}</h2>
          <SeriesPicker value={draft.series} onChange={(series) => setDraft({ ...draft, series })} />
        </div>
        <div className="grid gap-2">
          <h2 className="font-semibold">{t('qGoal')}</h2>
          <LevelPicker label={t('qGoal')} from="n5" value={draft.goal} onChange={(goal) => setDraft({ ...draft, goal })} />
        </div>
      </Card>
      <section className="grid gap-3">
        <h2 className="font-semibold">{t('qStart')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="grid content-between gap-3">
            <div><div className="font-semibold">{t('startZero')}</div><p className="text-sm text-muted">{t('startZeroHint')}</p></div>
            <Button variant="soft" onClick={() => begin('kana')}>{t('begin', { lv: 'Kana' })}</Button>
          </Card>
          <Card className="grid content-between gap-3 border-primary">
            <div><div className="font-semibold">{t('startTest')}</div><p className="text-sm text-muted">{t('startTestHint')}</p></div>
            <Button onClick={onTest}>{t('testStart')}</Button>
          </Card>
        </div>
        <Card className="grid gap-3">
          <div><div className="font-semibold">{t('startPick')}</div><p className="text-sm text-muted">{t('startPickHint')}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <LevelPicker label={t('startPick')} value={pick} onChange={setPick} />
            <Button variant="soft" onClick={() => begin(pick)}>{t('begin', { lv: LEVEL_LABEL[pick] })}</Button>
          </div>
        </Card>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------- Tổng quan

function StepRow({ s }: { s: Step }) {
  const t = useT(S)
  const [busy, setBusy] = useState(false)
  return (
    <li className="flex items-center gap-3 py-3">
      <span aria-hidden className="jp grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg text-primary">{ICON[s.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium">{s.title}</span>
          {s.soon && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t('soon')}</span>}
          {s.ratio === undefined && !s.soon && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t('optional')}</span>}
          {s.ratio !== undefined && !s.soon && <span className="text-xs text-muted">{t('percent', { n: pct(s.ratio) })}</span>}
        </div>
        <div className="text-sm text-muted">{s.detail}</div>
        {s.ratio !== undefined && !s.soon && <div className="mt-1.5"><Bar ratio={s.ratio} label={s.title} /></div>}
      </div>
      {s.action ? (
        <Button variant="soft" disabled={busy} onClick={() => { setBusy(true); void s.action!.run().finally(() => setBusy(false)) }}>{s.action.label}</Button>
      ) : (
        <ButtonLink variant="ghost" to={s.link}>{t('open')} ›</ButtonLink>
      )}
    </li>
  )
}

function LevelCard({ l, isCurrent, state }: { l: LevelPlan; isCurrent: boolean; state: RoadmapState }) {
  const t = useT(S)
  const badge = l.skipped
    ? t('skipped', { how: state.placement?.start === state.start ? t('byTest') : t('byChoice') })
    : l.done ? t('done') : isCurrent ? t('current') : ''
  return (
    <Card className={isCurrent ? 'border-primary' : ''}>
      <details open={isCurrent}>
        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl font-bold ${l.done ? 'bg-good text-surface' : isCurrent ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted'}`}>
            {LEVEL_LABEL[l.id]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold">{levelName(t, l.id)}</span>
              {badge && <span className="text-xs text-muted">{badge}</span>}
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <span className="flex-1"><Bar ratio={l.ratio} label={levelName(t, l.id)} /></span>
              <span className="w-10 text-right text-sm text-muted">{pct(l.ratio)}%</span>
            </span>
          </span>
          <span aria-hidden className="text-muted">▾</span>
        </summary>
        <ul className="mt-2 divide-y divide-border">
          {l.steps.map((s) => <StepRow key={s.id} s={s} />)}
        </ul>
      </details>
    </Card>
  )
}

function Customize({ state, onTest }: { state: RoadmapState; onTest: () => void }) {
  const t = useT(S)
  const lang = useLang()
  const [confirm, setConfirm] = useState(false)
  const p = state.placement
  return (
    <Card className="grid gap-4">
      <h2 className="font-semibold">{t('settings')}</h2>
      <div className="grid gap-1.5"><span className="text-sm text-muted">{t('series')}</span>
        <SeriesPicker value={state.series} onChange={(series) => void patchRoadmapState({ series })} /></div>
      <div className="grid gap-1.5"><span className="text-sm text-muted">{t('start')}</span>
        <LevelPicker label={t('start')} value={state.start} onChange={(start) => void patchRoadmapState({ start })} /></div>
      <div className="grid gap-1.5"><span className="text-sm text-muted">{t('goal')}</span>
        <LevelPicker label={t('goal')} from={state.start === 'kana' ? 'n5' : state.start} value={state.goal}
          onChange={(goal) => void patchRoadmapState({ goal })} /></div>
      {p && <p className="text-sm text-muted">{t('lastTest', { date: new Date(p.at).toLocaleDateString(lang), lv: LEVEL_LABEL[p.start] })}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={onTest}>{t('retake')}</Button>
        <Button variant="ghost" onClick={() => (confirm ? void resetRoadmap() : setConfirm(true))} onBlur={() => setConfirm(false)}>
          {confirm ? t('resetConfirm') : t('reset')}
        </Button>
      </div>
      <p className="text-xs text-muted">{t('note')}</p>
    </Card>
  )
}

function Overview({ state, onTest }: { state: RoadmapState; onTest: () => void }) {
  const t = useT(S)
  const raw = useDbQuery(loadRaw, [], ['kv', 'srsCards', 'knownWords', 'textbooks', 'textbookLessons', 'packs']).data
  if (!raw) return <p className="text-muted">{t('loading')}</p>

  const plan = buildPlan(raw, state, t)
  const cur = currentLevel(plan)
  const next = nextStep(plan)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')} <span className="jp ml-1 text-lg font-normal text-muted">ロードマップ</span></h1>
        {cur && <span className="text-sm text-muted">{t('current')}: <b className="text-text">{levelName(t, cur.id)}</b> · {pct(cur.ratio)}%</span>}
      </div>

      {next && cur ? (
        <Card className="flex flex-wrap items-center gap-4 bg-primary-soft">
          <span aria-hidden className="jp grid size-12 shrink-0 place-items-center rounded-xl bg-surface text-2xl text-primary">{ICON[next.kind]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted">{t('nextTitle')} · {LEVEL_LABEL[cur.id]}</div>
            <div className="font-semibold">{next.title}</div>
            <div className="text-sm text-muted">{next.detail}</div>
          </div>
          {next.action
            ? <Button onClick={() => void next.action!.run()}>{next.action.label}</Button>
            : <ButtonLink to={next.link}>{t('go')} ›</ButtonLink>}
        </Card>
      ) : !cur ? (
        <Card className="bg-primary-soft">{t('allDone', { lv: LEVEL_LABEL[state.goal] })}</Card>
      ) : null}

      <ol className="grid gap-3">
        {plan.map((l) => <li key={l.id}><LevelCard l={l} isCurrent={l.id === cur?.id} state={state} /></li>)}
      </ol>

      <Customize state={state} onTest={onTest} />
    </div>
  )
}

// ---------------------------------------------------------------- Trang

export default function RoadmapPage() {
  const t = useT(S)
  const state = useRoadmapState()
  const [params, setParams] = useSearchParams()
  const testing = params.get('tab') === 'test'
  const setTesting = (on: boolean) => setParams(on ? { tab: 'test' } : {}, { replace: false })
  const [draft, setDraft] = useState<Draft>({ series: 'minna', goal: 'n3' })

  if (state === undefined) return <p className="text-muted">{t('loading')}</p>

  if (testing) {
    const apply = async (r: PlacementResult) => {
      if (state) await patchRoadmapState({ start: r.start, placement: r })
      else await saveRoadmapState({
        start: r.start, goal: levelIndex(draft.goal) < levelIndex(r.start) ? r.start : draft.goal,
        series: draft.series, placement: r, createdAt: Date.now(),
      })
      setTesting(false)
    }
    return <Placement onApply={(r) => void apply(r)} onCancel={() => setTesting(false)} />
  }

  if (!state) return <Onboarding draft={draft} setDraft={setDraft} onTest={() => setTesting(true)} />
  return <Overview state={state} onTest={() => setTesting(true)} />
}
