/**
 * TỔNG QUAN CẢ CUỐN SÁCH
 * - BookChart: biểu đồ % mỗi bài (từ + ngữ pháp + bài tập), vạch ngưỡng mở khóa, và cảnh báo bài yếu.
 * - WeakPoints: "Điểm yếu" của cả cuốn: từ hay quên, mẫu ngữ pháp hay quên, câu bài tập hay sai; luyện lại ngay.
 * - UnitTest: kiểm tra tổng hợp một nhóm bài (vd bài 1–5): trộn câu từ vựng tự tạo + bài tập bạn đã nhập, lưu điểm.
 * Kết quả luyện / kiểm tra ghi vào lịch sử câu sai của từng bài (mục Bài tập của bài đó).
 */
import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { getGrammarPoints, type GrammarPoint } from '@/modules/grammar/api'
import type { SrsCard } from '@/modules/review/api'
import { updateBook } from './store'
import { isWeakItem, printSet, recordAcross, shuffle, vocabQuiz, wordQuestion } from './lib/exercises'
import { sourceKey, unlockRatio, weakReasons, type LessonProgress } from './lib/progress'
import { Runner } from './sections/ExerciseSection'
import { inputCls, useTx } from './ui'
import type { ExItem, ExStat, Lesson, LessonWord, Textbook } from './types'

const mean = (w: LessonWord) => (w.meaning || w.en || '').trim()
const REVIEW_STATE = 2

/** Thống kê làm bài của mọi bài gộp lại (mã câu là duy nhất trong cả sách). */
const allStats = (lessons: Lesson[]) => Object.assign({}, ...lessons.map((l) => l.exStats ?? {})) as Record<string, ExStat>

/* ---------------- Biểu đồ cả cuốn + cảnh báo bài yếu ---------------- */

