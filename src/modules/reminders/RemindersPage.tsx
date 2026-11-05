/**
 * TRANG CÀI ĐẶT NHẮC HỌC (/reminders)
 * Bật/tắt, xin quyền thông báo, chọn giờ và ngày nhắc, chọn nội dung, xem trước và gửi thử.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useLang, useT } from '@/core/i18n'
import { useDbQuery } from '@/core/db'
import { S } from './strings'
import { Row, Toggle } from './components'
import { buildReminder } from './lib/message'
import { getPermission, isDesktopApp, requestPermission, showNotification, type Permission } from './lib/notify'
import { DEFAULT_REMINDER_SETTINGS, MAX_TIMES, nextReminder, saveReminderSettings, useReminderSettings, type ReminderSettings } from './lib/settings'

// Thứ hai đứng đầu như lịch Việt Nam
const WEEK = [1, 2, 3, 4, 5, 6, 0]

function usePermission(): [Permission | undefined, () => Promise<Permission>] {
  const [perm, setPerm] = useState<Permission>()
  useEffect(() => {
    const load = () => { getPermission().then(setPerm) }
    load()
    // Người dùng có thể đổi quyền ở cài đặt trình duyệt rồi quay lại
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])
  const ask = async () => { const p = await requestPermission(); setPerm(p); return p }
  return [perm, ask]
}

export default function RemindersPage() {
  const t = useT(S)
  const s = useReminderSettings() ?? DEFAULT_REMINDER_SETTINGS
  const [perm, ask] = usePermission()
  const [testMsg, setTestMsg] = useState('')
  const desktop = isDesktopApp()
  const save = (patch: Partial<ReminderSettings>) => saveReminderSettings(patch)

  const toggleEnabled = async (on: boolean) => {
    if (on && perm !== 'granted') {
      const p = await ask()
      if (p !== 'granted') return
    }
    await save({ enabled: on })
  }

  const setTime = (i: number, v: string) => save({ times: s.times.map((x, j) => (j === i ? v : x)) })
  const addTime = () => {
    // Giờ mới: sau giờ cuối cùng 2 tiếng (ví dụ 20:00 → 22:00), không trùng giờ đã có
    const last = s.times[s.times.length - 1] ?? '18:00'
    let h = (Number(last.slice(0, 2)) + 2) % 24
    while (s.times.includes(`${String(h).padStart(2, '0')}:00`)) h = (h + 1) % 24
    save({ times: [...s.times, `${String(h).padStart(2, '0')}:00`] })
  }
  const toggleDay = (d: number) =>
    save({ days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() })

  const test = async () => {
    const msg = await buildReminder(s, true)
    const ok = msg ? await showNotification(msg) : false
    setTestMsg(ok ? t('testSent') : t('testFail'))
  }

  const permProblem =
    perm === 'denied' ? t(desktop ? 'permDeniedDesktop' : 'permDenied')
      : perm === 'unsupported' ? t('permUnsupported') : null

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{t('title')}</h1>
      <p className="mb-4 text-muted">{t('intro')}</p>

      <Card>
        <Row label={t('enable')} hint={permProblem ?? (perm === 'granted' ? undefined : t('enableHint'))}>
          <Toggle label={t('enable')} on={s.enabled && perm === 'granted'} onChange={toggleEnabled}
            disabled={perm === 'unsupported' || perm === 'denied'} />
        </Row>
        {perm === 'default' && s.enabled && (
          <div className="py-3"><Button onClick={ask}>{t('allow')}</Button></div>
        )}
        <NextLine s={s} active={s.enabled && perm === 'granted'} />
      </Card>

      <Card className="mt-4">
        <div className="border-b border-border pb-4">
          <p className="font-medium">{t('times')}</p>
          <p className="mb-3 text-sm text-muted">{t('timesHint', { n: MAX_TIMES })}</p>
          <div className="flex flex-wrap items-center gap-2">
            {s.times.map((time, i) => (
              <span key={time} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 py-1 pl-3 pr-1">
                <input type="time" value={time} aria-label={t('timeLabel', { n: i + 1 })}
                  onChange={(e) => e.target.value && setTime(i, e.target.value)}
                  className="bg-transparent text-lg tabular-nums outline-none" />
                {s.times.length > 1 && (
                  <button onClick={() => save({ times: s.times.filter((_, j) => j !== i) })} aria-label={`${t('remove')} ${time}`}
                    className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-text">×</button>
                )}
              </span>
            ))}
            {s.times.length < MAX_TIMES && <Button variant="ghost" onClick={addTime}>{t('addTime')}</Button>}
          </div>
        </div>
        <div className="pt-4">
          <p className="mb-3 font-medium">{t('days')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('days')}>
            {WEEK.map((d) => {
              const on = s.days.includes(d)
              return (
                <button key={d} aria-pressed={on} onClick={() => toggleDay(d)}
                  className={`min-h-11 min-w-12 rounded-xl px-3 font-medium transition ${on ? 'bg-primary text-on-primary' : 'border border-border bg-surface-2 text-muted hover:text-text'}`}>
                  {t(`d${d}` as 'd0')}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-medium">{t('content')}</p>
        <Row label={t('showDue')} hint={t('showDueHint')}>
          <Toggle label={t('showDue')} on={s.showDue} onChange={(showDue) => save({ showDue })} />
        </Row>
        <Row label={t('showStreak')} hint={t('showStreakHint')}>
          <Toggle label={t('showStreak')} on={s.showStreak} onChange={(showStreak) => save({ showStreak })} />
        </Row>
        <Row label={t('skipIfDone')} hint={t('skipIfDoneHint')}>
          <Toggle label={t('skipIfDone')} on={s.skipIfDone} onChange={(skipIfDone) => save({ skipIfDone })} />
        </Row>
        <Preview s={s} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="soft" onClick={test} disabled={perm !== 'granted'}>{t('test')}</Button>
          {testMsg && <p className="text-sm text-muted" role="status">{testMsg}</p>}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-medium">{t('noteTitle')}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>{t(desktop ? 'noteDesktop' : 'noteWeb')}</li>
          <li>{t('noteCatchUp')}</li>
        </ul>
      </Card>
    </div>
  )
}

/** "Lần nhắc tới: hôm nay 20:00". */
function NextLine({ s, active }: { s: ReminderSettings; active: boolean }) {
  const t = useT(S)
  const lang = useLang()
  const next = active ? nextReminder(s) : null
  if (!active) return null
  if (next == null) return <p className="pt-3 text-sm text-muted">{t('nextNone')}</p>
  const d = new Date(next)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const day = d.toDateString() === now.toDateString() ? t('today')
    : d.toDateString() === tomorrow.toDateString() ? t('tomorrow')
      : d.toLocaleDateString(lang, { weekday: 'long' })
  return <p className="pt-3 text-sm text-muted">{t('next', { when: `${day} ${time}` })}</p>
}

/** Khung giả lập thông báo, với số liệu thật của bạn lúc này. */
function Preview({ s }: { s: ReminderSettings }) {
  const t = useT(S)
  const lang = useLang()
  const key = `${s.showDue}${s.showStreak}${lang}`
  const { data: msg } = useDbQuery(() => buildReminder(s, true), [key], ['srsCards', 'srsLogs', 'studyDays'])
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-muted">{t('preview')}</p>
      <div className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3">
        <img src={`${import.meta.env.BASE_URL}icon-512.png`} alt="" className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="font-semibold">{msg?.title ?? '…'}</p>
          <p className="text-sm text-muted">{msg?.body}</p>
        </div>
      </div>
    </div>
  )
}
