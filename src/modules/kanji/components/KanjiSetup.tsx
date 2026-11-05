/** Khối tải dữ liệu Kanji về máy (lần đầu) và cập nhật khi có bản mới. */
import { useEffect } from 'react'
import { formatBytes } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { STUDY_PACK, useKanjiInstaller, useKanjiPacks } from '../lib/data'

export function KanjiSetup() {
  const packs = useKanjiPacks()
  const inst = useKanjiInstaller()
  const { check } = inst
  useEffect(() => { check().catch(() => {}) }, [packs.ready, packs.study?.version])

  const pending = inst.plan ?? []
  if (packs.loading || (packs.ready && !pending.length && !inst.running && !inst.error)) return null
  const size = pending.reduce((s, p) => s + (p.downloadSize ?? 0), 0)
  const p = inst.progress
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0

  return (
    <Card className="mb-4 space-y-3">
      {!packs.ready ? (
        <>
          <h2 className="font-semibold">Tải dữ liệu Kanji về máy</h2>
          <p className="text-sm text-muted">
            Cần tải một lần{size ? ` khoảng ${formatBytes(size)}` : ''}: thứ tự nét của hơn 6.000 Kanji (KanjiVG),
            âm On/Kun, âm Hán Việt, từ ví dụ và danh sách JLPT. Sau đó học được cả khi không có mạng.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Có bản cập nhật dữ liệu Kanji{size ? ` (${formatBytes(size)})` : ''}.
        </p>
      )}
      {inst.running ? (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${p?.phase === 'install' ? pct : 5}%` }} />
          </div>
          <p className="text-xs text-muted">
            {!p ? 'Đang chuẩn bị…' : `${p.phase === 'download' ? 'Đang tải' : 'Đang cài'} ${p.pack === STUDY_PACK ? 'nét viết' : 'thông tin Kanji'}${p.phase === 'install' ? `: ${pct}%` : '…'}`}
          </p>
        </div>
      ) : (
        <Button onClick={() => inst.install()}>{packs.ready ? 'Cập nhật' : 'Tải dữ liệu Kanji'}</Button>
      )}
      {inst.error && <p className="whitespace-pre-line text-sm text-bad">Có lỗi: {inst.error}</p>}
    </Card>
  )
}
