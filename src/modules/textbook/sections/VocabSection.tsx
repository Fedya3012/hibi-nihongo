/**
 * MỤC TỪ VỰNG CỦA BÀI
 * - Dán danh sách từ (mỗi dòng một từ) → app tự tra Từ điển để điền cách đọc, loại từ, gợi ý nghĩa.
 * - Danh sách từ: furigana, nghĩa, loại từ, đã thuộc / đang học / chưa học; bấm từ để tra.
 * - Sửa, xóa, đổi thứ tự, tự đánh dấu thuộc / chưa thuộc, ghi chú riêng cho từng từ.
 */
import { useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { Furigana, PackSetup, useDictPacks } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import type { SrsCard } from '@/modules/review/api'
import { addWords, moveWord, removeWord, updateWord } from '../store'
import { parseList } from '../lib/parse'
import { matchWord } from '../lib/match'
import { sharedStatus, sourceKey, wordState, type WordState } from '../lib/progress'
import { setWordStatus, useKnowledge } from '@/modules/vocab/api'
import { classLabel, inputCls, Pill, useTx, WORD_CLASSES } from '../ui'
import type { Lesson, LessonWord, Textbook, WordClass } from '../types'

type Filter = 'all' | WordState

export function VocabSection({ book, lesson, cards }: { book: Textbook; lesson: Lesson; cards: Map<string, SrsCard> }) {
  const t = useTx()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [cls, setCls] = useState<WordClass | ''>('')

  const knowledge = useKnowledge()
  const rows = useMemo(() => lesson.words.map((w) => ({
    w, state: wordState(w, cards.get(sourceKey(lesson, w)), sharedStatus(w, knowledge)),
  })), [lesson, cards, knowledge])
  const shown = rows.filter((r) => (filter === 'all' || r.state === filter) && (!cls || r.w.wordClass === cls))
  const classes = WORD_CLASSES.filter((c) => lesson.words.some((w) => w.wordClass === c))

  return (
    <div className="space-y-4">
      {(adding || lesson.words.length === 0) && (
        <PasteBox book={book} lesson={lesson} onDone={() => setAdding(false)} canClose={lesson.words.length > 0} />
      )}

      {lesson.words.length > 0 && (
        <Card className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="max-w-full overflow-x-auto">
              <Segmented<Filter> label={t('filterAll')} value={filter} onChange={setFilter}
                options={[{ value: 'all', label: `${t('filterAll')} ${rows.length}` },
                  { value: 'known', label: t('known') }, { value: 'learning', label: t('learning') }, { value: 'unseen', label: t('unseen') }]} />
            </div>
            {classes.length > 1 && (
              <select className={`${inputCls} !w-auto`} value={cls} onChange={(e) => setCls(e.target.value as WordClass | '')} aria-label={t('wordClass')}>
                <option value="">{t('wordClass')}: {t('filterAll')}</option>
                {classes.map((c) => <option key={c} value={c}>{classLabel(t, c)}</option>)}
              </select>
            )}
            {!adding && <Button variant="soft" className="ml-auto" onClick={() => setAdding(true)}>{t('addWords')}</Button>}
          </div>
          <ul>
            {shown.map(({ w, state }) => (
              <WordRow key={w.id} lesson={lesson} w={w} state={state}
                first={lesson.words[0]?.id === w.id} last={lesson.words.at(-1)?.id === w.id} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function WordRow({ lesson, w, state, first, last }: { lesson: Lesson; w: LessonWord; state: WordState; first: boolean; last: boolean }) {
  const t = useTx()
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(w)
  const b = lesson.bookId, n = lesson.number

  if (editing) {
    const set = (patch: Partial<LessonWord>) => setV((x) => ({ ...x, ...patch }))
    return (
      <li className="border-t border-border p-3 first:border-0">
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault()
          void updateWord(b, n, { ...v, word: v.word.trim(), reading: v.reading?.trim() || undefined, meaning: v.meaning.trim(),
            note: v.note?.trim() || undefined }).then(() => setEditing(false))
        }}>
          <label className="text-sm">{t('word')}<input className={`jp ${inputCls}`} lang="ja" value={v.word} required onChange={(e) => set({ word: e.target.value })} /></label>
          <label className="text-sm">{t('reading')}<input className={`jp ${inputCls}`} lang="ja" value={v.reading ?? ''} onChange={(e) => set({ reading: e.target.value })} /></label>
          <label className="text-sm">{t('meaning')}<input className={inputCls} value={v.meaning} placeholder={w.en} onChange={(e) => set({ meaning: e.target.value })} /></label>
          <label className="text-sm">{t('wordClass')}
            <select className={inputCls} value={v.wordClass ?? ''} onChange={(e) => set({ wordClass: (e.target.value || undefined) as WordClass | undefined })}>
              <option value="">{classLabel(t)}</option>
              {WORD_CLASSES.map((c) => <option key={c} value={c}>{classLabel(t, c)}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">{t('note')}<input className={inputCls} value={v.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit">{t('save')}</Button>
            <Button type="button" variant="ghost" onClick={() => { setV(w); setEditing(false) }}>{t('cancel')}</Button>
            <Button type="button" variant="ghost" className="ml-auto !text-bad" onClick={() => void removeWord(b, n, w.id)}>{t('delete')}</Button>
          </div>
        </form>
      </li>
    )
  }

  // Bấm đánh dấu: theo Ôn tập → đã thuộc → chưa thuộc → theo Ôn tập
  const cycleKnown = async () => {
    const known = w.known === undefined ? true : w.known ? false : undefined
    await updateWord(b, n, { ...w, known })
    // Ghi luôn vào Kho từ dùng chung → từ này cũng đổi màu khi đọc manga, xem anime...
    await setWordStatus({ w: w.word, r: w.reading, id: w.jmId }, known === true ? 'known' : known === false ? 'learning' : null, 'textbook')
  }
  const stateTone = state === 'known' ? 'good' : state === 'learning' ? 'primary' : 'muted'

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 first:border-0">
      <button className="min-w-24 text-left text-xl hover:text-primary" lang="ja"
        onClick={(e) => openLookup(w.word, { x: e.clientX, y: e.clientY })}>
        <Furigana text={w.word} reading={w.reading} />
      </button>
      <div className="min-w-40 flex-1">
        {w.meaning ? <p>{w.meaning}</p> : <p className="italic text-muted">{w.en ?? '—'}</p>}
        {w.note && <p className="text-sm text-muted">✎ {w.note}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {w.wordClass && <Pill>{classLabel(t, w.wordClass)}</Pill>}
        <button onClick={() => void cycleKnown()} title={w.known === undefined ? t('markKnown') : w.known ? t('markUnknown') : t('markAuto')}>
          <Pill tone={stateTone}>{t(state)}{w.known !== undefined ? ' ✓' : ''}</Pill>
        </button>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" className="!min-h-8 !px-2" disabled={first} aria-label={t('up')} onClick={() => void moveWord(b, n, w.id, -1)}>↑</Button>
        <Button variant="ghost" className="!min-h-8 !px-2" disabled={last} aria-label={t('down')} onClick={() => void moveWord(b, n, w.id, 1)}>↓</Button>
        <Button variant="ghost" className="!min-h-8 !px-2" onClick={() => setEditing(true)}>{t('edit')}</Button>
      </div>
    </li>
  )
}

interface Draft { word: string; reading?: string; meaning: string; jmId?: string; en?: string; wordClass?: WordClass }

function PasteBox({ book, lesson, onDone, canClose }: { book: Textbook; lesson: Lesson; onDone: () => void; canClose: boolean }) {
  const t = useTx()
  const dict = useDictPacks()
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [busy, setBusy] = useState(false)

  const check = async () => {
    setBusy(true)
    try {
      const out: Draft[] = []
      for (const p of parseList(text)) {
        const m = dict.ready ? await matchWord(p.word, p.reading) : undefined
        out.push({ ...p, reading: p.reading ?? m?.reading, jmId: m?.jmId, en: m?.en, wordClass: m?.wordClass })
      }
      setDrafts(out)
    } finally { setBusy(false) }
  }

  const save = async () => {
    if (!drafts?.length) return
    setBusy(true)
    try {
      await addWords(book.id, lesson.number, drafts)
      setText(''); setDrafts(null); onDone()
    } finally { setBusy(false) }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{lesson.words.length ? t('pasteTitle') : t('addWords')}</h2>
        {canClose && <Button variant="ghost" onClick={onDone}>{t('close')}</Button>}
      </div>
      {!lesson.words.length && <p className="text-sm text-muted">{t('emptyVocab')}</p>}
      <p className="text-sm text-muted">{t('pasteHint')}</p>
      {!dict.loading && !dict.ready && (
        <>
          <p className="text-sm text-warn">{t('noDict')}</p>
          <PackSetup />
        </>
      )}
      <textarea className={`jp ${inputCls} min-h-36 py-2`} lang="ja" placeholder={t('pastePh')} value={text}
        onChange={(e) => { setText(e.target.value); setDrafts(null) }} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" disabled={busy || !text.trim()} onClick={() => void check()}>
          {busy && !drafts ? t('checking') : t('preview', { n: parseList(text).length })}
        </Button>
        {drafts && <Button disabled={busy || !drafts.length} onClick={() => void save()}>{t('addN', { n: drafts.length })}</Button>}
      </div>
      {drafts && drafts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr><th className="py-1 pr-3">{t('word')}</th><th className="pr-3">{t('meaning')}</th><th className="pr-3">{t('wordClass')}</th><th /></tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1 pr-3 text-base"><Furigana text={d.word} reading={d.reading} /></td>
                  <td className="pr-3">{d.meaning || <span className="italic text-muted">{d.en ?? '—'}</span>}</td>
                  <td className="pr-3">{classLabel(t, d.wordClass)}</td>
                  <td className={d.jmId ? 'text-good' : 'text-muted'}>{dict.ready ? (d.jmId ? `✓ ${t('found')}` : t('notFound')) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
