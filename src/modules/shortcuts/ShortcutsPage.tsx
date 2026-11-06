/**
 * TRANG ĐỔI PHÍM TẮT (/shortcuts)
 * Mỗi hành động một dòng: các phím đang dùng (bấm để đổi, × để gỡ), nút + để thêm phím, "Về mặc định".
 * Phím trùng nhau (cùng nhóm, hoặc trùng với nhóm Toàn app) được cảnh báo ngay dưới dòng.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useLang, useT } from '@/core/i18n'
import { ACTIONS, GROUPS, comboOf, conflictsOf, formatCombo, keysFor, pickLabel, useKeymap, type ActionDef } from './keymap'
import { S } from './strings'
import { Kbd } from './Kbd'

/** Đang chờ bấm phím mới: cho hành động nào, thay phím thứ mấy (null = thêm mới). */
interface Capture { id: string; index: number | null }


export default function ShortcutsPage() {
  const t = useT(S)
  const lang = useLang()
  const { custom, setKeys, resetAction, resetAll } = useKeymap()
  const [cap, setCap] = useState<Capture | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const capDef = cap ? ACTIONS.find((x) => x.id === cap.id) : undefined

  // Chờ phím mới: bắt phím trước mọi chỗ khác (capture: true) để phím đó không kích hoạt việc gì
  useEffect(() => {
    if (!cap) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) { setCap(null); return }
      const combo = comboOf(e)
      if (!combo || combo === 'Tab' || combo === 'Shift+Tab') return // mới bấm Ctrl/Shift..., chờ phím chính; Tab để dành cho di chuyển
      const keys = [...keysFor(cap.id, custom)]
      if (cap.index == null) { if (!keys.includes(combo)) keys.push(combo) }
      else keys[cap.index] = combo
      setKeys(cap.id, [...new Set(keys)])
      setCap(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [cap, custom, setKeys])

  const removeKey = (id: string, combo: string) => setKeys(id, keysFor(id, custom).filter((k) => k !== combo))
  const label = (d: ActionDef) => pickLabel(d.label, lang)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 max-w-xl text-muted">{t('intro')}</p>
          <p className="mt-1 text-sm text-muted">
            {t('helpHint', { key: formatCombo(keysFor('global.help', custom)[0] ?? '?') })} {t('typingNote')}
          </p>
        </div>
        <Button
          variant="soft"
          disabled={!Object.keys(custom).length}
          onClick={() => { if (confirmAll) { resetAll(); setConfirmAll(false) } else setConfirmAll(true) }}
          onBlur={() => setConfirmAll(false)}
        >
          {confirmAll ? t('resetAllConfirm') : t('resetAll')}
        </Button>
      </div>

      {GROUPS.map((g) => (
        <Card key={g.id} className="mt-4 p-0">
          <h2 className="border-b border-border px-5 py-3 font-semibold">{pickLabel(g.label, lang)}</h2>
          <ul>
            {ACTIONS.filter((x) => x.group === g.id).map((d) => {
              const keys = keysFor(d.id, custom)
              const changed = d.id in custom
              const clashes = [...new Set(keys.flatMap((k) => conflictsOf(d.id, k, custom)).map(label))]
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-2.5 last:border-b-0">
                  <div className="min-w-40 flex-1">
                    <p className="text-sm">
                      {label(d)}
                      {changed && <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs">{t('changed')}</span>}
                    </p>
                    {clashes.length > 0 && <p className="text-xs text-[var(--warn)]" role="status">⚠ {t('conflict', { list: clashes.join(', ') })}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {keys.length === 0 && <span className="text-xs text-muted">{t('none')}</span>}
                    {keys.map((k, i) => (
                      <span key={k} className="inline-flex items-center rounded-lg border border-border">
                        <button type="button" onClick={() => setCap({ id: d.id, index: i })} aria-label={t('change', { key: formatCombo(k) })}
                          className="rounded-l-lg px-1 py-1 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
                          <Kbd combo={k} className="border-0 bg-transparent" />
                        </button>
                        <button type="button" onClick={() => removeKey(d.id, k)} aria-label={t('remove', { key: formatCombo(k) })}
                          className="rounded-r-lg border-l border-border px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-primary">
                          ×
                        </button>
                      </span>
                    ))}
                    <button type="button" onClick={() => setCap({ id: d.id, index: null })} aria-label={`${t('add')}: ${label(d)}`} title={t('add')}
                      className="grid size-8 place-items-center rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-text focus-visible:outline-2 focus-visible:outline-primary">
                      +
                    </button>
                    <button type="button" onClick={() => resetAction(d.id)} disabled={!changed}
                      className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text disabled:invisible">
                      {t('reset')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {g.id === 'review' && <p className="border-t border-border px-5 py-2 text-xs text-muted">{t('choiceNote')}</p>}
        </Card>
      ))}

      {cap && capDef && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cap-title">
          <Card className="w-full max-w-sm text-center">
            <p id="cap-title" className="font-semibold">{t('capture', { action: label(capDef) })}</p>
            <p className="mt-2 text-sm text-muted">{t('captureHint')}</p>
            <div className="mt-4 text-3xl" aria-hidden>⌨</div>
            <Button variant="ghost" className="mt-3" onClick={() => setCap(null)}>{t('cancel')}</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
