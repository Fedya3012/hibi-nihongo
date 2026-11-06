/**
 * TRANG POMODORO (/pomodoro)
 * Đồng hồ vòng tròn, chọn phiên, Bắt đầu / Tạm dừng / Đặt lại / Bỏ qua, cài đặt độ dài và thống kê 7 ngày.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button, ButtonLink } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useLang, useT } from '@/core/i18n'
import { kvGet } from '@/core/db'
import { dayKey, getDayStartHour, DAY_MS } from '@/modules/today/lib/days'
import { Row, Toggle } from '@/modules/reminders/components'
import { requestPermission } from '@/modules/reminders/lib/notify'
import { formatCombo, keysFor, useKeymap } from '@/modules/shortcuts/keymap'
import { fmtClock, phaseMs, remainingNow, usePomodoro, type Phase, type PomodoroSettings } from './store'
import { chime, LOG_KEY, type DayLog } from './ticker'
import { useNow } from './HeaderTimer'
import { S } from './strings'

const R = 88
const CIRC = 2 * Math.PI * R

/** Nhật ký 7 ngày học gần nhất, cũ → mới. */
function useWeek() {
  const [days, setDays] = useState<{ key: string; date: Date; log: DayLog }[]>([])
  useEffect(() => {
    const load = async () => {
      const [log, h] = await Promise.all([kvGet<Record<string, DayLog>>(LOG_KEY, {}), getDayStartHour()])
      const now = Date.now()
      setDays(Array.from({ length: 7 }, (_, i) => {
        const ts = now - (6 - i) * DAY_MS
        const key = dayKey(ts, h)
        return { key, date: new Date(ts - h * 3600_000), log: log[key] ?? { count: 0, minutes: 0 } }
      }))
    }
    void load()
    window.addEventListener('pomodoro:logged', load)
    return () => window.removeEventListener('pomodoro:logged', load)
  }, [])
  return days
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <input
        type="number" inputMode="numeric" min={min} max={max} value={value} aria-label={label}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value))
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="h-10 w-20 rounded-lg border border-border bg-surface px-2 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </Row>
  )
}

