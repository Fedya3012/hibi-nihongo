/**
 * MỘT SERIES ANIME: danh sách tập, chỗ đang xem, điểm hiểu từng tập, từ vựng để học trước khi xem.
 * Tập có phụ đề tiếng Nhật được tự phân tích ngầm (lần đầu cần tải bộ tách từ).
 */
import { useEffect, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useDbQuery } from '@/core/db'
import { ProgressBar, inputClass } from '../manga/ui'
import { ensureAnalysis, comprehension, comprehensionLabel, useKnowledge } from './analysis'
import { episodeLabel } from './importer'
import { ImportDialog } from './ImportDialog'
import { SeriesTile } from './Library'
import {
  deleteEpisode, deleteSeries, episodesWithMedia, getSeries, getSubs, listEpisodes, setFinished, updateSeries,
} from './store'
import { formatClock } from './subtitles'
import type { AnimeEpisode, SubAnalysis } from './types'
import { ComprehensionBar, VocabPanel } from './VocabPanel'

export function SeriesView({ seriesId, back, openPlayer }: {
  seriesId: string
  back: () => void
  openPlayer: (episodeId: string) => void
}) {
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [vocabFor, setVocabFor] = useState<string>()
  const [analyzing, setAnalyzing] = useState<string>()
  const [analyses, setAnalyses] = useState<Map<string, SubAnalysis>>(new Map())
  const k = useKnowledge()

  const { data } = useDbQuery(async () => {
    const [series, eps] = await Promise.all([getSeries(seriesId), listEpisodes(seriesId)])
    const withMedia = await episodesWithMedia(eps.map((e) => e.id))
    return { series, eps, withMedia }
  }, [seriesId], ['animeSeries', 'animeEpisodes', 'animeMedia'])
  const series = data?.series
  const eps = data?.eps ?? []

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
          const a = cached ?? (alive ? (setAnalyzing(episodeLabel(e)), await ensureAnalysis(e)) : undefined)
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
            {eps.length} tập · đã xem {eps.filter((e) => e.finishedAt).length}
            {seriesScore != null && <> · hiểu khoảng <b className="text-text">{Math.round(seriesScore * 100)}%</b> ({comprehensionLabel(seriesScore)})</>}
          </p>
          {analyzing && <p className="text-xs text-muted">Đang phân tích phụ đề {analyzing}…</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {resumeEp && <Button onClick={() => openPlayer(resumeEp.id)}>{resumeEp.position > 5 && !resumeEp.finishedAt ? 'Xem tiếp' : 'Xem'} {episodeLabel(resumeEp)}</Button>}
            <Button variant="soft" onClick={() => setImporting(true)}>+ Thêm tập / phụ đề</Button>
            {!editing && <Button variant="ghost" onClick={() => setEditing(true)}>Đổi tên</Button>}
            <Button variant="ghost" onClick={async () => {
              if (confirm(`Xóa "${series.title}" khỏi app? File video trên máy của bạn không bị xóa.`)) { await deleteSeries(series.id); back() }
            }}>Xóa series</Button>
          </div>
        </div>
      </div>

      {eps.length === 0 && (
        <Card className="text-sm text-muted">Series này chưa có tập nào. Bấm <b>+ Thêm tập / phụ đề</b>.</Card>
      )}

      <div className="grid gap-3">
        {eps.map((e) => (
          <EpisodeRow key={e.id} e={e} hasVideo={!!data?.withMedia.has(e.id)} analysis={analyses.get(e.id)}
            onPlay={() => openPlayer(e.id)} vocabOpen={vocabFor === e.id}
            onVocab={() => setVocabFor((v) => (v === e.id ? undefined : e.id))}
            seriesTitle={series.title} k={k} />
        ))}
      </div>

      {importing && (
        <ImportDialog seriesId={series.id} onClose={() => setImporting(false)} onDone={() => setImporting(false)} />
      )}
    </div>
  )
}

function EpisodeRow({ e, hasVideo, analysis, onPlay, vocabOpen, onVocab, seriesTitle, k }: {
  e: AnimeEpisode
  hasVideo: boolean
  analysis?: SubAnalysis
  onPlay: () => void
  vocabOpen: boolean
  onVocab: () => void
  seriesTitle: string
  k: ReturnType<typeof useKnowledge>
}) {
  const started = e.position > 5 && !e.finishedAt
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onPlay} aria-label={`Xem ${episodeLabel(e)}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition hover:opacity-90">▶</button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold">{episodeLabel(e)}</h3>
            {e.finishedAt && <span className="text-xs text-good">✓ đã xem</span>}
            {!hasVideo && <span className="text-xs text-muted">· chọn lại video khi xem</span>}
            {!e.subFile && <span className="text-xs text-warn">· chưa có phụ đề tiếng Nhật</span>}
          </div>
          <p className="truncate text-xs text-muted" title={e.fileName}>{e.title}</p>
          {(started || e.finishedAt) && e.duration ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <ProgressBar className="w-40" value={e.finishedAt ? 1 : e.position / e.duration} />
              {started && <span>{formatClock(e.position)} / {formatClock(e.duration)}</span>}
            </div>
          ) : null}
        </div>
        {analysis && k && <div className="w-full sm:w-40"><ComprehensionBar a={analysis} k={k} compact /></div>}
        <div className="flex gap-1">
          {e.subFile && <Button variant={vocabOpen ? 'soft' : 'ghost'} onClick={onVocab}>Từ vựng</Button>}
          <Button variant="ghost" onClick={() => setFinished(e.id, !e.finishedAt)}>{e.finishedAt ? 'Chưa xem' : 'Đã xem'}</Button>
          <Button variant="ghost" aria-label="Xóa tập" onClick={async () => {
            if (confirm(`Xóa ${episodeLabel(e)} khỏi app? File video trên máy không bị xóa.`)) await deleteEpisode(e.id)
          }}>✕</Button>
        </div>
      </div>
      {vocabOpen && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm text-muted">Học trước những từ hay gặp nhất để xem tập này dễ hơn.</p>
          <VocabPanel episode={e} seriesTitle={seriesTitle} />
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
