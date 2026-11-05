/**
 * Khối "Giáo trình" cho màn Hôm nay: sách đang học, bài nên học tiếp, tiến độ cả cuốn,
 * các bài nên ôn lại và lần kiểm tra tổng hợp gần nhất. Chỉ đọc dữ liệu.
 */
import { Link } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { ButtonLink } from '@/design/components/Button'
import { listBooks, listLessons } from './store'
import { bookProgress, isWeak, lockedSet, nextLesson } from './lib/progress'
import { ProgressBar, useTx } from './ui'

const bookUrl = (id: string, extra = '') => `/learn/textbook?b=${encodeURIComponent(id)}${extra}`

export default function TextbookTodayWidget() {
  const t = useTx()
  const { data, loading } = useDbQuery(async () => {
    const books = await listBooks()
    // Sách mở gần nhất (hoặc sách đầu tiên trên kệ)
    const book = [...books].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0]
    if (!book) return null
    const lessons = await listLessons(book.id)
    const { byLesson } = await bookProgress([book], lessons)
    const locked = lockedSet(book, lessons, byLesson)
    const next = nextLesson(book, lessons, locked)
    const avg = lessons.length ? lessons.reduce((s, l) => s + (byLesson.get(l.id)?.ratio ?? 0), 0) / lessons.length : 0
    const weak = lessons.filter((l) => isWeak(byLesson.get(l.id))).map((l) => l.number)
    const done = lessons.filter((l) => l.status === 'done').length
    return { book, next, nextRatio: next ? byLesson.get(next.id)?.ratio ?? 0 : 0, avg, weak, done, total: lessons.length, test: book.tests?.at(-1) }
  }, [], ['textbooks', 'textbookLessons', 'srsCards', 'kv', 'knownWords'])

  if (loading && !data) return null
  if (!data) {
    return (
      <div>
        <p className="text-sm text-muted">{t('title')}</p>
        <h2 className="mt-1 text-lg font-semibold">{t('tdEmpty')}</h2>
        <ButtonLink to="/learn/textbook" variant="soft" className="mt-3">{t('tdAddBook')}</ButtonLink>
      </div>
    )
  }
  const { book, next, nextRatio, avg, weak, done, total, test } = data

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted">{t('title')}</p>
        <Link to={bookUrl(book.id)} className="block truncate text-lg font-semibold hover:underline">{book.title}</Link>
        <p className="text-sm text-muted">{t('lessonsDone', { done, total })} · {t('tdAvg', { pct: Math.round(avg * 100) })}</p>
        <ProgressBar value={avg} className="mt-1.5" />
      </div>
      {next && (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t('lesson', { n: next.number })}{next.title ? `: ${next.title}` : ''}</p>
            <p className="text-xs text-muted">{t('tdLessonPct', { pct: Math.round(nextRatio * 100) })}</p>
          </div>
          <ButtonLink to={bookUrl(book.id, `&l=${next.number}`)} className="shrink-0">{t('continueLesson', { n: next.number })}</ButtonLink>
        </div>
      )}
      {weak.length > 0 && (
        <p className="rounded-xl bg-warn/15 px-3 py-2 text-sm">
          ⚠ {t('tdWeak', { list: weak.slice(0, 5).map((n) => t('lesson', { n })).join(', ') })}{' '}
          <Link to={bookUrl(book.id, '&v=weak')} className="font-medium text-primary hover:underline">{t('tabWeak')} →</Link>
        </p>
      )}
      {test && (
        <p className="text-sm text-muted">
          {t('tdLastTest', { range: test.from === test.to ? t('lesson', { n: test.from }) : t('utRange', { from: test.from, to: test.to }), right: test.right, total: test.total })}{' '}
          <Link to={bookUrl(book.id, '&v=test')} className="text-primary hover:underline">{t('utNew')} →</Link>
        </p>
      )}
    </div>
  )
}
