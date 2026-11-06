/**
 * TRANG "DUNG LƯỢNG VÀ DỌN DẸP" (/storage)
 * Xem từng phần (manga, anime, giáo trình, thẻ...) chiếm bao nhiêu chỗ, và dọn những thứ
 * nhập lại được hoặc không còn dùng. Cách đo và dọn: lib/usage.ts.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Link } from 'react-router-dom'
import { Button } from '@/design/components/Button'
import { formatBytes, getStorageInfo, requestPersistentStorage, lastQuotaErrorAt, useDbQuery } from '@/core/db'
import { measureUsage, planCleanup, runCleanup, type CategoryUsage, type CleanupKind, type CleanupPlan } from './lib/usage'

const num = (n: number) => n.toLocaleString('vi-VN')

export default function StoragePage() {
  const [usage, setUsage] = useState<CategoryUsage[] | null>(null)
  const [plan, setPlan] = useState<CleanupPlan | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ bad: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const { data: info } = useDbQuery(getStorageInfo, [tick], [])
  const quotaHit = lastQuotaErrorAt()

  useEffect(() => {
    let alive = true
    setProgress('Đang đo…')
    measureUsage((d, t) => alive && setProgress(`Đang đo ${d}/${t}…`))
      .then(async (u) => { if (!alive) return; setUsage(u); setPlan(await planCleanup()) })
      .catch((e) => alive && setNotice({ bad: true, text: e instanceof Error ? e.message : String(e) }))
      .finally(() => alive && setProgress(null))
    return () => { alive = false }
  }, [tick])

  const clean = async (kind: CleanupKind, done: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await runCleanup(kind)
      setNotice({ bad: false, text: done })
      setTick((t) => t + 1)
    } catch (e) {
      setNotice({ bad: true, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const persist = async () => {
    const ok = await requestPersistentStorage()
    setNotice(ok
      ? { bad: false, text: 'Trình duyệt đã đồng ý không tự xóa dữ liệu của Hibi.' }
      : { bad: true, text: 'Trình duyệt chưa đồng ý. Cài app (biểu tượng ⊕ trên thanh địa chỉ) thường sẽ được chấp nhận.' })
    setTick((t) => t + 1)
  }

  const max = Math.max(1, ...(usage ?? []).map((u) => u.bytes))
  const pct = info && info.quota > 0 ? Math.min(100, (info.usage / info.quota) * 100) : 0

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-bold"><span className="jp mr-2 text-primary" aria-hidden>容</span>Dung lượng và dọn dẹp</h1>
        <p className="text-muted">Mọi thứ bạn học nằm ngay trên máy này. Đây là phần nào chiếm bao nhiêu chỗ.</p>
      </div>

      {quotaHit > 0 && (
        <Card className="border-bad">
          <p className="font-medium text-bad">Vừa rồi app không lưu được vì bộ nhớ đầy.</p>
          <p className="text-sm text-muted">Dọn bớt bên dưới rồi làm lại thao tác vừa rồi.</p>
        </Card>
      )}

      <Card>
        <div className="flex justify-between text-sm">
          <span>Hibi đang dùng <b>{info ? formatBytes(info.usage) : '…'}</b></span>
          {info && info.quota > 0 && <span className="text-muted">trình duyệt cho tối đa {formatBytes(info.quota)}</span>}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Dung lượng đã dùng"
          aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${pct > 90 ? 'bg-bad' : 'bg-primary'}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
        {info && !info.persisted && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Trình duyệt có thể tự xóa dữ liệu khi máy đầy ổ.</span>
            <Button variant="soft" className="min-h-9 text-sm" onClick={persist}>Xin giữ dữ liệu lâu dài</Button>
          </div>
        )}
      </Card>

      <Card className="!p-0">
        <h2 className="px-4 pt-4 text-lg font-semibold">Từng phần</h2>
        {progress && <p className="px-4 pt-1 text-sm text-muted" aria-live="polite">{progress}</p>}
        <ul className="mt-2">
          {(usage ?? []).map((u) => (
            <li key={u.id} className="border-t border-border px-4 py-3">
              <button type="button" className="w-full text-left" onClick={() => setOpen(open === u.id ? null : u.id)} aria-expanded={open === u.id}>
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{u.label}</span>
                  <span className="tabular-nums">{u.approx ? '≈ ' : ''}{formatBytes(u.bytes)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1, (u.bytes / max) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">{u.hint}</p>
              </button>
              {open === u.id && (
                <ul className="mt-2 text-sm">
                  {u.stores.map((s) => (
                    <li key={s.store} className="flex justify-between gap-2 py-0.5">
                      <span>{s.label} <span className="text-muted">· {num(s.rows)} mục</span></span>
                      <span className="tabular-nums text-muted">{s.approx ? '≈ ' : ''}{formatBytes(s.bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="px-4 py-3 text-xs text-muted">
          Số liệu là ước lượng. Tổng ở trên do trình duyệt báo, thường lớn hơn một chút vì có thêm phần đệm và bộ nhớ đệm của app.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Dọn dẹp</h2>
        <p className="text-sm text-muted">Chỉ xóa những thứ nhập lại được hoặc không còn dùng. Tiến độ, ghi chú và thẻ ôn tập không bị đụng tới.</p>
        {!plan && <p className="mt-3 text-sm text-muted">Đang tìm thứ có thể dọn…</p>}
        {plan && (
          <ul className="mt-3 grid gap-3">
            <CleanRow
              title="Ảnh trang của chương manga đã đọc xong"
              detail={`${num(plan.manga.chapters)} chương · ${formatBytes(plan.manga.bytes)}. Giữ ảnh bìa, trang đang đọc, bong bóng thoại và ghi chú. Muốn đọc lại thì nhập lại file.`}
              disabled={busy || plan.manga.rows === 0}
              onClick={() => clean('manga', `Đã xóa ảnh của ${num(plan.manga.chapters)} chương đã đọc xong.`)}
            />
            <CleanRow
              title="Video đã chép vào app của tập anime đã xem xong"
              detail={`${num(plan.anime.episodes)} tập · ${formatBytes(plan.anime.bytes)}. Giữ phụ đề, câu đã lưu và tiến độ. Video mở thẳng từ file trên máy không bị tính.`}
              disabled={busy || plan.anime.rows === 0}
              onClick={() => clean('anime', `Đã xóa video của ${num(plan.anime.episodes)} tập đã xem xong.`)}
            />
            <CleanRow
              title="File không còn dùng"
              detail={`${num(plan.orphans.rows)} file · ${formatBytes(plan.orphans.bytes)}. Ảnh, tiếng, video còn sót lại của thẻ, chương, tập, bài đã bị xóa.`}
              disabled={busy || plan.orphans.rows === 0}
              onClick={() => clean('orphans', `Đã dọn ${num(plan.orphans.rows)} file không còn dùng.`)}
            />
            <CleanRow
              title="Bản an toàn trước lần khôi phục gần nhất"
              detail={plan.snapshot.rows ? `${formatBytes(plan.snapshot.bytes)}. Xóa thì không còn "Hoàn tác khôi phục" được nữa.` : 'Không có.'}
              disabled={busy || plan.snapshot.rows === 0}
              onClick={() => clean('snapshot', 'Đã xóa bản an toàn.')}
            />
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">
          Từ điển và gói nội dung gỡ ở <Link to="/settings" className="text-primary underline">Cài đặt → Gói nội dung</Link>;
          manga, anime, sách gỡ ở trang của từng phần.
        </p>
        {notice && <p role="status" className={`mt-3 text-sm ${notice.bad ? 'text-bad' : 'text-good'}`}>{notice.text}</p>}
      </Card>
    </div>
  )
}

function CleanRow({ title, detail, disabled, onClick }: { title: string; detail: string; disabled: boolean; onClick: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      {confirm ? (
        <div className="flex gap-1">
          <Button className="min-h-9 text-sm" onClick={() => { setConfirm(false); onClick() }}>Xóa</Button>
          <Button variant="ghost" className="min-h-9 text-sm" onClick={() => setConfirm(false)}>Thôi</Button>
        </div>
      ) : (
        <Button variant="soft" className="min-h-9 text-sm" disabled={disabled} onClick={() => setConfirm(true)}>Dọn</Button>
      )}
    </li>
  )
}
