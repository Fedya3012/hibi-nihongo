/**
 * PHẦN "SAO LƯU" trong khối Dữ liệu trên máy (trang Cài đặt):
 *   - Tạo file sao lưu (.zip).
 *   - Khôi phục: xem trước file có gì, rồi mới thay. App tự chụp bản an toàn trước khi thay.
 *   - Hoàn tác khôi phục từ bản an toàn.
 */
import { useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { useDbQuery } from './useDbQuery'
import { formatBytes } from './storage'
import { STORE_LABELS } from './labels'
import type { StoreName } from './schema'
import {
  SafetySnapshotError, deleteRestoreSnapshot, deviceId, downloadBackup, downloadRestoreSnapshot, getRestoreSnapshot,
  inspectBackup, lastBackupAt, restoreBackup, undoLastRestore, type BackupSummary,
} from './backup'

type Notice = { kind: 'good' | 'bad' | 'info'; text: string } | null

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const dateText = (t: number) => new Date(t).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
const num = (n: number) => n.toLocaleString('vi-VN')

/** Bảng nào hiện trong phần xem trước (bỏ bảng kỹ thuật ít ý nghĩa với người dùng). */
const PREVIEW_ORDER: StoreName[] = [
  'srsCards', 'srsLogs', 'knownWords', 'studyDays', 'textbooks', 'textbookLessons', 'textbookNotes',
  'mangaSeries', 'mangaChapters', 'mangaNotes', 'animeSeries', 'animeEpisodes', 'animeSubs', 'animeSentences', 'animeLinks', 'kv',
]

export function BackupSection() {
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [lastBackup, setLastBackup] = useState(lastBackupAt)
  const [preview, setPreview] = useState<{ file: File; summary: BackupSummary } | null>(null)
  const [needsForce, setNeedsForce] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const { data: snapshot } = useDbQuery(getRestoreSnapshot, [], ['backupSnapshots'])

  async function run(task: () => Promise<string | void>) {
    setBusy(true)
    setNotice(null)
    try {
      const msg = await task()
      if (msg) setNotice({ kind: 'good', text: msg })
    } catch (e) {
      if (e instanceof SafetySnapshotError) setNeedsForce(true)
      setNotice({ kind: 'bad', text: errText(e) })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const onProgress = (done: number, total: number) => setProgress(`Đang khôi phục ${num(done)}/${num(total)}`)

  const backup = () => run(async () => {
    setProgress('Đang tạo file sao lưu…')
    await downloadBackup()
    setLastBackup(lastBackupAt())
    return 'Đã tạo file sao lưu. Hãy cất file này ở nơi an toàn (USB, Google Drive...).'
  })

  const pick = (file: File) => run(async () => {
    setNeedsForce(false)
    setPreview({ file, summary: await inspectBackup(file) })
  })

  const restore = (force = false) => run(async () => {
    if (!preview) return
    const { file } = preview
    setProgress('Đang lưu bản an toàn của dữ liệu hiện tại…')
    const r = await restoreBackup(file, { safety: !force, label: file.name, onProgress })
    setPreview(null)
    setNeedsForce(false)
    const parts = [`${num(r.records)} mục dữ liệu`, r.media ? `${num(r.media)} ảnh/tiếng` : ''].filter(Boolean).join(' và ')
    return `Đã khôi phục ${parts}.${r.snapshot ? ' Nếu chọn nhầm file, bấm "Hoàn tác khôi phục" bên dưới.' : ''}`
  })

  const undo = () => run(async () => {
    setConfirmUndo(false)
    await undoLastRestore(onProgress)
    return 'Đã hoàn tác: dữ liệu đã trở lại như trước lần khôi phục.'
  })

  const s = preview?.summary
  const rows = s ? PREVIEW_ORDER.filter((n) => s.counts[n] != null) : []
  const missing = s ? s.missing.filter((n) => PREVIEW_ORDER.includes(n)) : []

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="font-medium">Sao lưu</p>
      <p className="text-sm text-muted">
        {lastBackup ? `Lần sao lưu gần nhất: ${dateText(lastBackup)}` : 'Bạn chưa sao lưu lần nào.'}
        {' '}File .zip gồm dữ liệu học và ảnh, tiếng của thẻ ôn tập.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={backup} disabled={busy}>Tạo file sao lưu</Button>
        <Button variant="soft" onClick={() => input.current?.click()} disabled={busy}>Khôi phục từ file</Button>
        <input ref={input} type="file" accept=".zip,.json,application/zip,application/json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f) }} />
      </div>

      {preview && s && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p>
            <b>{preview.file.name}</b> ({formatBytes(s.size)}), tạo lúc <b>{dateText(s.createdAt)}</b>
            {s.deviceId && s.deviceId !== deviceId() && ' trên một máy khác'}.
          </p>
          <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
            {rows.map((n) => (
              <li key={n} className="flex justify-between gap-2">
                <span>{STORE_LABELS[n]}</span><span className="tabular-nums text-muted">{num(s.counts[n] ?? 0)}</span>
              </li>
            ))}
            {s.media > 0 && (
              <li className="flex justify-between gap-2"><span>Ảnh, tiếng của thẻ</span><span className="tabular-nums text-muted">{num(s.media)}</span></li>
            )}
          </ul>
          {missing.length > 0 && (
            <p className="mt-2 text-muted">
              File không có: {missing.map((n) => STORE_LABELS[n]).join(', ')}. Phần này trên máy được <b>giữ nguyên</b>.
            </p>
          )}
          <p className="mt-2">
            Các phần có trong file sẽ <b>thay thế</b> dữ liệu hiện tại. App tự lưu một bản an toàn trước, để bạn hoàn tác được.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!needsForce && <Button onClick={() => restore()} disabled={busy}>Khôi phục</Button>}
            {needsForce && (
              <>
                <Button variant="soft" onClick={backup} disabled={busy}>Tải dữ liệu hiện tại về trước</Button>
                <Button onClick={() => restore(true)} disabled={busy}>Vẫn khôi phục (không có bản an toàn)</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => { setPreview(null); setNeedsForce(false) }} disabled={busy}>Hủy</Button>
          </div>
        </div>
      )}

      {snapshot && (
        <div className="mt-3 rounded-xl border border-border p-3 text-sm">
          <p>
            Bản an toàn trước lần khôi phục lúc {dateText(snapshot.createdAt)}
            {snapshot.label ? ` (từ file ${snapshot.label})` : ''} · {formatBytes(snapshot.size)}
          </p>
          {confirmUndo ? (
            <div className="mt-2">
              <p>Dữ liệu hiện tại sẽ được thay bằng bản an toàn này. Tiếp tục?</p>
              <div className="mt-2 flex gap-2">
                <Button onClick={undo} disabled={busy}>Hoàn tác</Button>
                <Button variant="ghost" onClick={() => setConfirmUndo(false)}>Thôi</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="soft" className="min-h-9 text-sm" onClick={() => setConfirmUndo(true)} disabled={busy}>Hoàn tác khôi phục</Button>
              <Button variant="ghost" className="min-h-9 text-sm" onClick={() => run(async () => { await downloadRestoreSnapshot() })} disabled={busy}>Tải về</Button>
              <Button variant="ghost" className="min-h-9 text-sm" disabled={busy}
                onClick={() => run(async () => { await deleteRestoreSnapshot(); return 'Đã xóa bản an toàn.' })}>
                Xóa bản an toàn
              </Button>
            </div>
          )}
        </div>
      )}

      {progress && <p className="mt-3 text-sm text-muted" aria-live="polite">{progress}</p>}
      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice.kind === 'bad' ? 'text-bad' : notice.kind === 'good' ? 'text-good' : 'text-muted'}`}>
          {notice.text}
        </p>
      )}
    </div>
  )
}
