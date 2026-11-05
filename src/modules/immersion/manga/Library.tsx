/** THƯ VIỆN MANGA: "Tiếp tục đọc", tìm kiếm trong mọi manga, yêu thích, lọc đang đọc/đã đọc. */
import { useMemo, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { formatBytes, getStorageInfo, useDbQuery } from '@/core/db'
import { listAllChapters, listSeries, updateSeries } from './store'
import { listAllNotes, normalizeSearch } from './notes'
import { getMangaResume } from './api'
import { chapterLabel } from './naming'
import { ImportDialog } from './ImportDialog'
import { Cover, ProgressBar } from './ui'
import type { MangaChapter } from './types'

type Filter = 'all' | 'reading' | 'fav' | 'done'

export function Library({ openSeries, openReader }: {
  openSeries: (id: string) => void
  openReader: (chapterId: string, page?: number) => void
}) {
  const [importing, setImporting] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const { data } = useDbQuery(async () => {
    const [series, chapters, resume] = await Promise.all([listSeries(), listAllChapters(), getMangaResume()])
    const bySeries = new Map<string, MangaChapter[]>()
    for (const c of chapters) bySeries.set(c.seriesId, [...(bySeries.get(c.seriesId) ?? []), c])
    return { series, chapters, bySeries, resume }
  }, [], ['mangaSeries', 'mangaChapters'])
  const { data: notes = [] } = useDbQuery(listAllNotes, [], ['mangaNotes'])
  const { data: storage } = useDbQuery(getStorageInfo, [], ['mangaBlobs'])

  const series = data?.series ?? []
  const resume = data?.resume

  const shown = series
    .filter((s) => {
      const chs = data?.bySeries.get(s.id) ?? []
      if (filter === 'fav') return s.favorite
      if (filter === 'done') return chs.length > 0 && chs.every((c) => c.finishedAt)
      if (filter === 'reading') return chs.some((c) => c.lastReadAt) && !chs.every((c) => c.finishedAt)
      return true
    })
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite))

  // Tìm trong tên series, tên chương, chữ trong bong bóng, bản dịch và ghi chú của bạn
  const results = useMemo(() => {
    const q = normalizeSearch(query.trim())
    if (q.length < 1 || !data) return null
    const chapterById = new Map(data.chapters.map((c) => [c.id, c]))
    const seriesById = new Map(data.series.map((s) => [s.id, s]))
    const out: { key: string; title: string; sub: string; text?: string; go: () => void }[] = []
    for (const s of data.series) {
      if (normalizeSearch(`${s.title} ${s.titleJp ?? ''}`).includes(q)) out.push({ key: s.id, title: s.title, sub: 'Series', go: () => openSeries(s.id) })
    }
    for (const c of data.chapters) {
      if (normalizeSearch(`${c.title} ${chapterLabel(c)}`).includes(q)) {
        out.push({ key: c.id, title: `${seriesById.get(c.seriesId)?.title ?? ''} · ${chapterLabel(c)}`, sub: 'Chương', go: () => openReader(c.id) })
      }
    }
    for (const n of notes) {
      const hay = n.kind === 'bubble' ? `${n.text} ${n.translation ?? ''} ${n.note ?? ''} ${n.speaker ?? ''}` : n.note
      if (!hay || !normalizeSearch(hay).includes(q)) continue
      const c = chapterById.get(n.chapterId)
      if (!c) continue
      out.push({
        key: n.id,
        title: `${seriesById.get(c.seriesId)?.title ?? ''} · ${chapterLabel(c)} · trang ${n.page + 1}`,
        sub: n.kind === 'bubble' ? 'Câu' : 'Ghi chú',
        text: n.kind === 'bubble' ? n.text : n.note,
        go: () => openReader(c.id, n.page),
      })
    }
    return out.slice(0, 80)
  }, [query, data, notes, openSeries, openReader])

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đọc manga</h1>
          <p className="text-sm text-muted">Đọc manga tiếng Nhật từ file của bạn. Nhớ trang đang đọc cho từng chương.</p>
        </div>
        <Button onClick={() => setImporting(true)}>+ Thêm manga</Button>
      </div>

      {resume && !query && (
        <Card className="flex items-center gap-4">
          <Cover chapterId={resume.chapterId} className="h-24 w-16 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Tiếp tục đọc</p>
            <h2 className="truncate font-semibold">{resume.seriesTitle}</h2>
            <p className="truncate text-sm text-muted">{resume.chapterLabel} · trang {resume.page + 1}/{resume.pageCount}</p>
            <ProgressBar className="mt-2 max-w-xs" value={(resume.page + 1) / resume.pageCount} />
          </div>
          <Button onClick={() => openReader(resume.chapterId)}>Đọc tiếp</Button>
        </Card>
      )}

      {series.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm trong manga"
            placeholder="Tìm câu, từ, ghi chú, tên chương… trong mọi manga"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary sm:max-w-md" />
          {!query && (
            <Segmented<Filter> label="Lọc" value={filter} onChange={setFilter}
              options={[{ value: 'all', label: 'Tất cả' }, { value: 'reading', label: 'Đang đọc' }, { value: 'fav', label: '★ Yêu thích' }, { value: 'done', label: 'Đã đọc' }]} />
          )}
        </div>
      )}

      {results && (
        <section className="grid gap-2">
          <p className="text-sm text-muted">{results.length ? `${results.length} kết quả` : 'Không tìm thấy. Chữ trong bong bóng chỉ tìm được sau khi bạn đã thêm chữ cho bong bóng đó.'}</p>
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {results.map((r) => (
              <li key={r.key}>
                <button onClick={r.go} className="w-full px-4 py-3 text-left hover:bg-surface-2">
                  <span className="mr-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{r.sub}</span>
                  <span className="text-sm">{r.title}</span>
                  {r.text && <span className="jp mt-1 block truncate">{r.text}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && series.length === 0 && (
        <Card className="mx-auto max-w-xl text-center">
          <div className="jp text-5xl text-primary" aria-hidden>漫</div>
          <h2 className="mt-3 text-lg font-semibold">Chưa có manga nào</h2>
          <p className="mt-2 text-sm text-muted">
            App không kèm sẵn truyện. Bạn thêm file manga tiếng Nhật của mình (CBZ, CBR, PDF hoặc thư mục ảnh),
            ví dụ các tập D.Gray-man hay One Piece bạn đã mua. Mỗi bộ truyện là một series, mỗi file là một chương.
          </p>
          <Button className="mt-4" onClick={() => setImporting(true)}>Thêm manga đầu tiên</Button>
        </Card>
      )}

      {!results && shown.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((s) => {
            const chs = data?.bySeries.get(s.id) ?? []
            const read = chs.filter((c) => c.finishedAt).length
            const coverId = [...chs].sort((a, b) => (a.volume ?? -1) - (b.volume ?? -1) || (a.number ?? Infinity) - (b.number ?? Infinity))[0]?.id
            return (
              <div key={s.id} className="group relative">
                <button onClick={() => openSeries(s.id)} className="flex w-full flex-col text-left">
                  <Cover chapterId={coverId} alt={s.title}
                    className="aspect-[2/3] w-full rounded-card border border-border transition group-hover:border-primary" />
                  <h3 className="mt-2 truncate font-semibold">{s.title}</h3>
                  {s.titleJp && <p className="jp truncate text-sm leading-normal text-muted">{s.titleJp}</p>}
                  <p className="text-xs text-muted">{chs.length} chương · đã đọc {read}</p>
                  {chs.length > 0 && <ProgressBar className="mt-1 w-full" value={read / chs.length} />}
                </button>
                <button onClick={() => updateSeries(s.id, { favorite: !s.favorite })}
                  aria-label={s.favorite ? `Bỏ yêu thích ${s.title}` : `Yêu thích ${s.title}`} aria-pressed={!!s.favorite}
                  className={`absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-surface/90 text-lg shadow-card ${s.favorite ? 'text-primary' : 'text-muted'}`}>
                  {s.favorite ? '★' : '☆'}
                </button>
              </div>
            )
          })}
        </div>
      )}
      {!results && series.length > 0 && shown.length === 0 && <p className="text-sm text-muted">Không có series nào trong mục này.</p>}

      {storage && series.length > 0 && (
        <p className="text-xs text-muted">
          Dữ liệu app trên máy: {formatBytes(storage.usage)}
          {storage.quota ? ` / ${formatBytes(storage.quota)}` : ''}. Ảnh manga không nằm trong file sao lưu; khi chuyển máy hãy nhập lại file (trang đang đọc, bong bóng và ghi chú vẫn được giữ).
        </p>
      )}

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onDone={(id) => { setImporting(false); openSeries(id) }} />
      )}
    </div>
  )
}
