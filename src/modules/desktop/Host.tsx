/**
 * CHẠY NGẦM TRONG CỬA SỔ CHÍNH (Layout chỉ cần một dòng <DesktopHost />). Bản web không làm gì.
 * - Gửi cài đặt (phím tắt, thu xuống khay) cho phần Windows mỗi khi đổi.
 * - Tự kiểm tra bản mới, có thì hiện thanh nhắc.
 * - Cửa sổ tra nhanh bấm "Mở trong Từ điển" thì chuyển trang ở đây.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { applyDesktop, isDesktopApp, onNavigate } from './lib/native'
import { useDesktopPrefs, useHotkeyError } from './lib/prefs'
import { checkForUpdate, installUpdate, useUpdate } from './lib/updater'

const SIX_HOURS = 6 * 3600_000

export function DesktopHost() {
  if (!isDesktopApp()) return null
  return <Inner />
}

function Inner() {
  const { hotkey, hotkeyOn, closeToTray, autoUpdate } = useDesktopPrefs()
  const navigate = useNavigate()

  useEffect(() => {
    applyDesktop(hotkeyOn ? hotkey : '', closeToTray).then(
      () => useHotkeyError.setState({ error: null }),
      (e) => useHotkeyError.setState({ error: String(e) }),
    )
  }, [hotkey, hotkeyOn, closeToTray])

  useEffect(() => {
    let un: (() => void) | undefined
    let alive = true
    onNavigate((path) => navigate(path)).then((f) => { if (alive) un = f; else f() })
    return () => { alive = false; un?.() }
  }, [navigate])

  useEffect(() => {
    if (!autoUpdate) return
    const first = setTimeout(() => void checkForUpdate(), 20_000) // đợi app mở xong, không làm chậm lúc đầu
    const every = setInterval(() => void checkForUpdate(), SIX_HOURS)
    return () => { clearTimeout(first); clearInterval(every) }
  }, [autoUpdate])

  return <UpdateBanner />
}

function UpdateBanner() {
  const t = useT(S)
  const u = useUpdate()
  const show = (u.status === 'available' && u.dismissed !== u.version) || u.status === 'downloading' || u.status === 'installing'
  if (!show) return null
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-card md:bottom-4">
      <span className="jp text-xl text-primary" aria-hidden>新</span>
      <p className="min-w-0 flex-1 text-sm">
        {u.status === 'available' && t('bannerText', { v: u.version ?? '' })}
        {u.status === 'downloading' && t('downloading', { p: u.progress != null ? `${Math.round(u.progress * 100)}%` : '' })}
        {u.status === 'installing' && t('installing')}
      </p>
      {u.status === 'available' && (
        <div className="flex gap-1">
          <Button className="min-h-9 text-sm" onClick={() => void installUpdate()}>{t('install')}</Button>
          <Button variant="ghost" className="min-h-9 text-sm" onClick={() => useUpdate.setState({ dismissed: u.version })}>{t('later')}</Button>
        </div>
      )}
    </div>
  )
}
