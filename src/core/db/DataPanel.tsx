/**
 * KHỐI "DỮ LIỆU TRÊN MÁY" trong trang Cài đặt:
 * dung lượng đang dùng, sao lưu / khôi phục, gói nội dung đã cài và nút cập nhật.
 */
import { useRef, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button, ButtonLink } from '@/design/components/Button'
import { useDbQuery } from './useDbQuery'
import { getStorageInfo, formatBytes } from './storage'
import { BackupSection } from './BackupSection'
import {
  listPacks, removePack, installPackFile, fetchManifest, planUpdates, runUpdates,
  type UpdatePlanItem, type Progress,
} from './content'

type Notice = { kind: 'good' | 'bad' | 'info'; text: string } | null

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function DataPanel() {
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<UpdatePlanItem[] | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const packInput = useRef<HTMLInputElement>(null)

  const { data: storage } = useDbQuery(getStorageInfo, [busy], ['kv', 'packItems'])
  const { data: packs } = useDbQuery(listPacks, [], ['packs'])

  async function run(task: () => Promise<string | void>) {
    setBusy(true)
    setNotice(null)
    try {
      const msg = await task()
      if (msg) setNotice({ kind: 'good', text: msg })
    } catch (e) {
      setNotice({ kind: 'bad', text: errText(e) })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const checkUpdates = () => run(async () => {
    const p = await planUpdates(await fetchManifest(), { includeNew: true })
    setPlan(p)
    if (p.length === 0) return 'Nội dung trên máy đã là mới nhất.'
  })

  const applyUpdates = (items: UpdatePlanItem[]) => run(async () => {
    const { updated, failed } = await runUpdates(items, setProgress)
    setPlan(null)
    if (failed.length) throw new Error(`Không cập nhật được: ${failed.map((f) => `${f.pack} (${f.error})`).join('; ')}`)
    return `Đã cập nhật ${updated.length} gói nội dung.`
  })

  const installFromFile = (file: File) => run(async () => {
    const p = await installPackFile(file, setProgress)
    return `Đã cài gói "${p.title}" (phiên bản ${p.version}, ${p.itemCount.toLocaleString('vi-VN')} mục).`
  })

  const usedPct = storage && storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold">Dữ liệu trên máy</h2>
      <p className="text-sm text-muted">Mọi thứ bạn học được lưu ngay trên thiết bị này, dùng được cả khi không có mạng.</p>

      {/* Dung lượng */}
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span>Đang dùng {storage ? formatBytes(storage.usage) : '…'}</span>
          {storage && storage.quota > 0 && <span className="text-muted">tối đa {formatBytes(storage.quota)}</span>}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar"
          aria-label="Dung lượng đã dùng" aria-valuenow={Math.round(usedPct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(usedPct, 1)}%` }} />
        </div>
        {storage && !storage.persisted && (
          <p className="mt-2 text-sm text-muted">
            Mẹo: cài app (biểu tượng ⊕ trên thanh địa chỉ) để trình duyệt không tự xóa dữ liệu khi máy đầy ổ.
          </p>
        )}
        <ButtonLink to="/storage" variant="ghost" className="mt-2 min-h-9 text-sm">Xem từng phần chiếm bao nhiêu, dọn dẹp →</ButtonLink>
      </div>

      <BackupSection />

      {/* Gói nội dung */}
      <div className="mt-5 border-t border-border pt-4">
        <p className="font-medium">Gói nội dung</p>
        <p className="text-sm text-muted">Từ điển, kanji, câu ví dụ... Khi có bản mới, app chỉ tải phần thay đổi.</p>
        {packs && packs.length > 0 ? (
          <ul className="mt-2 divide-y divide-border">
            {packs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted"> · bản {p.version} · {p.itemCount.toLocaleString('vi-VN')} mục</span>
                  {p.status === 'installing' && <span className="text-warn"> · cài chưa xong</span>}
                </span>
                <Button variant="ghost" className="min-h-9 text-sm" disabled={busy}
                  onClick={() => run(async () => { await removePack(p.id); return `Đã gỡ gói "${p.title}".` })}>
                  Gỡ
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Chưa cài gói nào.</p>
        )}

        {plan && plan.length > 0 && (
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <ul className="space-y-1">
              {plan.map((i) => (
                <li key={i.pack.id}>
                  <b>{i.pack.title}</b>{' '}
                  {i.installedVersion == null ? `(mới, bản ${i.pack.version})` : `bản ${i.installedVersion} → ${i.pack.version}`}
                  <span className="text-muted">
                    {' · '}{i.method === 'patch' ? 'chỉ tải phần thay đổi' : 'tải cả gói'}
                    {i.downloadSize != null && ` · ${formatBytes(i.downloadSize)}`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => applyUpdates(plan)} disabled={busy}>Tải và cài</Button>
              <Button variant="ghost" onClick={() => setPlan(null)}>Để sau</Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="soft" onClick={checkUpdates} disabled={busy}>Kiểm tra cập nhật</Button>
          <Button variant="ghost" onClick={() => packInput.current?.click()} disabled={busy}>Cài gói từ file</Button>
          <input ref={packInput} type="file" accept=".json,.gz,application/json,application/gzip" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) installFromFile(f) }} />
        </div>
      </div>

      {progress && (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {progress.phase === 'download' ? 'Đang tải' : 'Đang cài'} {progress.pack}: {progress.done.toLocaleString('vi-VN')}/{progress.total.toLocaleString('vi-VN')}
        </p>
      )}
      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice.kind === 'bad' ? 'text-bad' : notice.kind === 'good' ? 'text-good' : 'text-muted'}`}>
          {notice.text}
        </p>
      )}
    </Card>
  )
}
