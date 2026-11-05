/**
 * Thẻ nhỏ "Nhắc học hằng ngày" đặt trong trang Cài đặt, dẫn sang /reminders.
 * Để ở module này để trang Cài đặt chỉ cần thêm một dòng <ReminderSettingsLink />.
 */
import { Card } from '@/design/components/Card'
import { ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { useReminderSettings } from './lib/settings'

export function ReminderSettingsLink() {
  const t = useT(S)
  const s = useReminderSettings()
  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium"><span className="jp mr-2 text-primary" aria-hidden>鈴</span>{t('linkTitle')}</p>
        <p className="text-sm text-muted">{s?.enabled ? t('linkOn', { times: s.times.join(', ') }) : t('linkOff')}</p>
      </div>
      <ButtonLink to="/reminders" variant="soft">{t('open')}</ButtonLink>
    </Card>
  )
}