export function BookChart({ book, lessons, byLesson, locked, onOpen }: {
  book: Textbook; lessons: Lesson[]; byLesson: Map<string, LessonProgress>; locked: Set<number>; onOpen: (n: number) => void
}) {
  const t = useTx()
  const pct = unlockRatio(book)
  const avg = lessons.length ? lessons.reduce((s, l) => s + (byLesson.get(l.id)?.ratio ?? 0), 0) / lessons.length : 0
  const weak = lessons.flatMap((l) => {
    const r = weakReasons(byLesson.get(l.id))
    return Object.keys(r).length ? [{ l, r }] : []
  })

  return (
    <Card className="mb-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-semibold">{t('chartTitle')}</h2>
        <span className="text-sm text-muted">{t('chartAvg', { pct: Math.round(avg * 100) })}</span>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-good" />{t('chartPassed')}</span>
          <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-primary" />{t('chartLearning')}</span>
          <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-bad/70" />{t('weak')}</span>
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="relative flex h-36 min-w-full items-end gap-1" style={{ width: `${Math.max(lessons.length * 22, 100)}px` }}
          role="img" aria-label={t('chartTitle')}>
          {/* Vạch ngưỡng mở khóa */}
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted/60" style={{ bottom: `calc(18px + (100% - 18px) * ${pct})` }}>
            <span className="absolute -top-4 right-0 bg-surface px-1 text-[10px] text-muted">{Math.round(pct * 100)}%</span>
          </div>
          {lessons.map((l) => {
            const p = byLesson.get(l.id)
            const r = p?.ratio ?? 0
            const isWeak = Object.keys(weakReasons(p)).length > 0
            const color = isWeak ? 'bg-bad/70' : r >= pct ? 'bg-good' : 'bg-primary'
            return (
              <button key={l.id} type="button" onClick={() => onOpen(l.number)}
                title={`${t('lesson', { n: l.number })}: ${Math.round(r * 100)}%`}
                className={`group flex h-full min-w-4 flex-1 flex-col items-center justify-end gap-0.5 ${locked.has(l.number) ? 'opacity-40' : ''}`}>
                <span className="flex w-full flex-1 items-end rounded-t bg-surface-2">
                  <span className={`block w-full rounded-t ${color} transition group-hover:opacity-80`} style={{ height: `${Math.max(r * 100, r > 0 ? 3 : 0)}%` }} />
                </span>
                <span className={`h-4 text-[10px] tabular-nums ${book.lastLesson === l.number ? 'font-bold text-primary' : 'text-muted'}`}>{l.number}</span>
              </button>
            )
          })}
        </div>
      </div>
      {weak.length > 0 && (
        <div className="space-y-1 rounded-xl bg-warn/15 p-3 text-sm" role="note">
          <p className="font-medium">⚠ {t('weakWarn', { n: weak.length })}</p>
          <ul className="space-y-1">
            {weak.slice(0, 6).map(({ l, r }) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-2">
                <button className="font-medium underline-offset-2 hover:underline" onClick={() => onOpen(l.number)}>{t('lesson', { n: l.number })}</button>
                <span className="text-muted">
                  {[r.lapses != null && t('weakLapses', { n: r.lapses }), r.exWeak != null && t('weakEx', { n: r.exWeak })].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* ---------------- Điểm yếu của cả cuốn ---------------- */

interface WeakWord { l: Lesson; w: LessonWord; c: SrsCard }

export function WeakPoints({ book, lessons, cards, grammarIds, onOpen }: {
  book: Textbook; lessons: Lesson[]; cards: Map<string, SrsCard>; grammarIds: Map<string, string[]>; onOpen: (n: number, s?: string) => void
}) {
  const t = useTx()
  const [run, setRun] = useState<{ title: string; items: ExItem[] } | null>(null)
  const [points, setPoints] = useState<Map<string, GrammarPoint>>(new Map())
  const stats = allStats(lessons)

  // Từ hay quên: thẻ đã quên ≥ 2 lần, hoặc đã quên và đang học lại
  const words: WeakWord[] = lessons.flatMap((l) => l.words.flatMap((w) => {
    const c = cards.get(sourceKey(l, w))
    return c && w.known !== true && (c.lapses >= 2 || (c.lapses >= 1 && c.state !== REVIEW_STATE)) ? [{ l, w, c }] : []
  })).sort((a, b) => b.c.lapses - a.c.lapses)

  // Mẫu ngữ pháp hay quên (thẻ Ôn tập của mẫu quên ≥ 2 lần)
  const grammar = lessons.flatMap((l) => (grammarIds.get(l.id) ?? []).flatMap((id) => {
    const c = cards.get(`grammar:${id}`)
    return c && c.lapses >= 2 ? [{ l, id, c }] : []
  })).sort((a, b) => b.c.lapses - a.c.lapses)
  const gKey = grammar.map((g) => g.id).join()
  useEffect(() => {
    if (!gKey) return
    void getGrammarPoints(gKey.split(',')).then((ps) => setPoints(new Map(ps.map((p) => [p.id, p]))))
  }, [gKey])

  // Câu bài tập hay sai
  const exs = lessons.flatMap((l) => (l.exercises ?? []).flatMap((s) => s.items)
    .filter((it) => isWeakItem(stats[it.id])).map((it) => ({ l, it, s: stats[it.id] })))
    .sort((a, b) => b.s.wrong - a.s.wrong)

  const lessonOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of lessons) {
      for (const it of (l.exercises ?? []).flatMap((s) => s.items)) m.set(it.id, l.number)
      for (const w of l.words) for (const d of ['m', 'w']) m.set(`auto:vocab:${w.id}:${d}`, l.number)
    }
    return m
  }, [lessons])

  const practiceWords = () => {
    // Câu chọn nghĩa / chọn từ cho từ yếu, lựa chọn nhiễu lấy từ cả cuốn
    const pool = lessons.flatMap((l) => l.words).filter(mean)
    const items = shuffle(words.filter((x) => mean(x.w))).slice(0, 20).map(({ w }, i) => wordQuestion(w, pool, i % 2 === 0))
    setRun({ title: t('wpPracticeWords'), items })
  }

  if (!words.length && !grammar.length && !exs.length) {
    return <Card><p className="text-muted">{t('wpEmpty')}</p></Card>
  }
  const record = (r: Record<string, [boolean, string]>) => recordAcross(book.id, r, lessonOf)

  return (
    <div className="space-y-4">
      {run && (
        <Runner key={run.items.map((x) => x.id).join()} title={run.title} items={run.items} stats={stats}
          onRecord={record} onClose={() => setRun(null)} onPrint={() => printSet(`${book.short} · ${run.title}`, run.items)} />
      )}

      {words.length > 0 && (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t('wpWords', { n: words.length })}</h3>
            {words.some((x) => mean(x.w)) && (
              <Button className="ml-auto !min-h-9" onClick={practiceWords}>{t('wpPracticeWords')}</Button>
            )}
          </div>
          <ul className="divide-y divide-border">
            {words.slice(0, 40).map(({ l, w, c }) => (
              <li key={`${l.id}:${w.id}`} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                <span className="jp font-medium">{w.word}</span>
                {w.reading && w.reading !== w.word && <span className="jp text-muted">{w.reading}</span>}
                <span className="min-w-0 flex-1">{mean(w)}</span>
                <button className="text-xs text-primary hover:underline" onClick={() => onOpen(l.number)}>{t('lesson', { n: l.number })}</button>
                <span className="text-xs text-warn">{t('wpForgot', { n: c.lapses })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {grammar.length > 0 && (
        <Card className="space-y-2">
          <h3 className="font-semibold">{t('wpGrammar', { n: grammar.length })}</h3>
          <ul className="divide-y divide-border">
            {grammar.map(({ l, id, c }) => (
              <li key={`${l.id}:${id}`} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                <span className="jp font-medium">{points.get(id)?.pattern ?? id}</span>
                <span className="min-w-0 flex-1 text-muted">{points.get(id)?.meaning}</span>
                <button className="text-xs text-primary hover:underline" onClick={() => onOpen(l.number, 'grammar')}>{t('lesson', { n: l.number })}</button>
                <span className="text-xs text-warn">{t('wpForgot', { n: c.lapses })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {exs.length > 0 && (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t('wpEx', { n: exs.length })}</h3>
            <Button className="ml-auto !min-h-9" onClick={() => setRun({ title: t('wpPracticeEx'), items: shuffle(exs.map((x) => x.it)) })}>
              {t('wpPracticeEx')}
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {exs.map(({ l, it, s }) => (
              <li key={it.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                <span className="jp min-w-0 flex-1 basis-60">{it.q || t('exKindOrder')}</span>
                <span className="jp text-good">{it.kind === 'order' ? it.answer.join(' ') : it.answer.join(' / ')}</span>
                <button className="text-xs text-primary hover:underline" onClick={() => onOpen(l.number, 'exercise')}>{t('lesson', { n: l.number })}</button>
                <span className="text-xs text-warn">{t('exWeakStat', { wrong: s.wrong, right: s.right })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ---------------- Kiểm tra tổng hợp một nhóm bài ---------------- */

const SIZES = [10, 20, 30]

export function UnitTest({ book, lessons }: { book: Textbook; lessons: Lesson[] }) {
  const t = useTx()
  const nums = lessons.map((l) => l.number)
  // Mặc định: nhóm 5 bài chứa bài đang học (vd đang ở bài 7 → bài 6–10)
  const cur = book.lastLesson ?? nums[0] ?? 1
  const first = nums[0] ?? 1
  const start = first + Math.floor((cur - first) / 5) * 5
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(Math.min(start + 4, nums[nums.length - 1] ?? start))
  const [size, setSize] = useState(20)
  const [test, setTest] = useState<{ items: ExItem[]; from: number; to: number } | null>(null)
  const [score, setScore] = useState<string | null>(null)

  const range = lessons.filter((l) => l.number >= Math.min(from, to) && l.number <= Math.max(from, to))
  const exItems = range.flatMap((l) => (l.exercises ?? []).flatMap((s) => s.items))
  const vocabCount = range.flatMap((l) => l.words).filter(mean).length
  const lessonOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of lessons) {
      for (const it of (l.exercises ?? []).flatMap((s) => s.items)) m.set(it.id, l.number)
      for (const w of l.words) for (const d of ['m', 'w']) m.set(`auto:vocab:${w.id}:${d}`, l.number)
    }
    return m
  }, [lessons])

  const startTest = () => {
    // Một nửa là bài tập bạn đã nhập (nếu có), phần còn lại là câu từ vựng tự tạo
    const ex = shuffle(exItems).slice(0, Math.ceil(size / 2))
    const vocab = vocabQuiz({ words: range.flatMap((l) => l.words) }, size - ex.length)
    const items = shuffle([...ex, ...vocab]).slice(0, size)
    setScore(null)
    setTest({ items, from: Math.min(from, to), to: Math.max(from, to) })
  }

  const record = async (r: Record<string, [boolean, string]>) => {
    if (!test) return
    await recordAcross(book.id, r, lessonOf)
    const right = Object.values(r).filter(([ok]) => ok).length
    const res = { at: Date.now(), from: test.from, to: test.to, right, total: test.items.length }
    await updateBook(book.id, { tests: [...(book.tests ?? []), res].slice(-30) })
    setScore(t('utSaved', { pct: Math.round((right / res.total) * 100) }))
  }

  const lessonOpts = nums.map((n) => <option key={n} value={n}>{t('lesson', { n })}</option>)
  const history = [...(book.tests ?? [])].reverse()
  const label = (a: number, b: number) => (a === b ? t('lesson', { n: a }) : t('utRange', { from: a, to: b }))

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="font-semibold">{t('utTitle')}</h3>
        <p className="text-sm text-muted">{t('utHint')}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className={`${inputCls} !w-auto`} value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label={t('utFrom')}>{lessonOpts}</select>
          <span>→</span>
          <select className={`${inputCls} !w-auto`} value={to} onChange={(e) => setTo(Number(e.target.value))} aria-label={t('utTo')}>{lessonOpts}</select>
          <select className={`${inputCls} !w-auto`} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label={t('utSize')}>
            {SIZES.map((n) => <option key={n} value={n}>{t('exCount', { n })}</option>)}
          </select>
          <Button disabled={vocabCount < 4 && !exItems.length} onClick={startTest}>{test ? t('utNew') : t('utStart')}</Button>
        </div>
        <p className="text-xs text-muted">{t('utPool', { ex: exItems.length, words: vocabCount })}</p>
        {vocabCount < 4 && !exItems.length && <p className="text-sm text-warn">{t('utEmpty')}</p>}
      </Card>

      {test && (
        <>
          <Runner key={test.items.map((x) => x.id).join()} title={label(test.from, test.to)} items={test.items}
            stats={allStats(lessons)} onRecord={record} onClose={() => setTest(null)}
            onPrint={() => printSet(`${book.short} · ${t('utTitle')} · ${label(test.from, test.to)}`, test.items)} />
          {score && <p className="text-sm text-muted" role="status">{score}</p>}
        </>
      )}

      {history.length > 0 && (
        <Card className="space-y-2">
          <h3 className="font-semibold">{t('utHistory')}</h3>
          <ul className="divide-y divide-border text-sm">
            {history.map((h) => {
              const p = h.total ? h.right / h.total : 0
              return (
                <li key={h.at} className="flex items-center gap-3 py-1.5">
                  <span className="w-28 shrink-0">{label(h.from, h.to)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className={`block h-full ${p >= unlockRatio(book) ? 'bg-good' : p >= 0.5 ? 'bg-primary' : 'bg-warn'}`} style={{ width: `${p * 100}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{h.right}/{h.total}</span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:inline">{new Date(h.at).toLocaleDateString()}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
