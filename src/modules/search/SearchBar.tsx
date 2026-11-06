/**
 * Nút tìm kiếm trên thanh trên cùng + phím tắt Ctrl+K (Mac: ⌘K) và phím "/".
 * Hộp tìm kiếm thật (SearchPalette) chỉ được tải ở lần mở đầu tiên, để app mở nhanh.
 */
import { lazy, Suspense, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/core/i18n'
import { openSearch, useSearchUi } from './api'
import { S } from './strings'
import { ariaCombo, comboOf, formatCombo, hasModifier, keysFor, matches, useKeymap } from '@/modules/shortcuts/keymap'

const loadPalette = () => import('./SearchPalette')
const SearchPalette = lazy(loadPalette)

/**
 * Hiện trong lúc hộp tìm kiếm đang tải (chỉ lần đầu, rất ngắn). Chữ gõ vào được giữ lại
 * và chuyển sang hộp thật, nên bấm Ctrl+K rồi gõ ngay cũng không mất chữ nào.
 */
function LoadingBox({ placeholder }: { placeholder: string }) {
  const initial = useSearchUi((s) => s.initial)
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 md:items-start md:pt-[10vh]">
      <div className="h-full w-full bg-surface md:h-auto md:max-w-2xl md:rounded-2xl md:border md:border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <span aria-hidden className="text-muted">⌕</span>
          <input autoFocus value={initial} placeholder={placeholder} aria-label={placeholder}
            onChange={(e) => useSearchUi.setState({ initial: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Escape') useSearchUi.setState({ open: false }) }}
            className="min-h-10 flex-1 bg-transparent text-base outline-none" />
        </div>
      </div>
    </div>
  )
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export function SearchBar() {
  const t = useT(S)
  const { open, initial, n } = useSearchUi()
  // Phím hiện trên nút: ưu tiên phím có Ctrl/Alt (vd Ctrl K), không có thì lấy phím đầu tiên
  const searchKeys = keysFor('global.search', useKeymap((s) => s.custom))
  const shownKey = searchKeys.find(hasModifier) ?? searchKeys[0]

  // Tải sẵn hộp tìm kiếm khi máy rảnh, để lần bấm Ctrl+K đầu tiên mở ngay
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => { void loadPalette() })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Phím mở tìm kiếm đổi được ở trang Phím tắt (mặc định Ctrl+K và "/")
      if (!matches(e, 'global.search')) return
      if (hasModifier(comboOf(e))) {
        e.preventDefault()
        if (useSearchUi.getState().open) useSearchUi.setState({ open: false })
        else openSearch(window.getSelection()?.toString().trim().slice(0, 40) ?? '')
      } else if (!isTyping(e.target) && !useSearchUi.getState().open) {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => openSearch()}
        onMouseEnter={() => { void loadPalette() }}
        aria-label={t('label')}
        aria-keyshortcuts={shownKey ? ariaCombo(shownKey) : undefined}
        className="flex min-h-10 w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-surface px-4 text-left text-sm text-muted transition hover:border-primary"
      >
        <span aria-hidden>⌕</span>
        <span className="min-w-0 flex-1 truncate">{t('trigger')}</span>
        {shownKey && <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 text-xs md:inline">{formatCombo(shownKey)}</kbd>}
      </button>
      {/* Gắn thẳng vào <body>: thanh trên có hiệu ứng làm mờ nền, nếu đặt bên trong thì hộp nổi bị kẹt trong thanh đó */}
      {open && createPortal(
        <Suspense fallback={<LoadingBox placeholder={t('placeholder')} />}>
          <SearchPalette key={n} initial={initial} />
        </Suspense>,
        document.body,
      )}
    </>
  )
}
