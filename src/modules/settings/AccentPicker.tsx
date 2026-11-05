/**
 * CHỌN MÀU CHỦ ĐẠO (Cài đặt → Giao diện)
 * - 6 bảng màu có sẵn + "Tự chọn màu". Mỗi ô màu hiện cả bản Sáng (nửa trái) và bản Tối (nửa phải).
 * - Bàn phím: Tab vào nhóm, phím mũi tên để đổi màu (giống nút chọn một trong nhiều).
 * - Màu tự chọn được app tự chỉnh độ đậm nhạt cho dễ đọc (xem src/core/accent.ts).
 */
import { useRef, type KeyboardEvent } from 'react'
import { useSettings } from '@/core/settings'
import { ACCENTS, accentBase, paletteFor, type AccentId } from '@/core/accent'
import { useT } from '@/core/i18n'
import { SET } from './strings'

const IDS: AccentId[] = [...ACCENTS.map((a) => a.id), 'custom']

function Swatch({ base }: { base: string }) {
  const l = paletteFor(base, 'light').primary
  const d = paletteFor(base, 'dark').primary
  return (
    <span aria-hidden className="block size-10 overflow-hidden rounded-full border border-border" style={{ background: `linear-gradient(135deg, ${l} 50%, ${d} 50%)` }} />
  )
}

export function AccentPicker() {
  const t = useT(SET)
  const accent = useSettings((s) => s.accent) ?? 'amber'
  const custom = useSettings((s) => s.customAccent) ?? '#3a8fb7'
  const set = useSettings((s) => s.set)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const choose = (id: AccentId) => set({ accent: id })

  // Phím mũi tên đổi màu và chuyển con trỏ theo (radiogroup chuẩn)
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const j = (i + step + IDS.length) % IDS.length
    choose(IDS[j])
    refs.current[j]?.focus()
  }

  const label = (id: AccentId) => t(`accent_${id}` as `accent_${AccentId}`)

  return (
    <div className="grid w-full gap-4">
      <div role="radiogroup" aria-label={t('accent')} className="flex flex-wrap gap-2">
        {IDS.map((id, i) => {
          const on = accent === id
          return (
            <button
              key={id}
              ref={(el) => { refs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(id)}
              onKeyDown={(e) => onKey(e, i)}
              title={label(id)}
              className={`flex w-24 flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-xs transition ${
                on ? 'border-primary bg-primary-soft font-semibold text-text' : 'border-transparent text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {id === 'custom' ? (
                <span aria-hidden className="relative block size-10 rounded-full border border-border"
                  style={{ background: 'conic-gradient(#d0482f, #c98a1a, #6a8d3a, #3a8fb7, #2f4f8f, #8467b3, #c95b7f, #d0482f)' }}>
                  <span className="absolute inset-2.5 rounded-full border-2 border-surface" style={{ background: custom }} />
                </span>
              ) : (
                <Swatch base={accentBase(id, custom)} />
              )}
              <span className="leading-tight">{label(id)}</span>
            </button>
          )
        })}
      </div>

      {accent === 'custom' && (
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">{t('accentCustomPick')}</span>
          <input
            type="color"
            value={custom}
            onChange={(e) => set({ customAccent: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
          />
          <code className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">{custom.toUpperCase()}</code>
        </label>
      )}

      {/* Xem trước: dùng biến màu thật đang áp lên trang */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm" aria-label={t('accentPreview')}>
        <span className="text-muted">{t('accentPreview')}:</span>
        <span className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 font-medium text-on-primary">{t('accentButton')}</span>
        <span className="inline-flex min-h-9 items-center rounded-lg bg-primary-soft px-3 text-text">{label(accent)}</span>
        <span className="font-medium text-primary underline">{t('accentLink')}</span>
        <span className="jp text-lg text-primary">日本語</span>
      </div>
    </div>
  )
}
