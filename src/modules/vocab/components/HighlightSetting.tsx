/**
 * CHỌN CÁCH TÔ MÀU CHỮ (dùng ở trang Kho từ, trang Từ điển, cài đặt trình đọc manga/anime...).
 * Kèm chú thích nhỏ: gạch liền = từ mới, gạch chấm = đang học.
 */
import { useT } from '@/core/i18n'
import { Segmented } from '@/design/components/Segmented'
import { useVocabPrefs, type HighlightMode } from '../prefs'
import { S } from '../strings'

export function HighlightSetting({ legend = true }: { legend?: boolean }) {
  const t = useT(S)
  const mode = useVocabPrefs((s) => s.highlight)
  const set = useVocabPrefs((s) => s.set)
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{t('hlTitle')}</span>
      <Segmented<HighlightMode> label={t('hlTitle')} value={mode} onChange={(v) => set({ highlight: v })}
        options={[{ value: 'all', label: t('hlAll') }, { value: 'new', label: t('hlNew') }, { value: 'off', label: t('hlOff') }]} />
      {legend && mode !== 'off' && (
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          <span><span className="jp underline decoration-primary decoration-2 underline-offset-[0.3em]">単語</span> {t('legendNew')}</span>
          {mode === 'all' && <span><span className="jp underline decoration-primary decoration-dotted decoration-2 underline-offset-[0.3em]">単語</span> {t('legendLearning')}</span>}
          <span><span className="jp">単語</span> {t('legendKnown')}</span>
        </p>
      )}
    </div>
  )
}
