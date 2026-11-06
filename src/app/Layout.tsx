/**
 * KHUNG GIAO DIỆN CHUNG
 * - Máy tính (màn rộng): thanh bên trái (Sidebar.tsx, có mục con) + ô tìm kiếm phía trên
 * - Điện thoại (màn hẹp): thanh điều hướng 5 tab ở dưới
 * - Trợ năng: nút "Bỏ qua, tới nội dung chính" (hiện khi bấm Tab), tiêu đề tab trình duyệt theo
 *   trang đang mở, và khi chuyển trang thì con trỏ bàn phím về đầu nội dung chính.
 */
import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { mainNav } from '@/modules/registry'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { SearchBar } from '@/modules/search/SearchBar'
import { PomodoroHeaderButton } from '@/modules/pomodoro/HeaderTimer'
import { ShortcutsHost } from '@/modules/shortcuts/Host'
import { AutoBackupHost } from '@/modules/autobackup/Host'
import { APP } from './strings'
import { Sidebar } from './Sidebar'
import { moduleForPath } from './nav'
import { DueBadge, useDueCount } from './DueBadge'

/** Tiêu đề tab trình duyệt + đưa con trỏ bàn phím về nội dung chính khi đổi trang. */
function useRouteFocus(main: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const mt = useModuleText()
  const prev = useRef(pathname)
  const m = moduleForPath(pathname)
  const title = m ? mt(m).title : ''

  useEffect(() => {
    document.title = title ? `${title} · Hibi Nihongo` : 'Hibi Nihongo'
  }, [title])

  useEffect(() => {
    if (prev.current === pathname) return // lần mở app đầu tiên: giữ nguyên để Tab vào nút "Bỏ qua"
    prev.current = pathname
    // Chỉ khi đổi trang (không phải khi trang tự đổi ?tham số), và không giật màn hình
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [pathname, main])
}

export function Layout() {
  const t = useT(APP)
  const mt = useModuleText()
  const main = useRef<HTMLElement>(null)
  const due = useDueCount()
  useRouteFocus(main)

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus() }} className="skip-link">
        {t('skip')}
      </a>

      <Sidebar />
      <ShortcutsHost />
      <AutoBackupHost />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh trên: tìm kiếm toàn cục (Ctrl+K), xem src/modules/search */}
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg/85 px-3 py-2.5 backdrop-blur md:px-8 md:py-3">
          <Link
            to="/"
            aria-label={t('home')}
            className="jp grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:hidden"
          >
            日
          </Link>
          <SearchBar />
          <PomodoroHeaderButton />
          <NavLink
            to="/settings"
            aria-label={t('settings')}
            className={({ isActive }) =>
              `jp ml-auto grid size-11 shrink-0 place-items-center rounded-xl text-lg outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden ${
                isActive ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2'
              }`
            }
          >
            <span aria-hidden>設</span>
          </NavLink>
        </header>

        <main
          id="main"
          ref={main}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 outline-none md:px-8 md:pb-10"
        >
          <Suspense fallback={<p className="text-muted" role="status">{t('loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav
        aria-label={t('nav')}
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${mainNav.length}, minmax(0, 1fr))` }}
      >
        {mainNav.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            end={m.path === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] outline-none focus-visible:bg-surface-2 ${
                isActive ? 'font-semibold text-text' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`jp relative grid h-7 w-12 place-items-center rounded-full text-base leading-none transition-colors ${
                    isActive ? 'bg-primary-soft text-primary' : ''
                  }`}
                >
                  {m.icon}
                  {m.id === 'review' && due > 0 && (
                    <span className="absolute -top-1 right-0"><DueBadge n={due} compact /></span>
                  )}
                </span>
                <span className="max-w-full truncate">{mt(m).title}</span>
                {m.id === 'review' && due > 0 && <span className="sr-only">{t('due', { n: due })}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
