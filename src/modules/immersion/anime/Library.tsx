/**
 * THƯ VIỆN ANIME
 * - "Xem tiếp", thống kê (tổng thời gian xem, số từ đã thuộc nhờ anime, câu đã lưu).
 * - Lọc theo trạng thái: đang xem / đã xem xong / muốn xem. Sắp xếp theo độ dễ.
 * - Độ khó mỗi bộ: % từ bạn đã biết (theo thẻ ôn tập) + tốc độ nói. Gợi ý bộ vừa sức (hiểu 80–95%).
 * - Tìm kiếm trong mọi câu đã lưu, thẻ từ anime và toàn bộ phụ đề → bấm để mở đúng cảnh.
 */
import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { getAll, useDbQuery } from '@/core/db'
import { kataToHira } from '@/modules/dictionary'
import { ProgressBar, inputClass } from '../manga/ui'
import { ANALYSIS_VERSION, comprehension, useKnowledge } from './analysis'
import { downloadBlob, exportAnki } from './anki'
import { getAnimeResume } from './api'
import { episodeLabel } from './importer'
import { ImportDialog } from './ImportDialog'
import { formatDuration, libraryStats, loadAnimeData, speedLabel, uniqueCards, type AnimeCardItem } from './progress'
import { getSubs } from './store'
import { formatClock } from './subtitles'
import type { AnimeEpisode, AnimeSeries, AnimeSubs, SavedSentence, SeriesStatus, SubAnalysis } from './types'

const STATUS_LABEL: Record<SeriesStatus, string> = { watching: 'Đang xem', completed: 'Đã xem xong', planned: 'Muốn xem' }

/** Ô bìa: chưa có ảnh bìa nên dùng chữ đầu của tên tiếng Nhật (hoặc tên thường). */
export function SeriesTile({ s, className = '' }: { s: AnimeSeries; className?: string }) {
  const ch = [...(s.titleJp || s.title)][0] ?? '映'
  return (
    <div className={`jp grid place-items-center bg-primary-soft text-5xl text-primary ${className}`} aria-hidden>{ch}</div>
  )
}

interface Difficulty { known: number; cpm?: number }

