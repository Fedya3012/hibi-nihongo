/**
 * ĐỌC MỘT TRUYỆN
 *   - Mỗi câu một dòng: nút 🔊 nghe riêng câu đó, chữ bấm để tra (dùng <JapaneseText> của Từ điển),
 *     bản dịch tiếng Việt hiện bên dưới khi bật "Bản dịch".
 *   - "Nghe cả truyện": giọng máy đọc lần lượt từng câu, câu đang đọc được tô sáng và tự cuộn tới.
 *   - Thanh dưới: từ vừa tra → tạo thẻ Ôn tập kèm câu đó, hoặc đánh dấu "Đã biết" (kho từ chung).
 *   - Cuối truyện: câu hỏi đọc hiểu, chấm điểm, lưu tiến độ; nút sang truyện tiếp theo.
 *   - Thời gian đọc (khi cửa sổ đang mở) được cộng vào Hôm nay, nhóm "Khác".
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { JapaneseText, headword, useDictPacks, useTokenizerStatus, type Segment, type WordResult } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { PreStudyButton, setWordStatus, textCoverage, type Coverage } from '@/modules/vocab/api'
import { addReviewCards } from '@/modules/review/api'
import { logStudyTime } from '@/modules/today/api'
import { STORIES, getStory, storyLines } from './data'
import { RATES, SIZES, useStoryPrefs } from './prefs'
import { speak, stopSpeech, useJaVoice } from './speech'
import { updateProgress } from './store'
import { S } from './strings'
import type { Line, Story } from './types'

interface LastLookup { seg: Segment; result?: WordResult; sentence: string }

const glossOf = (r: WordResult) => r.data.s.slice(0, 3).map((s) => s.g.slice(0, 3).join(', ')).join('; ')
const deckOf = (s: Story) => `Truyện · ${s.title}`.slice(0, 60)

/** Một câu. Tách riêng (memo) để tô sáng câu đang đọc không vẽ lại cả truyện. */
const Sentence = memo(function Sentence({ line, idx, active, furigana, translate, canSpeak, label, onPlay, onLookup }: {
  line: Line
  idx: number
  active: boolean
  furigana: boolean
  translate: boolean
  canSpeak: boolean
  label: string
  onPlay: (idx: number) => void
  onLookup: (sentence: string, seg: Segment, results: WordResult[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [active])
  const handle = useCallback((seg: Segment, results: WordResult[]) => onLookup(line.ja, seg, results), [line.ja, onLookup])
  return (
    <div ref={ref} className={`-mx-2 flex gap-1 rounded-lg px-2 py-1 transition-colors ${active ? 'bg-primary-soft' : ''}`}>
      {canSpeak && (
        <button aria-label={label} title={label} onClick={() => onPlay(idx)}
          className="mt-[0.25em] grid size-8 shrink-0 place-items-center rounded-lg text-base text-muted hover:bg-surface-2 hover:text-text">
          🔊
        </button>
      )}
      <div className="min-w-0">
        <JapaneseText text={line.ja} furigana={furigana} onLookup={handle} />
        {translate && <p className="mt-0.5 font-sans text-[0.7em] leading-normal text-muted">{line.vi}</p>}
      </div>
    </div>
  )
})

export function StoryView({ id, onClose, openStory }: { id: string; onClose: () => void; openStory: (id: string) => void }) {
  const t = useT(S)
  const story = getStory(id)
  const prefs = useStoryPrefs()
  const packs = useDictPacks()
  const tokStatus = useTokenizerStatus((s) => s.status)
  const voice = useJaVoice()
  const canSpeak = voice.supported && voice.ready

  const lines = useMemo(() => (story ? storyLines(story) : []), [story])
  const [cur, setCur] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const playToken = useRef(0)
  const [cov, setCov] = useState<Coverage | null>(null)
  const [last, setLast] = useState<LastLookup | null>(null)
  const [msg, setMsg] = useState('')

  // Mở truyện: ghi "đã mở"; khi rời trang: dừng giọng đọc, cộng thời gian đọc vào Hôm nay
  useEffect(() => {
    if (!story) return
    updateProgress(story.id, { openedAt: Date.now() })
    let secs = 0
    const tick = window.setInterval(() => { if (!document.hidden) secs++ }, 1000)
    return () => {
      window.clearInterval(tick)
      playToken.current++
      stopSpeech()
      if (secs >= 20) void logStudyTime('other', Math.min(secs, 2 * 3600))
    }
  }, [story])

  // Tỉ lệ hiểu của cả truyện (so với kho từ đã biết)
  useEffect(() => {
    if (!lines.length) return
    let alive = true
    textCoverage(lines.map((l) => l.ja).join('\n')).then((c) => alive && setCov(c), () => alive && setCov(null))
    return () => { alive = false }
  }, [lines])

  /** Đọc từ câu `from`; `only` = chỉ đọc một câu. Bấm lại khi đang đọc thì đổi sang chỗ mới. */
  const play = useCallback(async (from: number, only = false) => {
    const my = ++playToken.current
    setPlaying(!only)
    for (let i = from; i < lines.length; i++) {
      setCur(i)
      const ok = await speak(lines[i].ja, prefs.rate)
      if (my !== playToken.current) return
      if (!ok || only) break
      await new Promise((r) => window.setTimeout(r, 250)) // nghỉ ngắn giữa hai câu
      if (my !== playToken.current) return
    }
    setPlaying(false)
    setCur(null)
  }, [lines, prefs.rate])

  const stop = useCallback(() => { playToken.current++; stopSpeech(); setPlaying(false); setCur(null) }, [])
  const playOne = useCallback((i: number) => { void play(i, true) }, [play])

  // ----- Tra từ → thanh lưu thẻ -----
  const onLookup = useCallback((sentence: string, seg: Segment, results: WordResult[]) => {
    setMsg('')
    setLast({ seg, result: results[0], sentence })
  }, [])

  if (!story) {
    return (
      <div className="grid gap-3">
        <p>{t('notFound')}</p>
        <div><Button variant="soft" onClick={onClose}>{t('back')}</Button></div>
      </div>
    )
  }

  const addCard = async () => {
    if (!last?.result) return
    const r = last.result
    const { word, reading } = headword(r.data)
    const example = last.sentence.includes(last.seg.surface) ? last.sentence.replace(last.seg.surface, `{{${last.seg.surface}}}`) : last.sentence
    const n = await addReviewCards([{
      deck: deckOf(story), kind: 'vocab', front: word, reading: word === reading ? undefined : reading,
      meaning: glossOf(r), example, tags: ['stories', `N${story.level}`],
      source: { module: 'dictionary', ref: r.id },
    }])
    setMsg(n > 0 ? t('added', { deck: deckOf(story) }) : t('dup'))
  }
  const known = async () => {
    if (!last) return
    const base = last.seg.base || last.seg.surface
    if (last.result) {
      const { word, reading } = headword(last.result.data)
      await setWordStatus({ w: word, r: reading, id: last.result.id, alt: base !== word ? [base] : undefined }, 'known', 'stories')
      setMsg(t('marked', { w: word }))
    } else {
      await setWordStatus({ w: base, r: last.seg.reading || undefined }, 'known', 'stories')
      setMsg(t('marked', { w: base }))
    }
  }

  const idx = STORIES.findIndex((s) => s.id === story.id)
  const next = STORIES[idx + 1]
  const btnToggle = (on: boolean) => `min-h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`
  let n = 0 // số thứ tự câu chạy qua các đoạn

  return (
    <div className="grid gap-3 pb-28">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="min-h-9 px-2" onClick={onClose}>{t('back')}</Button>
        <span className="rounded bg-primary-soft px-1.5 text-xs font-semibold leading-5">N{story.level}</span>
        <div className="min-w-0 flex-1">
          <h1 className="jp truncate text-lg font-bold leading-tight">{story.title}</h1>
          <p className="truncate text-xs text-muted">{story.titleVi}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canSpeak && (
          playing
            ? <Button className="min-h-9 text-sm" onClick={stop}>{t('stop')}</Button>
            : <Button className="min-h-9 text-sm" onClick={() => void play(cur ?? 0)}>{t('playAll')}</Button>
        )}
        {canSpeak && (
          <Segmented label={t('speed')} value={`${prefs.rate}`} onChange={(v) => prefs.set({ rate: Number(v) })}
            options={RATES.map((r) => ({ value: `${r}`, label: `${r}×` }))} />
        )}
        <button className={btnToggle(prefs.furigana)} aria-pressed={prefs.furigana} onClick={() => prefs.set({ furigana: !prefs.furigana })}>{t('furigana')}</button>
        <button className={btnToggle(prefs.translate)} aria-pressed={prefs.translate} onClick={() => prefs.set({ translate: !prefs.translate })}>{t('translate')}</button>
        <select aria-label={t('size')} className="min-h-9 rounded-lg border border-border bg-surface-2 px-2 text-sm"
          value={prefs.size} onChange={(e) => prefs.set({ size: Number(e.target.value) })}>
          {SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        <PreStudyButton variant="ghost" className="min-h-9 px-3 text-sm" name={story.title}
          lines={lines.map((l) => l.ja)} deck={deckOf(story)} tags={['stories', `N${story.level}`]} src="stories" />
      </div>

      {/* Không có giọng đọc */}
      {!voice.supported ? (
        <p className="rounded-xl bg-surface-2 p-3 text-sm">{t('noSpeech')}</p>
      ) : !voice.ready ? (
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p>{t('noVoice')}</p>
          <p className="mt-1 text-muted">{t('noVoiceHelp')}</p>
        </div>
      ) : null}

      {/* Tỉ lệ hiểu */}
      <div className="grid gap-1 text-sm">
        {cov && cov.tokens > 0 ? (
          <>
            <div className="flex flex-wrap gap-x-3 text-muted">
              <b className="text-text">{t('coverage', { pct: Math.round(cov.known * 100) })}</b>
              {cov.newWords.length > 0 && <span>{t('newWords', { n: cov.newWords.length })}</span>}
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="bg-good" style={{ width: `${cov.known * 100}%` }} />
              <div className="bg-warn" style={{ width: `${cov.learning * 100}%` }} />
            </div>
            {cov.newWords.length > 0 && (
              <details className="text-muted">
                <summary className="cursor-pointer select-none">{t('newWords', { n: cov.newWords.length })}</summary>
                <div className="jp mt-2 flex flex-wrap gap-1.5">
                  {cov.newWords.slice(0, 60).map((w) => (
                    <button key={w} className="rounded-md bg-primary-soft px-2 py-0.5 text-text hover:opacity-80"
                      onClick={(e) => openLookup(w, { x: e.clientX, y: e.clientY })}>{w}</button>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : tokStatus === 'loading' ? <p className="text-muted">{t('preparing')}</p> : null}
      </div>

      {!packs.loading && !packs.ready && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm">
          {t('noDict')} <a className="font-medium text-primary hover:underline" href="#/dictionary?tab=data">{t('openDict')}</a>
        </p>
      )}

      {/* Nội dung truyện */}
      <Card className="p-4 sm:p-8">
        <div lang="ja" className="jp mx-auto grid max-w-[40em] gap-[1em] leading-[1.9]" style={{ fontSize: prefs.size }}>
          {story.paras.map((para, pi) => (
            <div key={pi} className="grid gap-[0.2em]">
              {para.map((line) => {
                const i = n++
                return (
                  <Sentence key={i} line={line} idx={i} active={cur === i} furigana={prefs.furigana} translate={prefs.translate}
                    canSpeak={canSpeak} label={t('playLine')} onPlay={playOne} onLookup={onLookup} />
                )
              })}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">{t('tapHint')}</p>
      </Card>

      <Quiz key={story.id} story={story} />

      {next && (
        <div className="flex justify-end">
          <Button variant="soft" onClick={() => openStory(next.id)}>{t('next')}</Button>
        </div>
      )}

      {/* Thanh dưới: từ vừa tra */}
      {last && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-4 md:left-auto md:right-4 md:max-w-xl">
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{t('lastWord')}</p>
              <p className="truncate">
                <span className="jp font-semibold">{last.result ? headword(last.result.data).word : last.seg.base || last.seg.surface}</span>
                {last.result && <span className="ml-2 text-sm text-muted">{glossOf(last.result)}</span>}
              </p>
              {msg && <p role="status" className="text-xs text-good">{msg}</p>}
            </div>
            <Button className="min-h-9 text-sm" disabled={!last.result} onClick={addCard}>{t('addCard')}</Button>
            <Button variant="soft" className="min-h-9 text-sm" onClick={known}>{t('markKnown')}</Button>
            <button aria-label={t('close')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" onClick={() => setLast(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Câu hỏi đọc hiểu cuối truyện. Kiểm tra xong thì lưu điểm và đánh dấu đã đọc. */
function Quiz({ story }: { story: Story }) {
  const t = useT(S)
  const [picks, setPicks] = useState<(number | undefined)[]>(() => story.quiz.map(() => undefined))
  const [checked, setChecked] = useState(false)
  const [hint, setHint] = useState(false)
  const score = story.quiz.reduce((s, q, i) => s + (picks[i] === q.answer ? 1 : 0), 0)

  const check = async () => {
    if (picks.some((p) => p === undefined)) { setHint(true); return }
    setHint(false)
    setChecked(true)
    await updateProgress(story.id, { finishedAt: Date.now(), score, total: story.quiz.length })
  }
  const retry = () => { setPicks(story.quiz.map(() => undefined)); setChecked(false) }

  if (!story.quiz.length) {
    return (
      <div className="flex justify-end">
        <Button variant="soft" onClick={() => updateProgress(story.id, { finishedAt: Date.now() })}>{t('finish')}</Button>
      </div>
    )
  }

  return (
    <Card className="grid gap-4 p-4 sm:p-6">
      <h2 className="font-semibold">{t('quiz')}</h2>
      {story.quiz.map((q, qi) => (
        <fieldset key={qi} className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{qi + 1}. {q.q}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, oi) => {
              const picked = picks[qi] === oi
              const state = !checked ? (picked ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2')
                : oi === q.answer ? 'border-good bg-good/10'
                  : picked ? 'border-bad bg-bad/10' : 'border-border opacity-60'
              return (
                <button key={oi} disabled={checked} aria-pressed={picked}
                  onClick={() => setPicks((p) => p.map((x, i) => (i === qi ? oi : x)))}
                  className={`min-h-10 rounded-xl border px-3 py-2 text-left text-sm transition ${state}`}>
                  {checked && oi === q.answer ? '✓ ' : checked && picked ? '✗ ' : ''}{o}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
      {hint && !checked && <p className="text-sm text-muted">{t('answerAll')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {checked ? (
          <>
            <p role="status" className="flex-1 text-sm font-medium">
              {score === story.quiz.length ? t('perfect') : t('result', { s: score, t: story.quiz.length })}
            </p>
            <Button variant="ghost" onClick={retry}>{t('retry')}</Button>
          </>
        ) : (
          <Button onClick={check}>{t('check')}</Button>
        )}
      </div>
    </Card>
  )
}
