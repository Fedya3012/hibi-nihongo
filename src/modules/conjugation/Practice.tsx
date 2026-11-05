/**
 * LUYỆN CHIA: màn hình chuẩn bị → làm bài → kết quả.
 * Câu hỏi tạo ở lib/quiz.ts, chấm ở lib/conjugate.ts, kết quả ghi vào lib/progress.ts.
 * Phím tắt: Enter = kiểm tra / câu tiếp, 1–4 = chọn đáp án (dạng trắc nghiệm).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useLang, useT } from '@/core/i18n'
import { Furigana, hasJapanese, romajiToHiragana } from '@/modules/dictionary'
import { speak } from '@/modules/kana/speech'
import type { ConjWord, FormId } from './types'
import { WORDS } from './data/words'
import { FORMS, FORM_BY_ID, CLASS_LABEL, formApplies, formJp, type FormInfo } from './lib/forms'
import { conjugate, isCorrect } from './lib/conjugate'
import { backChain, guessForm } from './lib/explain'
import { buildQuiz, type Mode, type Question } from './lib/quiz'
import {
  accuracy, getPrefs, recordResults, resetStats, savePrefs, useConjStats,
  type ClassGroup, type ConjPrefs, type ConjStats,
} from './lib/progress'
import { S } from './strings'

const GROUP_OF: Record<ConjWord['c'], ClassGroup> = { v5: 'v5', v1: 'v1', vs: 'v3', vk: 'v3', i: 'i', na: 'na' }
const CLASS_KEYS: [ClassGroup, 'cV5' | 'cV1' | 'cV3' | 'cI' | 'cNa'][] = [['v5', 'cV5'], ['v1', 'cV1'], ['v3', 'cV3'], ['i', 'cI'], ['na', 'cNa']]

/** Tên thể theo ngôn ngữ giao diện, kèm dạng tiếng Nhật. */
export function useFormName() {
  const lang = useLang()
  return (f: FormInfo, w?: ConjWord) => {
    const jp = formJp(f, w)
    return { name: f[lang] ?? f.vi, jp }
  }
}

