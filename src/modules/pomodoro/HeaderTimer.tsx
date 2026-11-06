/**
 * Nút Pomodoro nhỏ trên thanh trên cùng (Layout chỉ cần một dòng <PomodoroHeaderButton />).
 * - Chưa chạy: chỉ một biểu tượng, bấm mở trang /pomodoro.
 * - Đang chạy / tạm dừng: hiện thời gian còn lại, màu theo phiên (tập trung hay nghỉ).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/core/i18n'
import { fmtClock, remainingNow, usePomodoro } from './store'
import { S } from './strings'

/** Vẽ lại mỗi giây khi `on` (để đồng hồ nhảy số). */
export function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [on])
  return now
}

export function PomodoroHeaderButton() {
  const t = useT(S)
  const s = usePomodoro()
  const active = s.status !== 'idle'
  const now = useNow(s.status === 'running')
  const time = fmtClock(remainingNow(s, now))
  const work = s.phase === 'work'

  return (
    <Link
      to="/pomodoro"
      aria-label={active ? t('headerLabel', { phase: t(s.phase), time }) : t('headerIdle')}
      title={active ? undefined : t('headerIdle')}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary md:ml-auto ${
        active
          ? work ? 'bg-primary-soft font-semibold text-text' : 'border border-border bg-surface font-semibold text-text'
          : 'text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      <span aria-hidden className={`jp text-base ${active && work ? 'text-primary' : ''}`}>{work ? '集' : '休'}</span>
      {active && (
        <span className={`tabular-nums ${s.status === 'paused' ? 'opacity-60' : ''}`} aria-hidden>
          {time}{s.status === 'paused' ? ' ⏸' : ''}
        </span>
      )}
    </Link>
  )
}
