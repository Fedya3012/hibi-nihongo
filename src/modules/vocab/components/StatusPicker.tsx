/**
 * NÚT ĐÁNH DẤU MỨC ĐỘ BIẾT một từ: Đang học · Đã biết · Bỏ qua.
 * Bấm lại nút đang chọn = bỏ đánh dấu (quay về theo thẻ Ôn tập, hoặc "Mới").
 * Dùng trong popup tra từ, trang Từ điển, danh sách từ của anime...
 */
import { useState } from 'react'
import { useT } from '@/core/i18n'
import { manualStatus, srsStatus, useKnowledge } from '../knowledge'
import { setWordStatus } from '../actions'
import { S } from '../strings'
import type { ManualStatus, WordInput } from '../types'

const OPTIONS: { value: ManualStatus; key: 'sLearning' | 'sKnown' | 'sIgnored' }[] = [
  { value: 'learning', key: 'sLearning' },
  { value: 'known', key: 'sKnown' },
  { value: 'ignored', key: 'sIgnored' },
]

export function WordStatusPicker({ word, src = 'popup', className = '' }: { word: WordInput; src?: string; className?: string }) {
  const t = useT(S)
  const k = useKnowledge()
  const [busy, setBusy] = useState(false)
  if (!k) return null
  const manual = manualStatus(k, word)
  const srs = srsStatus(k, word)
  // Chưa tự đánh dấu thì hiện trạng thái theo thẻ Ôn tập (mờ hơn), để biết vì sao chữ có/không có màu
  const shown: ManualStatus | undefined = manual ?? (srs === 'known' ? 'known' : srs === 'learning' ? 'learning' : undefined)

  const pick = async (v: ManualStatus) => {
    setBusy(true)
    try { await setWordStatus(word, manual === v ? null : v, src) } finally { setBusy(false) }
  }

  return (
    <div role="group" aria-label={t('pickerLabel')} className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      {OPTIONS.map((o) => {
        const on = shown === o.value
        const auto = on && !manual
        return (
          <button
            key={o.value}
            type="button"
            disabled={busy}
            aria-pressed={on && !!manual}
            title={manual === o.value ? t('sClear') : undefined}
            onClick={() => void pick(o.value)}
            className={`min-h-8 rounded-lg px-2.5 transition disabled:opacity-60 ${
              on && manual ? 'bg-primary text-on-primary'
                : auto ? 'border border-primary text-text'
                  : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {t(o.key)}{auto ? ` · ${t('fromSrs')}` : ''}
          </button>
        )
      })}
      {!shown && <span className="px-1 text-xs text-muted">{t('sNew')}</span>}
    </div>
  )
}
