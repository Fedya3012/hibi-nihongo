/** KỆ SÁCH: các giáo trình đang học, tiến độ, "Học tiếp bài N", thêm giáo trình. */
import { useState } from 'react'
import { getAll, useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { addBookFromTemplate, addCustomBook, listBooks } from './store'
import { TEMPLATES } from './templates'
import { bookProgress, lockedSet, nextLesson } from './lib/progress'
import { inputCls, ProgressBar, useTx } from './ui'
import type { Lesson, Textbook } from './types'

export function Shelf({ onOpen }: { onOpen: (bookId: string, lesson?: number) => void }) {
  const t = useTx()
  const [adding, setAdding] = useState(false)
  const { data } = useDbQuery(async () => {
    const [books, lessons] = await Promise.all([listBooks(), getAll<Lesson>('textbookLessons')])
    const { byLesson } = await bookProgress(books, lessons)
    return books.map((b) => {
      const ls = lessons.filter((l) => l.bookId === b.id).sort((x, y) => x.number - y.number)
      const locked = lockedSet(b, ls, byLesson)
      const done = ls.filter((l) => l.status === 'done').length
      const ratio = ls.length ? ls.reduce((s, l) => s + (byLesson.get(l.id)?.ratio ?? 0), 0) / ls.length : 0
      const resume = b.lastLesson != null && !locked.has(b.lastLesson) ? b.lastLesson : nextLesson(b, ls, locked)?.number
      return { book: b, done, ratio, resume }
    })
  }, [], ['textbooks', 'textbookLessons', 'srsCards', 'kv'])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')} <span className="jp ml-1 text-lg font-normal text-muted">教科書</span></h1>
        <Button onClick={() => setAdding(true)}>{t('addBook')}</Button>
      </div>

      {data && data.length === 0 && !adding && (
        <Card className="text-center">
          <div className="jp mb-2 text-5xl text-primary">本</div>
          <p className="text-muted">{t('shelfEmpty')}</p>
          <Button className="mt-4" onClick={() => setAdding(true)}>{t('addBook')}</Button>
        </Card>
      )}

      {adding && <AddBook have={new Set(data?.map((d) => d.book.id))} onClose={() => setAdding(false)}
        onCreated={(b) => { setAdding(false); onOpen(b.id) }} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map(({ book, done, ratio, resume }) => (
          <Card key={book.id} className="flex flex-col gap-3">
            <button className="text-left" onClick={() => onOpen(book.id)}>
              <h2 className="text-lg font-semibold">{book.title}</h2>
              <p className="text-sm text-muted">
                {[book.edition, t('lessonsDone', { done, total: book.lessonCount })].filter(Boolean).join(' · ')}
              </p>
            </button>
            <ProgressBar value={ratio} />
            <div className="flex flex-wrap gap-2">
              {resume != null && <Button onClick={() => onOpen(book.id, resume)}>{t('continueLesson', { n: resume })}</Button>}
              <Button variant="soft" onClick={() => onOpen(book.id)}>{t('allLessons')}</Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">{t('copyright')}</p>
    </>
  )
}

function AddBook({ have, onClose, onCreated }: { have: Set<string>; onClose: () => void; onCreated: (b: Textbook) => void }) {
  const t = useTx()
  const [title, setTitle] = useState('')
  const [first, setFirst] = useState(1)
  const [count, setCount] = useState(20)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<Textbook>) => {
    setBusy(true)
    try { onCreated(await fn()) } finally { setBusy(false) }
  }
  return (
    <Card className="mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('addTitle')}</h2>
        <Button variant="ghost" onClick={onClose}>{t('close')}</Button>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">{t('fromTemplate')}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((tp) => (
            <button key={tp.id} disabled={busy || have.has(tp.id)} onClick={() => void run(() => addBookFromTemplate(tp))}
              className="rounded-xl border border-border p-3 text-left transition hover:border-primary disabled:opacity-50">
              <span className="font-medium">{tp.title}</span>
              <span className="block text-sm text-muted">
                {tp.edition} · {t('lesson', { n: tp.firstLesson })}–{tp.firstLesson + tp.lessonCount - 1}
                {have.has(tp.id) ? ` · ${t('added')}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => addCustomBook({ title, firstLesson: first, lessonCount: count })) }}>
        <h3 className="text-sm font-medium text-muted">{t('custom')}</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem]">
          <label className="text-sm">{t('customName')}
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marugoto A1, Quartet I…" required />
          </label>
          <label className="text-sm">{t('customFirst')}
            <input className={inputCls} type="number" min={0} value={first} onChange={(e) => setFirst(Number(e.target.value))} />
          </label>
          <label className="text-sm">{t('customCount')}
            <input className={inputCls} type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        </div>
        <Button type="submit" variant="soft" disabled={busy || !title.trim()}>{t('create')}</Button>
      </form>
    </Card>
  )
}
