/**
 * SÁCH GỐC CỦA BẠN: thêm file PDF / ảnh scan vào một giáo trình, mở trình đọc, xóa file.
 * Kéo thả file vào khung cũng được.
 */
import { useRef, useState } from 'react'
import { formatBytes, useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { acceptsFile, deleteFile, importFiles, listFiles } from './lib/files'
import { useTx } from './ui'
import type { BookFile } from './types'

export function BookFiles({ bookId, onRead }: { bookId: string; onRead: (fileId: string, page?: number) => void }) {
  const t = useTx()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [drag, setDrag] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const { data: files } = useDbQuery(() => listFiles(bookId), [bookId], ['textbookMedia'])

  const add = async (list: File[]) => {
    const ok = list.filter(acceptsFile)
    if (!ok.length) { setMsg(t('filesBad')); return }
    setBusy(true); setMsg('')
    try {
      const { countPdfPages } = await import('./lib/pdf')
      const added = await importFiles(bookId, ok, countPdfPages)
      if (added.length === 1 && !files?.length) onRead(added[0].id)
    } catch (e) {
      setMsg(String((e as Error)?.message ?? e))
    } finally { setBusy(false) }
  }

  return (
    <Card className={`mt-6 space-y-3 transition ${drag ? 'ring-2 ring-primary' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void add([...e.dataTransfer.files]) }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('filesTitle')}</h2>
        <Button variant="soft" disabled={busy} onClick={() => input.current?.click()}>{busy ? t('filesImporting') : t('filesAdd')}</Button>
        <input ref={input} type="file" multiple hidden accept="application/pdf,.pdf,image/*"
          onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = '' }} />
      </div>
      <p className="text-sm text-muted">{t('filesHint')}</p>
      {files && files.length > 0 ? (
        <ul className="divide-y divide-border">
          {files.map((f: BookFile) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="text-2xl" aria-hidden>{f.kind === 'pdf' ? '📕' : '🖼'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.name}</span>
                <span className="text-sm text-muted">{t('filesPages', { n: f.pageCount })} · {formatBytes(f.size)}</span>
              </span>
              {confirm === f.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{t('fileDeleteConfirm')}</span>
                  <Button variant="soft" className="!text-bad" onClick={() => { void deleteFile(f.id); setConfirm(null) }}>{t('delete')}</Button>
                  <Button variant="ghost" onClick={() => setConfirm(null)}>{t('cancel')}</Button>
                </span>
              ) : (
                <span className="flex gap-2">
                  <Button onClick={() => onRead(f.id)}>{f.lastPage ? t('fileResume', { n: f.lastPage + 1 }) : t('fileRead')}</Button>
                  <Button variant="ghost" aria-label={`${t('fileDelete')} ${f.name}`} onClick={() => setConfirm(f.id)}>✕</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">{t('filesDrop')}</p>}
      {msg && <p className="text-sm text-bad" role="alert">{msg}</p>}
    </Card>
  )
}
