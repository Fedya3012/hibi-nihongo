/**
 * Ô TÌM KIẾM TOÀN CỤC (Ctrl+K): một hộp nổi giữa màn hình, tìm cùng lúc trong mọi nguồn.
 * Nguồn nào xong trước thì hiện trước, nên gõ là thấy kết quả ngay, không phải đợi nguồn chậm.
 * File này chỉ được tải khi mở ô tìm kiếm lần đầu (xem SearchBar.tsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '@/core/i18n'
import { BUILTIN_SOURCES } from './sources'
import { MODULE_SOURCES, closeSearch, runtimeSources } from './api'
import { makeQuery } from './normalize'
import { S } from './strings'
import type { SearchHit, SearchSource } from './types'

const PER_GROUP = 5
const RECENT_KEY = 'hibi-search-recent'

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[] } catch { return [] }
}
function saveRecent(q: string) {
  const list = [q, ...readRecent().filter((x) => x !== q)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* chế độ riêng tư */ }
}

let moduleSourcesPromise: Promise<SearchSource[]> | null = null
function loadModuleSources(): Promise<SearchSource[]> {
  moduleSourcesPromise ??= Promise.allSettled(MODULE_SOURCES.map((m) => m.load())).then((r) =>
    r.flatMap((x) => (x.status === 'fulfilled' ? [x.value.default] : [])))
  return moduleSourcesPromise
}

interface Group { source: SearchSource; hits: SearchHit[] }

