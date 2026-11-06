/**
 * ÔN THEO CẢNH PHIM
 * Ôn các thẻ tạo từ anime, kèm ảnh cảnh phim và âm thanh gốc của câu thoại.
 * Chọn phạm vi: tất cả / một bộ / một mùa / một tập / 1–2 tập xem gần nhất.
 * Kiểu ôn:
 *  - Đầy đủ: thấy chữ + ảnh, nghe âm thanh → nhớ nghĩa
 *  - Nghe hiểu: chỉ ảnh + âm thanh (che chữ) → nhớ câu / nghĩa
 *  - Che từ: câu thoại che mất từ cần nhớ + ảnh + âm thanh → nhớ ra từ bị che
 * Chấm điểm dùng chung lịch ôn FSRS với trang Ôn tập (không bị lệch lịch).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useDbQuery } from '@/core/db'
import { getSettings, rateCard } from '@/modules/review/store'
import type { Rating, ReviewSettings } from '@/modules/review/types'
import { playBlob } from './capture'
import { episodeLabel } from './importer'
import { ClipImage } from './Panels'
import {
  inScope, isDue, loadAnimeData, recentEpisodes, seasonOf, uniqueCards, type AnimeCardItem, type ReviewScope,
} from './progress'
import { getClip, sortEpisodes } from './store'
import { formatClock } from './subtitles'
import { SubtitleLine } from './SubtitleLine'
import { useKnowledge } from './analysis'
import { inputClass } from '../manga/ui'
import { hasCardMedia, useCardMedia, withCardMedia } from '@/modules/review/api'

type ReviewMode = 'full' | 'listen' | 'cloze'
const MODE_LABEL: Record<ReviewMode, string> = { full: 'Đầy đủ', listen: 'Nghe hiểu (che chữ)', cloze: 'Che từ trong câu' }
const RATINGS: { r: Rating; label: string; cls: string }[] = [
  { r: 1, label: 'Quên', cls: 'text-bad' }, { r: 2, label: 'Khó', cls: 'text-warn' },
  { r: 3, label: 'Được', cls: 'text-good' }, { r: 4, label: 'Dễ', cls: 'text-primary' },
]

/** Đọc phạm vi từ đường dẫn: ?review=1&series=..&season=..&episode=..&recent=2 */
export function scopeFromParams(p: URLSearchParams): ReviewScope {
  const series = p.get('series') ?? undefined
  const episode = p.get('episode')
  const season = p.get('season')
  const recent = p.get('recent')
  if (episode) return { kind: 'episode', episodeId: episode }
  if (recent) return { kind: 'recent', seriesId: series, count: Number(recent) || 1 }
  if (series && season) return { kind: 'season', seriesId: series, season: Number(season) || 1 }
  if (series) return { kind: 'series', seriesId: series }
  return { kind: 'all' }
}

const scopeValue = (s: ReviewScope) =>
  s.kind === 'all' ? 'all' : s.kind === 'series' ? `series:${s.seriesId}` : s.kind === 'season' ? `season:${s.seriesId}:${s.season}`
    : s.kind === 'episode' ? `episode:${s.episodeId}` : `recent:${s.seriesId ?? ''}:${s.count}`

function parseScope(v: string): ReviewScope {
  const [k, a, b] = v.split(':')
  if (k === 'series') return { kind: 'series', seriesId: a }
  if (k === 'season') return { kind: 'season', seriesId: a, season: Number(b) }
  if (k === 'episode') return { kind: 'episode', episodeId: a }
  if (k === 'recent') return { kind: 'recent', seriesId: a || undefined, count: Number(b) }
  return { kind: 'all' }
}

/** Câu thoại có từ cần nhớ bị che: lấy từ câu ví dụ dạng {{từ}} của thẻ từ. */
function clozeOf(x: AnimeCardItem): { masked: string; answer: string } | undefined {
  const ex = x.card.example
  const m = ex?.match(/\{\{(.+?)\}\}/)
  if (ex && m) return { masked: ex.replace(/\{\{.+?\}\}/, '＿'.repeat(Math.max(2, [...m[1]].length))), answer: m[1] }
  return undefined
}
const plainExample = (s?: string) => s?.replace(/\{\{(.+?)\}\}/g, '$1')

