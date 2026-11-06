/**
 * TRANG "BẢN WINDOWS" (/desktop): cập nhật, phím tắt tra từ, khay hệ thống, chạy cùng Windows.
 * Trên web: giới thiệu và nút tải bản Windows.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { Kbd } from '@/modules/shortcuts/Kbd'
import { comboOf } from '@/modules/shortcuts/keymap'
import { S, RELEASES_URL } from './strings'
import { Toggle } from './Toggle'
import { isDesktopApp, showLookup } from './lib/native'
import { DEFAULT_HOTKEY, useDesktopPrefs, useHotkeyError } from './lib/prefs'
import { checkForUpdate, installUpdate, useUpdate } from './lib/updater'
import { isAutostartOn, setAutostart } from './lib/autostart'

export default function DesktopPage() {
  const t = useT(S)
  if (!isDesktopApp()) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Card className="space-y-3">
          <p>{t('webIntro')}</p>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-medium text-on-primary hover:opacity-90">
            {t('download')}
          </a>
        </Card>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <UpdateCard />
      <LookupCard />
      <TrayCard />
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function UpdateCard() {
  const t = useT(S)
  const u = useUpdate()
  const p = useDesktopPrefs()
  const [version, setVersion] = useState('')
  useEffect(() => {
    import('@tauri-apps/api/app').then((m) => m.getVersion()).then(setVersion, () => {})
  }, [])
  const busy = u.status === 'checking' || u.status === 'downloading' || u.status === 'installing'

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{t('updTitle')}</h2>
      {version && <p className="text-sm text-muted">{t('current', { v: version })}</p>}
      <div role="status" className="text-sm">
        {u.status === 'checking' && t('checking')}
        {u.status === 'none' && t('upToDate')}
        {u.status === 'available' && t('available', { v: u.version ?? '' })}
        {u.status === 'downloading' && t('downloading', { p: u.progress != null ? `${Math.round(u.progress * 100)}%` : '' })}
        {u.status === 'installing' && t('installing')}
        {u.status === 'error' && <span className="text-bad">{t('updError', { e: u.error ?? '' })}</span>}
      </div>
      {u.notes && u.status === 'available' && <p className="whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm">{u.notes}</p>}
      <div className="flex flex-wrap gap-2">
        {u.status === 'available'
          ? <Button onClick={() => void installUpdate()}>{t('install')}</Button>
          : <Button variant="soft" disabled={busy} onClick={() => void checkForUpdate()}>{u.status === 'checking' ? t('checking') : t('check')}</Button>}
      </div>
      {u.lastCheck && (
        <p className="text-xs text-muted">{t('lastCheck', { when: new Date(u.lastCheck).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>
      )}
      <Row label={t('autoUpdate')} hint={t('autoUpdateHint')}>
        <Toggle label={t('autoUpdate')} on={p.autoUpdate} onChange={(autoUpdate) => p.set({ autoUpdate })} />
      </Row>
    </Card>
  )
}

function LookupCard() {
  const t = useT(S)
  const p = useDesktopPrefs()
  const error = useHotkeyError((s) => s.error)
  const [recording, setRecording] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRecording(false); setWarn(null); return }
      const c = comboOf(e)
      if (!c) return // mới bấm Ctrl/Alt, đợi phím chính
      if (!/^(Ctrl|Alt)\+/.test(c)) { setWarn(t('needMod')); return }
      p.set({ hotkey: c, hotkeyOn: true })
      setWarn(null)
      setRecording(false)
    }
    window.addEventListener('keydown', onKey, true) // bắt trước phím tắt trong app
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, p, t])

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{t('lookupTitle')}</h2>
      <p className="text-sm text-muted">{t('lookupIntro')}</p>
      <Row label={t('hotkeyOn')}>
        <Toggle label={t('hotkeyOn')} on={p.hotkeyOn} onChange={(hotkeyOn) => p.set({ hotkeyOn })} />
      </Row>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="font-medium">{t('hotkey')}:</span>
        {recording ? <span className="text-sm text-primary" role="status">{t('recording')}</span> : <Kbd combo={p.hotkey} className="text-sm" />}
        {!recording && <Button variant="soft" className="min-h-9 text-sm" onClick={() => setRecording(true)}>{t('change')}</Button>}
        {!recording && p.hotkey !== DEFAULT_HOTKEY && (
          <Button variant="ghost" className="min-h-9 text-sm" onClick={() => p.set({ hotkey: DEFAULT_HOTKEY })}>{t('reset')}</Button>
        )}
        <Button variant="ghost" className="min-h-9 text-sm" onClick={() => void showLookup()}>{t('tryNow')}</Button>
      </div>
      {(warn || (p.hotkeyOn && error)) && <p role="alert" className="text-sm text-bad">{warn ?? error}</p>}
      <Row label={t('lookupOnCopy')} hint={t('lookupOnCopyHint')}>
        <Toggle label={t('lookupOnCopy')} on={p.lookupOnCopy} onChange={(lookupOnCopy) => p.set({ lookupOnCopy })} />
      </Row>
    </Card>
  )
}

function TrayCard() {
  const t = useT(S)
  const p = useDesktopPrefs()
  const [auto, setAuto] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { isAutostartOn().then(setAuto, () => setAuto(false)) }, [])
  const toggleAuto = async (on: boolean) => {
    setErr(null)
    try { await setAutostart(on); setAuto(await isAutostartOn()) } catch (e) { setErr(String(e)) }
  }

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{t('trayTitle')}</h2>
      <Row label={t('closeToTray')} hint={t('closeToTrayHint')}>
        <Toggle label={t('closeToTray')} on={p.closeToTray} onChange={(closeToTray) => p.set({ closeToTray })} />
      </Row>
      <Row label={t('autostart')} hint={t('autostartHint')}>
        <Toggle label={t('autostart')} on={!!auto} disabled={auto === null} onChange={(v) => void toggleAuto(v)} />
      </Row>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <p className="text-sm text-muted">{t('windowHint')}</p>
    </Card>
  )
}
