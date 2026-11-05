/** THƯ VIỆN ANIME: "Xem tiếp" + lưới các series. */
import { useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { ProgressBar } from '../manga/ui'
import { getAnimeResume } from './api'
import { ImportDialog } from './ImportDialog'
import { listAllEpisodes, listSeries } from './store'
import { formatClock } from './subtitles'
import type { AnimeEpisode, AnimeSeries } from './types'

/** Ô bìa: chưa có ảnh bìa nên dùng chữ đầu của tên tiếng Nhật (hoặc tên thường). */
export function SeriesTile({ s, className = '' }: { s: AnimeSeries; className?: string }) {
  const ch = [...(s.titleJp || s.title)][0] ?? '映'
  return (
    <div className={`jp grid place-items-center bg-primary-soft text-5xl text-primary ${className}`} aria-hidden>{ch}</div>
  )
}

export function Library({ openSeries, openPlayer }: {
  openSeries: (id: string) => void
  openPlayer: (episodeId: string) => void
}) {
  const [importing, setImporting] = useState(false)
  const { data } = useDbQuery(async () => {
    const [series, eps, resume] = await Promise.all([listSeries(), listAllEpisodes(), getAnimeResume()])
    const bySeries = new Map<string, AnimeEpisode[]>()
    for (const e of eps) bySeries.set(e.seriesId, [...(bySeries.get(e.seriesId) ?? []), e])
    return { series, bySeries, resume }
  }, [], ['animeSeries', 'animeEpisodes'])

  const series = data?.series ?? []
  const resume = data?.resume
  const resumeSeries = resume && series.find((s) => s.id === resume.seriesId)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Xem anime</h1>
          <p className="text-sm text-muted">Xem anime từ file của bạn với phụ đề tiếng Nhật bấm để tra từ.</p>
        </div>
        <Button onClick={() => setImporting(true)}>+ Thêm anime</Button>
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

      {data && series.length === 0 && (
        <Card className="mx-auto max-w-xl text-center">
          <div className="jp text-5xl text-primary" aria-hidden>映</div>
          <h2 className="mt-3 text-lg font-semibold">Chưa có anime nào</h2>
          <p className="mt-2 text-sm text-muted">
            App không kèm sẵn anime. Bạn thêm file video của mình (.mp4, .webm, .mkv) cùng file phụ đề tiếng Nhật
            (.srt, .ass, .vtt). Mỗi bộ anime là một series, mỗi file video là một tập.
          </p>
          <p className="mt-2 text-sm text-muted">
            Phụ đề tiếng Nhật thường tìm được ở các kho phụ đề cộng đồng (ví dụ Kitsunekko, Jimaku). Hãy tôn trọng bản quyền.
          </p>
          <Button className="mt-4" onClick={() => setImporting(true)}>Thêm anime đầu tiên</Button>
        </Card>
      )}

      {series.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {series.map((s) => {
            const eps = data?.bySeries.get(s.id) ?? []
            const done = eps.filter((e) => e.finishedAt).length
            return (
              <button key={s.id} onClick={() => openSeries(s.id)} className="group flex flex-col text-left">
                <SeriesTile s={s} className="aspect-[3/4] w-full rounded-card border border-border transition group-hover:border-primary" />
                <h3 className="mt-2 truncate font-semibold">{s.title}</h3>
                {s.titleJp && <p className="jp truncate text-sm leading-normal text-muted">{s.titleJp}</p>}
                <p className="text-xs text-muted">{eps.length} tập · đã xem {done}</p>
                {eps.length > 0 && <ProgressBar className="mt-1" value={done / eps.length} />}
              </button>
            )
          })}
        </div>
      )}

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onDone={(id) => { setImporting(false); openSeries(id) }} />
      )}
    </div>
  )
}
