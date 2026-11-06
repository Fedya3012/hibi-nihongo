/** Cài đặt giao diện: Sáng/Tối, cỡ chữ, furigana, tương phản cao, âm thanh, rung. */
import { useSettings, type ThemeChoice, type FuriganaMode } from '@/core/settings'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { DataPanel } from '@/core/db/DataPanel'
import { coverage, FALLBACK, LANGS, useT, type Lang } from '@/core/i18n'
import { APP } from '@/app/strings'
import { S as SEARCH } from '@/modules/search/strings'
import { SET } from './strings'
import { AccentPicker } from './AccentPicker'
import { ReminderSettingsLink } from '@/modules/reminders/SettingsLink'
import { ShortcutsSettingsLink } from '@/modules/shortcuts/SettingsLink'

/** Các bảng chữ dùng chung, để tính "đã dịch bao nhiêu %". */
const SHARED_TABLES = [SET, APP, SEARCH]

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-primary' : 'bg-surface-2 border border-border'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-surface shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const s = useSettings()
  const t = useT(SET)
  const lang = s.lang ?? 'vi'
  const fallbackName = LANGS.find((l) => l.value === (FALLBACK[lang][1] ?? 'vi'))?.label ?? 'Tiếng Việt'
  const pct = Math.round(coverage(SHARED_TABLES, lang) * 100)
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
      <Card>
        <Row label={t('language')} hint={lang === 'vi' ? undefined : `${t('languageHint', { fallback: fallbackName })} ${t('coverage', { pct })}`}>
          <Segmented<Lang> label={t('language')} value={lang} onChange={(l) => s.set({ lang: l })}
            options={LANGS.map((l) => ({ value: l.value, label: l.label }))} />
        </Row>
        <Row label={t('theme')}>
          <Segmented<ThemeChoice> label={t('theme')} value={s.theme} onChange={(theme) => s.set({ theme })}
            options={[{ value: 'system', label: t('themeSystem') }, { value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]} />
        </Row>
        <div className="border-b border-border py-4">
          <p className="font-medium">{t('accent')}</p>
          <p className="mb-3 text-sm text-muted">{t('accentHint')}</p>
          <AccentPicker />
        </div>
        <Row label={t('fontSize')} hint={`${Math.round(s.fontScale * 100)}%`}>
          <input type="range" min={0.8} max={2} step={0.1} value={s.fontScale} aria-label={t('fontSize')}
            onChange={(e) => s.set({ fontScale: Number(e.target.value) })} className="w-48 accent-[var(--primary)]" />
        </Row>
        <Row label={t('furigana')} hint={t('furiganaHint')}>
          <Segmented<FuriganaMode> label={t('furigana')} value={s.furigana} onChange={(furigana) => s.set({ furigana })}
            options={[{ value: 'on', label: t('furiganaOn') }, { value: 'unknown-only', label: t('furiganaUnknown') }, { value: 'off', label: t('furiganaOff') }]} />
        </Row>
        <Row label={t('contrast')}><Toggle label={t('contrast')} on={s.highContrast} onChange={(highContrast) => s.set({ highContrast })} /></Row>
        <Row label={t('vertical')}><Toggle label={t('vertical')} on={s.verticalText} onChange={(verticalText) => s.set({ verticalText })} /></Row>
        <Row label={t('sound')}><Toggle label={t('sound')} on={s.sound} onChange={(sound) => s.set({ sound })} /></Row>
        <Row label={t('haptics')}><Toggle label={t('haptics')} on={s.haptics} onChange={(haptics) => s.set({ haptics })} /></Row>
      </Card>
      <ReminderSettingsLink />
      <ShortcutsSettingsLink />
      <DataPanel />
      <p className="jp mt-6 text-center text-muted">
        {t('preview')} <ruby>日本語<rt>にほんご</rt></ruby>を<ruby>毎日<rt>まいにち</rt></ruby><ruby>勉強<rt>べんきょう</rt></ruby>します。
      </p>
    </div>
  )
}
