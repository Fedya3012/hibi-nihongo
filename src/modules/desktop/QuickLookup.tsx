/**
 * CỬA SỔ TRA NHANH (bản Windows): cửa sổ nhỏ luôn nằm trên cùng, hiện cạnh chuột khi bấm phím tắt.
 * Tra chữ vừa sao chép: một từ thì hiện các nghĩa; cả câu thì hiện câu (bấm từng từ để tra)
 * và từ đầu câu. Mỗi từ có nút "+ Thêm vào Ôn tập" (của module Từ điển).
 *
 * Cửa sổ này dùng chung dữ liệu với cửa sổ chính (cùng IndexedDB), nên không phải tải từ điển lại.
 * Gốc của cửa sổ: src/main.tsx gọi <QuickLookupRoot /> thay cho <App /> khi isLookupWindow().
 */
import { useEffect, useRef, useState } from 'react'
import { useApplySettings } from '@/core/useApplySettings'
import { useT } from '@/core/i18n'
import { Button } from '@/design/components/Button'
import { JapaneseText, PackSetup, WordEntry, hasJapanese, lookupAt, searchWords, useDictPacks, type WordResult } from '@/modules/dictionary'
import { formatCombo } from '@/modules/shortcuts/keymap'
import { S } from './strings'
import { hideLookup, isDesktopApp, onLookupText, openInMain, readClipboard, takeLookupText } from './lib/native'
import { useDesktopPrefs } from './lib/prefs'

/** Câu dài (hoặc có dấu câu) thì tra từ đầu câu thay vì tìm cả chuỗi. */
const isSentence = (s: string) => [...s].length > 8 || /[、。，！？!?\s「」]/.test(s)

export default function QuickLookupRoot() {
  useApplySettings()
  const t = useT(S)
  const packs = useDictPacks()
  const { hotkey, lookupOnCopy } = useDesktopPrefs()
  const [text, setText] = useState('')
  const [results, setResults] = useState<WordResult[] | null>(null)
  const lastClip = useRef<string | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { document.title = `${t('qlTitle')} · Hibi Nihongo` }, [t])

  // Chữ từ phím tắt: lần đầu lấy chữ đang chờ, các lần sau nghe sự kiện
  useEffect(() => {
    if (!isDesktopApp()) return
    const take = (s: string | null) => { if (s != null) { lastClip.current = s; setText(s) } }
    takeLookupText().then(take, () => {})
    let un: (() => void) | undefined
    let alive = true
    onLookupText(take).then((f) => { if (alive) un = f; else f() })
    return () => { alive = false; un?.() }
  }, [])

  // Đang mở cửa sổ mà sao chép chữ tiếng Nhật mới thì tự tra
  useEffect(() => {
    if (!isDesktopApp() || !lookupOnCopy) return
    const id = setInterval(() => {
      if (document.hidden) return
      readClipboard().then((s) => {
        if (s === lastClip.current) return
        lastClip.current = s
        if (s && hasJapanese(s)) setText(s)
      }, () => {})
    }, 800)
    return () => clearInterval(id)
  }, [lookupOnCopy])

  // Esc để ẩn cửa sổ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"]')) return // đang mở popup tra từ thì Esc đóng popup trước
      if (isDesktopApp()) void hideLookup()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = text.trim()
  useEffect(() => {
    if (!q || !packs.ready) { setResults(null); return }
    let alive = true
    setResults(null)
    const run = isSentence(q) && hasJapanese(q) ? lookupAt(q, 0) : searchWords(q, 8)
    run.then((r) => { if (alive) setResults(r.slice(0, 8)) }, () => { if (alive) setResults([]) })
    return () => { alive = false }
  }, [q, packs.ready])

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="sticky top-0 z-10 flex items-start gap-2 border-b border-border bg-bg/95 p-2 backdrop-blur">
        <textarea
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('qlPlaceholder')}
          aria-label={t('qlPlaceholder')}
          rows={Math.min(3, Math.max(1, Math.ceil([...text].length / 22)))}
          className="jp min-h-10 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <Button variant="ghost" className="min-h-10 px-3" aria-label={t('qlClose')} title={t('qlClose')} onClick={() => isDesktopApp() && void hideLookup()}>✕</Button>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto p-3">
        {!packs.ready && <PackSetup compact />}
        {!q && <p className="py-8 text-center text-sm text-muted">{t('qlEmpty', { key: formatCombo(hotkey) })}</p>}
        {q && isSentence(q) && hasJapanese(q) && (
          <section className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 text-xs text-muted">{t('qlSentence')}</p>
            <JapaneseText text={q} furigana className="text-lg leading-loose" />
          </section>
        )}
        {q && packs.ready && results === null && <p className="text-sm text-muted" role="status">…</p>}
        {q && results?.length === 0 && <p className="text-sm text-muted">{t('qlNoResult')}</p>}
        {results?.map((r, i) => (
          <div key={r.id} className={i ? 'border-t border-border pt-3' : ''}>
            <WordEntry r={r} compact showKanji={i === 0} showExamples={i === 0} />
          </div>
        ))}
      </main>

      {q && isDesktopApp() && (
        <footer className="border-t border-border p-2">
          <Button variant="soft" className="w-full min-h-9 text-sm" onClick={() => void openInMain(`/dictionary?q=${encodeURIComponent(q)}`)}>
            {t('qlOpen')}
          </Button>
        </footer>
      )}
    </div>
  )
}
