/** Khối tải / cập nhật dữ liệu từ điển về máy. */
import { useEffect, useRef } from 'react'
import { formatBytes } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useDictInstaller, useDictPacks } from '../lib/packs'
import { WORD_PACK } from '../types'

export function PackSetup({ compact = false }: { compact?: boolean }) {
  const packs = useDictPacks()
  const inst = useDictInstaller()
  const fileRef = useRef<HTMLInputElement>(null)
  const { check } = inst

  useEffect(() => { check().catch(() => {}) }, [packs.word?.version, packs.kanji?.version])

  const pending = inst.plan ?? []
  const size = pending.reduce((s, p) => s + (p.downloadSize ?? 0), 0)
  const p = inst.progress
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0

  if (compact && packs.ready && !pending.length && !inst.running) return null

  return (
    <Card className="space-y-3">
      {!packs.ready ? (
        <>
          <h2 className="font-semibold">Tải dữ liệu từ điển về máy</h2>
          <p className="text-sm text-muted">
            Từ điển chạy hoàn toàn offline. Cần tải một lần{size ? ` khoảng ${formatBytes(size)}` : ''}: hơn 190.000 từ
            (JMdict, nghĩa tiếng Anh), 13.000 Kanji kèm âm Hán Việt, pitch accent và cấp JLPT. Cài xong mất khoảng 1 phút.
          </p>
        </>
      ) : pending.length > 0 ? (
        <>
          <h2 className="font-semibold">Có bản cập nhật từ điển</h2>
          <p className="text-sm text-muted">
            {pending.map((x) => `${x.pack.title}: v${x.installedVersion ?? '–'} → v${x.pack.version}${x.method === 'patch' ? ' (chỉ tải phần thay đổi)' : ''}`).join(' · ')}
            {size ? ` · ${formatBytes(size)}` : ''}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Dữ liệu từ điển: {packs.word?.itemCount.toLocaleString('vi-VN')} từ (v{packs.word?.version})
          {packs.kanji ? `, ${packs.kanji.itemCount.toLocaleString('vi-VN')} Kanji (v${packs.kanji.version})` : ''}. Đã là bản mới nhất.
        </p>
      )}

      {inst.running ? (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${p?.phase === 'install' ? pct : 5}%` }} />
          </div>
          <p className="text-xs text-muted">
            {!p ? 'Đang chuẩn bị…' : p.phase === 'download' ? `Đang tải ${p.pack === WORD_PACK ? 'từ vựng' : 'Kanji'}…` : `Đang cài ${p.pack === WORD_PACK ? 'từ vựng' : 'Kanji'}: ${pct}%`}
            {' '}Đừng đóng app trong lúc cài.
          </p>
        </div>
      ) : (
        (pending.length > 0 || !packs.ready) && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => inst.install()}>{packs.ready ? 'Cập nhật' : 'Tải từ điển'}</Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>Cài từ file…</Button>
            <input
              ref={fileRef} type="file" accept=".gz,.json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) inst.installFile(f); e.target.value = '' }}
            />
          </div>
        )
      )}
      {inst.error && <p className="whitespace-pre-line text-sm text-bad">Có lỗi: {inst.error}</p>}
    </Card>
  )
}
