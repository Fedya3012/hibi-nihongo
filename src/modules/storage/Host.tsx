/**
 * THANH CẢNH BÁO "BỘ NHỚ ĐẦY" (Layout chỉ cần một dòng <StorageHost />)
 * - Khi bất kỳ thao tác lưu nào hỏng vì hết chỗ (kho dữ liệu báo qua onQuotaError), hiện ngay,
 *   ở mọi trang, kèm nút "Dọn dữ liệu".
 * - Lúc mở app, nếu đã dùng trên 90% chỗ trình duyệt cho, nhắc trước (mỗi ngày tối đa một lần).
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, ButtonLink } from '@/design/components/Button'
import { formatBytes, getStorageInfo, onQuotaError } from '@/core/db'

const NEAR_FULL = 0.9
const SNOOZE_KEY = 'hibi-storage-warned'

type Warn = { kind: 'full' } | { kind: 'near'; text: string }

export function StorageHost() {
  const [warn, setWarn] = useState<Warn | null>(null)
  const { pathname } = useLocation()

  useEffect(() => onQuotaError(() => setWarn({ kind: 'full' })), [])

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < 86_400_000) return
      } catch { /* bỏ qua */ }
      const info = await getStorageInfo()
      if (info.quota > 0 && info.usage / info.quota > NEAR_FULL) {
        setWarn((w) => w ?? { kind: 'near', text: `Bộ nhớ dành cho Hibi sắp đầy (${formatBytes(info.usage)} / ${formatBytes(info.quota)}).` })
      }
    }, 8_000)
    return () => clearTimeout(t)
  }, [])

  if (!warn || pathname === '/storage') return null
  const close = () => {
    if (warn.kind === 'near') { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch { /* bỏ qua */ } }
    setWarn(null)
  }

  return (
    <div role="alert"
      className="fixed inset-x-3 top-16 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-bad bg-surface p-3 shadow-card">
      <span className="jp text-xl text-bad" aria-hidden>満</span>
      <p className="min-w-0 flex-1 text-sm">
        {warn.kind === 'full'
          ? 'Bộ nhớ đầy nên vừa rồi không lưu được. Dọn bớt ảnh, video không cần nữa rồi thử lại.'
          : warn.text}
      </p>
      <div className="flex gap-1">
        <ButtonLink className="min-h-9 text-sm" to="/storage" onClick={() => setWarn(null)}>Dọn dữ liệu</ButtonLink>
        <Button variant="ghost" className="min-h-9 text-sm" onClick={close}>Đóng</Button>
      </div>
    </div>
  )
}
