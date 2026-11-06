/**
 * PHÍM TẮT TOÀN APP + BẢNG XEM NHANH (Layout chỉ cần một dòng <ShortcutsHost />)
 * - Nghe phím của nhóm "Toàn app": mở trang (Alt+1…), bật/tắt Pomodoro, mở bảng phím tắt (?).
 *   (Phím mở tìm kiếm do ô tìm kiếm tự nghe, xem src/modules/search/SearchBar.tsx.)
 * - Phím không kèm Ctrl/Alt bị bỏ qua khi đang gõ chữ trong ô nhập, để gõ "?" vẫn ra dấu hỏi.
 * - Bảng xem nhanh hiện nhóm "Toàn app" và nhóm của trang đang mở (Ôn tập, anime, manga).
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ButtonLink, Button } from '@/design/components/Button'
import { useLang, useT } from '@/core/i18n'
import { usePomodoro } from '@/modules/pomodoro/store'
import { ACTIONS, GROUPS, actionFor, comboOf, hasModifier, keysFor, pickLabel, useKeymap, type Group } from './keymap'
import { Kbd } from './Kbd'
import { S } from './strings'

const GO: Record<string, string> = {
  'global.goToday': '/',
  'global.goLearn': '/learn',
  'global.goReview': '/review',
  'global.goImmersion': '/immersion',
  'global.goMe': '/me',
  'global.goDictionary': '/dictionary',
  'global.goPomodoro': '/pomodoro',
  'global.goSettings': '/settings',
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** Nhóm phím của trang đang mở (để bảng xem nhanh hiện đúng phần cần). */
function groupForPath(path: string): Group | null {
  if (path.startsWith('/review')) return 'review'
  if (path.startsWith('/immersion/anime')) return 'anime'
  if (path.startsWith('/immersion/manga')) return 'manga'
  return null
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const t = useT(S)
  const lang = useLang()
  const custom = useKeymap((s) => s.custom)
  const { pathname } = useLocation()
  const here = groupForPath(pathname)
  const box = useRef<HTMLDivElement>(null)
  const groups = GROUPS.filter((g) => g.id === 'global' || g.id === here)

  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="kbd-help-title"
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-card outline-none">
        <div className="flex items-center justify-between gap-2">
          <h2 id="kbd-help-title" className="text-lg font-semibold">{t('helpTitle')}</h2>
          <Button variant="ghost" onClick={onClose} aria-label={t('close')} className="min-h-9 px-2">✕</Button>
        </div>
        {groups.map((g) => (
          <section key={g.id} className="mt-3">
            <h3 className="mb-1 text-sm font-semibold text-muted">{pickLabel(g.label, lang)}</h3>
            <dl className="text-sm">
              {ACTIONS.filter((x) => x.group === g.id).map((d) => {
                const keys = keysFor(d.id, custom)
                if (!keys.length) return null
                return (
                  <div key={d.id} className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
                    <dt>{pickLabel(d.label, lang)}</dt>
                    <dd className="flex shrink-0 flex-wrap justify-end gap-1">{keys.map((k) => <Kbd key={k} combo={k} />)}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
        <div className="mt-4 flex justify-end">
          <ButtonLink to="/shortcuts" variant="soft" onClick={onClose}>{t('helpEdit')}</ButtonLink>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ShortcutsHost() {
  const navigate = useNavigate()
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const id = actionFor(e, 'global')
      if (!id || id === 'global.search') return
      if (!hasModifier(comboOf(e)) && isTyping(e.target)) return
      e.preventDefault()
      if (id === 'global.help') setHelp((h) => !h)
      else if (id === 'global.pomodoro') usePomodoro.getState().toggle()
      else if (GO[id]) navigate(GO[id])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return help ? <HelpDialog onClose={() => setHelp(false)} /> : null
}
