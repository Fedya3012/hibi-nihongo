/**
 * MỤC KANJI CỦA BÀI
 * Tự rút các chữ Kanji có trong từ vựng của bài (+ chữ bạn thêm tay). Mỗi chữ: âm Hán Việt, On/Kun, nghĩa,
 * từ trong bài có chữ đó. Bấm chữ để mở trang Kanji (hoạt ảnh nét, luyện viết chấm từng nét).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Furigana, getKanji, isKanji, type KanjiData } from '@/modules/dictionary'
import { addReviewCards, tagReviewCards } from '@/modules/review/api'
import { updateLesson } from '../store'
import { lessonDeck, lessonTag } from '../lib/learn'
import { inputCls, useTx } from '../ui'
import type { Lesson, Textbook } from '../types'

/** Các chữ Kanji của bài, theo thứ tự xuất hiện, không lặp. */
export function lessonKanji(l: Lesson): string[] {
  const all = [...l.words.map((w) => w.word).join(''), ...(l.kanjiExtra ?? '')]
  return [...new Set(all.filter((c) => isKanji(c)))]
}

export function KanjiSection({ book, lesson }: { book: Textbook; lesson: Lesson }) {
  const t = useTx()
  const chars = lessonKanji(lesson)
  const [extra, setExtra] = useState(lesson.kanjiExtra ?? '')
  const [msg, setMsg] = useState('')
  const { data: info } = useDbQuery(async () => {
    const out = new Map<string, KanjiData>()
    for (const c of chars) {
      const d = await getKanji(c).catch(() => undefined)
      if (d) out.set(c, d)
    }
    return out
  }, [chars.join('')], ['packs'])

  const addToReview = async () => {
    const tag = lessonTag(book, lesson.number)
    const have = await tagReviewCards(chars.map((c) => ({ module: 'dictionary', ref: 'kanji:' + c })), tag)
    const n = await addReviewCards(chars.filter((c) => !have.has('dictionary:kanji:' + c) && info?.get(c)).map((c) => {
      const d = info!.get(c)!
      return {
        deck: lessonDeck(book, lesson.number), kind: 'kanji' as const, front: c,
        reading: [...(d.on ?? []), ...(d.kun ?? [])].join('、') || undefined,
        meaning: [d.hv?.length ? d.hv.join(', ').toUpperCase() : '', (d.m ?? []).join(', ')].filter(Boolean).join(' · '),
        tags: [tag], source: { module: 'dictionary', ref: 'kanji:' + c },
      }
    }))
    setMsg(t('kanjiAdded', { n }))
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t('kanjiAuto')} · {chars.length}</h2>
          {chars.length > 0 && <Button variant="soft" onClick={() => void addToReview()}>{t('kanjiAddReview')}</Button>}
        </div>
        {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
        {chars.length === 0 && <p className="text-muted">{t('kanjiEmpty')}</p>}
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          void updateLesson(book.id, lesson.number, (l) => ({ ...l, kanjiExtra: [...new Set([...extra].filter((c) => isKanji(c)))].join('') || undefined }))
        }}>
          <input className={`jp ${inputCls}`} lang="ja" placeholder={t('kanjiExtra')} value={extra} onChange={(e) => setExtra(e.target.value)} />
          <Button type="submit" variant="soft">{t('save')}</Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {chars.map((c) => {
          const d = info?.get(c)
          const words = lesson.words.filter((w) => w.word.includes(c))
          return (
            <Card key={c} className="flex gap-4">
              <Link to={`/learn/kanji?k=${encodeURIComponent(c)}`} className="jp text-5xl leading-none hover:text-primary" lang="ja">{c}</Link>
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                {d?.hv?.length ? <p className="font-semibold uppercase">{d.hv.join(', ')}</p> : null}
                {d?.m?.length ? <p className="text-muted">{d.m.slice(0, 4).join(', ')}</p> : null}
                {d?.on?.length ? <p className="jp" lang="ja">音 {d.on.join('、')}</p> : null}
                {d?.kun?.length ? <p className="jp" lang="ja">訓 {d.kun.slice(0, 6).join('、')}{d.kun.length > 6 ? '…' : ''}</p> : null}
                {words.length > 0 && (
                  <p className="flex flex-wrap gap-x-3">{words.map((w) => <Furigana key={w.id} text={w.word} reading={w.reading} />)}</p>
                )}
                <Link to={`/learn/kanji?tab=write&k=${encodeURIComponent(c)}`} className="inline-block text-primary underline">{t('kanjiWrite')}</Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
