/**
 * KHUNG GIAO DIỆN CHUNG
 * - Máy tính (màn rộng): thanh bên trái + ô tìm kiếm phía trên
 * - Điện thoại (màn hẹp): thanh điều hướng 5 tab ở dưới
 */
import { Suspense } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { mainNav } from '@/modules/registry'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { SearchBar } from '@/modules/search/SearchBar'
import { APP } from './strings'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
    isActive ? 'bg-primary-soft text-text font-semibold' : 'text-muted hover:bg-surface-2 hover:text-text'
  }`

export function Layout() {
  const t = useT(APP)
  const mt = useModuleText()
  return (
    <div className="min-h-dvh md:flex">
      {/* Thanh bên (máy tính) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-3">
          <span className="jp grid size-9 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary">日</span>
          <span className="text-lg font-bold">Hibi Nihongo</span>
        </Link>
        {mainNav.map((m) => (
          <NavLink key={m.id} to={m.path} end={m.path === '/'} className={navClass}>
            <span className="jp w-5 text-center" aria-hidden>{m.icon}</span>
            {mt(m).title}
          </NavLink>
        ))}
        <div className="mt-auto">
          <NavLink to="/settings" className={navClass}>
            <span className="jp w-5 text-center" aria-hidden>設</span>{t('settings')}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh trên: tìm kiếm toàn cục (Ctrl+K), xem src/modules/search */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur md:px-8">
          <span className="jp font-bold md:hidden">Hibi</span>
          <SearchBar />
          <Link to="/settings" className="ml-auto text-muted md:hidden" aria-label={t('settings')}>設</Link>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <Suspense fallback={<p className="text-muted">{t('loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav aria-label={t('nav')} className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {mainNav.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            end={m.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-primary font-semibold' : 'text-muted'}`
            }
          >
            <span className="jp text-lg leading-none" aria-hidden>{m.icon}</span>
            {mt(m).title}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
