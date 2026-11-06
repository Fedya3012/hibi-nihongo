/** THƯ VIỆN MANGA: "Tiếp tục đọc", tìm kiếm trong mọi manga, yêu thích, lọc đang đọc/đã đọc. */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { formatBytes, getAll, getStorageInfo, useDbQuery } from '@/core/db'
import type { SrsCard } from '@/modules/review/api'
import { listAllChapters, listSeries, updateSeries } from './store'
import { listAllNotes, normalizeSearch } from './notes'
import { getMangaResume } from './api'
import { chapterLabel } from './naming'
import { ImportDialog } from './ImportDialog'
import { Cover, ProgressBar } from './ui'
import { isMangaCard, loadMangaStats, seriesStatus, suggestSeries, type Suggestion } from './stats'
import { reviewPathForTags, seriesTags } from './study/mining'
import { SFX_TAG, SLANG_TAG } from './study/sfx-data'
import { LEVEL_LABEL, type MangaChapter, type MangaSeries, type SeriesLevel } from './types'

type Filter = 'all' | 'reading' | 'want' | 'fav' | 'done'

export function Library({ openSeries, openReader, openSfx }: {
  openSeries: (id: string) => void
  openReader: (chapterId: string, page?: number) => void
  openSfx: () => void
}) {
  const [importing, setImporting] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [level, setLevel] = useState<SeriesLevel | 0>(0)
  const { data } = useDbQuery(async () => {
    const [series, chapters, resume] = await Promise.all([listSeries(), listAllChapters(), getMangaResume()])
    const bySeries = new Map<string, MangaChapter[]>()
    for (const c of chapters) bySeries.set(c.seriesId, [...(bySeries.get(c.seriesId) ?? []), c])
    return { series, chapters, bySeries, resume }
  }, [], ['mangaSeries', 'mangaChapters'])
  const { data: notes = [] } = useDbQuery(listAllNotes, [], ['mangaNotes'])
  const { data: storage } = useDbQuery(getStorageInfo, [], ['mangaBlobs'])
  const { data: stats } = useDbQuery(() => loadMangaStats(), [], ['mangaChapters', 'mangaNotes', 'srsCards'])
  // Thẻ Ôn tập đã lưu từ manga (để tìm kiếm trong thẻ)
  const { data: cards = [] } = useDbQuery(async () => (await getAll<SrsCard>('srsCards')).filter(isMangaCard), [], ['srsCards'])

  const series = data?.series ?? []
  const resume = data?.resume

  const shown = series
    .filter((s) => {
      const chs = data?.bySeries.get(s.id) ?? []
      if (level && s.level !== level) return false
      if (filter === 'fav') return s.favorite
      if (filter === 'all') return true
      return seriesStatus(s, chs) === filter
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
    // Thẻ đã lưu vào Ôn tập (câu, từ, tượng thanh, khẩu ngữ)
    for (const c of cards) {
      if (!normalizeSearch(`${c.front} ${c.reading ?? ''} ${c.meaning} ${c.example ?? ''}`).includes(q)) continue
      out.push({
        key: `card-${c.id}`, title: c.deck, sub: 'Thẻ đã lưu', text: `${c.front}　${c.meaning.split('\n')[0]}`,
        go: () => { window.location.hash = `#/review?tab=cards&q=${encodeURIComponent(c.front)}` },
      })
    }
    return out.slice(0, 100)
  }, [query, data, notes, cards, openSeries, openReader])

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đọc manga</h1>
          <p className="text-sm text-muted">Đọc manga tiếng Nhật từ file của bạn. Nhớ trang đang đọc cho từng chương.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={openSfx}>💥 Tượng thanh & khẩu ngữ</Button>
          <Button onClick={() => setImporting(true)}>+ Thêm manga</Button>
        </div>
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

      {stats && series.length > 0 && !query && <StatsRow stats={stats} />}

      {series.length > 0 && !query && <Suggestions openSeries={openSeries} />}

      {series.length > 0 && !query && <ReviewPicker series={series} cards={cards} />}

      {series.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm trong manga"
            placeholder="Tìm câu, từ, ghi chú, tên chương… trong mọi manga"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary sm:max-w-md" />
          {!query && (
            <Segmented<Filter> label="Lọc" value={filter} onChange={setFilter}
              options={[{ value: 'all', label: 'Tất cả' }, { value: 'reading', label: 'Đang đọc' }, { value: 'want', label: 'Muốn đọc' }, { value: 'done', label: 'Đã xong' }, { value: 'fav', label: '★' }]} />
          )}
          {!query && (
            <select value={level} onChange={(e) => setLevel(Number(e.target.value) as SeriesLevel | 0)} aria-label="Lọc theo độ khó"
              className="min-h-10 rounded-xl border border-border bg-surface px-2 text-sm">
              <option value={0}>Mọi độ khó</option>
              {([5, 4, 3, 2, 1] as SeriesLevel[]).map((k) => <option key={k} value={k}>{LEVEL_LABEL[k]}</option>)}
            </select>
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
                  <p className="text-xs text-muted">
                    {chs.length} chương · đã đọc {read}{s.level ? ` · N${s.level}` : ''}
                    {seriesStatus(s, chs) === 'want' ? ' · Muốn đọc' : ''}
                  </p>
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <p className="text-2xl font-bold">{n.toLocaleString('vi-VN')}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/** Thống kê tổng: trang đã đọc, câu và từ đã học qua manga. */
function StatsRow({ stats }: { stats: Awaited<ReturnType<typeof loadMangaStats>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat n={stats.pages} label="trang đã đọc" />
      <Stat n={stats.chaptersDone} label="chương đã đọc xong" />
      <Stat n={stats.sentencesSaved} label="câu đã lưu vào Ôn tập" />
      <Stat n={stats.cardsLearned} label={`thẻ từ manga đã thuộc (trên ${stats.cards} thẻ)`} />
    </div>
  )
}

/** Gợi ý bộ nên đọc tiếp, theo vốn từ (kho từ đã biết) và cấp độ. */
function Suggestions({ openSeries }: { openSeries: (id: string) => void }) {
  const [list, setList] = useState<Suggestion[]>()
  useEffect(() => { let alive = true; suggestSeries().then((l) => alive && setList(l), () => alive && setList([])); return () => { alive = false } }, [])
  if (!list?.length) return null
  return (
    <Card className="grid gap-2">
      <h2 className="font-semibold">Gợi ý cho bạn</h2>
      <ul className="grid gap-1">
        {list.map((sg) => (
          <li key={sg.series.id}>
            <button onClick={() => openSeries(sg.series.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{sg.series.title}</span>
                {sg.series.level && <span className="ml-2 rounded bg-surface-2 px-1.5 text-xs">N{sg.series.level}</span>}
                <span className="block text-xs text-muted">{sg.reason}</span>
              </span>
              {sg.coverage != null && (
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-semibold">{Math.round(sg.coverage * 100)}%</span>
                  <span className="block text-xs text-muted">từ đã biết</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Tính từ lời thoại bạn đã thêm, so với kho từ đã biết; và độ khó bạn đặt cho từng bộ (trong trang series).</p>
    </Card>
  )
}

/** Ôn tập chỉ thẻ của manga: một bộ, nhiều bộ cùng lúc, hoặc một nhóm (tượng thanh, khẩu ngữ, che chữ). */
function ReviewPicker({ series, cards }: { series: MangaSeries[]; cards: SrsCard[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const countFor = (s: MangaSeries) => {
    const tags = new Set(seriesTags(s.title))
    return cards.filter((c) => c.deck === `Manga: ${s.title}` || c.tags?.some((t) => tags.has(t))).length
  }
  const withCards = series.map((s) => ({ s, n: countFor(s) })).filter((x) => x.n > 0)
  const groups = [
    { tag: SFX_TAG, label: '💥 Tượng thanh' },
    { tag: SLANG_TAG, label: '🗣 Khẩu ngữ' },
    { tag: 'che-chu', label: '🙈 Thẻ che chữ' },
  ].map((g) => ({ ...g, n: cards.filter((c) => c.tags?.includes(g.tag)).length })).filter((g) => g.n > 0)
  if (!cards.length) return null
  const tags = [...picked].flatMap((id) => {
    const s = series.find((x) => x.id === id)
    if (s) return seriesTags(s.title)
    return [id]
  })
  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Ôn tập từ manga</h2>
        <span className="text-sm text-muted">{cards.length} thẻ</span>
        <Link to="/review?tab=cards" className="ml-auto text-xs text-primary underline" title="Tab Thẻ → Anki → Xuất, bật Kèm ảnh">Xuất Anki kèm ảnh khung tranh</Link>
      </div>
      <p className="text-sm text-muted">Chọn một hoặc nhiều bộ (hoặc nhóm), rồi bấm Ôn. Không chọn gì = ôn mọi thẻ từ manga.</p>
      <div className="flex flex-wrap gap-2">
        {withCards.map(({ s, n }) => <Chip key={s.id} on={picked.has(s.id)} onClick={() => setPicked(toggle(picked, s.id))}>{s.title} · {n}</Chip>)}
        {groups.map((g) => <Chip key={g.tag} on={picked.has(g.tag)} onClick={() => setPicked(toggle(picked, g.tag))}>{g.label} · {g.n}</Chip>)}
      </div>
      <div>
        <Link to={reviewPathForTags(tags.length ? tags : ['manga'])}
          className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">
          Ôn {picked.size ? `${picked.size} mục đã chọn` : 'tất cả thẻ manga'}
        </Link>
      </div>
    </Card>
  )
}

const toggle = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n }

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-9 rounded-full border px-3 text-sm ${on ? 'border-primary bg-primary-soft' : 'border-border text-muted hover:text-text'}`}>
      {on ? '✓ ' : ''}{children}
    </button>
  )
}