export function AnimeReview({ initial, onClose, openAt }: {
  initial: ReviewScope
  onClose: () => void
  /** Mở trình xem ở đúng cảnh (giây). */
  openAt: (episodeId: string, sec: number) => void
}) {
  const { data } = useDbQuery(loadAnimeData, [], ['animeLinks', 'animeEpisodes', 'animeSeries'])
  const [scope, setScope] = useState<ReviewScope>(initial)
  const [mode, setMode] = useState<ReviewMode>('full')
  const [extra, setExtra] = useState(false) // luyện thêm cả thẻ chưa đến hạn (không chấm điểm)
  const [queue, setQueue] = useState<AnimeCardItem[] | null>(null)
  const [pos, setPos] = useState(0)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(0)
  const [settings, setSettings] = useState<ReviewSettings>()
  const started = useRef(Date.now())
  const stopAudio = useRef<(() => void) | undefined>(undefined)
  const k = useKnowledge()

  useEffect(() => { void getSettings().then(setSettings) }, [])

  const pool = useMemo(() => (data ? uniqueCards(inScope(data.items, scope, data.episodes)) : []), [data, scope])
  const dueCount = pool.filter((x) => isDue(x.card)).length

  const start = () => {
    const now = Date.now()
    const list = (extra ? pool.filter((x) => !x.card.suspended) : pool.filter((x) => isDue(x.card, now)))
      .sort((a, b) => a.card.due - b.card.due)
    // Kiểu "che từ" chỉ hợp với thẻ có câu ví dụ
    setQueue(mode === 'cloze' ? list.filter((x) => clozeOf(x)) : list)
    setPos(0); setShown(false); setDone(0); started.current = Date.now()
  }

  const cur = queue?.[pos]
  // Ảnh/tiếng của thẻ ôn tập nằm ở bảng riêng: đọc khi thẻ hiện ra
  const curCard = useCardMedia(cur?.card)

  // Phát âm thanh gốc của cảnh khi mở thẻ (trừ kiểu không có âm thanh)
  const play = async (x = cur) => {
    stopAudio.current?.()
    const id = x?.link.sentenceId ?? x?.sentence?.id
    const clip = id ? await getClip(id) : undefined
    if (clip?.audio) { stopAudio.current = playBlob(clip.audio); return }
    // Không có bản ghi trong máy (vd. khôi phục từ sao lưu): dùng âm thanh lưu sẵn trong thẻ
    const audio = x?.card.media?.audio ? (await withCardMedia(x.card)).audio : x?.card.audio
    if (audio) {
      const a = new Audio(audio)
      void a.play().catch(() => {})
      stopAudio.current = () => a.pause()
    }
  }
  useEffect(() => {
    if (cur) void play(cur)
    return () => stopAudio.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.card.id])

  const next = () => { setShown(false); setPos((p) => p + 1); started.current = Date.now() }
  const rate = async (r: Rating) => {
    if (!cur || !settings) return
    if (!extra || isDue(cur.card)) {
      await rateCard(cur.card, r, { settings, durationMs: Date.now() - started.current, question: mode === 'cloze' ? 'cloze' : 'recognize' })
    }
    setDone((d) => d + 1)
    next()
  }

  // Phím tắt: Space = lật thẻ, 1-4 = chấm, P = nghe lại
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  keys.current = (e) => {
    if ((e.target as HTMLElement).closest('input, select, textarea') || !cur) return
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!shown) setShown(true); else void rate(3) }
    else if (shown && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); void rate(Number(e.key) as Rating) }
    else if (e.key.toLowerCase() === 'p') { e.preventDefault(); void play() }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!data) return <p className="text-muted">Đang tải…</p>

  const seriesById = new Map(data.series.map((s) => [s.id, s]))
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'Tất cả anime' }]
  const recentAll = recentEpisodes(data.episodes, 2)
  if (recentAll.length) {
    options.push({ value: 'recent::1', label: 'Tập vừa xem gần nhất' })
    if (recentAll.length > 1) options.push({ value: 'recent::2', label: '2 tập xem gần nhất' })
  }
  for (const s of data.series) {
    const eps = sortEpisodes(data.episodes.filter((e) => e.seriesId === s.id))
    if (!eps.length) continue
    options.push({ value: `series:${s.id}`, label: `${s.title} · cả bộ` })
    if (eps.some((e) => e.lastWatchedAt)) options.push({ value: `recent:${s.id}:2`, label: `${s.title} · 1–2 tập xem gần nhất` })
    const seasons = [...new Set(eps.map(seasonOf))]
    if (seasons.length > 1) for (const n of seasons) options.push({ value: `season:${s.id}:${n}`, label: `${s.title} · Mùa ${n}` })
    for (const e of eps) options.push({ value: `episode:${e.id}`, label: `${s.title} · ${episodeLabel(e)}` })
  }
  // Phạm vi đang chọn có thể không nằm trong danh sách (vd recent=1 của một bộ): thêm vào
  if (!options.some((o) => o.value === scopeValue(scope))) options.push({ value: scopeValue(scope), label: 'Phạm vi đã chọn' })

  // ---------- Màn hình chọn phạm vi ----------
  if (!queue) {
    return (
      <div className="grid gap-4">
        <Button variant="ghost" className="justify-self-start" onClick={onClose}>← Quay lại</Button>
        <h1 className="text-2xl font-bold">Ôn theo cảnh phim</h1>
        <Card className="grid gap-4 sm:max-w-xl">
          <label className="grid gap-1 text-sm">
            Ôn phần nào?
            <select className={inputClass} value={scopeValue(scope)} onChange={(e) => setScope(parseScope(e.target.value))}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <fieldset className="grid gap-1 text-sm">
            <legend className="mb-1">Kiểu ôn</legend>
            {(Object.keys(MODE_LABEL) as ReviewMode[]).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                {MODE_LABEL[m]}
                <span className="text-xs text-muted">
                  {m === 'full' ? 'thấy chữ + ảnh, nghe âm thanh gốc' : m === 'listen' ? 'chỉ ảnh + âm thanh, đoán câu rồi lật' : 'câu thoại che mất từ cần nhớ'}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
            Luyện thêm cả thẻ chưa đến hạn (không đổi lịch ôn của chúng)
          </label>
          <p className="text-sm text-muted">
            {pool.length} thẻ trong phạm vi này · <b className="text-text">{dueCount}</b> thẻ đến hạn
          </p>
          <Button onClick={start} disabled={extra ? !pool.length : !dueCount}>Bắt đầu ôn</Button>
          {!pool.length && (
            <p className="text-sm text-muted">Chưa có thẻ nào. Trong lúc xem, bấm <b>★ Lưu câu</b> (phím C) rồi tạo thẻ trong tab <b>Câu đã lưu</b>, hoặc thêm từ ở tab <b>Từ vựng</b>.</p>
          )}
        </Card>
      </div>
    )
  }

  // ---------- Hết thẻ ----------
  if (!cur) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">Ôn xong 🎉</h1>
        <p>Bạn vừa ôn {done} thẻ.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setQueue(null)}>Ôn phần khác</Button>
          <Button variant="ghost" onClick={onClose}>Quay lại</Button>
        </div>
      </div>
    )
  }

  const ep = cur.episode
  const series = seriesById.get(cur.link.seriesId)
  const isSentence = cur.card.source?.module === 'anime'
  const line = cur.sentence?.text ?? (isSentence ? cur.card.front : plainExample(cur.card.example))
  const cloze = clozeOf(cur)
  const hasAudio = !!cur.sentence?.hasAudio || hasCardMedia(cur.card, 'audio')
  const image = curCard?.image

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => setQueue(null)}>← Dừng</Button>
        <p className="flex-1 text-right text-sm text-muted">{pos + 1} / {queue.length}</p>
      </div>
      <Card className="grid gap-3">
        {image ? <img src={image} alt="Cảnh phim" className="w-full rounded-lg border border-border" />
          : cur.sentence?.hasImage ? <ClipImage id={cur.sentence.id} /> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {series && <span>{series.title}</span>}
          {ep && <span>· {episodeLabel(ep)}</span>}
          {cur.sentence && <span>· {formatClock(cur.sentence.s / 1000)}</span>}
          {cur.sentence?.speaker && <span>· {cur.sentence.speaker}</span>}
          {hasAudio && <Button variant="ghost" className="ml-auto" onClick={() => play()}>🔊 Nghe lại (P)</Button>}
        </div>

        {/* Mặt hỏi */}
        <div className={`grid place-items-center gap-2 text-center ${mode === 'listen' && shown ? '' : 'min-h-20'}`}>
          {mode === 'listen' ? (
            !shown && <p className="text-sm text-muted">{hasAudio ? 'Nghe câu thoại và nhìn cảnh phim. Bạn hiểu câu này không?' : 'Thẻ này chưa có âm thanh: nhìn cảnh phim và nhớ lại câu thoại.'}</p>
          ) : mode === 'cloze' && cloze ? (
            <p className="jp text-2xl leading-relaxed">{shown ? plainExample(cur.card.example) : cloze.masked}</p>
          ) : isSentence ? (
            <p className="text-2xl leading-relaxed"><SubtitleLine text={cur.card.front} furigana={shown} k={k} highlight={!!k} /></p>
          ) : (
            <>
              <p className="jp text-4xl">{cur.card.front}</p>
              {line && <p className="text-lg leading-relaxed"><SubtitleLine text={line} furigana={false} k={k} highlight={false} /></p>}
            </>
          )}
        </div>

        {/* Mặt đáp án */}
        {shown && (
          <div className="grid gap-1 border-t border-border pt-3 text-center">
            {mode === 'listen' && line && <p className="text-xl leading-relaxed"><SubtitleLine text={line} furigana k={k} highlight={false} /></p>}
            {!isSentence && <p className="jp text-lg">{cur.card.front}{cur.card.reading && <span className="ml-2 text-muted">【{cur.card.reading}】</span>}</p>}
            <p className="font-medium">{cur.card.meaning}</p>
            {cur.card.exampleMeaning && <p className="text-sm text-muted">{cur.card.exampleMeaning}</p>}
            {cur.sentence?.note && <p className="text-sm text-muted">Ghi chú: {cur.sentence.note}</p>}
            {ep && cur.sentence && (
              <Button variant="ghost" className="justify-self-center" onClick={() => openAt(ep.id, Math.max(0, cur.sentence!.s / 1000 - 2))}>Xem lại cảnh này ▶</Button>
            )}
          </div>
        )}
      </Card>

      {!shown ? (
        <Button onClick={() => setShown(true)}>Xem đáp án (Space)</Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((x) => (
            <Button key={x.r} variant="soft" onClick={() => rate(x.r)}><span className={x.cls}>{x.label}</span><span className="ml-1 text-xs text-muted">{x.r}</span></Button>
          ))}
        </div>
      )}
      {extra && !isDue(cur.card) && <p className="text-center text-xs text-muted">Thẻ chưa đến hạn: chỉ luyện thêm, lịch ôn không đổi.</p>}
    </div>
  )
}