/** Chữ người học gõ → chuỗi sẽ chấm (romaji đổi sang hiragana). */
function toAnswer(input: string): string {
  const s = input.trim()
  if (!s || hasJapanese(s)) return s
  return romajiToHiragana(s.replace(/[^a-zA-Z' -]/g, '')) ?? s
}

interface Answer { q: Question; ok: boolean; input: string }

export function Practice({ focus, onClearFocus }: { focus?: ConjWord; onClearFocus: () => void }) {
  const stats = useConjStats()
  const [prefs, setPrefs] = useState<ConjPrefs | null>(null)
  const [quiz, setQuiz] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  useEffect(() => { getPrefs().then(setPrefs) }, [])

  const update = (p: ConjPrefs) => { setPrefs(p); void savePrefs(p) }

  const pool = useMemo(() => {
    if (!prefs) return { words: [] as ConjWord[], forms: [] as FormInfo[] }
    const forms = FORMS.filter((f) => prefs.forms.includes(f.id))
    if (focus) {
      const fit = forms.filter((f) => formApplies(focus, f))
      return { words: [focus], forms: fit.length ? fit : FORMS.filter((f) => formApplies(focus, f)) }
    }
    const words = WORDS.filter((w) => prefs.levels.includes(w.lv) && prefs.classes.includes(GROUP_OF[w.c]))
    return { words, forms }
  }, [prefs, focus])
  const pairs = useMemo(() => pool.words.reduce((n, w) => n + pool.forms.filter((f) => formApplies(w, f)).length, 0), [pool])

  const start = (list?: Question[]) => {
    if (!prefs) return
    setAnswers([])
    setQuiz(list ?? buildQuiz({ ...pool, count: prefs.count, mode: prefs.mode, weak: prefs.weak, stats }))
  }

  const finish = useCallback((list: Answer[]) => {
    void recordResults(list.map((a) => ({ word: a.q.word, form: a.q.form.id, ok: a.ok })))
  }, [])

  if (!prefs) return null

  if (quiz && answers.length < quiz.length) {
    return (
      <QuestionView key={answers.length} q={quiz[answers.length]} i={answers.length} n={quiz.length} hint={prefs.hint}
        onQuit={() => { finish(answers); setQuiz(answers.length ? quiz.slice(0, answers.length) : null) }}
        onDone={(ok, input) => {
          const next = [...answers, { q: quiz[answers.length], ok, input }]
          setAnswers(next)
          if (next.length === quiz.length) finish(next)
        }} />
    )
  }

  if (quiz && quiz.length) {
    return <Result answers={answers} onAgain={() => start()} onRedo={(qs) => start(qs)} onSetup={() => setQuiz(null)} />
  }

  return <Setup prefs={prefs} update={update} stats={stats} focus={focus} onClearFocus={onClearFocus} pairs={pairs} onStart={() => start()} />
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div>{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`min-h-9 rounded-full border px-3 text-sm transition ${on ? 'border-primary bg-primary-soft' : 'border-border text-muted hover:text-text'}`}>
      {children}
    </button>
  )
}

function Setup({ prefs, update, stats, focus, onClearFocus, pairs, onStart }: {
  prefs: ConjPrefs; update: (p: ConjPrefs) => void; stats: ConjStats | undefined
  focus?: ConjWord; onClearFocus: () => void; pairs: number; onStart: () => void
}) {
  const t = useT(S)
  const fname = useFormName()
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? (list.length > 1 ? list.filter((y) => y !== x) : list) : [...list, x])
  const n5 = FORMS.filter((f) => f.lv === 5).map((f) => f.id)

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card className="grid gap-4">
        {focus ? (
          <div className="flex flex-wrap items-center gap-3">
            <Furigana text={focus.w} reading={focus.r} className="text-2xl font-bold" />
            {focus.m && <span className="text-muted">{focus.m}</span>}
            <Button variant="ghost" onClick={onClearFocus}>✕</Button>
          </div>
        ) : (
          <>
            <Row label={t('level')}>
              <Segmented<string> label={t('level')} value={prefs.levels.includes(4) ? '45' : '5'}
                onChange={(v) => update({ ...prefs, levels: v === '45' ? [5, 4] : [5] })}
                options={[{ value: '5', label: 'N5' }, { value: '45', label: 'N5 + N4' }]} />
            </Row>
            <Row label={t('words')}>
              <div className="flex flex-wrap gap-2">
                {CLASS_KEYS.map(([c, key]) => (
                  <Chip key={c} on={prefs.classes.includes(c)} onClick={() => update({ ...prefs, classes: toggle(prefs.classes, c) })}>{t(key)}</Chip>
                ))}
              </div>
            </Row>
          </>
        )}
        <Row label={t('forms')}>
          <div className="grid gap-2">
            {([5, 4] as const).map((lv) => (
              <div key={lv} className="flex flex-wrap items-center gap-2">
                <span className="w-8 text-xs font-semibold text-muted">N{lv}</span>
                {FORMS.filter((f) => f.lv === lv).map((f) => {
                  const { name, jp } = fname(f)
                  return (
                    <Chip key={f.id} on={prefs.forms.includes(f.id)} onClick={() => update({ ...prefs, forms: toggle(prefs.forms, f.id) })}>
                      {name}{jp && <span className="jp ml-1 text-xs text-muted">{jp.split('／')[0]}</span>}
                    </Chip>
                  )
                })}
              </div>
            ))}
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" onClick={() => update({ ...prefs, forms: FORMS.map((f) => f.id) })}>{t('allForms')}</Button>
              <Button variant="ghost" onClick={() => update({ ...prefs, forms: n5 })}>{t('n5Forms')}</Button>
              <Button variant="ghost" onClick={() => update({ ...prefs, forms: [prefs.forms[0]] })}>{t('noForms')}</Button>
            </div>
          </div>
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={t('mode')}>
            <Segmented<Mode> label={t('mode')} value={prefs.mode} onChange={(mode) => update({ ...prefs, mode })}
              options={[{ value: 'type', label: t('mType') }, { value: 'choice', label: t('mChoice') }]} />
          </Row>
          <Row label={t('count')}>
            <Segmented<string> label={t('count')} value={String(prefs.count)} onChange={(v) => update({ ...prefs, count: Number(v) })}
              options={['10', '20', '30'].map((v) => ({ value: v, label: v }))} />
          </Row>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip on={prefs.weak} onClick={() => update({ ...prefs, weak: !prefs.weak })}>{t('weak')}</Chip>
          <Chip on={prefs.hint} onClick={() => update({ ...prefs, hint: !prefs.hint })}>{t('hint')}</Chip>
        </div>
        {pairs === 0 ? <p className="text-sm text-muted">{t('empty')}</p> : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onStart}>{t('start')}</Button>
            <span className="text-sm text-muted">{t('poolN', { n: pairs })}</span>
          </div>
        )}
      </Card>
      <StatsCard stats={stats} />
    </div>
  )
}

