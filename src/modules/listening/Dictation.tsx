/**
 * CHÉP CHÍNH TẢ: nghe một câu rồi gõ lại (hoặc chỉ gõ phần bị che).
 * Nguồn câu: câu mẫu của Ngữ pháp (giọng máy đọc) hoặc phụ đề anime (tiếng nhân vật thật nếu mở được video).
 * Chấm theo cách đọc (lib/compare.ts) nên gõ kana, Kanji hay romaji đều được.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { kataToHira, tokenizeRaw } from '@/modules/dictionary'
import { ExampleText, grammarPath, type JlptLevel } from '@/modules/grammar/api'
import { getMedia, putMedia } from '@/modules/immersion/anime/store'
import { makeMedia, openMedia, pickFiles } from '@/modules/immersion/anime/media'
import { S } from './strings'
import { Chip, isReplayKey, ListenButtons, Row, StatLine } from './components'
import { compareReadings, readingFromFurigana, readingOf, type Score } from './lib/compare'
import { animeEpisodes, animeSentences, grammarSentences, type EpisodeChoice, type Sentence } from './lib/sources'
import { playClip, speak, stopClip, stopSpeech } from './lib/speech'
import { recordResult } from './lib/stats'

type Source = 'grammar' | 'anime'
type Task = 'full' | 'blank'
type VideoState = 'none' | 'ok' | 'permission' | 'missing'

/** Câu hỏi đã chuẩn bị: câu, phần cần gõ (cả câu hoặc chỗ trống) và cách đọc của phần đó. */
interface Question {
  s: Sentence
  /** Câu hiện khi làm bài điền chỗ trống (chỗ cần gõ thay bằng ＿＿). */
  shownBlank?: string
  answer: string
  reading: string
}

const ALL_LEVELS: JlptLevel[] = [5, 4, 3, 2, 1]
const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1])

/** Chọn một từ có nghĩa (danh từ, động từ, tính từ) trong câu phụ đề để che đi. */
async function blankOfSubtitle(text: string): Promise<{ shown: string; answer: string; reading: string } | null> {
  const toks = await tokenizeRaw(text).catch(() => [])
  const good = toks.filter((t) => /^(名詞|動詞|形容詞|副詞)$/.test(t.pos) && !/非自立|数|固有名詞|代名詞|接尾/.test(t.pos_detail_1)
    && [...t.surface_form].length >= 2 && t.reading && t.reading !== '*')
  if (!good.length) return null
  const w = good[Math.floor(Math.random() * good.length)]
  const at = w.word_position - 1
  return { shown: text.slice(0, at) + '＿＿' + text.slice(at + w.surface_form.length), answer: w.surface_form, reading: kataToHira(w.reading!) }
}

async function prepare(s: Sentence, task: Task): Promise<Question | null> {
  if (task === 'full') {
    const reading = s.reading ?? (await readingOf(s.text))
    return reading ? { s, answer: s.text, reading } : null
  }
  if (s.src) {
    // Câu mẫu: chỗ trống là phần ngữ pháp {{ }} đầu tiên
    const m = s.src.match(/\{\{(.*?)\}\}/)
    if (!m) return null
    const reading = readingFromFurigana(m[1])
    return reading ? { s, answer: m[1].replace(/\[[^\]]*\]/g, '').replace(/ /g, ''), reading } : null
  }
  const b = await blankOfSubtitle(s.text)
  return b ? { s, shownBlank: b.shown, answer: b.answer, reading: b.reading } : null
}

