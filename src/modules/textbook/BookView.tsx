/**
 * MỘT CUỐN GIÁO TRÌNH: biểu đồ tiến độ cả cuốn, cảnh báo bài yếu, lưới các bài (trạng thái, %, bài khóa),
 * và hai mục ôn tổng hợp: Điểm yếu của cả cuốn, Kiểm tra tổng hợp theo nhóm bài (xem BookReview.tsx).
 * Cài đặt của sách: học tuần tự (khóa bài sau), ôn các bài đã học, xóa sách.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { deleteBook, getBook, listLessons, updateBook } from './store'
import { bookProgress, isWeak, lockedSet, nextLesson, unlockRatio } from './lib/progress'
import { lessonTag } from './lib/learn'
import { Pill, ProgressBar, statusLabel, useTx } from './ui'
import { BookFiles } from './BookFiles'
import { BookChart, UnitTest, WeakPoints } from './BookReview'
import { BookNotes } from './BookNotes'

export type BookTab = 'lessons' | 'weak' | 'test' | 'notes'

export function BookView({ bookId, tab = 'lessons', onTab, onBack, onOpen, onRead }: {
  tab?: BookTab; onTab: (t: BookTab) => void
  bookId: string; onBack: () => void; onOpen: (n: number, section?: string) => void; onRead: (fileId: string, page?: number) => void
}) {
  const t = useTx()
  const navigate = useNavigate()
  const [confirmDel, setConfirmDel] = useState(false)
  const { data, loading } = useDbQuery(async () => {
    const [book, lessons] = await Promise.all([getBook(bookId), listLessons(bookId)])
    if (!book) return null
    const { byLesson, cards, grammarIds } = await bookProgress([book], lessons)
    const locked = lockedSet(book, lessons, byLesson)
    return { book, lessons, byLesson, cards, grammarIds, locked, next: nextLesson(book, lessons, locked) }
  }, [bookId], ['textbooks', 'textbookLessons', 'srsCards', 'kv', 'knownWords'])

  if (loading && !data) return null
  if (!data) {
    return <Card><p>{t('shelfEmpty')}</p><Button className="mt-3" variant="soft" onClick={onBack}>{t('back')}</Button></Card>
  }
  const { book, lessons, byLesson, cards, grammarIds, locked, next } = data
  const studied = lessons.filter((l) => l.status !== 'new')
  const done = lessons.filter((l) => l.status === 'done').length
  const pct = Math.round(unlockRatio(book) * 100)

  return (
    <>
      <Button variant="ghost" className="mb-2" onClick={onBack}>{t('back')}</Button>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-sm text-muted">{[book.edition, t('lessonsDone', { done, total: lessons.length })].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {next && <Button onClick={() => onOpen(next.number)}>{t('continueLesson', { n: next.number })}</Button>}
          {studied.length > 0 && (
            <Button variant="soft" onClick={() => navigate(`/review?tags=${studied.map((l) => lessonTag(book, l.number)).join(',')}`)}>
              {t('reviewBook')}
            </Button>
          )}
        </div>
      </div>

      <BookChart book={book} lessons={lessons} byLesson={byLesson} locked={locked} onOpen={onOpen} />

      <div className="mb-4">
        <Segmented<BookTab> label={t('bookTabs')} value={tab} onChange={onTab}
          options={[{ value: 'lessons', label: t('tabLessons') }, { value: 'weak', label: t('tabWeak') }, { value: 'test', label: t('tabTest') }, { value: 'notes', label: t('tabNotes') }]} />
      </div>

      {tab === 'weak' && <WeakPoints book={book} lessons={lessons} cards={cards} grammarIds={grammarIds} onOpen={onOpen} />}
      {tab === 'test' && <UnitTest book={book} lessons={lessons} />}
      {tab === 'notes' && <BookNotes book={book} lessons={lessons} onOpen={onOpen} onRead={onRead} />}

      {tab === 'lessons' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {lessons.map((l) => {
          const p = byLesson.get(l.id)
          const isLocked = locked.has(l.number)
          const weak = isWeak(p)
          return (
            <button key={l.id} onClick={() => onOpen(l.number)}
              className={`flex flex-col gap-2 rounded-card border bg-surface p-3 text-left shadow-card transition hover:border-primary ${
                book.lastLesson === l.number ? 'border-primary' : 'border-border'} ${isLocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t('lesson', { n: l.number })}</span>
                <span className="jp text-xs text-muted">第{l.number}課</span>
              </div>
              {l.title && <span className="truncate text-sm">{l.title}</span>}
              <div className="flex flex-wrap gap-1">
                {isLocked ? <Pill>🔒 {t('locked')}</Pill>
                  : <Pill tone={l.status === 'done' ? 'good' : l.status === 'learning' ? 'primary' : 'muted'}>{statusLabel(t, l.status)}</Pill>}
                {weak && <Pill tone="warn">{t('weak')}</Pill>}
              </div>
              <span className="text-xs text-muted">
                {p && p.total ? t('progress', { known: p.known, total: p.total }) : t('words', { n: 0 })}
              </span>
              <ProgressBar value={p?.ratio ?? 0} />
            </button>
          )
        })}
      </div>}

      <BookFiles bookId={book.id} onRead={onRead} />

      <Card className="mt-6 space-y-3">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={!!book.sequential}
            onChange={(e) => void updateBook(book.id, { sequential: e.target.checked })} />
          <span>
            <span className="font-medium">{t('sequential')}</span>
            <span className="block text-sm text-muted">{t('sequentialHint', { pct })}</span>
          </span>
        </label>
        {book.sequential && (
          <label className="flex items-center gap-3 text-sm">
            {t('unlockAt')}
            <input type="range" className="accent-[var(--primary)]" min={50} max={100} step={5} value={pct}
              onChange={(e) => void updateBook(book.id, { unlockAt: Number(e.target.value) / 100 })} />
            <span className="w-10 tabular-nums">{pct}%</span>
          </label>
        )}
        <div className="border-t border-border pt-3">
          {confirmDel ? (
            <div className="space-y-2">
              <p className="text-sm">{t('deleteConfirm', { book: book.title })}</p>
              <div className="flex gap-2">
                <Button variant="soft" className="!text-bad" onClick={() => void deleteBook(book.id).then(onBack)}>{t('delete')}</Button>
                <Button variant="ghost" onClick={() => setConfirmDel(false)}>{t('cancel')}</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDel(true)}>{t('deleteBook')}</Button>
          )}
        </div>
      </Card>
    </>
  )
}
