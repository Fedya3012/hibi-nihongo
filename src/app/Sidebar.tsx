/**
 * THANH BÊN (máy tính)
 * - Mục chính lấy từ registry; mục có module con (Học, Immersion) mở ra danh sách con ngay bên dưới,
 *   nên vào Ngữ pháp, Giáo trình, Manga... chỉ cần một cú bấm.
 * - Ôn tập có huy hiệu số thẻ đến hạn.
 * - Thu gọn / mở nhóm bằng nút mũi tên (nhớ trên máy). Nhóm đang chứa trang mở thì luôn mở.
 * - Cuối thanh: đổi Sáng/Tối nhanh và Cài đặt.
 */
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useT } from '@/core/i18n'
import { useModuleText } from '@/core/i18n/modules'
import { useSettings } from '@/core/settings'
import type { AppModule } from '@/modules/registry'
import { APP } from './strings'
import { navTree } from './nav'
import { DueBadge, useDueCount } from './DueBadge'

const COLLAPSE_KEY = 'hibi-nav-collapsed'

function readCollapsed(): string[] {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]') } catch { return [] }
}

const itemBase =
  'group relative flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[0.95rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary'

function Icon({ char, active, small }: { char: string; active: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`jp grid shrink-0 place-items-center rounded-lg leading-none transition-colors ${
        small ? 'size-7 text-sm' : 'size-8 text-base'
      } ${active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted group-hover:text-text'}`}
    >
      {char}
    </span>
  )
}

function Item({ m, small, exact, due = 0 }: { m: AppModule; small?: boolean; exact?: boolean; due?: number }) {
  const mt = useModuleText()
  return (
    <NavLink
      to={m.path}
      end={exact || m.path === '/'}
      className={({ isActive }) =>
        `${itemBase} ${isActive ? 'bg-primary-soft font-semibold text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon char={m.icon} active={isActive} small={small} />
          <span className="min-w-0 flex-1 truncate">{mt(m).title}</span>
          {m.id === 'review' && <DueBadge n={due} />}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const t = useT(APP)
  const mt = useModuleText()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed)
  const theme = useSettings((s) => s.theme)
  const set = useSettings((s) => s.set)
  const due = useDueCount()

  const toggle = (id: string) => {
    const next = collapsed.includes(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id]
    setCollapsed(next)
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)) } catch { /* chế độ riêng tư */ }
  }

  // Giao diện đang thật sự hiển thị (kể cả khi chọn "Theo hệ thống")
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
  void theme // đọc để thanh bên vẽ lại khi đổi giao diện

  return (
    <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <Link
        to="/"
        aria-label={t('home')}
        className="mx-3 mt-4 mb-4 flex items-center gap-2.5 rounded-xl px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span aria-hidden className="jp grid size-9 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary">日</span>
        <span className="leading-tight">
          <span className="block text-base font-bold">Hibi Nihongo</span>
          <span aria-hidden className="jp block text-xs text-muted">毎日の日本語</span>
        </span>
      </Link>

      <nav aria-label={t('nav')} className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="grid grid-cols-1 gap-0.5">
          {navTree.map(({ module: m, children }) => {
            if (children.length === 0) return <li key={m.id}><Item m={m} due={due} /></li>
            const inside = pathname === m.path || pathname.startsWith(m.path + '/')
            const open = inside || !collapsed.includes(m.id)
            const name = mt(m).title
            const listId = `nav-${m.id}`
            return (
              <li key={m.id} className="mt-2 first:mt-0">
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1"><Item m={m} exact /></div>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    disabled={inside}
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-label={open ? t('collapse', { name }) : t('expand', { name })}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted outline-none hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <svg aria-hidden viewBox="0 0 20 20" className={`size-4 transition-transform ${open ? '' : '-rotate-90'}`}>
                      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {open && (
                  <ul id={listId} className="mt-0.5 ml-[1.3rem] grid grid-cols-1 gap-0.5 border-l border-border pl-1.5">
                    {children.map((c) => <li key={c.id}><Item m={c} small /></li>)}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-1 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${itemBase} ${isActive ? 'bg-primary-soft font-semibold text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`
            }
          >
            {({ isActive }) => (<><Icon char="設" active={isActive} />{t('settings')}</>)}
          </NavLink>
        </div>
        <button
          type="button"
          onClick={() => set({ theme: dark ? 'light' : 'dark' })}
          aria-label={dark ? t('toLight') : t('toDark')}
          title={dark ? t('toLight') : t('toDark')}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted outline-none hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-primary"
        >
          {dark ? (
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  )
}