export function Dictation({ canSpeak }: { canSpeak: boolean }) {
  const t = useT(S)
  const [source, setSource] = useState<Source>('grammar')
  const [task, setTask] = useState<Task>('full')
  const [levels, setLevels] = useState<JlptLevel[]>([5])
  const [episodes, setEpisodes] = useState<EpisodeChoice[]>()
  const [episodeId, setEpisodeId] = useState('')

  // ----- Video (chỉ với phụ đề anime) -----
  const video = useRef<HTMLVideoElement>(null)
  const [videoState, setVideoState] = useState<VideoState>('none')
  const [videoUrl, setVideoUrl] = useState<string>()
  const attach = useCallback(async (ask: boolean) => {
    if (!episodeId) { setVideoState('none'); return }
    const r = await openMedia(await getMedia(episodeId), ask)
    if (r.state === 'ok') { setVideoUrl(URL.createObjectURL(r.file)); setVideoState('ok') } else setVideoState(r.state)
  }, [episodeId])
  useEffect(() => {
    setVideoUrl(undefined)
    if (source === 'anime') void attach(false); else setVideoState('none')
  }, [source, attach])
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])
  const pickVideo = async () => {
    const [f] = await pickFiles('video', false)
    if (!f) return
    const m = makeMedia(episodeId, f, false)
    if (m) await putMedia(m)
    setVideoUrl(URL.createObjectURL(f.file)); setVideoState('ok')
  }

  useEffect(() => {
    if (source !== 'anime' || episodes) return
    void animeEpisodes().then((l) => { setEpisodes(l); if (l[0]) setEpisodeId((id) => id || l[0].id) })
  }, [source, episodes])

  // ----- Danh sách câu (xáo trộn, làm lần lượt) -----
  const [pool, setPool] = useState<Sentence[]>()
  useEffect(() => {
    let alive = true
    setPool(undefined)
    const load = source === 'grammar' ? grammarSentences(levels) : episodeId ? animeSentences(episodeId) : Promise.resolve([])
    void load.then((l) => alive && setPool(shuffle(l)))
    return () => { alive = false }
  }, [source, levels, episodeId])

  const [idx, setIdx] = useState(0)
  const [q, setQ] = useState<Question | null>()
  const [text, setText] = useState('')
  const [result, setResult] = useState<Score>()
  const [checking, setChecking] = useState(false)
  const [hint, setHint] = useState(false)
  const [score, setScore] = useState({ r: 0, n: 0 })
  const [started, setStarted] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)

  const play = useCallback((rate = 1, item: Question | null | undefined = q) => {
    if (!item) return
    setStarted(true)
    const v = video.current
    if (item.s.clip && v && videoState === 'ok') void playClip(v, item.s.clip.start, item.s.clip.end, rate)
    else void speak(item.s.text, rate * 0.95)
  }, [q, videoState])

  // Chuẩn bị câu số idx (bỏ qua câu không làm được, ví dụ không có chỗ trống phù hợp)
  useEffect(() => {
    if (!pool) return
    let alive = true
    setQ(undefined); setText(''); setResult(undefined); setHint(false); setChecking(false)
    void (async () => {
      for (let k = 0; k < Math.min(pool.length, 8); k++) {
        const s = pool[(idx + k) % pool.length]
        const p = await prepare(s, task)
        if (!alive) return
        if (p) { setQ(p); if (started) play(1, p); return }
      }
      setQ(null)
    })()
    return () => { alive = false }
  }, [pool, idx, task]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopSpeech(); stopClip(video.current) }, [])

  // Câu đang làm: chấm xong mà đã sang câu khác (đổi cấp, đổi cách làm) thì bỏ kết quả
  const current = useRef(q)
  current.current = q
  const check = async () => {
    if (!q || result || checking || !text.trim()) return
    setChecking(true)
    // Gõ đúng y chữ của câu gốc (kể cả Kanji) thì khỏi cần bộ tách từ
    const bare = (x: string) => x.replace(/[\s、。！？!?「」…・,.]/g, '')
    const mine = bare(text) === bare(q.answer) ? q.reading : await readingOf(text)
    setChecking(false)
    if (current.current !== q) return
    const r = compareReadings(q.reading, mine)
    setResult(r)
    setScore((s) => ({ r: s.r + (r.perfect ? 1 : 0), n: s.n + 1 }))
    recordResult('sentence', r.perfect)
  }
  const next = () => { setIdx((i) => i + 1); input.current?.focus() }
  const onKey = (e: React.KeyboardEvent) => {
    if (isReplayKey(e)) { e.preventDefault(); play() }
    else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (result) next(); else void check() }
  }

  const toggleLevel = (lv: JlptLevel) =>
    setLevels((l) => (l.includes(lv) ? (l.length > 1 ? l.filter((x) => x !== lv) : l) : [...l, lv].sort((a, b) => b - a)))

  const blankMode = task === 'blank'
  const noEpisodes = source === 'anime' && episodes && !episodes.length
  const hasKanji = useMemo(() => /[㐀-鿿]/.test(text), [text])

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Row label={t('source')}>
          <Segmented<Source> label={t('source')} value={source} onChange={setSource}
            options={[{ value: 'grammar', label: t('srcGrammar') }, { value: 'anime', label: t('srcAnime') }]} />
        </Row>
        {source === 'grammar' ? (
          <Row label={t('levels')}>
            {ALL_LEVELS.map((lv) => <Chip key={lv} on={levels.includes(lv)} onClick={() => toggleLevel(lv)}>N{lv}</Chip>)}
          </Row>
        ) : episodes && episodes.length > 0 ? (
          <Row label={t('episode')}>
            <select value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} aria-label={t('episode')}
              className="min-h-9 max-w-full rounded-lg border border-border bg-surface-2 px-2 text-sm">
              {episodes.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </Row>
        ) : null}
        <Row label={t('task')}>
          <Segmented<Task> label={t('task')} value={task} onChange={setTask}
            options={[{ value: 'full', label: t('taskFull') }, { value: 'blank', label: t('taskBlank') }]} />
        </Row>
        {source === 'anime' && episodeId && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={videoState === 'ok' ? 'text-good' : 'text-muted'}>{videoState === 'ok' ? '🎬 ' + t('audioReal') : t('audioTts')}</span>
            {videoState === 'permission' && <Button type="button" variant="soft" className="min-h-9" onClick={() => void attach(true)}>{t('allowVideo')}</Button>}
            {videoState === 'missing' && <Button type="button" variant="soft" className="min-h-9" onClick={() => void pickVideo()}>{t('pickVideo')}</Button>}
          </div>
        )}
        <StatLine kind="sentence" />
      </Card>
      {/* Video ẩn: chỉ để phát tiếng của câu thoại */}
      {videoUrl && <video ref={video} src={videoUrl} preload="auto" className="hidden" />}

      {noEpisodes ? (
        <Card className="grid justify-items-start gap-3">
          <p className="text-sm text-muted">{t('noEpisodes')}</p>
          <ButtonLink to="/immersion/anime" variant="soft">{t('openAnime')}</ButtonLink>
        </Card>
      ) : q === undefined ? (
        <Card><p className="text-sm text-muted">{t('loading')}</p></Card>
      ) : q === null ? (
        <Card><p className="text-sm text-muted">{t('noSentences')}</p></Card>
      ) : (
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ListenButtons onPlay={(r) => play(r)} disabled={!canSpeak && !(q.s.clip && videoState === 'ok')} />
            {score.n > 0 && <span className="text-sm text-muted">{t('score', { r: score.r, n: score.n })}</span>}
          </div>

          {blankMode && (
            <p className="jp rounded-xl bg-surface-2 p-3 text-xl">
              {q.s.src ? <ExampleText src={q.s.src} blank fill={result ? q.answer : undefined} lookup={false} /> : (result ? q.s.text : q.shownBlank)}
            </p>
          )}

          {q.s.meaning && !result && (
            hint ? <p className="text-sm text-muted">💬 {q.s.meaning}</p>
              : <button type="button" className="justify-self-start text-sm text-primary hover:underline" onClick={() => setHint(true)}>{t('showMeaning')}</button>
          )}

          <textarea ref={input} rows={blankMode ? 1 : 2} lang="ja" value={text} readOnly={!!result}
            onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
            placeholder={blankMode ? t('placeholderBlank') : t('placeholder')} aria-label={blankMode ? t('placeholderBlank') : t('placeholder')}
            className="jp w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-lg outline-none focus:border-primary" />

          {!result ? (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void check()} disabled={!text.trim() || checking}>{checking ? '…' : t('check')}</Button>
                <Button type="button" variant="ghost" onClick={() => { setScore((s) => ({ ...s, n: s.n + 1 })); recordResult('sentence', false); setResult(compareReadings(q.reading, '')) }}>{t('skip')}</Button>
              </div>
              {hasKanji && <p className="text-xs text-muted">{t('tokenizerNote')}</p>}
            </div>
          ) : (
            <Feedback q={q} r={result} onNext={next} onSlow={() => play(0.7)} />
          )}
          <p className="text-xs text-muted">{t('keys')}</p>
        </Card>
      )}
    </div>
  )
}

