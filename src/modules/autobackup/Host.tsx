/**
 * THANH NHẮC SAO LƯU (Layout chỉ cần một dòng <AutoBackupHost />)
 * Chỉ hiện khi tới hạn sao lưu mà app không tự ghi được (bản web: trình duyệt cần bạn bấm để
 * cho phép ghi thư mục, hoặc trình duyệt chỉ cho tải file về). Bản Windows không bao giờ hiện.
 */
import { useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { clearNeedsAction, getNeedsAction, subscribeNeedsAction, tick } from './lib/scheduler'
import { runAutoBackup } from './lib/run'
import { setState } from './lib/settings'
import { platform } from './lib/platform'

export function AutoBackupHost() {
  const t = useT(S)
  const show = useSyncExternalStore(subscribeNeedsAction, getNeedsAction)
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)
  // Đang ở trang Sao lưu tự động thì trang đó đã có nút, không cần thanh nhắc
  if (!show || pathname === '/autobackup') return null

  const doIt = async () => {
    setBusy(true)
    const r = await runAutoBackup({ interactive: true })
    setBusy(false)
    if (r.kind !== 'needs-action') clearNeedsAction()
  }
  const later = () => {
    setState({ snoozeUntil: Date.now() + 86_400_000 })
    clearNeedsAction()
    void tick()
  }

  return (
    <div role="status"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-card md:bottom-4">
      <span className="jp text-xl text-primary" aria-hidden>保</span>
      <p className="min-w-0 flex-1 text-sm">{t(platform() === 'folder' ? 'bannerTextFolder' : 'bannerText')}</p>
      <div className="flex gap-1">
        <Button className="min-h-9 text-sm" onClick={doIt} disabled={busy}>{t('bannerDo')}</Button>
        <Button variant="ghost" className="min-h-9 text-sm" onClick={later}>{t('bannerLater')}</Button>
        <ButtonLink variant="ghost" className="min-h-9 text-sm" to="/autobackup">{t('bannerSettings')}</ButtonLink>
      </div>
    </div>
  )
}