export default function SearchPalette({ initial }: { initial: string }) {
  const t = useT(S)
  const lang = useLang()
  const navigate = useNavigate()
  const [text, setText] = useState(initial)
  const [groups, setGroups] = useState<Record<string, Group>>({})
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  // Mục đang chọn lưu theo "nguồn:id" (không theo vị trí), để khi nguồn chậm trả kết quả
  // và danh sách dịch xuống, mục đang chọn không bị nhảy sang mục khác.
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [recent, setRecent] = useState(readRecent)
  const [sources, setSources] = useState<SearchSource[]>(BUILTIN_SOURCES)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Nguồn của module khác (Ngữ pháp, Giáo trình...) tải thêm khi mở
  useEffect(() => {
    void loadModuleSources().then((extra) => setSources([...BUILTIN_SOURCES, ...extra, ...runtimeSources.values()]))
  }, [])

  // Trả lại vị trí con trỏ cho chỗ cũ khi đóng
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = inputRef.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
    return () => prev?.focus?.()
  }, [])

  // Tìm (chờ 120ms sau lần gõ cuối để không tìm từng phím)
  useEffect(() => {
    const q = makeQuery(text)
    setActiveKey(null)
    if (!q.raw) { setGroups({}); setPending(0); setFailed([]); return }
    let alive = true
    const timer = window.setTimeout(() => {
      const run = sources.filter((s) => [...q.raw].length >= (s.minLength ?? 1))
      setPending(run.length)
      setFailed([])
      const next: Record<string, Group> = {}
      for (const source of run) {
        source.search(q, { limit: PER_GROUP, lang })
          .then((hits) => { if (alive) { next[source.id] = { source, hits }; setGroups({ ...next }) } })
          .catch((err: unknown) => {
            console.warn('[search]', source.id, err)
            if (alive) setFailed((f) => [...f, source.label[lang] ?? source.label.vi])
          })
          .finally(() => { if (alive) setPending((n) => n - 1) })
      }
      // Kết quả cũ của nguồn chưa trả lời: xóa ngay để không lẫn với câu mới
      setGroups({})
    }, 120)
    return () => { alive = false; window.clearTimeout(timer) }
  }, [text, sources, lang])

  const ordered = useMemo(
    // Nhóm có kết quả khớp tốt (≥ 80 điểm) lên trước, sau đó theo thứ tự cố định của nguồn.
    // Ví dụ gõ "eat": nhóm Từ vựng (to eat) đứng trước một trang chỉ khớp mờ trong phần mô tả.
    () => Object.values(groups).filter((g) => g.hits.length).sort((a, b) => {
      const strong = (g: Group) => ((g.hits[0].score ?? 100) >= 80 ? 0 : 1)
      return strong(a) - strong(b) || a.source.order - b.source.order
    }),
    [groups],
  )
  const flat = useMemo(() => ordered.flatMap((g) => g.hits.map((h) => ({ g, h, key: `${g.source.id}:${h.id}` }))), [ordered])
  const found = flat.findIndex((x) => x.key === activeKey)
  const active = found >= 0 ? found : 0
  const setActive = (fn: (i: number) => number) => { const x = flat[fn(active)]; if (x) setActiveKey(x.key) }

  // Giữ mục đang chọn trong tầm nhìn
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (h: SearchHit) => {
    const q = text.trim()
    if (q) saveRecent(q)
    closeSearch()
    if (h.to) navigate(h.to)
    else h.run?.()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); pick(flat[active].h) }
  }

  const q = text.trim()
  let index = -1

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 md:items-start md:pt-[10vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeSearch() }}>
      <div role="dialog" aria-modal="true" aria-label={t('label')} onKeyDown={onKey}
        className="flex h-full w-full flex-col overflow-hidden bg-surface shadow-card md:h-auto md:max-h-[75vh] md:max-w-2xl md:rounded-2xl md:border md:border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span aria-hidden className="text-muted">⌕</span>
          <input
            ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={t('placeholder')} aria-label={t('label')}
            role="combobox" aria-expanded={flat.length > 0} aria-controls="hibi-search-list"
            aria-activedescendant={flat[active] ? `hibi-search-${active}` : undefined}
            autoComplete="off" spellCheck={false}
            className="min-h-10 flex-1 bg-transparent text-base outline-none"
          />
          {pending > 0 && q && <span className="text-xs text-muted" aria-live="polite">{t('loading')}</span>}
          <button onClick={closeSearch} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2" aria-label={t('close')}>
            Esc
          </button>
        </div>

        <div ref={listRef} id="hibi-search-list" role="listbox" aria-label={t('label')} className="flex-1 overflow-y-auto p-2">
          {!q && (
            <div className="p-2">
              {recent.length > 0 && (
                <>
                  <div className="mb-1 flex items-center justify-between px-2 text-xs font-semibold text-muted">
                    <span>{t('recent')}</span>
                    <button className="hover:text-text" onClick={() => { try { localStorage.removeItem(RECENT_KEY) } catch { /* bỏ qua */ } setRecent([]) }}>
                      {t('clearRecent')}
                    </button>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2 px-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => setText(r)} className="jp rounded-full bg-surface-2 px-3 py-1 text-sm hover:bg-primary-soft">{r}</button>
                    ))}
                  </div>
                </>
              )}
              <p className="px-2 text-sm text-muted">{t('tips')}</p>
            </div>
          )}

          {ordered.map((g) => (
            <div key={g.source.id} className="mb-2" role="group" aria-label={g.source.label[lang] ?? g.source.label.vi}>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {g.source.label[lang] ?? g.source.label.vi}
              </p>
              {g.hits.map((h) => {
                index++
                const i = index
                const on = i === active
                return (
                  <button key={h.id} id={`hibi-search-${i}`} data-index={i} role="option" aria-selected={on}
                    onMouseMove={() => { if (!on) setActive(() => i) }} onClick={() => pick(h)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${on ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`truncate font-medium ${h.jp ? 'jp text-lg leading-snug' : ''}`}>{h.title}</span>
                        {h.reading && <span className="jp truncate text-sm text-muted">{h.reading}</span>}
                      </span>
                      {h.subtitle && <span className="block truncate text-sm text-muted">{h.subtitle}</span>}
                    </span>
                    {h.badge && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">{h.badge}</span>}
                  </button>
                )
              })}
            </div>
          ))}

          {q && pending === 0 && flat.length === 0 && (
            <div className="p-6 text-center">
              <p className="font-medium">{t('empty', { q })}</p>
              <p className="mt-1 text-sm text-muted">{t('emptyHint')}</p>
            </div>
          )}
          {failed.length > 0 && <p className="px-3 py-2 text-xs text-muted">{t('error', { name: failed.join(', ') })}</p>}
        </div>

        <p className="hidden border-t border-border px-4 py-2 text-xs text-muted md:block">{t('keys')}</p>
      </div>
    </div>
  )
}
