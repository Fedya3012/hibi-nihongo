/**
 * Khối "Cấp độ" cho màn Hôm nay: chú cáo, cấp, thanh XP và huy hiệu đạt gần nhất. Chỉ đọc dữ liệu.
 */
import { Link } from 'react-router-dom'
import { useLang, useT } from '@/core/i18n'
import { S } from './strings'
import { rankOf } from './lib/level'
import { useAchievements } from './lib/store'
import { fmtNum, rankName, tierKeyTitle } from './lib/text'
import { Bar, FoxRing } from './components'

export default function AchievementsTodayWidget() {
  const t = useT(S)
  const lang = useLang()
  const { data } = useAchievements()
  if (!data) return null
  const { level } = data.progress
  const { rank } = rankOf(level.level)
  const latest = Object.entries(data.state?.at ?? {}).sort((a, b) => b[1] - a[1])[0]
  const latestName = latest ? tierKeyTitle(t, latest[0]) : null
  return (
    <div>
      <p className="text-sm text-muted">{t('widgetTitle')}</p>
      <Link to="/achievements" className="mt-2 flex items-center gap-4 rounded-xl hover:opacity-90" aria-label={t('widgetOpen')}>
        <FoxRing pct={level.pct} size={72} rank={rank} level={level.level} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t('level', { n: level.level })} · {rankName(t, rank)}</p>
          <Bar pct={level.pct} className="mt-2" />
          <p className="mt-1 text-xs text-muted">{t('toNext', { n: fmtNum(level.need - level.into, lang), l: level.level + 1 })}</p>
        </div>
      </Link>
      {latestName && <p className="mt-3 truncate text-sm">🏅 {t('widgetLatest', { name: latestName })}</p>}
      <Link to="/achievements" className="mt-2 inline-block text-sm text-primary hover:underline">{t('widgetOpen')} →</Link>
    </div>
  )
}
