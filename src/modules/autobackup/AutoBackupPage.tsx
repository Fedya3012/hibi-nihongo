/**
 * TRANG SAO LƯU TỰ ĐỘNG (/autobackup)
 * Bật/tắt, bao lâu một lần, giữ mấy bản, chọn thư mục, xem tình trạng, sao lưu ngay,
 * và danh sách các bản đã lưu kèm nút Khôi phục.
 */
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { formatBytes } from '@/core/db'
import { useLang, useT } from '@/core/i18n'
import { Row, Toggle } from '@/modules/reminders/components'
import { S } from './strings'
import {
  EVERY_OPTIONS, KEEP_OPTIONS, defaultSettings, nextDueAt, saveAutoBackupSettings,
  useAutoBackupSettings, useAutoBackupState, type AutoBackupSettings,
} from './lib/settings'
import { desktop, folder, platform, type BackupEntry } from './lib/targets'
import { desktopDir, restoreFrom, runAutoBackup, type RunResult } from './lib/run'
import { clearNeedsAction } from './lib/scheduler'

type Msg = { kind: 'good' | 'bad' | 'info'; text: string } | null

export default function AutoBackupPage() {
  const t = useT(S)
  const lang = useLang()
  const s = useAutoBackupSettings() ?? defaultSettings()
  const st = useAutoBackupState()
  const where = platform()
  const save = (patch: Partial<AutoBackupSettings>) => saveAutoBackupSettings(patch)

  const [dir, setDir] = useState<string | null>(null) // thư mục đang dùng (để hiện)
  const [files, setFiles] = useState<BackupEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [confirm, setConfirm] = useState<BackupEntry | null>(null)

  const when = (ms: number) => new Date(ms).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })

  // Thư mục + danh sách file. Bản web chỉ đọc được khi đã có quyền (không hỏi quyền lúc mở trang).
  const reload = useCallback(async () => {
    try {
      if (where === 'desktop') {
        const d = await desktopDir()
        setDir(d)
        setFiles(await desktop.list(d))
      } else if (where === 'folder') {
        const h = await folder.handle()
        setDir(h ? h.name || '/' : null)
        setFiles(h && (await folder.permission(false)) === 'granted' ? await folder.list() : null)
      }
    } catch (e) {
      setMsg({ kind: 'bad', text: e instanceof Error ? e.message : String(e) })
    }
  }, [where])
  useEffect(() => { void reload() }, [reload, s.desktopDir, st.lastWrittenAt])

  const resultText = (r: RunResult): Msg =>
    r.kind === 'written' ? { kind: 'good', text: t('done', { file: r.file }) }
      : r.kind === 'unchanged' ? { kind: 'info', text: t('unchanged') }
        : r.kind === 'empty' ? { kind: 'info', text: t('empty') }
          : r.kind === 'needs-action' ? { kind: 'bad', text: t('needs') }
            : { kind: 'bad', text: t('error', { msg: r.message }) }

  const runNow = async () => {
    setBusy(true)
    setMsg(null)
    const r = await runAutoBackup({ interactive: true, force: true })
    setBusy(false)
    if (r.kind !== 'needs-action' && r.kind !== 'error') clearNeedsAction()
    setMsg(resultText(r))
    void reload()
  }

  const pickDesktop = async () => {
    const d = await desktop.pick(dir ?? '')
    if (d) await save({ desktopDir: d })
  }
  const pickFolder = async () => {
    if (await folder.pick()) { setMsg(null); void reload() }
  }

  const restore = async (e: BackupEntry) => {
    setConfirm(null)
    setBusy(true)
    setMsg(null)
    try {
      const n = await restoreFrom(e.name)
      setMsg({ kind: 'good', text: t('restoreDone', { n: n.toLocaleString(lang) }) })
    } catch (err) {
      setMsg({ kind: 'bad', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
      void reload()
    }
  }

  const due = nextDueAt(s, st)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{t('title')}</h1>
      <p className="mb-4 text-muted">{t('intro')}</p>

      <Card>
        <Row label={t('enable')}>
          <Toggle label={t('enable')} on={s.enabled} onChange={(enabled) => save({ enabled })} />
        </Row>
        <Row label={t('every')} hint={t('unchangedHint')}>
          <Segmented label={t('every')} value={String(s.everyDays)}
            options={EVERY_OPTIONS.map((n) => ({ value: String(n), label: t(`every${n}` as 'every1') }))}
            onChange={(v) => save({ everyDays: Number(v) })} />
        </Row>
        {where !== 'download' && (
          <Row label={t('keep')} hint={t('keepHint')}>
            <Segmented label={t('keep')} value={String(s.keep)}
              options={KEEP_OPTIONS.map((n) => ({ value: String(n), label: t('keepN', { n }) }))}
              onChange={(v) => save({ keep: Number(v) })} />
          </Row>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-medium">{t('where')}</p>
        {where === 'desktop' && (
          <>
            <p className="mt-2 break-all rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm">
              {dir ?? '…'} {s.desktopDir == null && <span className="font-sans text-muted">{t('defaultDir')}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="soft" onClick={pickDesktop}>{t('change')}</Button>
              {s.desktopDir != null && <Button variant="ghost" onClick={() => save({ desktopDir: null })}>{t('useDefault')}</Button>}
            </div>
            <p className="mt-3 text-sm text-muted">{t('cloudTip')}</p>
            <p className="mt-2 text-sm text-muted">{t('syncTip')}</p>
          </>
        )}
        {where === 'folder' && (
          <>
            <p className="mt-1 text-sm text-muted">{t('whereFolder')}</p>
            <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
              {dir ? <span className="font-mono">📁 {dir}</span> : <span className="text-muted">{t('noFolder')}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="soft" onClick={pickFolder}>{dir ? t('change') : t('pick')}</Button>
              {dir && <Button variant="ghost" onClick={async () => { await folder.forget(); void reload() }}>{t('forget')}</Button>}
            </div>
            <p className="mt-3 text-sm text-muted">{t('cloudTip')}</p>
            <p className="mt-2 text-sm text-muted">{t('syncTip')}</p>
          </>
        )}
        {where === 'download' && <p className="mt-1 text-sm text-muted">{t('whereDownload')}</p>}
      </Card>

      <Card className="mt-4">
        <p className="font-medium">{t('status')}</p>
        <ul className="mt-1 space-y-1 text-sm text-muted">
          <li>{st.lastWrittenAt ? t('last', { when: when(st.lastWrittenAt) }) : t('lastNever')}</li>
          {st.lastFile && <li className="break-all">{t('lastFile', { file: st.lastFile })}</li>}
          <li>{due == null ? t('off') : due <= Date.now() ? t('nextNow') : t('next', { when: when(due) })}</li>
          {st.lastError && <li className="text-bad">{t('error', { msg: st.lastError })}</li>}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={runNow} disabled={busy}>{busy ? t('running') : t('runNow')}</Button>
        </div>
        {msg && (
          <p role="status" className={`mt-3 text-sm ${msg.kind === 'bad' ? 'text-bad' : msg.kind === 'good' ? 'text-good' : 'text-muted'}`}>
            {msg.text}
          </p>
        )}
      </Card>

      {where !== 'download' && files && (
        <Card className="mt-4">
          <p className="font-medium">{t('files')}</p>
          {files.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t('filesNone')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {files.map((f) => (
                <li key={f.name} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{when(f.modified)}</span>
                      <span className="text-muted"> · {formatBytes(f.size)}</span>
                    </span>
                    <Button variant="ghost" className="min-h-9 text-sm" disabled={busy} onClick={() => setConfirm(f)}>{t('restore')}</Button>
                  </div>
                  {confirm?.name === f.name && (
                    <div className="mt-2 rounded-xl border border-border bg-surface-2 p-3">
                      <p>{t('restoreAsk', { when: when(f.modified) })}</p>
                      <div className="mt-2 flex gap-2">
                        <Button onClick={() => restore(f)} disabled={busy}>{t('restore')}</Button>
                        <Button variant="ghost" onClick={() => setConfirm(null)}>{t('cancel')}</Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <p className="font-medium">{t('manualTitle')}</p>
        <p className="text-sm text-muted">{t('manualText')}</p>
      </Card>
    </div>
  )
}
