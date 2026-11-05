/**
 * HỘP THOẠI NHẬP MANGA
 * Bước 1: chọn hoặc kéo thả file/thư mục → Bước 2: xem lại, chọn series → Bước 3: nhập (có tiến độ).
 */
import { useRef, useState, type DragEvent } from 'react'
import { Button } from '@/design/components/Button'
import { formatBytes, useDbQuery } from '@/core/db'
import {
  ACCEPT, filesFromDrop, filesFromInput, importChapter, planImport,
  type ChapterDraft, type ImportPlan, type ImportProgress, type InputFile,
} from './importer'
import { createSeries, listAllChapters, listSeries } from './store'
import { Modal, ProgressBar, inputClass } from './ui'

/** Gợi ý nhanh khi tạo series mới (chỉ là tên, app không kèm nội dung truyện). */
const SUGGESTED = [
  { title: 'D.Gray-man', titleJp: 'ディー・グレイマン' },
  { title: 'One Piece', titleJp: 'ワンピース' },
]

type Status = { state: 'waiting' | 'working' | 'done' | 'error'; progress?: ImportProgress; error?: string }

export function ImportDialog({ seriesId: fixedSeries, onClose, onDone }: {
  seriesId?: string
  onClose: () => void
  onDone: (seriesId: string) => void
}) {
  const [plan, setPlan] = useState<ImportPlan>()
  const [drafts, setDrafts] = useState<ChapterDraft[]>([])
  const [target, setTarget] = useState<string>(fixedSeries ?? 'new')
  const [title, setTitle] = useState('')
  const [titleJp, setTitleJp] = useState('')
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [running, setRunning] = useState(false)
  const [finishedSeries, setFinishedSeries] = useState<string>()
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)
  const { data: series = [] } = useDbQuery(listSeries, [], ['mangaSeries'])
  const { data: existing = [] } = useDbQuery(listAllChapters, [], ['mangaChapters'])
  /** File trùng: đã nhập file cùng tên và cùng dung lượng. */
  const duplicateOf = (d: ChapterDraft) => existing.find((c) => c.fileName === d.fileName && c.size === d.size)

  const accept = (inputs: InputFile[]) => {
    if (!inputs.length) return
    const p = planImport(inputs)
    setPlan(p)
    setDrafts(p.chapters)
    setStatus({})
    if (!fixedSeries) {
      // Tên đoán được trùng series đã có → chọn luôn series đó
      const match = series.find((s) => s.title.toLowerCase() === p.seriesGuess.toLowerCase())
      setTarget(match?.id ?? 'new')
      setTitle(p.seriesGuess)
    }
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    accept(await filesFromDrop(e.dataTransfer))
  }

  const edit = (key: string, patch: Partial<ChapterDraft>) =>
    setDrafts((d) => d.map((c) => (c.key === key ? { ...c, ...patch } : c)))

  const run = async () => {
    setRunning(true)
    let sid = target
    if (sid === 'new') sid = (await createSeries(title, titleJp)).id
    let ok = 0
    for (const d of drafts) {
      if (status[d.key]?.state === 'done') { ok++; continue }
      setStatus((s) => ({ ...s, [d.key]: { state: 'working' } }))
      try {
        await importChapter(sid, d, (progress) => setStatus((s) => ({ ...s, [d.key]: { state: 'working', progress } })))
        setStatus((s) => ({ ...s, [d.key]: { state: 'done' } }))
        ok++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        const quota = /quota/i.test(msg) ? 'Bộ nhớ của trình duyệt đã đầy. Hãy xóa bớt chương đã đọc.' : msg
        setStatus((s) => ({ ...s, [d.key]: { state: 'error', error: quota } }))
      }
    }
    setRunning(false)
    setTarget(sid)
    setFinishedSeries(sid)
    if (ok === drafts.length) onDone(sid)
  }

  const totalSize = drafts.reduce((n, d) => n + d.size, 0)
  const canRun = drafts.length > 0 && !running && (target !== 'new' || title.trim().length > 0)

  return (
    <Modal title="Thêm manga" onClose={running ? () => {} : onClose} wide>
      {!plan ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-card border-2 border-dashed p-8 text-center transition ${dragOver ? 'border-primary bg-primary-soft' : 'border-border'}`}
        >
          <div className="jp text-4xl text-primary" aria-hidden>漫</div>
          <p className="mt-3 font-medium">Kéo thả file hoặc thư mục vào đây</p>
          <p className="mt-1 text-sm text-muted">CBZ, CBR, ZIP, RAR, PDF, hoặc thư mục ảnh (JPG, PNG, WEBP)</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileRef.current?.click()}>Chọn file</Button>
            <Button variant="soft" onClick={() => dirRef.current?.click()}>Chọn thư mục</Button>
          </div>
          <p className="mx-auto mt-5 max-w-md text-xs text-muted">
            Mỗi file là một chương. Chọn thư mục có nhiều thư mục con thì mỗi thư mục con là một chương.
            File chỉ được lưu trên máy này, không gửi đi đâu.
          </p>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => accept(filesFromInput(e.target.files))} />
          <input ref={dirRef} type="file" hidden
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            onChange={(e) => accept(filesFromInput(e.target.files))} />
        </div>
      ) : (
        <div className="grid gap-5">
          {/* Chọn series */}
          {!fixedSeries && (
            <section className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="manga-target">Thêm vào series</label>
              <select id="manga-target" className={inputClass} value={target} disabled={running || !!finishedSeries}
                onChange={(e) => setTarget(e.target.value)}>
                <option value="new">+ Series mới</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              {target === 'new' && !finishedSeries && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputClass} placeholder="Tên series, ví dụ One Piece" value={title}
                    onChange={(e) => setTitle(e.target.value)} aria-label="Tên series" />
                  <input className={`${inputClass} jp`} placeholder="Tên tiếng Nhật (không bắt buộc)" value={titleJp}
                    onChange={(e) => setTitleJp(e.target.value)} aria-label="Tên tiếng Nhật" />
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <span className="text-xs text-muted">Gợi ý:</span>
                    {SUGGESTED.map((s) => (
                      <button key={s.title} type="button" onClick={() => { setTitle(s.title); setTitleJp(s.titleJp) }}
                        className="rounded-full bg-surface-2 px-3 py-1 text-xs hover:bg-primary-soft">
                        {s.title} <span className="jp text-muted">{s.titleJp}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Danh sách chương */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium">{drafts.length} chương · {formatBytes(totalSize)}</h3>
              {!running && !finishedSeries && (
                <button className="text-sm text-muted hover:text-text" onClick={() => setPlan(undefined)}>Chọn lại</button>
              )}
            </div>
            {drafts.length === 0 && <p className="text-sm text-muted">Không tìm thấy file truyện hay ảnh nào trong những gì bạn chọn.</p>}
            <ul className="grid gap-2">
              {drafts.map((d) => {
                const st = status[d.key]
                return (
                  <li key={d.key} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-muted">
                        Tập
                        <input type="number" min={0} step="any" className="min-h-8 w-14 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text"
                          value={d.volume ?? ''} disabled={running || !!st}
                          onChange={(e) => edit(d.key, { volume: e.target.value === '' ? null : Number(e.target.value) })} />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        Chương
                        <input type="number" min={0} step="any" className="min-h-8 w-16 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text"
                          value={d.number ?? ''} disabled={running || !!st}
                          onChange={(e) => edit(d.key, { number: e.target.value === '' ? null : Number(e.target.value) })} />
                      </label>
                      <input className="min-h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 text-sm"
                        value={d.title} disabled={running || !!st} aria-label="Tên chương"
                        onChange={(e) => edit(d.key, { title: e.target.value })} />
                      {!running && !st && (
                        <button className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-bad"
                          aria-label={`Bỏ ${d.title}`} onClick={() => setDrafts((x) => x.filter((c) => c.key !== d.key))}>✕</button>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {d.kind === 'images' ? `${d.files.length} ảnh` : d.fileName} · {formatBytes(d.size)}
                    </p>
                    {!st && duplicateOf(d) && (() => {
                      const dup = duplicateOf(d)!
                      const where = series.find((x) => x.id === dup.seriesId)?.title ?? 'thư viện'
                      return (
                        <p className="mt-1 text-xs text-warn">
                          ⚠ File này đã có trong “{where}”.{' '}
                          {dup.seriesId === target ? 'Nhập lại sẽ thay ảnh và giữ trang đang đọc.' : 'Bỏ chọn nếu không muốn có hai bản.'}
                        </p>
                      )
                    })()}
                    {st?.state === 'working' && (
                      <div className="mt-2">
                        <ProgressBar value={st.progress && st.progress.total ? st.progress.done / st.progress.total : 0.05} />
                        <p className="mt-1 text-xs text-muted">
                          {st.progress?.stage === 'measure' ? `Đang xử lý trang ${st.progress.done}/${st.progress.total}`
                            : st.progress?.stage === 'save' ? 'Đang lưu…' : 'Đang đọc file…'}
                        </p>
                      </div>
                    )}
                    {st?.state === 'done' && <p className="mt-1 text-xs text-good">✓ Đã nhập</p>}
                    {st?.state === 'error' && <p className="mt-1 text-xs text-bad">✕ {st.error}</p>}
                  </li>
                )
              })}
            </ul>
            {plan.skipped.length > 0 && (
              <p className="mt-2 text-xs text-muted">Bỏ qua {plan.skipped.length} file không phải truyện/ảnh.</p>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            {finishedSeries ? (
              <>
                <Button variant="ghost" onClick={onClose}>Đóng</Button>
                <Button onClick={() => onDone(finishedSeries)}>Xem series</Button>
                <Button variant="soft" onClick={run}>Thử lại chương lỗi</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose} disabled={running}>Hủy</Button>
                <Button onClick={run} disabled={!canRun}>{running ? 'Đang nhập…' : `Nhập ${drafts.length} chương`}</Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
