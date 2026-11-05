/**
 * LUYỆN TẬP NGỮ PHÁP: điền chỗ trống, sắp xếp câu, chọn nghĩa.
 * Câu hỏi tự tạo từ câu ví dụ (lib/quiz.ts). Kết quả ghi vào tiến độ (lib/progress.ts).
 * Phím tắt: 1–4 chọn đáp án, Enter = kiểm tra / câu tiếp, Backspace = bỏ cụm cuối (sắp xếp câu).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import type { GrammarPoint, JlptLevel } from './types'
import { LEVELS } from './lib/content'
import { buildQuiz, orderCorrect, type Question, type QuestionType } from './lib/quiz'
import { recordPractice, type GrammarState } from './lib/progress'
import { ExampleText } from './components/Example'
import { S } from './strings'

type Scope = 'all' | 'learned' | 'weak'

export function Practice({ points, state, ids, level: initLevel, onOpen, onClearIds }: {
  points: GrammarPoint[]; state: GrammarState | undefined; ids?: string[]; level: JlptLevel
  onOpen: (id: string) => void; onClearIds: () => void
}) {
  const t = useT(S)
  const [level, setLevel] = useState<JlptLevel>(initLevel)
  const [scope, setScope] = useState<Scope>('all')
  const [count, setCount] = useState('10')
  const [types, setTypes] = useState<QuestionType[]>(['cloze', 'order', 'meaning'])
  const [quiz, setQuiz] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])

  const pool = useMemo(() => {
    if (ids?.length) return points.filter((p) => ids.includes(p.id))
    return points.filter((p) => {
      if (p.level !== level) return false
      const st = state?.progress[p.id]
      if (scope === 'learned') return !!st?.learned || !!state?.inReview.has(p.id)
      if (scope === 'weak') return (st?.wrong ?? 0) > 0 && (st?.wrong ?? 0) >= (st?.right ?? 0) / 2
      return true
    })
  }, [points, ids, level, scope, state])

  const start = () => { setAnswers([]); setQuiz(buildQuiz(pool, points, Number(count), types)) }

  const finish = useCallback((list: boolean[]) => {
    if (!quiz) return
    const res: Record<string, boolean[]> = {}
    list.forEach((ok, i) => { (res[quiz[i].point.id] ??= []).push(ok) })
    if (list.length) void recordPractice(res)
  }, [quiz])

  // Đang làm bài
  if (quiz && answers.length < quiz.length) {
    return (
      <QuestionView key={answers.length} q={quiz[answers.length]} i={answers.length} n={quiz.length}
        onQuit={() => { finish(answers); setQuiz(null) }}
        onLeave={(ok) => { const q = quiz[answers.length]; finish([...answers, ok]); setQuiz(null); onOpen(q.point.id) }}
        onDone={(ok) => {
          const next = [...answers, ok]
          setAnswers(next)
          if (next.length === quiz.length) finish(next)
        }} />
    )
  }

  // Kết quả
  if (quiz && quiz.length) {
    const right = answers.filter(Boolean).length
    const wrong = [...new Map(quiz.filter((_, i) => !answers[i]).map((q) => [q.point.id, q.point])).values()]
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-4xl font-bold text-primary">{Math.round((right / quiz.length) * 100)}%</p>
        <p className="mt-1 text-lg">{t('result', { right, total: quiz.length })}</p>
        {wrong.length > 0 && (
          <div className="mt-5 text-left">
            <h3 className="mb-2 font-semibold">{t('wrongList')}</h3>
            <div className="flex flex-wrap gap-2">
              {wrong.map((p) => (
                <button key={p.id} onClick={() => onOpen(p.id)} className="rounded-xl border border-border px-3 py-1.5 text-sm hover:border-primary">
                  <span className="jp font-medium">{p.pattern}</span> <span className="text-muted">{p.meaning}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={start}>{t('again')}</Button>
          <Button variant="ghost" onClick={() => setQuiz(null)}>{t('toList')}</Button>
        </div>
      </Card>
    )
  }

  // Chọn kiểu luyện
  const toggle = (ty: QuestionType) => setTypes((s) => (s.includes(ty) ? (s.length > 1 ? s.filter((x) => x !== ty) : s) : [...s, ty]))
  return (
    <Card className="mx-auto grid max-w-xl gap-4">
      {ids?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {pool.map((p) => <span key={p.id} className="jp rounded-lg bg-primary-soft px-2 py-1">{p.pattern}</span>)}
          <Button variant="ghost" onClick={onClearIds}>{t('pAll')}</Button>
        </div>
      ) : (
        <>
          <Row label={t('pLevel')}>
            <Segmented<string> label={t('pLevel')} value={String(level)} onChange={(v) => setLevel(Number(v) as JlptLevel)}
              options={LEVELS.filter((l) => l.ready).map((l) => ({ value: String(l.level), label: `N${l.level}` }))} />
          </Row>
          <Row label={t('pScope')}>
            <Segmented<Scope> label={t('pScope')} value={scope} onChange={setScope}
              options={[{ value: 'all', label: t('pAll') }, { value: 'learned', label: t('pLearned') }, { value: 'weak', label: t('pWeak') }]} />
          </Row>
        </>
      )}
      <Row label={t('pCount')}>
        <Segmented<string> label={t('pCount')} value={count} onChange={setCount}
          options={['5', '10', '20'].map((v) => ({ value: v, label: v }))} />
      </Row>
      <Row label={t('pTypes')}>
        <div className="flex flex-wrap gap-2">
          {(['cloze', 'order', 'meaning'] as QuestionType[]).map((ty) => (
            <button key={ty} onClick={() => toggle(ty)} aria-pressed={types.includes(ty)}
              className={`min-h-9 rounded-full border px-3 text-sm transition ${types.includes(ty) ? 'border-primary bg-primary-soft' : 'border-border text-muted'}`}>
              {t(ty === 'cloze' ? 'tCloze' : ty === 'order' ? 'tOrder' : 'tMeaning')}
            </button>
          ))}
        </div>
      </Row>
      {pool.length === 0 ? <p className="text-sm text-muted">{t('noPoints')}</p> : (
        <Button onClick={start} className="justify-self-start">{t('start')} · {pool.length}</Button>
      )}
      {quiz && quiz.length === 0 && <p className="text-sm text-muted">{t('noPoints')}</p>}
    </Card>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div>{children}</div>
    </div>
  )
}

/** Một câu hỏi. Gọi onDone(đúng?) khi bấm "Câu tiếp". */
function QuestionView({ q, i, n, onDone, onQuit, onLeave }: {
  q: Question; i: number; n: number; onDone: (ok: boolean) => void; onQuit: () => void
  /** Rời bài luyện để xem bài của mẫu này (vẫn ghi kết quả). */
  onLeave: (ok: boolean) => void
}) {
  const t = useT(S)
  const [chosen, setChosen] = useState<number | null>(null) // trắc nghiệm
  const [picked, setPicked] = useState<number[]>([]) // sắp xếp câu: thứ tự các cụm đã bấm
  const [checked, setChecked] = useState(false)

  const ok = q.type === 'order'
    ? orderCorrect(q, picked)
    : q.type === 'cloze' ? chosen != null && q.options[chosen] === q.answer
      : chosen != null && q.options[chosen].id === q.point.id
  const optionCount = q.type === 'order' ? 0 : q.options.length

  const choose = useCallback((k: number) => { if (!checked) { setChosen(k); setChecked(true) } }, [checked])
  const canCheck = q.type === 'order' && picked.length === q.chunks.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= String(optionCount)) choose(Number(e.key) - 1)
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (checked) onDone(ok)
        else if (canCheck) setChecked(true)
      } else if (e.key === 'Backspace' && q.type === 'order' && !checked) setPicked((p) => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, checked, canCheck, ok, onDone, optionCount, q.type])

  const optCls = (k: number, correct: boolean) => `min-h-12 rounded-xl border px-4 py-2 text-left transition ${
    !checked ? 'border-border hover:border-primary'
      : correct ? 'border-primary bg-primary-soft' : k === chosen ? 'border-border opacity-60 line-through' : 'border-border opacity-60'}`

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>{t('progressQ', { i: i + 1, n })}</span>
        <Button variant="ghost" onClick={onQuit}>{t('quit')}</Button>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary transition-all" style={{ width: `${(i / n) * 100}%` }} />
      </div>

      <Card className="grid gap-4">
        <p className="text-sm text-muted">{t(q.type === 'cloze' ? 'qCloze' : q.type === 'order' ? 'qOrder' : 'qMeaning')}</p>

        {q.type === 'cloze' && (
          <>
            <ExampleText src={q.ex[0]} blank fill={checked ? q.answer : undefined} className="text-2xl" />
            {/* Nghĩa tiếng Việt làm gợi ý: tránh trường hợp hai đáp án đều đúng ngữ pháp nhưng khác nghĩa */}
            <p className="-mt-2 text-sm text-muted">{q.ex[1]}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, k) => (
                <button key={k} onClick={() => choose(k)} className={`jp text-lg ${optCls(k, o === q.answer)}`}>
                  <span className="mr-2 text-xs text-muted">{k + 1}</span>{o}
                </button>
              ))}
            </div>
          </>
        )}

        {q.type === 'meaning' && (
          <>
            <p className="jp text-3xl font-bold">{q.point.pattern}</p>
            <div className="grid gap-2">
              {q.options.map((o, k) => (
                <button key={o.id} onClick={() => choose(k)} className={optCls(k, o.id === q.point.id)}>
                  <span className="mr-2 text-xs text-muted">{k + 1}</span>{o.meaning}
                </button>
              ))}
            </div>
          </>
        )}

        {q.type === 'order' && (
          <>
            <p className="text-muted">{q.ex[1]}</p>
            <div className={`jp flex min-h-14 flex-wrap items-center gap-1 rounded-xl border-2 border-dashed p-2 text-xl ${checked ? (ok ? 'border-primary' : 'border-border') : 'border-border'}`}>
              {picked.map((c, k) => (
                <button key={k} disabled={checked} onClick={() => setPicked((p) => p.filter((_, j) => j !== k))}
                  className="rounded-lg bg-primary-soft px-2 py-1">{q.chunks[c]}</button>
              ))}
            </div>
            <div className="jp flex flex-wrap gap-2 text-xl">
              {q.shuffled.map((c) => (
                <button key={c} disabled={checked || picked.includes(c)} onClick={() => setPicked((p) => [...p, c])}
                  className="rounded-lg border border-border px-2 py-1 transition hover:border-primary disabled:opacity-30">{q.chunks[c]}</button>
              ))}
            </div>
            {!checked && (
              <div className="flex gap-2">
                <Button disabled={!canCheck} onClick={() => setChecked(true)}>{t('check')}</Button>
                <Button variant="ghost" disabled={!picked.length} onClick={() => setPicked((p) => p.slice(0, -1))}>{t('undo')}</Button>
              </div>
            )}
          </>
        )}

        {checked && (
          <div className="grid gap-3 border-t border-border pt-4" role="status">
            <p className={`text-lg font-semibold ${ok ? 'text-primary' : ''}`}>{ok ? t('right') : t('wrong')}</p>
            {q.type !== 'meaning' && (
              <div>
                {!ok && <p className="text-sm text-muted">{t('answerIs')}</p>}
                <ExampleText src={q.ex[0]} className="text-xl" />
                <p className="text-sm text-muted">{q.ex[1]}</p>
              </div>
            )}
            <p className="text-sm"><span className="jp font-medium">{q.point.pattern}</span> · {q.point.meaning}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onDone(ok)}>{i + 1 === n ? t('finish') : t('nextQ')}</Button>
              <Button variant="ghost" onClick={() => onLeave(ok)}>{t('openPoint')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
