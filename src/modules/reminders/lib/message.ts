/**
 * NỘI DUNG THÔNG BÁO NHẮC HỌC
 * Lấy số liệu thật lúc nhắc: số thẻ đến hạn (module Ôn tập), chuỗi ngày học và mục tiêu ngày
 * (module Hôm nay), rồi ghép thành 1 tiêu đề + 1–2 câu ngắn theo ngôn ngữ giao diện.
 */
import { currentLang, translate } from '@/core/i18n'
import { getReviewOverview } from '@/modules/review/api'
import { getStudyStats } from '@/modules/today/api'
import type { AppNotification } from './notify'
import type { ReminderSettings } from './settings'
import { S } from '../strings'

/**
 * Trả về thông báo cần hiện, hoặc null nếu không cần nhắc (đã đạt mục tiêu và bật "bỏ qua khi đã học").
 * `force`: luôn trả về nội dung (dùng cho nút "Gửi thử" và phần xem trước).
 */
export async function buildReminder(s: ReminderSettings, force = false, now = Date.now()): Promise<AppNotification | null> {
  const [stats, ov] = await Promise.all([getStudyStats(now), getReviewOverview()])
  const lang = currentLang()
  const t = (k: keyof typeof S.vi, v?: Record<string, number>) => translate(S, lang, k, v)

  const today = stats.days.get(stats.today)
  const goalMet = today?.goalMet ?? false
  if (goalMet && s.skipIfDone && !force) return null

  const { streak, settings: goal } = stats
  // Chuỗi đang có nhưng hôm nay chưa được tính → có nguy cơ mất
  const streakAtRisk = s.showStreak && streak.current > 0 && !streak.todayDone

  const lines: string[] = []
  if (s.showDue && ov.dueNow > 0) {
    lines.push(ov.newAvailable > 0 ? t('bodyDueNew', { n: ov.dueNow, m: ov.newAvailable }) : t('bodyDue', { n: ov.dueNow }))
  } else if (s.showDue && ov.newAvailable > 0) {
    lines.push(t('bodyNew', { m: ov.newAvailable }))
  }
  if (!goalMet) {
    const left = goal.goalType === 'minutes'
      ? Math.max(1, Math.ceil(goal.goalMinutes - (today?.totalMin ?? 0)))
      : Math.max(1, goal.goalCards - (today?.cards ?? 0))
    if (streakAtRisk && goal.streakRule === 'any') lines.push(t('bodyStreakAny'))
    else lines.push(t(goal.goalType === 'minutes' ? 'bodyGoalMin' : 'bodyGoalCards', { n: left }))
  }
  if (!lines.length) lines.push(t('bodyDefault'))

  return {
    title: streakAtRisk ? t('titleStreak', { n: streak.current }) : t('titleDefault'),
    body: lines.join(' '),
    to: ov.dueNow > 0 ? '/review' : '/',
  }
}
