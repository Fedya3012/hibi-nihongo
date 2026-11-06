/**
 * HỘP THOẠI NHẬP ANIME
 * Bước 1: chọn hoặc kéo thả video + phụ đề → Bước 2: xem lại cách ghép, chọn series → Lưu.
 */
import { useState, type DragEvent } from 'react'
import { Button } from '@/design/components/Button'
import { formatBytes, useDbQuery } from '@/core/db'
import { Modal, ProgressBar, inputClass } from '../manga/ui'
import { canRememberFiles, filesFromDrop, pickFiles, playabilityHint, type PickedFile } from './media'
import { commitImport, planImport, type EpisodeDraft, type ImportPlan } from './importer'
import { createSeries, getSeries, listEpisodes, listSeries } from './store'

export function ImportDialog({ seriesId: fixedSeries, onClose, onDone }: {
  seriesId?: string
  onClose: () => void
  onDone: (seriesId: string) => void
}) {
  const [plan, setPlan] = useState<ImportPlan>()
  const [drafts, setDrafts] = useState<EpisodeDraft[]>([])
  const [target, setTarget] = useState<string>(fixedSeries ?? 'new')
  const [title, setTitle] = useState('')
  const [titleJp, setTitleJp] = useState('')
  const [copy, setCopy] = useState(false)
  const [files, setFiles] = useState<PickedFile[]>([])
  const [busy, setBusy] = useState<string>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()
  const [dragOver, setDragOver] = useState(false)
  const { data: series = [] } = useDbQuery(listSeries, [], ['animeSeries'])

  const load = async (files: PickedFile[], into = target) => {
    if (!files.length) return
    setFiles(files)
    setBusy('Đang đọc phụ đề…')
    setError(undefined)
    try {
      // Nhập vào series có sẵn: nhận ra tập đã có (cùng tên file / số tập) để giữ chỗ đang xem
      const existing = into !== 'new' ? await listEpisodes(into) : []
      const p = await planImport(files, existing, (m, pr) => { setBusy(m); setProgress(pr) })
      if (!p.drafts.length) {
        setError(p.subs.length && !p.subs.some((s) => s.japanese)
          ? 'Chưa thấy phụ đề tiếng Nhật (phụ đề cần có chữ kana). Hãy chọn thêm video hoặc phụ đề tiếng Nhật.'
          : 'Không thấy file video (.mp4, .mkv, .webm...) hay phụ đề (.srt, .ass, .vtt) nào.')
        return
      }
      setPlan(p)
      setDrafts(p.drafts)
      if (!title) setTitle(p.seriesGuess)
    } finally {
      setBusy(undefined)
    }
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    await load(await filesFromDrop(e.dataTransfer))
  }

  const run = async () => {
    if (!plan) return
    setBusy('Đang lưu…')
    try {
      const sid = target === 'new' ? (await createSeries(title, titleJp)).id : target
      await commitImport(sid, plan, drafts, copy, (d, t) => setProgress(d / t))
      if (!(await getSeries(sid))) throw new Error('Không tìm thấy series')
      onDone(sid)
    } catch (e) {
      setError(`Lưu không thành công: ${(e as Error).message}. Nếu chép video vào app, có thể máy đã hết dung lượng.`)
      setBusy(undefined)
    }
  }

  const update = (i: number, patch: Partial<EpisodeDraft>) =>
    setDrafts((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)))

  const subOptions = (japanese: boolean) =>
    plan?.subs.map((s, i) => ({ s, i })).filter(({ s }) => !s.error && s.japanese === japanese) ?? []
  const hints = [...new Set(drafts.flatMap((d) => (d.video ? [playabilityHint(d.video.file.name)] : [])).filter(Boolean))]
  const videoBytes = drafts.reduce((n, d) => n + (d.video?.file.size ?? 0), 0)
  const noMemory = !canRememberFiles() && !copy && drafts.some((d) => d.video)

  return (
    <Modal title="Thêm anime" onClose={onClose} wide>
      {!plan ? (
        <div className="grid gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`grid place-items-center gap-3 rounded-card border-2 border-dashed p-8 text-center transition ${dragOver ? 'border-primary bg-primary-soft' : 'border-border'}`}
          >
            <div className="jp text-4xl text-primary" aria-hidden>映</div>
            <p className="text-sm">Kéo thả file video và phụ đề vào đây, hoặc</p>
            <Button onClick={async () => load(await pickFiles('both'))} disabled={!!busy}>Chọn video và phụ đề</Button>
            <p className="text-xs text-muted">
              Video: .mp4, .webm, .mkv · Phụ đề: .srt, .ass, .vtt, hoặc phụ đề nhúng sẵn trong file .mkv. Chọn nhiều tập một lúc được, app tự ghép video với phụ đề cùng tên hoặc cùng số tập.
            </p>
          </div>
          <p className="text-xs text-muted">
            {canRememberFiles()
              ? 'App chỉ ghi nhớ vị trí file trên máy, không chép video, nên không tốn thêm dung lượng.'
              : 'Trình duyệt này không nhớ được file trên máy: mỗi lần xem bạn chọn lại file video (hoặc chọn chép video vào app ở bước sau).'}
            {' '}App không kèm sẵn anime nào: bạn dùng file của chính mình.
          </p>
          {busy && <div className="grid gap-1"><p className="text-sm text-muted">{busy}</p>{progress > 0 && <ProgressBar value={progress} />}</div>}
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="anime-target">Series</label>
            <select id="anime-target" className={inputClass} value={target} disabled={!!fixedSeries || !!busy}
              onChange={(e) => { setTarget(e.target.value); void load(files, e.target.value) }}>
              <option value="new">+ Series mới</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {target === 'new' && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputClass} placeholder="Tên anime, ví dụ Frieren" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tên anime" />
                <input className={`${inputClass} jp`} placeholder="Tên tiếng Nhật (không bắt buộc)" value={titleJp} onChange={(e) => setTitleJp(e.target.value)} aria-label="Tên tiếng Nhật" />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">{drafts.length} tập</p>
            <div className="grid max-h-[40dvh] gap-2 overflow-y-auto pr-1">
              {drafts.map((d, i) => (
                <div key={d.key} className="grid gap-2 rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-muted">
                      Tập
                      <input type="number" step="any" className={`${inputClass} w-20`} value={d.number ?? ''}
                        onChange={(e) => update(i, { number: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Số tập" />
                    </label>
                    <span className="min-w-0 flex-1 truncate" title={d.video?.file.name}>
                      {d.video ? `🎞 ${d.video.file.name}` : <span className="text-muted">Chưa có video (gắn sau)</span>}
                    </span>
                    {d.existingId && <span className="shrink-0 rounded-md bg-primary-soft px-2 py-0.5 text-xs">đã có, giữ chỗ đang xem</span>}
                    <button className="shrink-0 text-muted hover:text-bad" aria-label="Bỏ tập này"
                      onClick={() => setDrafts((ds) => ds.filter((_, k) => k !== i))}>✕</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select className={inputClass} value={d.jp} onChange={(e) => update(i, { jp: Number(e.target.value) })} aria-label="Phụ đề tiếng Nhật">
                      <option value={-1}>Không có phụ đề tiếng Nhật</option>
                      {subOptions(true).map(({ s, i: k }) => <option key={k} value={k}>JP · {s.name} ({s.cues.length} dòng)</option>)}
                    </select>
                    <select className={inputClass} value={d.tr} onChange={(e) => update(i, { tr: Number(e.target.value) })} aria-label="Phụ đề dịch">
                      <option value={-1}>Không có phụ đề dịch</option>
                      {subOptions(false).map(({ s, i: k }) => <option key={k} value={k}>Dịch · {s.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {plan.subs.some((s) => s.error) && (
            <p className="text-xs text-bad">Không đọc được: {plan.subs.filter((s) => s.error).map((s) => s.name).join(', ')}</p>
          )}
          {plan.ignored.length > 0 && <p className="text-xs text-muted">Bỏ qua {plan.ignored.length} file không phải video/phụ đề.</p>}
          {hints.map((h) => <p key={h} className="text-xs text-warn">{h}</p>)}

          {videoBytes > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
              <span>
                Chép video vào app ({formatBytes(videoBytes)})
                <span className="block text-xs text-muted">
                  {canRememberFiles()
                    ? 'Thường không cần: app đã nhớ vị trí file. Chỉ chép nếu bạn sẽ xóa hoặc di chuyển file gốc.'
                    : 'Nên chọn nếu không muốn chọn lại file mỗi lần xem. Tốn dung lượng bằng file gốc.'}
                </span>
              </span>
            </label>
          )}
          {noMemory && <p className="text-xs text-muted">Không chép: mỗi lần xem, app sẽ nhờ bạn chọn lại file video của tập đó.</p>}

          {busy && <div className="grid gap-1"><p className="text-sm text-muted">{busy}</p><ProgressBar value={progress} /></div>}
          {error && <p className="text-sm text-bad">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setPlan(undefined); setDrafts([]) }} disabled={!!busy}>Chọn lại</Button>
            <Button onClick={run} disabled={!!busy || !drafts.length || (target === 'new' && !title.trim())}>Lưu {drafts.length} tập</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
