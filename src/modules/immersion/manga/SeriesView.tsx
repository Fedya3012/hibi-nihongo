/** TRANG MỘT SERIES: thông tin, cài đặt đọc riêng, danh sách chương. */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { formatBytes, useDbQuery } from '@/core/db'
import {
  deleteChapter, deleteSeries, getSeries, hasFiles, listChapters, setFinished, updateChapter, updateSeries,
} from './store'
import { chapterLabel } from './naming'
import { ImportDialog } from './ImportDialog'
import { Cover, Modal, ProgressBar, inputClass } from './ui'
import { listChapterNotes, readingOrder } from './notes'
import { PreStudyButton } from '@/modules/vocab/api'
import type { MangaBubble, MangaChapter, ReadDirection } from './types'

export function SeriesView({ seriesId, back, openReader }: {
  seriesId: string
  back: () => void
  openReader: (chapterId: string, page?: number) => void
}) {
  const { data, loading } = useDbQuery(async () => {
    const [series, chapters] = await Promise.all([getSeries(seriesId), listChapters(seriesId)])
    const files = await Promise.all(chapters.map((c) => hasFiles(c.id)))
    return { series, chapters, files }
  }, [seriesId], ['mangaSeries', 'mangaChapters', 'mangaBlobs'])
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editChapter, setEditChapter] = useState<MangaChapter>()

  if (loading && !data) return <p className="text-muted">Đang tải…</p>
  const s = data?.series
  if (!s) {
    return (
      <Card className="text-center">
        <p>Không tìm thấy series này.</p>
        <Button className="mt-3" variant="soft" onClick={back}>Về thư viện</Button>
      </Card>
    )
  }
  const chapters = data.chapters
  const missing = data.files.filter((f) => !f).length
  const read = chapters.filter((c) => c.finishedAt).length
  const current = chapters.find((c) => c.id === s.lastChapterId)
  // Đọc tiếp: chương đang dở; nếu đã đọc xong thì chương kế tiếp chưa đọc
  const next = current && !current.finishedAt ? current
    : chapters.find((c) => !c.finishedAt && (!current || chapters.indexOf(c) > chapters.indexOf(current))) ?? chapters.find((c) => !c.finishedAt)

  const direction: ReadDirection = s.prefs?.direction ?? 'rtl'

  return (
    <div className="grid gap-6">
      <button onClick={back} className="w-fit text-sm text-muted hover:text-text">← Thư viện manga</button>

      <div className="flex flex-col gap-5 sm:flex-row">
        <Cover chapterId={chapters[0]?.id} alt={s.title} className="aspect-[2/3] w-36 shrink-0 rounded-card border border-border" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{s.title}</h1>
          {s.titleJp && <p className="jp text-lg text-muted">{s.titleJp}</p>}
          <p className="mt-1 text-sm text-muted">{chapters.length} chương · đã đọc {read}</p>
          {chapters.length > 0 && <ProgressBar className="mt-2 max-w-xs" value={read / chapters.length} />}
          <div className="mt-4 flex flex-wrap gap-2">
            {next && (
              <Button onClick={() => openReader(next.id)}>
                {next.lastReadAt && !next.finishedAt ? `Đọc tiếp ${chapterLabel(next)} (trang ${next.lastPage + 1})` : `Đọc ${chapterLabel(next)}`}
              </Button>
            )}
            <Button variant="soft" onClick={() => setImporting(true)}>+ Thêm chương</Button>
            <Button variant="ghost" onClick={() => setEditing(true)}>Sửa</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">Chiều đọc của series này</span>
            <Segmented label="Chiều đọc" value={direction}
              onChange={(v) => updateSeries(s.id, { prefs: { ...s.prefs, direction: v } })}
              options={[{ value: 'rtl', label: 'Phải → trái' }, { value: 'ltr', label: 'Trái → phải' }]} />
          </div>
        </div>
      </div>

      {missing > 0 && (
        <Card className="border-warn">
          <p className="text-sm">
            <b>{missing} chương chưa có ảnh trên máy này</b> (thường do vừa khôi phục sao lưu ở máy khác).
            Bấm <b>Thêm chương</b> và chọn lại đúng file đó: app sẽ gắn ảnh vào chương cũ và giữ trang bạn đang đọc.
          </p>
        </Card>
      )}

      {chapters.length === 0 ? (
        <Card className="text-center text-muted">
          Series này chưa có chương nào. Bấm <b>Thêm chương</b> để chọn file.
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {chapters.map((c, i) => {
            const has = data.files[i]
            const reading = !c.finishedAt && c.lastReadAt
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <button className="min-w-0 flex-1 text-left disabled:opacity-60" disabled={!has} onClick={() => openReader(c.id)}>
                  <p className={`truncate font-medium ${c.finishedAt ? 'text-muted' : ''}`}>
                    {chapterLabel(c)}
                    {c.title && chapterLabel(c) !== c.title && <span className="font-normal text-muted"> · {c.title}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {c.pageCount} trang · {c.source === 'pdf' ? 'PDF' : 'Ảnh'} · {formatBytes(c.size)}
                    {!has && <span className="text-warn"> · thiếu file</span>}
                  </p>
                  {reading && <ProgressBar className="mt-1 max-w-48" value={(c.lastPage + 1) / c.pageCount} />}
                </button>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${c.finishedAt ? 'bg-primary-soft' : reading ? 'bg-surface-2 text-primary' : 'text-muted'}`}>
                  {c.finishedAt ? 'Đã đọc' : reading ? `Trang ${c.lastPage + 1}/${c.pageCount}` : 'Chưa đọc'}
                </span>
                <button className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                  aria-label={`Tùy chọn ${chapterLabel(c)}`} onClick={() => setEditChapter(c)}>⋯</button>
              </li>
            )
          })}
        </ul>
      )}

      {importing && (
        <ImportDialog seriesId={s.id} onClose={() => setImporting(false)} onDone={() => setImporting(false)} />
      )}

      {editing && (
        <EditSeries title={s.title} titleJp={s.titleJp ?? ''} onClose={() => setEditing(false)}
          onSave={async (title, titleJp) => { await updateSeries(s.id, { title, titleJp: titleJp || undefined }); setEditing(false) }}
          onDelete={async () => { await deleteSeries(s.id); back() }} />
      )}

      {editChapter && (
        <EditChapter chapter={editChapter} seriesTitle={s.title} rtl={direction === 'rtl'} onClose={() => setEditChapter(undefined)} onRead={(p) => openReader(editChapter.id, p)} />
      )}
    </div>
  )
}

function EditSeries({ title: t0, titleJp: j0, onSave, onDelete, onClose }: {
  title: string; titleJp: string
  onSave: (title: string, titleJp: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(t0)
  const [titleJp, setTitleJp] = useState(j0)
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal title="Sửa series" onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">Tên<input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="grid gap-1 text-sm">Tên tiếng Nhật<input className={`${inputClass} jp`} value={titleJp} onChange={(e) => setTitleJp(e.target.value)} /></label>
        <div className="mt-2 flex justify-between gap-2">
          <Button variant="ghost" className={confirm ? 'text-bad' : ''} onClick={() => (confirm ? onDelete() : setConfirm(true))}>
            {confirm ? 'Bấm lần nữa để xóa hẳn' : 'Xóa series'}
          </Button>
          <Button onClick={() => onSave(title.trim() || t0, titleJp.trim())}>Lưu</Button>
        </div>
        {confirm && <p className="text-xs text-bad">Xóa series sẽ xóa mọi chương, ảnh và tiến độ đọc của nó trên máy này.</p>}
      </div>
    </Modal>
  )
}

/** Chữ của các bong bóng thoại đã gõ / OCR trong chương, theo thứ tự trang và thứ tự đọc. */
function useChapterLines(chapterId: string, rtl: boolean): string[] | undefined {
  const [lines, setLines] = useState<string[]>()
  useEffect(() => {
    let alive = true
    listChapterNotes(chapterId).then((notes) => {
      const bubbles = notes.filter((n): n is MangaBubble => n.kind === 'bubble' && !!n.text.trim())
      const pages = [...new Set(bubbles.map((b) => b.page))].sort((a, b) => a - b)
      const out = pages.flatMap((p) => readingOrder(bubbles.filter((b) => b.page === p), rtl).map((b) => b.text))
      if (alive) setLines(out)
    }, () => alive && setLines([]))
    return () => { alive = false }
  }, [chapterId, rtl])
  return lines
}

function EditChapter({ chapter: c, seriesTitle, rtl, onClose, onRead }: {
  chapter: MangaChapter; seriesTitle: string; rtl: boolean; onClose: () => void; onRead: (page: number) => void
}) {
  const lines = useChapterLines(c.id, rtl)
  const [title, setTitle] = useState(c.title)
  const [num, setNum] = useState(c.number?.toString() ?? '')
  const [vol, setVol] = useState(c.volume?.toString() ?? '')
  const [confirm, setConfirm] = useState(false)
  const save = async () => {
    await updateChapter(c.id, { title, number: num === '' ? null : Number(num), volume: vol === '' ? null : Number(vol) })
    onClose()
  }
  return (
    <Modal title={chapterLabel(c)} onClose={onClose}>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm">Tập<input type="number" step="any" className={inputClass} value={vol} onChange={(e) => setVol(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Chương<input type="number" step="any" className={inputClass} value={num} onChange={(e) => setNum(e.target.value)} /></label>
        </div>
        <label className="grid gap-1 text-sm">Tên chương<input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <p className="text-xs text-muted">File gốc: {c.fileName}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => { onRead(0); onClose() }}>Đọc từ đầu</Button>
          <Button variant="soft" onClick={async () => { await setFinished(c.id, !c.finishedAt); onClose() }}>
            {c.finishedAt ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
          </Button>
        </div>
        {/* Học trước từ: dựa trên chữ trong các bong bóng thoại đã lưu của chương */}
        {lines && (lines.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <PreStudyButton name={chapterLabel(c)} lines={lines} deck={`Manga · ${seriesTitle}`.slice(0, 60)} tags={['manga']} src="manga" />
            <span className="text-xs text-muted">Theo {lines.length} bong bóng thoại đã có chữ</span>
          </div>
        ) : (
          <p className="text-xs text-muted">Học trước từ: chương này chưa có chữ. Ở chế độ Học sâu, thêm bong bóng thoại (gõ, dán hoặc OCR) để app đếm từ của chương.</p>
        ))}
        <div className="mt-2 flex justify-between gap-2">
          <Button variant="ghost" className={confirm ? 'text-bad' : ''}
            onClick={async () => { if (confirm) { await deleteChapter(c.id); onClose() } else setConfirm(true) }}>
            {confirm ? 'Bấm lần nữa để xóa' : 'Xóa chương'}
          </Button>
          <Button onClick={save}>Lưu</Button>
        </div>
      </div>
    </Modal>
  )
}
