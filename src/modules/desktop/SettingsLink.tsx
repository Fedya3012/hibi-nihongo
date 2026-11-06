/** Thẻ nhỏ "Bản Windows" trong trang Cài đặt, dẫn sang /desktop. */
import { Card } from '@/design/components/Card'
import { ButtonLink } from '@/design/components/Button'
import { useT } from '@/core/i18n'
import { formatCombo } from '@/modules/shortcuts/keymap'
import { S } from './strings'
import { isDesktopApp } from './lib/native'
import { useDesktopPrefs } from './lib/prefs'

export function DesktopSettingsLink() {
  const t = useT(S)
  const hotkey = useDesktopPrefs((s) => s.hotkey)
  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium"><span className="jp mr-2 text-primary" aria-hidden>窓</span>{t('title')}</p>
        <p className="text-sm text-muted">{isDesktopApp() ? t('linkDesktop', { key: formatCombo(hotkey) }) : t('linkWeb')}</p>
      </div>
      <ButtonLink to="/desktop" variant="soft">{t('open')}</ButtonLink>
    </Card>
  )
}
