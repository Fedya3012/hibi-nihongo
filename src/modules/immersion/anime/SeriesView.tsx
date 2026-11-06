/**
 * MỘT SERIES ANIME
 * - Danh sách tập chia theo mùa, mỗi mùa có % đã học.
 * - Mỗi tập: đã xem / đã học, điểm hiểu, số từ mới đã tạo thẻ, số câu đã lưu, kết quả kiểm tra nghe.
 * - Gợi ý trước khi xem tập mới: ôn thẻ của tập trước, học trước từ mới của tập sắp xem.
 * - Trạng thái (đang xem / đã xem xong / muốn xem), ghi chú nhân vật, ôn theo cảnh phim, xuất Anki.
 * Tập có phụ đề tiếng Nhật được tự phân tích ngầm (lần đầu cần tải bộ tách từ).
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useDbQuery } from '@/core/db'
import { ProgressBar, inputClass } from '../manga/ui'
import { ANALYSIS_VERSION, ensureAnalysis, comprehension, comprehensionLabel, useKnowledge, type Knowledge } from './analysis'
import { downloadBlob, exportAnki } from './anki'
import { episodeLabel } from './importer'
import { ImportDialog } from './ImportDialog'
import { SeriesTile } from './Library'
import { openMedia } from './media'
import { CharacterNotes } from './Panels'
import {
  episodeProgress, formatDuration, inScope, libraryStats, loadAnimeData, seasonSummaries, speedLabel, uniqueCards,
  type AnimeData,
} from './progress'
import {
  deleteEpisode, deleteSeries, getMedia, getSeries, getSubs, listEpisodes, putMedia, setFinished, updateEpisode, updateSeries,
} from './store'
import { formatClock } from './subtitles'
import type { AnimeEpisode, AnimeMedia, AnimeSeries, SeriesStatus, SubAnalysis } from './types'
import { ComprehensionBar, VocabPanel } from './VocabPanel'

export const STATUS_LABEL: Record<SeriesStatus, string> = { watching: 'Đang xem', completed: 'Đã xem xong', planned: 'Muốn xem' }

export function SeriesView({ seriesId, back, openPlayer, openReview, focusEpisode }: {
  seriesId: string
  back: () => void
  openPlayer: (episodeId: string) => void
  /** Mở "Ôn theo cảnh phim" với phạm vi (tham số đường dẫn). */
  openReview: (scope: Record<string, string>) => void
  /** Mở sẵn bảng từ vựng của tập này (vd. bấm "Học trước từ vựng tập sau"). */
  focusEpisode?: string
}) {
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showChars, setShowChars] = useState(false)
  const [vocabFor, setVocabFor] = useState<string | undefined>(focusEpisode)
  const [analyzing, setAnalyzing] = useState<string>()
  const [analyses, setAnalyses] = useState<Map<string, SubAnalysis>>(new Map())
  const [msg, setMsg] = useState<string>()
  const k = useKnowledge()

  const { data } = useDbQuery(async () => {
    const [series, eps] = await Promise.all([getSeries(seriesId), listEpisodes(seriesId)])
    const media = new Map<string, AnimeMedia>()
    for (const e of eps) { const m = await getMedia(e.id); if (m) media.set(e.id, m) }
    return { series, eps, media }
  }, [seriesId], ['animeSeries', 'animeEpisodes', 'animeMedia'])
  const { data: all } = useDbQuery(loadAnimeData, [], ['animeLinks', 'animeSentences', 'animeEpisodes', 'srsCards'])
  const series = data?.series
  const eps = useMemo(() => data?.eps ?? [], [data])

  useEffect(() => {
    if (!focusEpisode) return
    setVocabFor(focusEpisode)
    window.setTimeout(() => document.getElementById(`ep-${focusEpisode}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300)
  }, [focusEpisode])

  // Phân tích ngầm các tập có phụ đề (lần lượt từng tập), rồi đọc kết quả để tính điểm hiểu
  const subKey = eps.map((e) => `${e.id}:${e.subFile ?? ''}`).join('|')
  useEffect(() => {
    let alive = true
    ;(async () => {
      const map = new Map<string, SubAnalysis>()
      for (const e of eps) {
        if (!e.subFile) continue
        try {
          const cached = (await getSubs(e.id, 'jp'))?.analysis
          const a = cached?.v === ANALYSIS_VERSION ? cached : (alive ? (setAnalyzing(episodeLabel(e)), await ensureAnalysis(e)) : undefined)
          if (a) map.set(e.id, a)
          if (alive) setAnalyses(new Map(map))
        } catch { /* bộ tách từ chưa tải được (mất mạng lần đầu): bỏ qua, thử lại lần sau */ }
        if (!alive) return
      }
      if (alive) setAnalyzing(undefined)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subKey])

  if (data && !series) {
    return (
      <div className="grid gap-3">
        <p>Không tìm thấy series này.</p>
        <Button variant="ghost" onClick={back}>← Thư viện</Button>
      </div>
    )
  }
  if (!series) return <p className="text-muted">Đang tải…</p>

  const resumeEp = eps.find((e) => e.id === series.lastEpisodeId) ?? eps.find((e) => !e.finishedAt) ?? eps[0]

  // Điểm hiểu cả series = gộp lượt từ của mọi tập đã phân tích
  let seriesScore: number | undefined
  if (k && analyses.size) {
    let known = 0, total = 0
    for (const a of analyses.values()) { known += comprehension(a, k).known * a.tokens; total += a.tokens }
    seriesScore = total ? known / total : undefined
  }
  const stats = all ? libraryStats(all, series.id) : undefined
  const seasons = all ? seasonSummaries(all, eps) : []
  const speakers = [...new Set(series.characters?.map((c) => c.name) ?? [])]

  const exportSeries = async () => {
    if (!all) return
    setMsg('Đang gói thẻ, ảnh và âm thanh…')
    const items = uniqueCards(inScope(all.items, { kind: 'series', seriesId: series.id }, all.episodes))
    if (!items.length) { setMsg('Series này chưa có thẻ ôn tập nào để xuất.'); return }
    const { blob, count } = await exportAnki(items, all, `Hibi Nihongo::Anime::${series.title}`)
    downloadBlob(blob, `anki-${series.title.replace(/[\\/:*?"<>|]/g, '_')}.zip`)
    setMsg(`Đã xuất ${count} thẻ. Mở file HUONG-DAN.txt trong file zip để nhập vào Anki.`)
  }

  return (
    <div className="grid gap-6">
      <Button variant="ghost" className="justify-self-start" onClick={back}>← Thư viện anime</Button>

      <div className="flex flex-wrap items-start gap-4">
        <SeriesTile s={series} className="h-32 w-24 shrink-0 rounded-card border border-border" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <EditTitle title={series.title} titleJp={series.titleJp ?? ''}
              onSave={async (t, j) => { await updateSeries(series.id, { title: t.trim() || series.title, titleJp: j.trim() || undefined }); setEditing(false) }}
              onCancel={() => setEditing(false)} />
          ) : (
            <>
              <h1 className="text-2xl font-bold">{series.title}</h1>
              {series.titleJp && <p className="jp text-muted">{series.titleJp}</p>}
            </>
          )}
          <p className="mt-1 text-sm text-muted">
            {eps.length} tập · đã xem {eps.filter((e) => e.finishedAt).length} · đã học {eps.filter((e) => e.studiedAt).length}
            {seriesScore != null && <> · hiểu khoảng <b className="text-text">{Math.round(seriesScore * 100)}%</b> ({comprehensionLabel(seriesScore)})</>}
          </p>
          {stats && (stats.watchSeconds > 0 || stats.cards > 0) && (
            <p className="text-sm text-muted">
              Đã xem {formatDuration(stats.watchSeconds)} · {stats.cards} thẻ · {stats.wordsLearned} từ đã thuộc · {stats.sentences} câu đã lưu
            </p>
          )}
          {analyzing && <p className="text-xs text-muted">Đang phân tích phụ đề {analyzing}…</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {resumeEp && <Button onClick={() => openPlayer(resumeEp.id)}>{resumeEp.position > 5 && !resumeEp.finishedAt ? 'Xem tiếp' : 'Xem'} {episodeLabel(resumeEp)}</Button>}
            <Button variant="soft" onClick={() => setImporting(true)}>+ Thêm tập / phụ đề</Button>
            <Button variant="soft" onClick={() => openReview({ series: series.id })}>Ôn theo cảnh phim</Button>
            <select className={`${inputClass} w-auto!`} aria-label="Trạng thái" value={series.status ?? ''}
              onChange={(e) => updateSeries(series.id, { status: (e.target.value || undefined) as SeriesStatus | undefined })}>
              <option value="">Chưa đặt trạng thái</option>
              {(Object.keys(STATUS_LABEL) as SeriesStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowChars((v) => !v)}>Ghi chú nhân vật{series.characters?.length ? ` (${series.characters.length})` : ''}</Button>
            <Button variant="ghost" onClick={exportSeries}>Xuất Anki (kèm âm thanh + ảnh)</Button>
            {!editing && <Button variant="ghost" onClick={() => setEditing(true)}>Đổi tên</Button>}
            <Button variant="ghost" onClick={async () => {
              if (confirm(`Xóa "${series.title}" khỏi app? File video trên máy của bạn không bị xóa.`)) { await deleteSeries(series.id); back() }
            }}>Xóa series</Button>
          </div>
          {msg && <p className="mt-2 text-sm text-muted" role="status">{msg}</p>}
        </div>
      </div>

      {showChars && <Card><CharacterNotes series={series} speakers={speakers} /></Card>}

      {all && <NextUp series={series} eps={eps} data={all} analyses={analyses} k={k}
        openPlayer={openPlayer} openReview={openReview} openVocab={(id) => { setVocabFor(id); document.getElementById(`ep-${id}`)?.scrollIntoView({ behavior: 'smooth' }) }} />}

      {eps.length === 0 && (
        <Card className="text-sm text-muted">Series này chưa có tập nào. Bấm <b>+ Thêm tập / phụ đề</b>.</Card>
      )}

      {seasons.map((s) => (
        <section key={s.season} className="grid gap-3">
          {(seasons.length > 1 || s.cards > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-lg font-semibold">{seasons.length > 1 ? `Mùa ${s.season}` : 'Các tập'}</h2>
              <ProgressBar className="w-32" value={s.percent} />
              <span className="text-sm text-muted">
                đã học {Math.round(s.percent * 100)}% · xem {s.watched}/{s.episodes.length} tập · học {s.studied}/{s.episodes.length} tập
                {s.cards > 0 && <> · thuộc {s.learned}/{s.cards} thẻ</>}
              </span>
              {seasons.length > 1 && s.cards > 0 && (
                <Button variant="ghost" onClick={() => openReview({ series: series.id, season: String(s.season) })}>Ôn mùa này</Button>
              )}
            </div>
          )}
          {s.episodes.map((e) => (
            <EpisodeRow key={e.id} e={e} media={data?.media.get(e.id)} analysis={analyses.get(e.id)} data={all}
              onPlay={() => openPlayer(e.id)} vocabOpen={vocabFor === e.id}
              onVocab={() => setVocabFor((v) => (v === e.id ? undefined : e.id))}
              onReview={() => openReview({ episode: e.id })}
              series={series} k={k} />
          ))}
        </section>
      ))}

      {importing && (
        <ImportDialog seriesId={series.id} onClose={() => setImporting(false)} onDone={() => setImporting(false)} />
      )}
    </div>
  )
}

/** Gợi ý trước khi xem tập tiếp theo. */
function NextUp({ series, eps, data, analyses, k, openPlayer, openReview, openVocab }: {
  series: AnimeSeries; eps: AnimeEpisode[]; data: AnimeData; analyses: Map<string, SubAnalysis>; k?: Knowledge
  openPlayer: (id: string) => void; openReview: (scope: Record<string, string>) => void; openVocab: (id: string) => void
}) {
  const lastIdx = eps.findIndex((e) => e.id === series.lastEpisodeId)
  const last = lastIdx >= 0 ? eps[lastIdx] : undefined
  // Tập sắp xem: tập sau tập vừa xem xong (tập đang dở thì không gợi ý tập mới)
  const next = last ? (last.finishedAt ? eps[lastIdx + 1] : undefined) : eps.find((e) => !e.finishedAt)
  if (!last && !next) return null
  const lastProg = last ? episodeProgress(data, last.id) : undefined
  const a = next ? analyses.get(next.id) : undefined
  const c = a && k ? comprehension(a, k) : undefined
  const tips: { text: string; action: string; run: () => void }[] = []
  if (last && lastProg && lastProg.due > 0) {
    tips.push({ text: `Ôn ${lastProg.due} thẻ đến hạn của ${episodeLabel(last)} để nhớ chắc trước khi xem tiếp.`, action: 'Ôn ngay', run: () => openReview({ episode: last.id }) })
  }
  const now = Date.now()
  const recentDue = uniqueCards(inScope(data.items, { kind: 'recent', seriesId: series.id, count: 2 }, data.episodes))
    .filter((x) => x.card.due <= now && !x.card.suspended).length
  if (recentDue > (lastProg?.due ?? 0)) {
    tips.push({ text: `Có ${recentDue} thẻ đến hạn trong 2 tập xem gần nhất.`, action: 'Ôn 2 tập gần nhất', run: () => openReview({ series: series.id, recent: '2' }) })
  }
  if (next && c && c.known < 0.9 && c.newUnique > 0) {
    tips.push({ text: `${episodeLabel(next)}: bạn hiểu khoảng ${Math.round(c.known * 100)}%, có ${c.newUnique} từ mới. Học trước vài từ hay gặp nhất sẽ dễ xem hơn.`, action: 'Học trước từ mới', run: () => openVocab(next.id) })
  }
  if (last && last.finishedAt && !last.studiedAt) {
    tips.push({ text: `Bạn đã xem xong ${episodeLabel(last)}. Ôn lại câu đã lưu rồi đánh dấu "Đã học" khi xong.`, action: 'Mở lại tập', run: () => openPlayer(last.id) })
  }
  if (!tips.length) return null
  return (
    <Card className="grid gap-2">
      <h2 className="font-semibold">Trước khi xem tiếp</h2>
      {tips.map((t) => (
        <div key={t.text} className="flex flex-wrap items-center gap-2 text-sm">
          <p className="min-w-0 flex-1">{t.text}</p>
          <Button variant="soft" onClick={t.run}>{t.action}</Button>
        </div>
      ))}
      {next && <Button className="justify-self-start" onClick={() => openPlayer(next.id)}>Xem {episodeLabel(next)} ▶</Button>}
    </Card>
  )
}

function EpisodeRow({ e, media, analysis, data, onPlay, vocabOpen, onVocab, onReview, series, k }: {
  e: AnimeEpisode
  media?: AnimeMedia
  analysis?: SubAnalysis
  data?: AnimeData
  onPlay: () => void
  vocabOpen: boolean
  onVocab: () => void
  onReview: () => void
  series: AnimeSeries
  k?: Knowledge
}) {
  const [saving, setSaving] = useState<string>()
  const started = e.position > 5 && !e.finishedAt
  const prog = data ? episodeProgress(data, e.id) : undefined
  const listen = e.listening ? e.listening.yes + e.listening.partly + e.listening.no : 0
  const speed = speedLabel(e.stats?.cpm ?? analysis?.cpm)

  // Lưu hẳn video vào bộ nhớ của app để xem không cần file gốc (đi đường, không cắm ổ cứng ngoài...)
  const keepOffline = async () => {
    setSaving('Đang chép video vào app…')
    try {
      const r = await openMedia(media, true)
      if (r.state !== 'ok') { setSaving('Không mở được file video để chép.'); return }
      await putMedia({ episodeId: e.id, kind: 'blob', blob: r.file, name: r.name, size: r.file.size })
      setSaving(undefined)
    } catch (err) {
      setSaving(`Không chép được (có thể hết dung lượng): ${(err as Error).message}`)
    }
  }

  return (
    <Card id={`ep-${e.id}`} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onPlay} aria-label={`Xem ${episodeLabel(e)}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition hover:opacity-90">▶</button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold">{episodeLabel(e)}</h3>
            {e.finishedAt && <span className="text-xs text-good">✓ đã xem</span>}
            {e.studiedAt && <span className="text-xs text-good">✓ đã học</span>}
            {!media && <span className="text-xs text-muted">· chọn lại video khi xem</span>}
            {media?.kind === 'blob' && <span className="text-xs text-muted">· video lưu trong app</span>}
            {!e.subFile && <span className="text-xs text-warn">· chưa có phụ đề tiếng Nhật</span>}
          </div>
          <p className="truncate text-xs text-muted" title={e.fileName}>{e.title}</p>
          {(started || e.finishedAt) && e.duration ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <ProgressBar className="w-40" value={e.finishedAt ? 1 : e.position / e.duration} />
              {started && <span>{formatClock(e.position)} / {formatClock(e.duration)}</span>}
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            {prog && prog.newWords > 0 && <span>{prog.newWords} từ mới đã tạo thẻ</span>}
            {prog && prog.sentences > 0 && <span>{prog.sentences} câu đã lưu</span>}
            {prog && prog.cards > 0 && <span>thuộc {prog.learned}/{prog.cards} thẻ</span>}
            {prog && prog.due > 0 && <span className="text-warn">{prog.due} thẻ đến hạn</span>}
            {listen > 0 && e.listening && <span>nghe hiểu {Math.round(((e.listening.yes + e.listening.partly * 0.5) / listen) * 100)}% ({listen} câu)</span>}
            {e.dictation && <span>chính tả {Math.round(e.dictation.score * 100)}% ({e.dictation.count} câu)</span>}
            {speed && <span>{speed}</span>}
            {e.watchSeconds ? <span>đã xem {formatDuration(e.watchSeconds)}</span> : null}
          </div>
        </div>
        {analysis && k && <div className="w-full sm:w-40"><ComprehensionBar a={analysis} k={k} compact /></div>}
        <div className="flex flex-wrap gap-1">
          {e.subFile && <Button variant={vocabOpen ? 'soft' : 'ghost'} onClick={onVocab}>Từ vựng</Button>}
          {prog && prog.cards > 0 && <Button variant="ghost" onClick={onReview}>Ôn</Button>}
          <Button variant="ghost" onClick={() => setFinished(e.id, !e.finishedAt)}>{e.finishedAt ? 'Chưa xem' : 'Đã xem'}</Button>
          <Button variant={e.studiedAt ? 'soft' : 'ghost'} onClick={() => updateEpisode(e.id, { studiedAt: e.studiedAt ? undefined : Date.now() })}>
            {e.studiedAt ? '✓ Đã học' : 'Đã học'}
          </Button>
          {media?.kind === 'handle' && <Button variant="ghost" onClick={keepOffline} title="Chép video vào bộ nhớ app để xem khi không có file gốc">Lưu vào app</Button>}
          <Button variant="ghost" aria-label="Xóa tập" onClick={async () => {
            if (confirm(`Xóa ${episodeLabel(e)} khỏi app? File video trên máy không bị xóa.`)) await deleteEpisode(e.id)
          }}>✕</Button>
        </div>
      </div>
      {saving && <p className="text-sm text-muted" role="status">{saving}</p>}
      {e.note && <p className="text-sm text-muted">📝 {e.note}</p>}
      {vocabOpen && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm text-muted">Học trước những từ hay gặp nhất để xem tập này dễ hơn.</p>
          <VocabPanel episode={e} series={series} />
        </div>
      )}
    </Card>
  )
}

function EditTitle({ title, titleJp, onSave, onCancel }: {
  title: string; titleJp: string; onSave: (t: string, j: string) => void; onCancel: () => void
}) {
  const [t, setT] = useState(title)
  const [j, setJ] = useState(titleJp)
  return (
    <form className="grid gap-2 sm:max-w-md" onSubmit={(ev) => { ev.preventDefault(); onSave(t, j) }}>
      <input className={inputClass} value={t} onChange={(ev) => setT(ev.target.value)} aria-label="Tên anime" autoFocus />
      <input className={`${inputClass} jp`} value={j} onChange={(ev) => setJ(ev.target.value)} placeholder="Tên tiếng Nhật" aria-label="Tên tiếng Nhật" />
      <div className="flex gap-2">
        <Button type="submit">Lưu</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  )
}