function StatsCard({ stats }: { stats: ConjStats | undefined }) {
  const t = useT(S)
  const fname = useFormName()
  const [confirm, setConfirm] = useState(false)
  const rows = FORMS.map((f) => ({ f, s: stats?.forms[f.id] })).filter((x) => x.s && x.s.right + x.s.wrong > 0)
  return (
    <Card className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('statsTitle')}</h2>
        {rows.length > 0 && (
          <Button variant="ghost" onClick={() => { if (confirm) { void resetStats(); setConfirm(false) } else setConfirm(true) }}>
            {t(confirm ? 'resetConfirm' : 'reset')}
          </Button>
        )}
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">{t('statsNone')}</p> : (
        <ul className="grid gap-2">
          {rows.map(({ f, s }) => {
            const acc = accuracy(s) ?? 0
            return (
              <li key={f.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{fname(f).name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(acc * 100)}%` }} />
                </span>
                <span className="tabular-nums text-muted">{Math.round(acc * 100)}% · {s!.right + s!.wrong}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** Một câu hỏi. Gọi onDone(đúng?, chữ đã gõ) khi bấm "Câu tiếp". */
function QuestionView({ q, i, n, hint, onDone, onQuit }: {
  q: Question; i: number; n: number; hint: boolean; onDone: (ok: boolean, input: string) => void; onQuit: () => void
}) {
  const t = useT(S)
  const lang = useLang()
  const fname = useFormName()
  const [input, setInput] = useState('')
  const [chosen, setChosen] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const typed = q.options ? (chosen != null ? q.options[chosen] : '') : toAnswer(input)
  const ok = checked && isCorrect(typed, q.res)
  const { name, jp } = fname(q.form, q.word)

  const check = useCallback(() => { if (!checked) setChecked(true) }, [checked])
  const choose = useCallback((k: number) => { if (!checked) { setChosen(k); setChecked(true) } }, [checked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (checked && e.key === 'Enter') { e.preventDefault(); onDone(ok, typed) }
      else if (!checked && q.options && e.key >= '1' && e.key <= String(q.options.length)) choose(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [checked, ok, typed, onDone, choose, q.options])

  const optCls = (o: string, k: number) => `jp min-h-12 rounded-xl border px-4 py-2 text-left text-lg transition ${
    !checked ? 'border-border hover:border-primary'
      : isCorrect(o, q.res) ? 'border-primary bg-primary-soft' : k === chosen ? 'border-border opacity-60 line-through' : 'border-border opacity-60'}`

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
        <div className="grid gap-1">
          {hint && <span className="text-xs font-medium text-muted">{CLASS_LABEL[q.word.c][lang]}</span>}
          <div className="flex flex-wrap items-baseline gap-x-3">
            <Furigana text={q.word.w} reading={q.word.r} className="text-4xl font-bold" />
            {q.word.m && <span className="text-muted">{q.word.m}</span>}
          </div>
        </div>
        <p className="text-lg">
          <span className="text-muted">{t('ask')} </span>
          <strong className="text-primary">{name}</strong>
          {jp && <span className="jp ml-2 text-muted">{jp}</span>}
        </p>

        {q.options ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <button key={o} onClick={() => choose(k)} className={optCls(o, k)}>
                <span className="mr-2 text-xs text-muted">{k + 1}</span>{o}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={checked} autoFocus lang="ja"
              autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
                // Không cho phím Enter này đi tiếp tới window (nếu không sẽ vừa kiểm tra vừa sang câu mới)
                e.preventDefault(); e.stopPropagation()
                if (input.trim()) check()
              }}
              placeholder={t('placeholder')} aria-label={t('placeholder')}
              className={`jp min-h-12 w-full rounded-xl border-2 bg-surface px-4 text-xl outline-none transition focus:border-primary ${
                checked ? (ok ? 'border-primary' : 'border-border line-through opacity-70') : 'border-border'}`} />
            {!checked && typed && typed !== input.trim() && (
              <p className="text-sm text-muted">{t('preview')} <span className="jp text-text">{typed}</span></p>
            )}
            {!checked && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={check} disabled={!input.trim()}>{t('check')}</Button>
                <Button variant="ghost" onClick={check}>{t('skip')}</Button>
              </div>
            )}
          </div>
        )}

        {checked && <Feedback q={q} ok={ok} typed={typed} />}
        {checked && (
          <div className="flex justify-end">
            <Button onClick={() => onDone(ok, typed)}>{i + 1 === n ? t('finish') : t('nextQ')}</Button>
          </div>
        )}
        {!checked && <p className="text-xs text-muted">{t('keys')}</p>}
      </Card>
    </div>
  )
}

function Feedback({ q, ok, typed }: { q: Question; ok: boolean; typed: string }) {
  const t = useT(S)
  const fname = useFormName()
  const chain = backChain(q.word, q.res.r)
  // Gõ sai nhưng vẫn là một dạng chia khác của từ này → nói đó là thể gì.
  // Trước hết so với các thể trong danh sách; không trùng thì nhờ bộ chia ngược của Từ điển.
  const wroteForm = !ok && typed ? FORMS.find((f) => f.id !== q.form.id && formApplies(q.word, f) && isCorrect(typed, conjugate(q.word, f.id)!)) : undefined
  const wrote = !ok && typed && !wroteForm ? guessForm(q.word, typed) : null
  const alts = [...new Set(q.res.alt.filter((a) => a !== q.res.r && a !== q.res.w && !/[㐀-鿿]/.test(a)))]
  return (
    <div className="grid gap-3 border-t border-border pt-4" role="status">
      <p className={`font-semibold ${ok ? 'text-primary' : ''}`}>{ok ? `✓ ${t('right')}` : `✗ ${t('wrong')}`}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">{t('answerIs')}</span>
        <Furigana text={q.res.w} reading={q.res.r} className="text-2xl font-bold" />
        <Button variant="ghost" onClick={() => speak(q.res.r, { force: true })} aria-label={t('listen')}>🔊</Button>
      </div>
      {alts.length > 0 && <p className="text-sm"><span className="text-muted">{t('alsoOk')} </span><span className="jp">{alts.join('、')}</span></p>}
      {(wroteForm || (wrote && wrote.length > 0)) && (
        <p className="text-sm text-muted">{t('youWrote', { f: wroteForm ? fname(wroteForm, q.word).name : wrote!.join(' → ') })}</p>
      )}
      <div className="rounded-xl bg-surface-2 p-3 text-sm">
        <p><span className="font-medium">{t('why')}: </span><span className="jp">{q.res.rule}</span></p>
        {chain && (
          <p className="mt-1 text-muted">{t('back')} <span className="jp">{q.res.r} → {q.word.r}</span> ({chain.join(' → ')})</p>
        )}
      </div>
    </div>
  )
}

function Result({ answers, onAgain, onRedo, onSetup }: {
  answers: Answer[]; onAgain: () => void; onRedo: (qs: Question[]) => void; onSetup: () => void
}) {
  const t = useT(S)
  const fname = useFormName()
  const right = answers.filter((a) => a.ok).length
  const wrong = answers.filter((a) => !a.ok)
  const byForm = new Map<FormId, { right: number; total: number }>()
  for (const a of answers) {
    const s = byForm.get(a.q.form.id) ?? { right: 0, total: 0 }
    s.total++
    if (a.ok) s.right++
    byForm.set(a.q.form.id, s)
  }
  return (
    <Card className="mx-auto grid max-w-2xl gap-5">
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">{Math.round((right / Math.max(1, answers.length)) * 100)}%</p>
        <p className="mt-1 text-lg">{t('result', { right, total: answers.length })}</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{t('byForm')}</h3>
        <div className="flex flex-wrap gap-2">
          {[...byForm].map(([id, s]) => (
            <span key={id} className={`rounded-xl border px-3 py-1 text-sm ${s.right === s.total ? 'border-primary' : 'border-border'}`}>
              {fname(FORM_BY_ID.get(id)!).name} <span className="text-muted">{s.right}/{s.total}</span>
            </span>
          ))}
        </div>
      </div>
      {wrong.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{t('wrongList')}</h3>
          <ul className="grid gap-1.5 text-sm">
            {wrong.map((a, k) => (
              <li key={k} className="flex flex-wrap items-baseline gap-x-2">
                <span className="jp font-medium">{a.q.word.w}</span>
                <span className="text-muted">→ {fname(a.q.form, a.q.word).name}:</span>
                <span className="jp font-semibold text-primary">{a.q.res.w}</span>
                {a.input && <span className="jp text-muted line-through">{a.input}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onAgain}>{t('again')}</Button>
        {wrong.length > 0 && <Button variant="soft" onClick={() => onRedo(wrong.map((a) => a.q))}>{t('redoWrong')}</Button>}
        <Button variant="ghost" onClick={onSetup}>{t('toSetup')}</Button>
      </div>
    </Card>
  )
}