/** Hẹn giờ Pomodoro cổ điển (25/5/15), giờ nằm trong tab "Hẹn giờ". */
export function ClassicTimer() {
  const t = useT(S)
  const lang = useLang()
  const s = usePomodoro()
  const custom = useKeymap((k) => k.custom)
  const now = useNow(s.status === 'running')
  const left = remainingNow(s, now)
  const total = phaseMs(s.phase, s.settings)
  const progress = total ? 1 - left / total : 0
  const week = useWeek()
  const [notifyMsg, setNotifyMsg] = useState('')
  const set = (patch: Partial<PomodoroSettings>) => s.setSettings(patch)
  const toggleKey = keysFor('global.pomodoro', custom)[0]

  // Đang chạy thì tiêu đề tab trình duyệt hiện giờ còn lại, nhìn được cả khi đang ở tab khác
  useEffect(() => {
    if (s.status !== 'running') return
    const old = document.title
    document.title = `${fmtClock(left)} · ${t(s.phase)}`
    return () => { document.title = old }
  }, [left, s.status, s.phase, t])

  const toggleNotify = async (on: boolean) => {
    setNotifyMsg('')
    if (on && (await requestPermission()) !== 'granted') { setNotifyMsg(t('notifyDenied')); return }
    set({ notify: on })
  }

  // cycle đếm 1, 2, 3, 4 (lúc nghỉ dài vẫn là 4) rồi về 0
  const doneInRound = s.cycle === 0 ? 0 : ((s.cycle - 1) % s.settings.longEvery) + 1
  const todayLog = week[6]?.log
  const weekCount = week.reduce((n, d) => n + d.log.count, 0)
  const weekMin = week.reduce((n, d) => n + d.log.minutes, 0)
  const maxCount = Math.max(1, ...week.map((d) => d.log.count))
  const dayFmt = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : lang, { weekday: 'short' })

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-muted">{t('intro')}</p>

      <Card className="mt-4 flex flex-col items-center gap-5">
        <Segmented<Phase>
          label={t('phase')}
          value={s.phase}
          onChange={(p) => s.choose(p)}
          options={(['work', 'short', 'long'] as Phase[]).map((p) => ({ value: p, label: t(p) }))}
        />

        <div className="relative grid size-56 place-items-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-[var(--surface-2)]" />
            <circle
              cx="100" cy="100" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
              className={`transition-[stroke-dashoffset] duration-500 ${s.phase === 'work' ? 'stroke-[var(--primary)]' : 'stroke-[var(--text-muted)]'}`}
            />
          </svg>
          <div className="text-center" role="timer" aria-live="off">
            <p className="text-5xl font-bold tabular-nums">{fmtClock(left)}</p>
            <p className="mt-1 text-sm text-muted">{s.status === 'paused' ? t('paused') : t(s.phase)}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={s.toggle} className="min-w-32">
            {s.status === 'running' ? t('pause') : s.status === 'paused' ? t('resume') : t('start')}
          </Button>
          <Button variant="soft" onClick={s.reset} disabled={s.status === 'idle' && left === total}>{t('reset')}</Button>
          <Button variant="ghost" onClick={s.skip}>{t('skip')}</Button>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: s.settings.longEvery }, (_, i) => (
              <span key={i} className={`size-2.5 rounded-full ${i < doneInRound ? 'bg-primary' : 'bg-surface-2 border border-border'}`} />
            ))}
          </div>
          <p className="text-sm text-muted">{t('cycle', { n: doneInRound, m: s.settings.longEvery })}</p>
        </div>

        {toggleKey && (
          <p className="text-center text-sm text-muted">
            {t('keyHint', { key: formatCombo(toggleKey) })}{' '}
            <ButtonLink to="/shortcuts" variant="ghost" className="min-h-0 px-1 py-0 underline">{t('shortcutsLink')}</ButtonLink>
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold">{t('stats')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-muted">{t('today')}</p>
            <p className="mt-1 font-semibold">{t('todayValue', { n: todayLog?.count ?? 0, min: todayLog?.minutes ?? 0 })}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-muted">{t('week')}</p>
            <p className="mt-1 font-semibold">{t('weekValue', { n: weekCount, h: Math.floor(weekMin / 60), min: weekMin % 60 })}</p>
          </div>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2" role="list">
          {week.map((d) => (
            <div key={d.key} role="listitem" aria-label={t('dayBar', { day: dayFmt.format(d.date), n: d.log.count })}
              className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-muted" aria-hidden>{d.log.count || ''}</span>
              <div className="w-full rounded-t-md bg-primary" aria-hidden
                style={{ height: `${(d.log.count / maxCount) * 64}px`, minHeight: d.log.count ? 4 : 0, opacity: d.log.count ? 1 : 0 }} />
              <div className="h-px w-full bg-border" aria-hidden />
              <span className="text-xs text-muted" aria-hidden>{dayFmt.format(d.date)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold">{t('settings')}</h2>
        <NumberField label={t('workMin')} value={s.settings.work} min={1} max={120} onChange={(work) => set({ work })} />
        <NumberField label={t('shortMin')} value={s.settings.short} min={1} max={60} onChange={(short) => set({ short })} />
        <NumberField label={t('longMin')} value={s.settings.long} min={1} max={90} onChange={(long) => set({ long })} />
        <NumberField label={t('longEvery')} value={s.settings.longEvery} min={2} max={10} onChange={(longEvery) => set({ longEvery })} />
        <Row label={t('autoStart')} hint={t('autoStartHint')}>
          <Toggle label={t('autoStart')} on={s.settings.autoStart} onChange={(autoStart) => set({ autoStart })} />
        </Row>
        <Row label={t('sound')} hint={t('soundHint')}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => chime()} className="min-h-9 px-2 text-sm">{t('testSound')}</Button>
            <Toggle label={t('sound')} on={s.settings.sound} onChange={(sound) => set({ sound })} />
          </div>
        </Row>
        <Row label={t('notify')} hint={notifyMsg || t('notifyHint')}>
          <Toggle label={t('notify')} on={s.settings.notify} onChange={(on) => void toggleNotify(on)} />
        </Row>
      </Card>
    </div>
  )
}
