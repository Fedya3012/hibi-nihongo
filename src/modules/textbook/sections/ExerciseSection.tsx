/**
 * MỤC BÀI TẬP CỦA BÀI
 * - Bạn chép bài tập trong sách (mỗi dòng một câu): chọn đáp án, điền, sắp xếp câu, kèm giải thích.
 * - Làm bài: bấm "Kiểm tra" để app tự chấm, hiện đáp án đúng và giải thích. Làm lại cả bộ hoặc chỉ câu sai.
 * - Mỗi lần chấm được ghi lại (đúng / sai bao nhiêu lần, lần sai gần nhất trả lời gì) → "Câu hay sai".
 * - Bài tập tự tạo từ từ vựng của bài (cần ≥ 4 từ có nghĩa).
 * - Xuất PDF: mở hộp thoại In với đề + đáp án, chọn "Lưu thành PDF".
 */
import { useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { JapaneseText } from '@/modules/dictionary'
import { makeId } from '../store'
import {
  check, clearStats, deleteSet, exerciseToText, isWeakItem, parseExerciseText, printSet, recordResults, saveSet, shuffle,
  vocabQuiz,
} from '../lib/exercises'
import { inputCls, useTx, type Key } from '../ui'
import type { ExerciseSet, ExItem, Lesson, LessonWord, Textbook } from '../types'

const KIND_KEY: Record<ExItem['kind'], Key> = { choice: 'exKindChoice', fill: 'exKindFill', order: 'exKindOrder' }

export function ExerciseSection({ book, lesson }: { book: Textbook; lesson: Lesson }) {
  const t = useTx()
  const sets = lesson.exercises ?? []
  const [editing, setEditing] = useState<ExerciseSet | null>(null)
  const [vocab, setVocab] = useState<ExItem[] | null>(null)
  const [weakRun, setWeakRun] = useState<ExItem[] | null>(null)
  const canVocab = lesson.words.filter((w) => (w.meaning || w.en)?.trim()).length >= 4
  const record = (r: Record<string, [boolean, string]>) => recordResults(book.id, lesson.number, r)
  const title = (s?: string) => `${book.short} · ${t('lesson', { n: lesson.number })}${s ? ` · ${s}` : ''}`

  return (
    <div className="space-y-4">
      {sets.length === 0 && !editing && (
        <Card className="space-y-2">
          <p className="text-muted">{t('exEmpty')}</p>
          <FormatHelp />
        </Card>
      )}

      {sets.map((s) => editing?.id === s.id
        ? <SetEditor key={s.id} book={book} lesson={lesson} set={s} onDone={() => setEditing(null)} />
        : (
          <Runner key={s.id} title={s.title || t('exUntitled')} items={s.items} stats={lesson.exStats} onRecord={record}
            onEdit={() => setEditing(s)} onPrint={() => printSet(title(s.title), s.items)} />
        ))}
      {editing && !sets.some((x) => x.id === editing.id) && (
        <SetEditor book={book} lesson={lesson} set={editing} onDone={() => setEditing(null)} />
      )}
      {!editing && (
        <Button variant="soft" onClick={() => setEditing({ id: makeId(), items: [], createdAt: Date.now() })}>{t('exAdd')}</Button>
      )}

      {/* Bài tập tự tạo từ từ vựng */}
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{t('exVocabTitle')}</h3>
          {canVocab && (
            <span className="ml-auto flex gap-2">
              <Button variant="soft" className="!min-h-9" onClick={() => setVocab(vocabQuiz(lesson))}>{vocab ? t('exNewQuiz') : t('exStart')}</Button>
              {vocab && <Button variant="ghost" className="!min-h-9" onClick={() => setVocab(null)}>{t('exClose')}</Button>}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{canVocab ? t('exVocabHint') : t('exVocabNeed')}</p>
        {vocab && (
          <Runner key={vocab[0]?.id + vocab.length} title="" bare items={vocab} stats={lesson.exStats} onRecord={record}
            onPrint={() => printSet(title(t('exVocabTitle')), vocab)} />
        )}
      </Card>

      <WeakList book={book} lesson={lesson} onPractice={setWeakRun} />
      {weakRun && (
        <Runner key={weakRun.map((x) => x.id).join()} title={t('exWeakRun')} items={weakRun} stats={lesson.exStats} onRecord={record}
          onClose={() => setWeakRun(null)} onPrint={() => printSet(title(t('exWeakTitle')), weakRun)} />
      )}
    </div>
  )
}

function FormatHelp() {
  const t = useTx()
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">{t('exFormatTitle')}</summary>
      <ul className="mt-2 space-y-2">
        <li><b>{t('exKindChoice')}:</b> <code className="jp rounded bg-surface-2 px-1">わたしは がくせい（　）。 [*です | ます | か]</code></li>
        <li><b>{t('exKindFill')}:</b> <code className="jp rounded bg-surface-2 px-1">たべます → て形 = たべて</code> <span className="text-muted">{t('exFormatFill')}</span></li>
        <li><b>{t('exKindOrder')}:</b> <code className="jp rounded bg-surface-2 px-1">{'{わたし / は / がくせい / です}'}</code> <span className="text-muted">{t('exFormatOrder')}</span></li>
        <li className="text-muted">{t('exFormatExplain')}</li>
      </ul>
    </details>
  )
}

/* ---------------- Nhập / sửa một bộ bài tập ---------------- */

function SetEditor({ book, lesson, set, onDone }: { book: Textbook; lesson: Lesson; set: ExerciseSet; onDone: () => void }) {
  const t = useTx()
  const [title, setTitle] = useState(set.title ?? '')
  const [text, setText] = useState(exerciseToText(set.items))
  const [confirmDel, setConfirmDel] = useState(false)
  const parsed = parseExerciseText(text)
  const items = parsed.flatMap((p) => (p.item ? [p.item] : []))
  const errors = parsed.filter((p) => p.error).length
  const isNew = !(lesson.exercises ?? []).some((x) => x.id === set.id)

  const save = async () => {
    // Giữ mã câu cũ nếu câu không đổi, để lịch sử làm bài vẫn khớp
    const old = new Map(set.items.map((it) => [exerciseToText([it]), it.id]))
    const merged = items.map((it) => ({ ...it, id: old.get(exerciseToText([it])) ?? it.id }))
    const heading = parsed.find((p) => p.heading)?.heading
    await saveSet(book.id, lesson.number, { ...set, title: title.trim() || heading || undefined, items: merged })
    onDone()
  }

  return (
    <Card className="space-y-3">
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('exTitlePh')} />
      <textarea className={`${inputCls} jp min-h-48 py-2`} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={t('exTextPh')} aria-label={t('exText')} />
      <FormatHelp />
      {parsed.length > 0 && (
        <ol className="max-h-64 space-y-1 overflow-auto rounded-xl bg-surface-2 p-2 text-sm" aria-label={t('exPreview')}>
          {parsed.map((p, i) => (
            <li key={i} className="flex gap-2">
              {p.heading != null ? <b>{p.heading}</b> : p.item ? (
                <>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 text-xs leading-5">{t(KIND_KEY[p.item.kind])}</span>
                  <span className="jp min-w-0 truncate">{p.item.q || p.item.answer.join(' ')}</span>
                  <span className="ml-auto shrink-0 text-good">→ {p.item.kind === 'order' ? p.item.answer.join(' ') : p.item.answer.join(' / ')}</span>
                </>
              ) : (
                <>
                  <span className="shrink-0 rounded-full bg-warn/35 px-2 text-xs leading-5">?</span>
                  <span className="jp min-w-0 truncate text-muted">{p.raw.trim()}</span>
                  <span className="ml-auto shrink-0 text-xs text-bad">{t(`exErr_${p.error}` as Key)}</span>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!items.length} onClick={() => void save()}>{t('exSave', { n: items.length })}</Button>
        <Button variant="ghost" onClick={onDone}>{t('cancel')}</Button>
        {errors > 0 && <span className="text-sm text-bad">{t('exErrors', { n: errors })}</span>}
        {!isNew && (confirmDel ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-sm">{t('exDeleteConfirm')}</span>
            <Button variant="soft" className="!text-bad" onClick={() => void deleteSet(book.id, lesson.number, set.id).then(onDone)}>{t('delete')}</Button>
          </span>
        ) : <Button variant="ghost" className="ml-auto !text-bad" onClick={() => setConfirmDel(true)}>{t('delete')}</Button>)}
      </div>
    </Card>
  )
}

/* ---------------- Làm bài ---------------- */

type Answer = string | number[] // chữ (chọn / điền) · thứ tự các mảnh đã xếp (sắp xếp)

interface RunnerProps {
  title: string
  items: ExItem[]
  stats?: Lesson['exStats']
  onRecord: (r: Record<string, [boolean, string]>) => Promise<void>
  onEdit?: () => void
  onClose?: () => void
  onPrint: () => void
  /** Không bọc Card (đã nằm trong Card khác). */
  bare?: boolean
}

function Runner({ title, items, stats, onRecord, onEdit, onClose, onPrint, bare }: RunnerProps) {
  const t = useTx()
  const [only, setOnly] = useState<string[] | null>(null) // null = cả bộ
  const [round, setRound] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [result, setResult] = useState<Record<string, boolean> | null>(null)
  const shown = only ? items.filter((it) => only.includes(it.id)) : items
  // Mỗi lượt làm xáo lại các mảnh câu sắp xếp
  const pools = useMemo(() => Object.fromEntries(items.map((it) => [it.id, shuffle(it.answer.map((_, i) => i))])), [items, round])

  const text = (it: ExItem, a?: Answer) => (a == null ? '' : typeof a === 'string' ? a : a.map((i) => it.answer[i]).join(' '))
  const given = (it: ExItem): string | string[] => {
    const a = answers[it.id]
    return it.kind === 'order' ? (Array.isArray(a) ? a.map((i) => it.answer[i]) : []) : typeof a === 'string' ? a : ''
  }
  const answered = shown.filter((it) => (it.kind === 'order' ? (answers[it.id] as number[] | undefined)?.length === it.answer.length : !!(answers[it.id] as string)?.trim())).length

  const submit = async () => {
    const res: Record<string, boolean> = {}
    const rec: Record<string, [boolean, string]> = {}
    for (const it of shown) {
      res[it.id] = check(it, given(it))
      // Câu bỏ trống: vẫn tính sai trong lượt này nhưng không ghi vào lịch sử câu sai
      const ans = text(it, answers[it.id])
      if (ans.trim()) rec[it.id] = [res[it.id], ans]
    }
    setResult(res)
    await onRecord(rec)
  }
  const restart = (ids: string[] | null) => { setOnly(ids); setAnswers({}); setResult(null); setRound((r) => r + 1) }
  const wrongIds = result ? shown.filter((it) => !result[it.id]).map((it) => it.id) : []
  const right = result ? shown.length - wrongIds.length : 0

  const body = (
    <div className="space-y-3">
      {(title || onEdit || onClose) && (
        <div className="flex flex-wrap items-center gap-2">
          {title && <h3 className="font-semibold">{title}</h3>}
          <span className="text-sm text-muted">{t('exCount', { n: shown.length })}</span>
          <span className="ml-auto flex gap-1">
            <Button variant="ghost" className="!min-h-9" onClick={onPrint} title={t('exPrintHint')}>{t('exPrint')}</Button>
            {onEdit && <Button variant="ghost" className="!min-h-9" onClick={onEdit}>{t('trEdit')}</Button>}
            {onClose && <Button variant="ghost" className="!min-h-9" onClick={onClose}>{t('exClose')}</Button>}
          </span>
        </div>
      )}
      <ol className="space-y-3">
        {shown.map((it, i) => {
          const ok = result?.[it.id]
          const st = stats?.[it.id]
          return (
            <li key={it.id} data-ex={it.kind}
              className={`rounded-xl border p-3 ${result ? (ok ? 'border-good/60 bg-good/5' : 'border-bad/60 bg-bad/5') : 'border-border'}`}>
              <div className="mb-2 flex gap-2">
                <span className="shrink-0 font-semibold">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  {it.q ? <JapaneseText text={it.q} className="jp" /> : <span className="text-muted">{t('exOrderPrompt')}</span>}
                </div>
                {result ? <span className={`shrink-0 font-bold ${ok ? 'text-good' : 'text-bad'}`}>{ok ? '✓' : '✗'}</span>
                  : st && isWeakItem(st) && <span className="shrink-0 text-xs text-warn" title={t('exWeakBadgeHint', { n: st.wrong })}>⚠ {st.wrong}</span>}
              </div>
              <ItemInput it={it} value={answers[it.id]} pool={pools[it.id]} locked={!!result} correct={ok}
                onChange={(v) => setAnswers((a) => ({ ...a, [it.id]: v }))}
                onEnter={() => { if (!result && answered === shown.length) void submit() }} />
              {result && !ok && (
                <p className="mt-2 text-sm"><span className="text-muted">{t('exCorrect')}</span>{' '}
                  <span className="jp font-medium text-good">{it.kind === 'order' ? it.answer.join(' ') : it.answer.join(' / ')}</span></p>
              )}
              {result && it.explain && <p className="mt-1 text-sm text-muted">💡 {it.explain}</p>}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {!result ? (
          <>
            <Button disabled={!answered} onClick={() => void submit()}>{t('exCheck')}</Button>
            <span className="text-sm text-muted">{t('exAnswered', { n: answered, total: shown.length })}</span>
          </>
        ) : (
          <>
            <span className={`font-semibold ${right === shown.length ? 'text-good' : ''}`} role="status">
              {t('exScore', { n: right, total: shown.length })}{right === shown.length ? ' 🎉' : ''}
            </span>
            <Button variant="soft" onClick={() => restart(null)}>{t('exRetry')}</Button>
            {wrongIds.length > 0 && <Button onClick={() => restart(wrongIds)}>{t('exRetryWrong', { n: wrongIds.length })}</Button>}
          </>
        )}
      </div>
    </div>
  )
  return bare ? body : <Card>{body}</Card>
}

function ItemInput({ it, value, pool, locked, correct, onChange, onEnter }: {
  it: ExItem; value?: Answer; pool: number[]; locked: boolean; correct?: boolean
  onChange: (v: Answer) => void; onEnter: () => void
}) {
  const t = useTx()
  if (it.kind === 'choice') {
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {(it.options ?? []).map((o) => {
          const picked = value === o
          const isRight = it.answer[0] === o
          const tone = locked
            ? isRight ? 'border-good bg-good/15' : picked ? 'border-bad bg-bad/15 line-through' : 'border-border opacity-60'
            : picked ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary'
          return (
            <button key={o} type="button" role="radio" aria-checked={picked} disabled={locked}
              className={`jp min-h-10 rounded-xl border px-3 ${tone}`} onClick={() => onChange(o)}>{o}</button>
          )
        })}
      </div>
    )
  }
  if (it.kind === 'fill') {
    return (
      <input className={`${inputCls} jp ${locked ? (correct ? '!border-good' : '!border-bad') : ''}`} value={(value as string) ?? ''}
        disabled={locked} placeholder={t('exFillPh')} lang="ja" autoComplete="off" spellCheck={false}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onEnter() }} />
    )
  }
  // Sắp xếp: bấm mảnh ở dưới để đưa lên câu, bấm mảnh trong câu để trả lại
  const picked = Array.isArray(value) ? value : []
  const chip = 'jp min-h-10 rounded-xl border px-3'
  return (
    <div className="space-y-2">
      <div className={`flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-dashed p-2 ${locked ? (correct ? 'border-good' : 'border-bad') : 'border-border'}`}
        aria-label={t('exOrderAnswer')}>
        {picked.length === 0 && <span className="text-sm text-muted">{t('exOrderHint')}</span>}
        {picked.map((idx, k) => (
          <button key={k} type="button" disabled={locked} className={`${chip} border-primary bg-primary-soft`}
            onClick={() => onChange(picked.filter((_, j) => j !== k))}>{it.answer[idx]}</button>
        ))}
      </div>
      {!locked && (
        <div className="flex flex-wrap gap-2" aria-label={t('exOrderPieces')}>
          {pool.filter((idx) => !picked.includes(idx)).map((idx) => (
            <button key={idx} type="button" className={`${chip} border-border bg-surface hover:border-primary`}
              onClick={() => onChange([...picked, idx])}>{it.answer[idx]}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Câu hay sai ---------------- */

function WeakList({ book, lesson, onPractice }: { book: Textbook; lesson: Lesson; onPractice: (items: ExItem[]) => void }) {
  const t = useTx()
  const [confirm, setConfirm] = useState(false)
  const stats = lesson.exStats ?? {}
  // Câu của các bộ bài tập + câu từ vựng tự tạo (tạo lại từ mã câu)
  const all = new Map<string, ExItem>()
  for (const s of lesson.exercises ?? []) for (const it of s.items) all.set(it.id, it)
  for (const id of Object.keys(stats)) {
    if (all.has(id) || !id.startsWith('auto:vocab:')) continue
    const [, , wid, dir] = id.split(':')
    const w = lesson.words.find((x) => x.id === wid)
    if (!w) continue
    const mean = (x: LessonWord) => (x.meaning || x.en || '').trim()
    const others = shuffle(lesson.words.filter((x) => x.id !== wid && mean(x))).slice(0, 3)
    all.set(id, dir === 'm'
      ? { id, kind: 'choice', q: w.word, options: shuffle([mean(w), ...others.map(mean)]), answer: [mean(w)] }
      : { id, kind: 'choice', q: mean(w), options: shuffle([w.word, ...others.map((x) => x.word)]), answer: [w.word] })
  }
  const rows = Object.entries(stats)
    .filter(([id, s]) => s.wrong > 0 && all.has(id))
    .sort(([, a], [, b]) => Number(isWeakItem(b)) - Number(isWeakItem(a)) || b.wrong - a.wrong || b.last - a.last)
  const weak = rows.filter(([, s]) => isWeakItem(s)).map(([id]) => all.get(id)!)
  if (!rows.length) return null

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{t('exWeakTitle')}</h3>
        <span className="ml-auto flex flex-wrap gap-2">
          {weak.length > 0 && <Button className="!min-h-9" onClick={() => onPractice(shuffle(weak))}>{t('exWeakPractice', { n: weak.length })}</Button>}
          {confirm
            ? <Button variant="soft" className="!min-h-9 !text-bad" onClick={() => void clearStats(book.id, lesson.number).then(() => setConfirm(false))}>{t('exClearConfirm')}</Button>
            : <Button variant="ghost" className="!min-h-9" onClick={() => setConfirm(true)}>{t('exClear')}</Button>}
        </span>
      </div>
      <p className="text-sm text-muted">{t('exWeakHint')}</p>
      <ul className="divide-y divide-border">
        {rows.map(([id, s]) => {
          const it = all.get(id)!
          return (
            <li key={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              <span className="jp min-w-0 flex-1 basis-60">{it.q || t('exKindOrder')}</span>
              <span className="jp text-good">{it.kind === 'order' ? it.answer.join(' ') : it.answer.join(' / ')}</span>
              {s.lastWrong && <span className="jp text-bad line-through">{s.lastWrong}</span>}
              <span className={`shrink-0 text-xs ${isWeakItem(s) ? 'text-warn' : 'text-muted'}`}>
                {t('exWeakStat', { wrong: s.wrong, right: s.right })}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
