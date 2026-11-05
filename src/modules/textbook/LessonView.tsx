/**
 * MỘT BÀI: đầu trang (trạng thái, tiến độ, Học bài này, Ôn riêng bài này, Học tiếp bài sau)
 * + 7 mục cố định: Từ vựng · Ngữ pháp · Hội thoại · Luyện nghe · Bài tập · Kanji · Đọc hiểu/Viết
 * + ghi chú của bài.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { getBook, listLessons, markOpened, setLessonNotes, setLessonStatus, setLessonTitle } from './store'
import { bookProgress, lockedSet, unlockRatio } from './lib/progress'
import { learnLesson, lessonTag, type LearnResult } from './lib/learn'
import { listFiles } from './lib/files'
import { VocabSection } from './sections/VocabSection'
import { KanjiSection } from './sections/KanjiSection'
import { GrammarSection } from './sections/GrammarSection'
import { SoonSection } from './sections/SoonSection'
import { inputCls, ProgressBar, useTx, type Key } from './ui'
import { SECTIONS, type LessonStatus, type Section } from './types'

const SECTION_KEY: Record<Section, Key> = {
  vocab: 'secVocab', grammar: 'secGrammar', dialogue: 'secDialogue', listening: 'secListening',
  exercise: 'secExercise', kanji: 'secKanji', reading: 'secReading',
}

export function LessonView({ bookId, number, section, onSection, onLesson, onBack, onRead }: {
  bookId: string
  number: number
  section: Section
  onSection: (s: Section) => void
  onLesson: (n: number) => void
  onBack: () => void
  onRead: (fileId: string, page?: number) => void
}) {
  const t = useTx()
  const navigate = useNavigate()
  const [forceOpen, setForceOpen] = useState(false)
  const [learnMsg, setLearnMsg] = useState<LearnResult | null>(null)
  const [busy, setBusy] = useState(false)

  const { data } = useDbQuery(async () => {
    const [book, lessons, files] = await Promise.all([getBook(bookId), listLessons(bookId), listFiles(bookId)])
    if (!book) return null
    const { cards, byLesson, grammarIds } = await bookProgress([book], lessons)
    const lesson = lessons.find((l) => l.number === number)
    const locked = lockedSet(book, lessons, byLesson)
    const i = lessons.findIndex((l) => l.number === number)
    return { book, lesson, cards, prog: lesson ? byLesson.get(lesson.id) : undefined, locked, nextNo: lessons[i + 1]?.number,
      gIds: lesson ? grammarIds.get(lesson.id) ?? [] : [], files }
  }, [bookId, number], ['textbooks', 'textbookLessons', 'srsCards', 'kv', 'textbookMedia'])

  const isLocked = !!data?.locked.has(number)
  // Ghi nhớ bài đang học (cho "Học tiếp", màn Hôm nay) khi bài mở được
  useEffect(() => {
    if (data?.lesson && (!isLocked || forceOpen)) void markOpened(bookId, number)
  }, [bookId, number, !!data?.lesson, isLocked, forceOpen])

  if (!data) return null
  const { book, lesson, cards, prog, nextNo, gIds, files } = data
  const startPage = book.lessonPages?.[number]
  const bookFile = startPage ? files.find((f) => f.id === startPage.fileId) : files[0]
  if (!lesson) {
    return <Card><Button variant="soft" onClick={onBack}>{t('backBook', { book: book.short })}</Button></Card>
  }

  const learn = async () => {
    setBusy(true)
    try { setLearnMsg(await learnLesson(book, lesson, gIds)) } finally { setBusy(false) }
  }

  const header = (
    <>
      <Button variant="ghost" className="mb-2" onClick={onBack}>{t('backBook', { book: book.short })}</Button>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t('lesson', { n: number })} <span className="jp ml-1 text-lg font-normal text-muted">第{number}課</span>
        </h1>
        <Segmented<LessonStatus> label={t('statusLearning')} value={lesson.status}
          onChange={(s) => void setLessonStatus(bookId, number, s)}
          options={[{ value: 'new', label: t('statusNew') }, { value: 'learning', label: t('statusLearning') }, { value: 'done', label: t('statusDone') }]} />
      </div>
    </>
  )

  if (isLocked && !forceOpen) {
    return (
      <>
        {header}
        <Card className="space-y-3 text-center">
          <div className="text-4xl">🔒</div>
          <p>{t('lockedLesson', { pct: Math.round(unlockRatio(book) * 100) })}</p>
          <Button variant="soft" onClick={() => setForceOpen(true)}>{t('openAnyway')}</Button>
        </Card>
      </>
    )
  }

  return (
    <>
      {header}
      <Card className="mb-4 space-y-3">
        <input className={inputCls} placeholder={t('lessonTitlePh')} defaultValue={lesson.title ?? ''}
          onBlur={(e) => { if (e.target.value !== (lesson.title ?? '')) void setLessonTitle(bookId, number, e.target.value) }} />
        <div className="flex items-center gap-3">
          <ProgressBar value={prog?.ratio ?? 0} className="flex-1" />
          <span className="text-sm text-muted">
            {t('progress', { known: prog?.known ?? 0, total: prog?.total ?? 0 })}
            {gIds.length > 0 && <> · {t('grammarProgress', { done: prog?.grammarLearned ?? 0, total: gIds.length })}</>}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || (!lesson.words.length && !gIds.length)} onClick={() => void learn()}>{t('learnLesson')}</Button>
          <Button variant="soft" disabled={!prog?.inReview && !prog?.grammarLearned} onClick={() => navigate(`/review?tags=${lessonTag(book, number)}`)}>
            {t('reviewLesson')}
          </Button>
          {bookFile && (
            <Button variant="soft" title={startPage ? undefined : t('rSetPageHint')}
              onClick={() => onRead(bookFile.id, startPage?.page)}>
              📕 {startPage ? t('rOpenBook', { n: startPage.page + 1 }) : t('rOpenBookNoPage')}
            </Button>
          )}
          {nextNo != null && (
            <Button variant="ghost" className="ml-auto" onClick={() => onLesson(nextNo)}>{t('nextLesson', { n: nextNo })}</Button>
          )}
        </div>
        {learnMsg && (
          <p className="text-sm text-muted" role="status">
            {lesson.words.length > 0 && t('learnDone', { added: learnMsg.added, tagged: learnMsg.tagged })}
            {learnMsg.grammar > 0 && <> {t('learnGrammar', { n: learnMsg.grammar })}</>}
            {learnMsg.skipped.length > 0 && <> {t('learnSkipped', { n: learnMsg.skipped.length, list: learnMsg.skipped.join('、') })}</>}
          </p>
        )}
      </Card>

      {/* 7 mục: cuộn ngang trên điện thoại */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div role="tablist" className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
          {SECTIONS.map((s) => (
            <button key={s} role="tab" aria-selected={section === s} onClick={() => onSection(s)}
              className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-sm transition ${
                section === s ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text'}`}>
              {t(SECTION_KEY[s])}
            </button>
          ))}
        </div>
      </div>

      {section === 'vocab' && <VocabSection book={book} lesson={lesson} cards={cards} />}
      {section === 'kanji' && <KanjiSection book={book} lesson={lesson} />}
      {section === 'grammar' && <GrammarSection book={book} lesson={lesson} ids={gIds} />}
      {section === 'dialogue' && <SoonSection step={3} text={t('soonDialogue')} />}
      {section === 'listening' && <SoonSection step={3} text={t('soonListening')} />}
      {section === 'exercise' && <SoonSection step={4} text={t('soonExercise')} />}
      {section === 'reading' && <SoonSection step={3} text={t('soonReading')} />}

      <Card className="mt-4">
        <label className="block">
          <span className="mb-1 block font-medium">{t('notes')}</span>
          <textarea className={`${inputCls} min-h-24 py-2`} placeholder={t('notesPh')} defaultValue={lesson.notes ?? ''}
            onBlur={(e) => { if (e.target.value !== (lesson.notes ?? '')) void setLessonNotes(bookId, number, e.target.value) }} />
        </label>
      </Card>
    </>
  )
}
