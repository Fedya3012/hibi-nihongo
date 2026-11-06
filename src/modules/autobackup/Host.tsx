/**
 * THANH NHẮC SAO LƯU (Layout chỉ cần một dòng <AutoBackupHost />)
 * Chỉ hiện khi tới hạn sao lưu mà app không tự ghi được (bản web: trình duyệt cần bạn bấm để
 * cho phép ghi thư mục, hoặc trình duyệt chỉ cho tải file về). Bản Windows không bao giờ hiện.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { clearNeedsAction, getNeedsAction, subscribeNeedsAction, tick } from './lib/scheduler'
import { restoreFrom, runAutoBackup } from './lib/run'
import { findNewerRemote, type RemoteBackup } from './lib/remote'
import { setState } from './lib/settings'
import { platform } from './lib/platform'

export function AutoBackupHost() {
  return (
    <>
      <DueBanner />
      <RemoteBanner />
    </>
  )
}

const bannerCls = 'fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-card md:bottom-4'

/**
 * Hai máy dùng chung một thư mục sao lưu: máy kia có bản mới hơn thì hỏi có lấy về không.
 * Kiểm tra lúc mở app (sau vài giây) và mỗi lần quay lại app.
 */
function RemoteBanner() {
  const t = useT(S)
  const [remote, setRemote] = useState<RemoteBackup | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const check = () => { findNewerRemote().then((r) => { if (alive) setRemote(r) }, () => {}) }
    const timer = setTimeout(check, 5_000)
    const onVis = () => { if (!document.hidden) check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  if (msg) {
    return (
      <div role="status" className={bannerCls}>
        <p className="min-w-0 flex-1 text-sm">{msg}</p>
        <Button variant="ghost" className="min-h-9 text-sm" onClick={() => setMsg(null)}>OK</Button>
      </div>
    )
  }
  if (!remote) return null

  const when = new Date(remote.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  const take = async () => {
    setBusy(true)
    try {
      const n = await restoreFrom(remote.name)
      setState({ remoteSeenAt: remote.at })
      setMsg(t('remoteDone', { n: n.toLocaleString() }))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setRemote(null)
    }
  }
  const skip = () => { setState({ remoteSeenAt: remote.at }); setRemote(null) }

  return (
    <div role="status" className={bannerCls}>
      <span className="jp text-xl text-primary" aria-hidden>同</span>
      <div className="min-w-0 flex-1 text-sm">
        <p>{t('remoteText', { when })}</p>
        {remote.localChanged && <p className="text-muted">{t('remoteWarn')}</p>}
      </div>
      <div className="flex gap-1">
        <Button className="min-h-9 text-sm" onClick={take} disabled={busy}>{busy ? '…' : t('remoteDo')}</Button>
        <Button variant="ghost" className="min-h-9 text-sm" onClick={skip} disabled={busy}>{t('remoteSkip')}</Button>
      </div>
    </div>
  )
}

function DueBanner() {
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
    <div role="status" className={bannerCls}>
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