export function Library({ openSeries, openPlayer, openPlayerAt, openReview }: {
  openSeries: (id: string) => void
  openPlayer: (episodeId: string) => void
  openPlayerAt: (episodeId: string, sec: number) => void
  openReview: (scope: Record<string, string>) => void
}) {
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState<'all' | SeriesStatus>('all')
  const [sort, setSort] = useState<'recent' | 'easy' | 'name'>('recent')
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState<string>()
  const { data: all } = useDbQuery(loadAnimeData, [], ['animeSeries', 'animeEpisodes', 'animeLinks', 'animeSentences', 'srsCards'])
  const { data: resume } = useDbQuery(getAnimeResume, [], ['animeSeries', 'animeEpisodes'])
  const k = useKnowledge()
  const [diff, setDiff] = useState<Map<string, Difficulty>>(new Map())

  const bySeries = useMemo(() => {
    const m = new Map<string, AnimeEpisode[]>()
    for (const e of all?.episodes ?? []) m.set(e.seriesId, [...(m.get(e.seriesId) ?? []), e])
    return m
  }, [all])

  // Độ khó: gộp phụ đề đã phân tích của tối đa 4 tập (ưu tiên tập chưa xem)
  const diffKey = (all?.episodes ?? []).map((e) => `${e.id}:${e.stats?.tokens ?? 0}`).join('|') + (k ? `|${k.srsWords.size}:${k.manualWords.size}:${k.srsIds.size}` : '')
  useEffect(() => {
    if (!all || !k) return
    let alive = true
    ;(async () => {
      const out = new Map<string, Difficulty>()
      for (const s of all.series) {
        const eps = (bySeries.get(s.id) ?? []).filter((e) => e.stats)
        const pick = [...eps.filter((e) => !e.finishedAt), ...eps.filter((e) => e.finishedAt)].slice(0, 4)
        let known = 0, total = 0, cpmSum = 0, cpmN = 0
        for (const e of pick) {
          const a: SubAnalysis | undefined = (await getSubs(e.id, 'jp'))?.analysis
          if (!a || a.v !== ANALYSIS_VERSION) continue
          known += comprehension(a, k).known * a.tokens; total += a.tokens
          if (a.cpm) { cpmSum += a.cpm; cpmN++ }
        }
        if (total) out.set(s.id, { known: known / total, cpm: cpmN ? Math.round(cpmSum / cpmN) : undefined })
        if (!alive) return
      }
      setDiff(out)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffKey])

  const series = all?.series ?? []
  const stats = all ? libraryStats(all) : undefined
  const resumeSeries = resume && series.find((s) => s.id === resume.seriesId)

  let shown = filter === 'all' ? series : series.filter((s) => s.status === filter)
  if (sort === 'easy') shown = [...shown].sort((a, b) => (diff.get(b.id)?.known ?? -1) - (diff.get(a.id)?.known ?? -1))
  if (sort === 'name') shown = [...shown].sort((a, b) => a.title.localeCompare(b.title))

  // Gợi ý theo trình độ: bộ chưa xem xong mà bạn hiểu 80–95% (đủ dễ để theo kịp, đủ khó để học thêm)
  const recs = series
    .filter((s) => s.status !== 'completed' && diff.has(s.id))
    .map((s) => ({ s, d: diff.get(s.id)! }))
    .filter((x) => x.d.known >= 0.8 && x.d.known <= 0.95)
    .sort((a, b) => Math.abs(a.d.known - 0.9) - Math.abs(b.d.known - 0.9))
    .slice(0, 3)

  const exportAll = async () => {
    if (!all) return
    const items = uniqueCards(all.items)
    if (!items.length) { setMsg('Chưa có thẻ ôn tập nào từ anime để xuất.'); return }
    setMsg('Đang gói thẻ, ảnh và âm thanh…')
    const { blob, count } = await exportAnki(items, all, 'Hibi Nihongo::Anime')
    downloadBlob(blob, 'anki-anime.zip')
    setMsg(`Đã xuất ${count} thẻ. Mở file HUONG-DAN.txt trong file zip để nhập vào Anki.`)
  }

  if (searching && all) {
    return <SearchView series={series} episodes={all.episodes} sentences={all.sentences} items={all.items}
      onBack={() => setSearching(false)} openPlayerAt={openPlayerAt} />
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Xem anime</h1>
          <p className="text-sm text-muted">Xem anime từ file của bạn với phụ đề tiếng Nhật bấm để tra từ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.length > 0 && <Button variant="ghost" onClick={() => setSearching(true)}>🔍 Tìm câu / từ</Button>}
          {(stats?.cards ?? 0) > 0 && <Button variant="soft" onClick={() => openReview({})}>Ôn theo cảnh phim</Button>}
          <Button onClick={() => setImporting(true)}>+ Thêm anime</Button>
        </div>
      </div>

      {resume && resumeSeries && (
        <Card className="flex items-center gap-4">
          <SeriesTile s={resumeSeries} className="h-20 w-16 shrink-0 rounded-lg text-3xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Xem tiếp</p>
            <h2 className="truncate font-semibold">{resume.seriesTitle}</h2>
            <p className="truncate text-sm text-muted">
              {resume.episodeLabel} · {formatClock(resume.position)}{resume.duration ? ` / ${formatClock(resume.duration)}` : ''}
            </p>
            {resume.duration ? <ProgressBar className="mt-2 max-w-xs" value={resume.position / resume.duration} /> : null}
          </div>
          <Button onClick={() => openPlayer(resume.episodeId)}>Xem tiếp</Button>
        </Card>
      )}

      {stats && (stats.watchSeconds > 0 || stats.cards > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Thời gian xem" value={formatDuration(stats.watchSeconds)} />
          <Stat label="Tập đã xem" value={String(stats.episodesWatched)} />
          <Stat label="Từ đã thuộc nhờ anime" value={String(stats.wordsLearned)} hint={`${stats.cards} thẻ đã tạo`} />
          <Stat label="Câu đã lưu" value={String(stats.sentences)} />
        </div>
      )}
      {stats && stats.cards > 0 && (
        <div className="-mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" onClick={exportAll}>Xuất tất cả sang Anki (kèm âm thanh + ảnh)</Button>
          {msg && <span className="text-muted" role="status">{msg}</span>}
        </div>
      )}

      {recs.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Vừa sức với bạn</h2>
          <div className="flex flex-wrap gap-2">
            {recs.map(({ s, d }) => (
              <button key={s.id} onClick={() => openSeries(s.id)} className="rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm hover:border-primary">
                <b>{s.title}</b>
                <span className="block text-xs text-muted">hiểu khoảng {Math.round(d.known * 100)}%{d.cpm ? ` · ${speedLabel(d.cpm)}` : ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {all && series.length === 0 && (
        <Card className="mx-auto max-w-xl text-center">
          <div className="jp text-5xl text-primary" aria-hidden>映</div>
          <h2 className="mt-3 text-lg font-semibold">Chưa có anime nào</h2>
          <p className="mt-2 text-sm text-muted">
            App không kèm sẵn anime. Bạn thêm file video của mình (.mp4, .webm, .mkv) cùng file phụ đề tiếng Nhật
            (.srt, .ass, .vtt). File .mkv có sẵn phụ đề bên trong cũng được. Mỗi bộ anime là một series, mỗi file video là một tập.
          </p>
          <p className="mt-2 text-sm text-muted">
            Phụ đề tiếng Nhật thường tìm được ở các kho phụ đề cộng đồng (ví dụ Kitsunekko, Jimaku). Hãy tôn trọng bản quyền.
          </p>
          <Button className="mt-4" onClick={() => setImporting(true)}>Thêm anime đầu tiên</Button>
        </Card>
      )}

      {series.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1">
              {(['all', 'watching', 'planned', 'completed'] as const).map((f) => {
                const n = f === 'all' ? series.length : series.filter((s) => s.status === f).length
                return (
                  <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                    className={`min-h-9 rounded-lg px-3 text-sm ${filter === f ? 'bg-primary-soft font-medium' : 'text-muted hover:bg-surface-2'}`}>
                    {f === 'all' ? 'Tất cả' : STATUS_LABEL[f]} ({n})
                  </button>
                )
              })}
            </div>
            <select className={`${inputClass} ml-auto w-auto!`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sắp xếp">
              <option value="recent">Xem gần đây</option>
              <option value="easy">Dễ hiểu nhất trước</option>
              <option value="name">Theo tên</option>
            </select>
          </div>
          {shown.length === 0 && <p className="text-sm text-muted">Không có bộ nào ở mục này. Đặt trạng thái trong trang của từng bộ.</p>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((s) => {
              const eps = bySeries.get(s.id) ?? []
              const done = eps.filter((e) => e.finishedAt).length
              const d = diff.get(s.id)
              return (
                <button key={s.id} onClick={() => openSeries(s.id)} className="group flex flex-col text-left">
                  <SeriesTile s={s} className="aspect-[3/4] w-full rounded-card border border-border transition group-hover:border-primary" />
                  <h3 className="mt-2 truncate font-semibold">{s.title}</h3>
                  {s.titleJp && <p className="jp truncate text-sm leading-normal text-muted">{s.titleJp}</p>}
                  <p className="text-xs text-muted">{eps.length} tập · đã xem {done}{s.status ? ` · ${STATUS_LABEL[s.status]}` : ''}</p>
                  {d && (
                    <p className={`text-xs ${d.known >= 0.95 ? 'text-good' : d.known >= 0.8 ? 'text-primary' : d.known >= 0.65 ? 'text-warn' : 'text-bad'}`}>
                      hiểu ~{Math.round(d.known * 100)}%{d.cpm ? ` · ${speedLabel(d.cpm)}` : ''}
                    </p>
                  )}
                  {eps.length > 0 && <ProgressBar className="mt-1" value={done / eps.length} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onDone={(id) => { setImporting(false); openSeries(id) }} />
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="grid gap-0.5 p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  )
}

// ---------------------------------------------------------------- Tìm kiếm

interface Hit { key: string; episodeId: string; sec: number; text: string; sub?: string; kind: 'saved' | 'card' | 'line' }

const norm = (s: string) => kataToHira(s.toLowerCase().normalize('NFKC'))
const KIND: Record<Hit['kind'], string> = { saved: 'Câu đã lưu', card: 'Thẻ từ', line: 'Phụ đề' }

function SearchView({ series, episodes, sentences, items, onBack, openPlayerAt }: {
  series: AnimeSeries[]
  episodes: AnimeEpisode[]
  sentences: SavedSentence[]
  items: AnimeCardItem[]
  onBack: () => void
  openPlayerAt: (episodeId: string, sec: number) => void
}) {
  const [q, setQ] = useState('')
  const [subs, setSubs] = useState<AnimeSubs[]>()
  useEffect(() => { void getAll<AnimeSubs>('animeSubs').then(setSubs) }, [])
  const epById = useMemo(() => new Map(episodes.map((e) => [e.id, e])), [episodes])
  const seriesById = useMemo(() => new Map(series.map((s) => [s.id, s])), [series])

  const hits = useMemo<Hit[]>(() => {
    const nq = norm(q.trim())
    if (!nq) return []
    const out: Hit[] = []
    for (const x of sentences) {
      if (norm(`${x.text} ${x.translation ?? ''} ${x.note ?? ''}`).includes(nq)) {
        out.push({ key: 's' + x.id, episodeId: x.episodeId, sec: x.s / 1000, text: x.text, sub: x.translation, kind: 'saved' })
      }
    }
    const seenCard = new Set<string>()
    for (const it of items) {
      if (it.card.source?.module === 'anime' || seenCard.has(it.card.id)) continue
      const c = it.card
      if (norm(`${c.front} ${c.reading ?? ''} ${c.meaning}`).includes(nq)) {
        seenCard.add(c.id)
        out.push({ key: 'c' + c.id, episodeId: it.link.episodeId, sec: it.sentence ? it.sentence.s / 1000 : 0, text: c.front + (c.reading ? `【${c.reading}】` : ''), sub: c.meaning, kind: 'card' })
      }
    }
    let lines = 0
    for (const s of subs ?? []) {
      if (s.track !== 'jp' || !epById.has(s.episodeId)) continue
      const off = epById.get(s.episodeId)?.subOffset ?? 0
      for (const c of s.cues) {
        if (norm(c.t).includes(nq)) {
          out.push({ key: `l${s.episodeId}:${c.s}`, episodeId: s.episodeId, sec: (c.s + off) / 1000, text: c.t.replace(/\n/g, ' '), kind: 'line' })
          if (++lines >= 200) break
        }
      }
      if (lines >= 200) break
    }
    return out
  }, [q, sentences, items, subs, epById])

  return (
    <div className="grid gap-4">
      <Button variant="ghost" className="justify-self-start" onClick={onBack}>← Thư viện anime</Button>
      <h1 className="text-2xl font-bold">Tìm câu / từ trong anime</h1>
      <input className={`${inputClass} jp`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus
        placeholder="Gõ từ tiếng Nhật, nghĩa tiếng Việt hoặc ghi chú… (vd: やばい, 大丈夫, cảm ơn)" aria-label="Tìm kiếm" />
      {!subs && <p className="text-sm text-muted">Đang đọc phụ đề…</p>}
      {q.trim() && <p className="text-sm text-muted">{hits.length >= 200 ? 'Hơn 200' : hits.length} kết quả</p>}
      <ul className="grid gap-2">
        {hits.map((h) => {
          const ep = epById.get(h.episodeId)
          const s = ep && seriesById.get(ep.seriesId)
          return (
            <li key={h.key}>
              <button className="grid w-full gap-0.5 rounded-xl border border-border bg-surface p-3 text-left hover:border-primary" onClick={() => openPlayerAt(h.episodeId, Math.max(0, h.sec - 1))}>
                <span className="flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded bg-surface-2 px-1.5">{KIND[h.kind]}</span>
                  {s && <span>{s.title}</span>}{ep && <span>· {episodeLabel(ep)}</span>}{h.sec > 0 && <span>· {formatClock(h.sec)}</span>}
                </span>
                <span className="jp leading-relaxed">{h.text}</span>
                {h.sub && <span className="text-sm text-muted">{h.sub}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
