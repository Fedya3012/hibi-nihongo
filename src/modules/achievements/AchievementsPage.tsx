/**
 * TRANG THÀNH TÍCH (/achievements)
 * - Chú cáo + cấp độ + thanh XP, hạng tiếp theo
 * - Huy hiệu vừa đạt, danh sách huy hiệu theo nhóm (lọc: tất cả / đã đạt / sắp đạt)
 * - Bảng "XP đến từ đâu"
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { useLang, useT, type TFunction } from '@/core/i18n'
import { flushStudyTimer } from '@/modules/today/api'
import { S, type Key } from './strings'
import { GROUPS, BADGES, tierKey, type BadgeState } from './lib/badges'
import { XP_RULES, rankOf, type XpPart } from './lib/level'
import { markSeen, syncAchievements, useAchievements, type AchState } from './lib/store'
import { badgeDesc, badgeTitle, fmtDate, fmtNum, rankName, tierKeyTitle, tierLabel } from './lib/text'
import { Bar, FoxRing, Medal, Pill, Tails, TierStars } from './components'

type Filter = 'all' | 'earned' | 'next'

export default function AchievementsPage() {
  const t = useT(S)
  const lang = useLang()
  const { data } = useAchievements()
  // Mốc "đã xem" lúc mở trang: huy hiệu đạt sau mốc này có nhãn "Mới" suốt lần xem này
  const [seenBase, setSeenBase] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let alive = true
    void (async () => {
      await flushStudyTimer() // ghi phần giờ học đang đếm dở để số liệu mới nhất
      const r = await syncAchievements()
      if (!alive) return
      setSeenBase((b) => b ?? r.state.seenAt)
      await markSeen()
    })()
    return () => { alive = false }
  }, [])

  if (!data) return <p className="text-muted">{t('loading')}</p>
  const { progress, state } = data
  const base = seenBase ?? state?.seenAt ?? Number.MAX_SAFE_INTEGER
  const isNew = (k: string) => (state?.at[k] ?? 0) > base

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        <Link to="/me" className="text-sm text-primary hover:underline">{t('back')}</Link>
      </div>

      <Hero t={t} lang={lang} progress={progress} />
      <Recent t={t} lang={lang} state={state} isNew={isNew} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label={t('title')} value={filter} onChange={setFilter}
          options={[
            { value: 'all', label: t('filterAll') },
            { value: 'earned', label: t('filterEarned') },
            { value: 'next', label: t('filterNext') },
          ]}
        />
        <span className="text-sm text-muted">
          {t('badgesCount', { a: progress.badges.filter((b) => b.earned > 0).length, b: BADGES.length })}
        </span>
      </div>

      <BadgeGroups t={t} lang={lang} badges={progress.badges} filter={filter} state={state} isNew={isNew} />
      <XpTable t={t} lang={lang} parts={progress.parts} total={progress.level.xp} />
    </div>
  )
}

type P = { t: TFunction<Key>; lang: ReturnType<typeof useLang> }

function Hero({ t, lang, progress }: P & { progress: NonNullable<ReturnType<typeof useAchievements>['data']>['progress'] }) {
  const { level } = progress
  const { rank, next } = rankOf(level.level)
  return (
    <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <FoxRing pct={level.pct} size={128} rank={rank} level={level.level} />
      <div className="w-full min-w-0 flex-1 space-y-2 text-center sm:text-left">
        <div>
          <p className="text-sm text-muted">{t('level', { n: level.level })}</p>
          <h2 className="text-2xl font-bold">
            {rankName(t, rank)} <span className="jp text-primary">{rank.jp}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Tails n={rank.tails} label={t('tails', { n: rank.tails })} />
          <span className="text-xs text-muted">{t('tails', { n: rank.tails })}</span>
        </div>
        <Bar pct={level.pct} className="h-3" />
        <div className="flex flex-wrap justify-between gap-x-4 text-sm">
          <span>{t('toNext', { n: fmtNum(level.need - level.into, lang), l: level.level + 1 })}</span>
          <span className="text-muted">{t('xpTotal', { n: fmtNum(level.xp, lang) })}</span>
        </div>
        <p className="text-sm text-muted">
          {next ? t('nextRank', { l: next.minLevel, name: `${rankName(t, next)} ${next.jp}` }) : t('maxRank')}
        </p>
      </div>
    </Card>
  )
}

function Recent({ t, lang, state, isNew }: P & { state: AchState | null; isNew: (k: string) => boolean }) {
  const list = useMemo(() => Object.entries(state?.at ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4), [state])
  if (!state) return null
  if (!list.length) return <Card><p className="text-muted">{t('none')}</p></Card>
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('recent')}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {list.map(([k, at]) => {
          const b = BADGES.find((x) => x.id === k.split(':')[0])
          if (!b) return null
          return (
            <li key={k} className="flex items-center gap-3">
              <Medal def={b} earned size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{tierKeyTitle(t, k)}</p>
                <p className="text-xs text-muted">
                  {t('earnedOn', { d: fmtDate(at, lang) })} {isNew(k) && <Pill>{t('newBadge')}</Pill>}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function BadgeGroups({ t, lang, badges, filter, state, isNew }: P & {
  badges: BadgeState[]; filter: Filter; state: AchState | null; isNew: (k: string) => boolean
}) {
  const shown = badges.filter((b) =>
    filter === 'all' ? true : filter === 'earned' ? b.earned > 0 : b.next !== undefined && b.pct >= 0.5)
  if (filter === 'next') shown.sort((a, b) => b.pct - a.pct)
  if (!shown.length) return <Card><p className="text-muted">{t('none')}</p></Card>
  const groups = filter === 'next' ? [null] : GROUPS
  return (
    <>
      {groups.map((g) => {
        const list = g ? shown.filter((b) => b.def.group === g) : shown
        if (!list.length) return null
        return (
          <section key={g ?? 'next'} aria-label={g ? t(`g_${g}` as Key) : t('filterNext')}>
            {g && <h2 className="mb-2 mt-2 font-semibold">{t(`g_${g}` as Key)}</h2>}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => <BadgeCard key={b.def.id} t={t} lang={lang} b={b} state={state} isNew={isNew} />)}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function BadgeCard({ t, lang, b, state, isNew }: P & { b: BadgeState; state: AchState | null; isNew: (k: string) => boolean }) {
  const { def, earned, next, value, pct } = b
  const lastKey = earned ? tierKey(def.id, earned - 1) : null
  const at = lastKey ? state?.at[lastKey] : undefined
  const fresh = lastKey ? isNew(lastKey) : false
  // Mô tả: mốc tiếp theo nếu còn, không thì mốc cao nhất
  const descIdx = next === undefined ? def.tiers.length - 1 : earned
  return (
    <li>
      <Card className={`flex h-full gap-3 p-4 ${fresh ? 'border-primary' : ''}`}>
        <Medal def={def} earned={earned > 0} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="font-semibold">{badgeTitle(t, def)}</h3>
            <TierStars total={def.tiers.length} earned={earned} />
            {fresh && <Pill>{t('newBadge')}</Pill>}
          </div>
          <p className="text-sm text-muted">{badgeDesc(t, def, descIdx)}</p>
          {next !== undefined ? (
            <div className="pt-1">
              <Bar pct={pct} />
              <p className="mt-1 flex justify-between gap-2 text-xs text-muted">
                <span>{earned ? tierLabel(t, def, earned - 1) : t('locked')}</span>
                <span>{t('progressTo', { v: def.fmt ? (value ? def.fmt(value) : '–') : fmtNum(value, lang), t: def.fmt ? def.fmt(next) : fmtNum(next, lang) })}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-primary">{def.tiers.length > 1 ? t('maxed') : tierLabel(t, def, 0)}</p>
          )}
          {at && <p className="text-xs text-muted">{t('earnedOn', { d: fmtDate(at, lang) })}</p>}
        </div>
      </Card>
    </li>
  )
}

function XpTable({ t, lang, parts, total }: P & { parts: XpPart[]; total: number }) {
  return (
    <Card>
      <h2 className="font-semibold">{t('howXp')}</h2>
      <p className="mb-3 text-sm text-muted">{t('howXpHint')}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">{t('colSource')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('colCount')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('colEach')}</th>
              <th className="py-2 text-right font-medium">{t('colXp')}</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.key} className={`border-b border-border last:border-0 ${p.xp ? '' : 'text-muted'}`}>
                <td className="py-2 pr-3">{t(`x_${p.key}` as Key)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(p.count, lang)}</td>
                <td className="py-2 pr-3 text-right text-xs text-muted">
                  {p.key === 'badges' ? t('x_badgesEach') : `+${XP_RULES[p.key]}`}
                </td>
                <td className="py-2 text-right font-medium tabular-nums">{fmtNum(p.xp, lang)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2" colSpan={3}>{t('total')}</td>
              <td className="py-2 text-right tabular-nums">{fmtNum(total, lang)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
