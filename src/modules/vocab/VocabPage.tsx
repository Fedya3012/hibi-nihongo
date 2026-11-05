/**
 * TRANG KHO TỪ CỦA TÔI (module vocab) — đường dẫn /learn/words
 *   - Số từ đã biết / đang học / bỏ qua, cách tô màu chữ.
 *   - Tab Danh sách: lọc, đổi trạng thái, xóa, bấm từ để tra.
 *   - Tab Thêm nhiều từ: dán danh sách (mỗi dòng một từ), xuất danh sách.
 * Đường dẫn mở thẳng: /learn/words?tab=import
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { useT } from '@/core/i18n'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { openLookup } from '@/modules/dictionary/api'
import { clearKnownWords, exportWordsText, importWords, listKnownWords, parseWordList, setWordStatus } from './actions'
import { HighlightSetting } from './components/HighlightSetting'
import { useKnowledge } from './knowledge'
import { S } from './strings'
import type { KnownWord, ManualStatus } from './types'

type Tab = 'list' | 'import'
type Filter = 'all' | ManualStatus
const PAGE = 100
const inputCls = 'w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted'

export default function VocabPage() {
  const t = useT(S)
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'import' ? 'import' : 'list'
  const { data: words } = useDbQuery(listKnownWords, [], ['knownWords'])
  const k = useKnowledge()

  const counts = useMemo(() => {
    const c = { known: 0, learning: 0, ignored: 0 }
    for (const w of words ?? []) c[w.status]++
    return c
  }, [words])
  const srsKnown = useMemo(() => (k ? [...k.srsWords.values()].filter((s) => s === 'known').length : 0), [k])

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')} <span className="jp ml-1 text-lg font-normal text-muted">単語帳</span></h1>
        <Segmented<Tab> label={t('title')} value={tab} onChange={(v) => setParams(v === 'list' ? {} : { tab: v }, { replace: true })}
          options={[{ value: 'list', label: t('tabList') }, { value: 'import', label: t('tabImport') }]} />
      </div>
      <p className="text-sm text-muted">{t('intro')}</p>

      <Card className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('statKnown')} n={counts.known} tone="text-good" />
          <Stat label={t('statLearning')} n={counts.learning} tone="text-primary" />
          <Stat label={t('statIgnored')} n={counts.ignored} tone="text-muted" />
          <Stat label={t('statSrs')} n={srsKnown} tone="text-good" />
        </dl>
        <HighlightSetting />
      </Card>

      {tab === 'list' ? <WordList words={words} /> : <ImportBox />}
    </div>
  )
}

function Stat({ label, n, tone }: { label: string; n: number; tone: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-2xl font-bold ${tone}`}>{n}</dd>
    </div>
  )
}

function WordList({ words }: { words: KnownWord[] | undefined }) {
  const t = useT(S)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const srcLabel: Record<string, string> = {
    popup: t('srcPopup'), anime: t('srcAnime'), textbook: t('srcTextbook'), import: t('srcImport'), page: t('srcPage'),
  }

  const list = useMemo(() => {
    const qq = q.trim()
    return (words ?? []).filter((w) => (filter === 'all' || w.status === filter)
      && (!qq || w.w.includes(qq) || w.r?.includes(qq) || w.alt?.some((a) => a.includes(qq))))
  }, [words, filter, q])

  if (!words) return null
  if (!words.length) return <Card><p className="text-sm text-muted">{t('empty')}</p></Card>

  return (
    <Card className="space-y-3 p-0 pt-4">
      <div className="flex flex-wrap items-center gap-2 px-4">
        <Segmented<Filter> label={t('tabList')} value={filter} onChange={(v) => { setFilter(v); setLimit(PAGE) }}
          options={[
            { value: 'all', label: t('filterAll') }, { value: 'known', label: t('sKnown') },
            { value: 'learning', label: t('sLearning') }, { value: 'ignored', label: t('sIgnored') },
          ]} />
        <input className={`${inputCls} max-w-56 flex-1`} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <p className="px-4 pb-4 text-sm text-muted">{t('noMatch')}</p> : (
        <ul>
          {list.slice(0, limit).map((w) => (
            <li key={w.w} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2">
              <button className="jp min-w-20 text-left text-lg hover:text-primary" title={t('lookup')}
                onClick={(e) => openLookup(w.w, { x: e.clientX, y: e.clientY })}>
                {w.w}{w.r && w.r !== w.w && <span className="ml-2 text-sm text-muted">{w.r}</span>}
              </button>
              <span className="flex-1 text-xs text-muted">{w.src ? t('source', { src: srcLabel[w.src] ?? w.src }) : ''}</span>
              <select aria-label={t('pickerLabel')} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm"
                value={w.status} onChange={(e) => void setWordStatus({ w: w.w, id: w.id }, e.target.value as ManualStatus)}>
                <option value="known">{t('sKnown')}</option>
                <option value="learning">{t('sLearning')}</option>
                <option value="ignored">{t('sIgnored')}</option>
              </select>
              <Button variant="ghost" className="!min-h-8 !px-2" onClick={() => void setWordStatus({ w: w.w, id: w.id }, null)}>{t('remove')}</Button>
            </li>
          ))}
        </ul>
      )}
      {list.length > limit && (
        <div className="px-4 pb-4"><Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>{t('more', { n: list.length - limit })}</Button></div>
      )}
    </Card>
  )
}

function ImportBox() {
  const t = useT(S)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<ManualStatus>('known')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const parsed = useMemo(() => parseWordList(text), [text])

  const run = async () => {
    setBusy(true)
    try {
      const n = await importWords(parsed, status, 'import')
      setMsg(n ? t('imported', { n }) : t('importNone'))
      if (n) setText('')
    } finally { setBusy(false) }
  }

  const download = async () => {
    const blob = new Blob([await exportWordsText()], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'hibi-kho-tu.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm text-muted">{t('importHint')}</p>
      <textarea className={`${inputCls} jp min-h-40`} value={text} onChange={(e) => { setText(e.target.value); setMsg('') }}
        placeholder={'食べる\n飲む\n学校'} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{t('importAs')}</span>
        <Segmented<ManualStatus> label={t('importAs')} value={status} onChange={setStatus}
          options={[{ value: 'known', label: t('sKnown') }, { value: 'learning', label: t('sLearning') }, { value: 'ignored', label: t('sIgnored') }]} />
        <Button disabled={busy || !parsed.length} onClick={() => void run()}>{t('importBtn', { n: parsed.length })}</Button>
      </div>
      {msg && <p className="text-sm text-good">{msg}</p>}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button variant="soft" onClick={() => void download()}>{t('exportBtn')}</Button>
        <Button variant="ghost" className="!text-bad" onBlur={() => setConfirmClear(false)}
          onClick={async () => { if (!confirmClear) { setConfirmClear(true); return } await clearKnownWords(); setConfirmClear(false) }}>
          {confirmClear ? t('clearConfirm') : t('clearAll')}
        </Button>
      </div>
    </Card>
  )
}
