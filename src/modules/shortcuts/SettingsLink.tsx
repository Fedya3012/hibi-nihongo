/**
 * Thẻ nhỏ "Phím tắt & Pomodoro" đặt trong trang Cài đặt, dẫn sang /shortcuts và /pomodoro.
 * Để ở module này để trang Cài đặt chỉ cần thêm một dòng <ShortcutsSettingsLink />.
 */
import { Card } from '@/design/components/Card'
import { ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'

export function ShortcutsSettingsLink() {
  const t = useT(S)
  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium"><span className="jp mr-2 text-primary" aria-hidden>鍵</span>{t('cardTitle')}</p>
        <p className="text-sm text-muted">{t('cardText')}</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink to="/shortcuts" variant="soft">{t('openShortcuts')}</ButtonLink>
        <ButtonLink to="/pomodoro" variant="soft">{t('openPomodoro')}</ButtonLink>
      </div>
    </Card>
  )
}
