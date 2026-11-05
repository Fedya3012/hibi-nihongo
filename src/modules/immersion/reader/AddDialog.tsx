/** HỘP THOẠI THÊM VĂN BẢN: dán chữ, link bài viết, file TXT/EPUB, hoặc theo dõi clipboard. */
import { useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { Modal, inputClass } from '../manga/ui'
import { FILE_ACCEPT, fromFile, fromPlainText, fromUrl, readClipboard } from './importers'
import { saveNewDoc } from './store'
import { S } from './strings'
import type { ParsedDoc } from './types'

type Tab = 'paste' | 'url' | 'file' | 'live'

export function AddDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const t = useT(S)
  const [tab, setTab] = useState<Tab>('paste')
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async (make: () => Promise<ParsedDoc>) => {
    setBusy(true)
    setError('')
    try {
      const doc = await make()
      if (name.trim()) doc.title = name.trim()
      const meta = await saveNewDoc(doc)
      onCreated(meta.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const pasteClipboard = async () => {
    setError('')
    try { setText(await readClipboard()) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const openFile = (f: File | undefined) => { if (f) run(() => fromFile(f)) }

  const submit = () => {
    if (tab === 'paste') run(async () => fromPlainText(text, name))
    else if (tab === 'url') run(() => fromUrl(url))
    else if (tab === 'live') {
      const date = new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      run(async () => ({ title: t('liveName', { date }), source: 'clipboard', chapters: [{ title: '', paras: [] }] }))
    }
  }

  const canSubmit = !busy && (tab === 'paste' ? text.trim().length > 0 : tab === 'url' ? url.trim().length > 0 : tab === 'live')

  return (
    <Modal title={t('add').replace(/^\+\s*/, '')} onClose={onClose} wide>
      <div className="grid gap-4">
        <div className="overflow-x-auto">
          <Segmented<Tab>
            label={t('add')}
            value={tab}
            onChange={(v) => { setTab(v); setError('') }}
            options={[
              { value: 'paste', label: t('tabPaste') },
              { value: 'url', label: t('tabUrl') },
              { value: 'file', label: t('tabFile') },
              { value: 'live', label: t('tabLive') },
            ]}
          />
        </div>

        {tab !== 'live' && (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">{t('nameLabel')}</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        {tab === 'paste' && (
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">{t('textLabel')}</span>
              <textarea
                className={`${inputClass} jp min-h-48 py-2 text-base`}
                value={text}
                placeholder={t('textPh')}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            </label>
            <div><Button variant="soft" onClick={pasteClipboard}>{t('fromClipboard')}</Button></div>
          </div>
        )}

        {tab === 'url' && (
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">{t('urlLabel')}</span>
              <input className={inputClass} type="url" inputMode="url" value={url} autoFocus
                onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()} />
            </label>
            <p className="text-xs text-muted">{t('urlHint')}</p>
          </div>
        )}

        {tab === 'file' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); openFile(e.dataTransfer.files[0]) }}
            className={`grid place-items-center gap-3 rounded-card border-2 border-dashed p-8 text-center ${drag ? 'border-primary bg-primary-soft' : 'border-border'}`}
          >
            <p className="text-sm text-muted">{t('fileHint')}</p>
            <Button variant="soft" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? t('loading') : t('chooseFile')}</Button>
            <input ref={fileRef} type="file" accept={FILE_ACCEPT} hidden onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        )}

        {tab === 'live' && <p className="text-sm text-muted">{t('liveHint')}</p>}

        {error && <p role="alert" className="rounded-xl bg-surface-2 p-3 text-sm text-bad">{error}</p>}

        {tab !== 'file' && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            <Button disabled={!canSubmit} onClick={submit}>{busy ? t('loading') : t('create')}</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