function Feedback({ q, r, onNext, onSlow }: { q: Question; r: Score; onNext: () => void; onSlow: () => void }) {
  const t = useT(S)
  const tone = r.perfect ? 'good' : r.percent >= 80 ? 'primary' : 'bad'
  return (
    <div className="grid gap-3">
      <div className={`grid gap-2 rounded-xl p-3 ${tone === 'good' ? 'bg-good/10' : tone === 'bad' ? 'bg-bad/10' : 'bg-primary-soft'}`}>
        <p className={`font-semibold ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-text'}`}>
          {r.perfect ? t('right') : r.percent >= 80 ? t('almost', { p: r.percent }) : `${t('wrong')} (${r.percent}%)`}
        </p>
        <div>
          <p className="text-xs text-muted">{t('yourDiff')}</p>
          <p className="jp text-lg leading-relaxed">
            {r.parts.map((p, i) => (
              <span key={i} className={p.kind === 'ok' ? 'text-good' : p.kind === 'miss' ? 'text-bad underline decoration-2 underline-offset-4' : 'text-muted line-through'}>{p.text}</span>
            ))}
          </p>
          {!r.perfect && <p className="mt-1 text-xs text-muted">{t('legend')}</p>}
        </div>
        <div>
          <p className="text-xs text-muted">{t('original')}</p>
          <p className="text-xl">{q.s.src ? <ExampleText src={q.s.src} /> : <span className="jp">{q.s.text}</span>}</p>
          {q.s.meaning && <p className="text-sm text-muted">{q.s.meaning}</p>}
          <p className="mt-1 text-xs text-muted">
            {q.s.grammarId ? <Link to={grammarPath(q.s.grammarId)} className="text-primary hover:underline">{q.s.from}</Link> : q.s.from}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onNext} autoFocus>{t('next')}</Button>
        <Button type="button" variant="soft" onClick={onSlow}>🐢 {t('slow')}</Button>
      </div>
    </div>
  )
}
