/**
 * Thẻ nhỏ "Sao lưu tự động" đặt trong trang Cài đặt, dẫn sang /autobackup.
 * Để ở module này để trang Cài đặt chỉ cần thêm một dòng <AutoBackupSettingsLink />.
 */
import { Card } from '@/design/components/Card'
import { ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { useAutoBackupSettings } from './lib/settings'

export function AutoBackupSettingsLink() {
  const t = useT(S)
  const s = useAutoBackupSettings()
  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium"><span className="jp mr-2 text-primary" aria-hidden>保</span>{t('linkTitle')}</p>
        <p className="text-sm text-muted">
          {s?.enabled ? t('linkOn', { every: t(`every${s.everyDays}` as 'every1') }) : t('linkOff')}
        </p>
      </div>
      <ButtonLink to="/autobackup" variant="soft">{t('open')}</ButtonLink>
    </Card>
  )
}
