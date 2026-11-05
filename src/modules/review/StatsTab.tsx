/**
 * TAB THỐNG KÊ ÔN TẬP
 * - Dự báo số thẻ đến hạn 7 / 30 / 90 ngày tới (biểu đồ cột), ngày nặng nhất, thời gian ôn dự kiến
 * - Tỉ lệ nhớ thật (thẻ non / thẻ thuộc chắc) so với tỉ lệ nhớ mong muốn trong Cài đặt
 * - Tỉ lệ các nút Quên / Khó / Được / Dễ, độ thuộc của các thẻ
 * - 10 thẻ khó nhất (bấm để mở và sửa thẻ)
 * Số liệu tính trong stats.ts. Biểu đồ dùng lại BarChart của module Hôm nay.
 */
import { useMemo, useState } from 'react'
import { getAll, useDbQuery } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { BarChart, Legend, type BarRow, type Series } from '@/modules/today/components/charts'
import { DAY } from './fsrs'
import { allCards, getSettings, startOfStudyDay } from './store'
import {
  avgSecondsPerReview, buttonCounts, forecast, hardestCards, maturity, rate, retention, summarizeForecast,
  MATURE_DAYS, type ForecastDay, type RetentionBucket,
} from './stats'
import type { SrsLog } from './types'

type Range = '7' | '30' | '90'
const RANGE_LABEL: Record<Range, string> = { '7': '7 ngày', '30': '30 ngày', '90': '3 tháng' }

const SERIES: Series[] = [
  { key: 'review', label: 'Ôn thẻ đã thuộc', color: 'var(--cat-review)' },
  { key: 'learning', label: 'Đang học / học lại', color: 'var(--cat-kana)' },
]

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const dm = (ts: number) => { const d = new Date(ts); return `${d.getDate()}/${d.getMonth() + 1}` }
const dayTitle = (d: ForecastDay) =>
  d.offset === 0 ? 'Hôm nay' : d.offset === 1 ? 'Ngày mai' : `${WEEKDAY[new Date(d.start).getDay()]}, ${dm(d.start)}`
const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 1000) / 10}%`)

async function loadAll() {
  const [cards, logs, settings] = await Promise.all([allCards(), getAll<SrsLog>('srsLogs'), getSettings()])
  return { cards, logs, settings }
}

export function StatsTab({ onOpenCard, onGoSettings }: { onOpenCard: (front: string) => void; onGoSettings: () => void }) {
  const { data } = useDbQuery(loadAll, [], ['srsCards', 'srsLogs', 'kv'])
  const [deck, setDeck] = useState('')
  const [range, setRange] = useState<Range>('30')

  const stats = useMemo(() => {
    if (!data) return null
    const now = Date.now()
    const dayStart = startOfStudyDay(now, data.settings.dayStartHour)
    const cards = deck ? data.cards.filter((c) => c.deck === deck) : data.cards
    const ids = new Set(cards.map((c) => c.id))
    const logs = deck ? data.logs.filter((l) => ids.has(l.cardId)) : data.logs
    const fc = forecast(cards, dayStart, Number(range))
    const next7 = summarizeForecast(forecast(cards, dayStart, 7))
    const last30 = dayStart - 29 * DAY
    return {
      dayStart,
      fc,
      summary: summarizeForecast(fc),
      next7,
      retention: retention(logs, dayStart),
      buttons: buttonCounts(logs, last30),
      secs: avgSecondsPerReview(logs, last30),
      maturity: maturity(cards),
      cardCount: cards.length,
      hard: hardestCards(cards, logs),
    }
  }, [data, deck, range])

  const decks = useMemo(() => [...new Set(data?.cards.map((c) => c.deck))].sort((a, b) => a.localeCompare(b, 'vi')), [data])

  if (!data || !stats) return <p className="text-muted">Đang tải…</p>
  if (!data.cards.length) return <Card><p className="text-muted">Chưa có thẻ nào. Thêm thẻ rồi ôn vài ngày, thống kê sẽ hiện ở đây.</p></Card>

  const rows: BarRow[] = stats.fc.map((d) => ({
    label: d.offset === 0 ? 'Nay' : d.offset === 1 ? 'Mai' : dm(d.start),
    title: dayTitle(d),
    values: [d.review, d.learning],
  }))
  const target = data.settings.retention
  const month = stats.retention.find((r) => r.key === 'month')!
  const monthRate = rate(month.all)
  const minsPerDay = stats.secs !== null ? (stats.next7.avgPerDay * stats.secs) / 60 : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {decks.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Bộ thẻ:
          <select value={deck} onChange={(e) => setDeck(e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-surface px-2 text-text">
            <option value="">Tất cả</option>
            {decks.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      )}

      {/* ----- Dự báo ----- */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Dự báo số thẻ đến hạn</h2>
            <p className="text-sm text-muted">Chưa tính thẻ mới bạn sẽ học thêm. Thẻ quá hạn tính vào hôm nay.</p>
          </div>
          <Segmented<Range> label="Khoảng dự báo" value={range} onChange={setRange}
            options={(Object.keys(RANGE_LABEL) as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />
        </div>
        <BarChart rows={rows} series={SERIES} unit="thẻ" />
        <div className="mt-2"><Legend series={SERIES} /></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label={`Tổng ${RANGE_LABEL[range]}`} value={stats.summary.total} />
          <Mini label="Trung bình / ngày" value={stats.summary.avgPerDay.toFixed(1)} />
          <Mini label="Ngày nặng nhất"
            value={stats.summary.peak ? stats.summary.peak.review + stats.summary.peak.learning : 0}
            sub={stats.summary.peak ? dayTitle(stats.summary.peak) : 'không có'} />
          <Mini label="Thời gian / ngày (7 ngày tới)"
            value={minsPerDay === null ? '–' : `~${Math.max(1, Math.round(minsPerDay))} phút`}
            sub={stats.secs === null ? 'chưa đủ dữ liệu' : `${stats.secs.toFixed(1)} giây / thẻ`} />
        </div>
        <LoadAdvice avg7={stats.next7.avgPerDay} newPerDay={data.settings.newPerDay} onGoSettings={onGoSettings} />
      </Card>

      {/* ----- Tỉ lệ nhớ thật ----- */}
      <Card>
        <h2 className="font-semibold">Tỉ lệ nhớ thật</h2>
        <p className="mb-3 text-sm text-muted">
          Trong các lần ôn thẻ đã thuộc, bao nhiêu phần trăm bạn không bấm “Quên”. Mục tiêu trong Cài đặt: <b className="text-text">{Math.round(target * 100)}%</b>.
          Thẻ non: khoảng cách ôn dưới {MATURE_DAYS} ngày; thẻ chắc: từ {MATURE_DAYS} ngày trở lên.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1.5 font-normal">Khoảng</th>
                <th className="py-1.5 text-right font-normal">Thẻ non</th>
                <th className="py-1.5 text-right font-normal">Thẻ chắc</th>
                <th className="py-1.5 text-right font-normal">Tất cả</th>
              </tr>
            </thead>
            <tbody>
              {stats.retention.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-2">{r.label}</td>
                  <RateCell b={r.young} target={target} />
                  <RateCell b={r.mature} target={target} />
                  <RateCell b={r.all} target={target} bold />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RetentionAdvice rate={monthRate} count={month.all.total} target={target} />
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {/* ----- Các nút chấm ----- */}
        <Card>
          <h2 className="font-semibold">Các nút đã bấm (30 ngày)</h2>
          <p className="mb-3 text-sm text-muted">{stats.buttons.total} lượt ôn</p>
          <Bars total={stats.buttons.total} items={[
            { label: 'Quên', value: stats.buttons.again, cls: 'bg-bad' },
            { label: 'Khó', value: stats.buttons.hard, cls: 'bg-warn' },
            { label: 'Được', value: stats.buttons.good, cls: 'bg-good' },
            { label: 'Dễ', value: stats.buttons.easy, cls: 'bg-[var(--cat-review)]' },
          ]} />
        </Card>
        {/* ----- Độ thuộc ----- */}
        <Card>
          <h2 className="font-semibold">Độ thuộc của các thẻ</h2>
          <p className="mb-3 text-sm text-muted">{stats.cardCount} thẻ</p>
          <Bars total={stats.cardCount} items={[
            { label: 'Chưa học', value: stats.maturity.fresh, cls: 'bg-surface-2 border border-border' },
            { label: 'Đang học', value: stats.maturity.learning, cls: 'bg-warn' },
            { label: 'Còn non', value: stats.maturity.young, cls: 'bg-good opacity-60' },
            { label: 'Thuộc chắc', value: stats.maturity.mature, cls: 'bg-good' },
            { label: 'Tạm ẩn', value: stats.maturity.suspended, cls: 'bg-muted opacity-40' },
          ]} />
        </Card>
      </div>

      {/* ----- Thẻ khó nhất ----- */}
      <Card className="p-0">
        <div className="px-5 pt-4">
          <h2 className="font-semibold">Thẻ khó nhất</h2>
          <p className="text-sm text-muted">Quên nhiều lần nhất. Bấm vào thẻ để sửa: thêm mẹo nhớ, câu ví dụ hoặc ảnh thường giúp nhớ hơn.</p>
        </div>
        {stats.hard.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Chưa có thẻ nào bị quên. Tuyệt vời!</p>
        ) : (
          <ul className="mt-2">
            {stats.hard.map(({ card, agains, reviews }) => (
              <li key={card.id} className="border-t border-border">
                <button onClick={() => onOpenCard(card.front)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                  <span className="jp min-w-0 shrink-0 text-xl">{card.front}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {card.reading && <span className="jp">{card.reading} · </span>}{card.meaning}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    <span className="text-bad">{card.lapses} lần quên</span><br />
                    Quên {agains}/{reviews} lượt · độ khó {card.difficulty.toFixed(1)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Mini({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

function RateCell({ b, target, bold }: { b: RetentionBucket; target: number; bold?: boolean }) {
  const r = rate(b)
  const low = r !== null && b.total >= 10 && r < target - 0.05
  return (
    <td className={`py-2 text-right ${bold ? 'font-semibold' : ''} ${low ? 'text-bad' : ''}`}>
      {pct(r)}
      <span className="ml-1 text-xs font-normal text-muted">({b.total})</span>
    </td>
  )
}

/** Thanh ngang chia phần trăm, kèm số liệu từng phần. */
function Bars({ total, items }: { total: number; items: { label: string; value: number; cls: string }[] }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {total > 0 && items.map((it) => it.value > 0 && (
          <div key={it.label} className={it.cls} style={{ width: `${(it.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted">
              <span className={`inline-block size-2.5 rounded-sm ${it.cls}`} aria-hidden />{it.label}
            </span>
            <span>{it.value} <span className="text-xs text-muted">{total ? `${Math.round((it.value / total) * 100)}%` : ''}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RetentionAdvice({ rate: r, count, target }: { rate: number | null; count: number; target: number }) {
  if (r === null || count < 20) {
    return <p className="mt-3 text-sm text-muted">Cần khoảng 20 lượt ôn thẻ đã thuộc trong 30 ngày để có nhận xét đáng tin.</p>
  }
  let msg: string
  if (r < target - 0.05) {
    msg = `30 ngày qua bạn nhớ ${pct(r)}, thấp hơn mục tiêu khá nhiều. Thử giảm số thẻ mới mỗi ngày và sửa lại các thẻ khó bên dưới.`
  } else if (r > target + 0.04) {
    msg = `30 ngày qua bạn nhớ ${pct(r)}, cao hơn mục tiêu. Bạn đang nhớ tốt: có thể học thêm thẻ mới mỗi ngày.`
  } else {
    msg = `30 ngày qua bạn nhớ ${pct(r)}, sát với mục tiêu. Lịch ôn đang vừa sức.`
  }
  return <p className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-sm">{msg}</p>
}

function LoadAdvice({ avg7, newPerDay, onGoSettings }: { avg7: number; newPerDay: number; onGoSettings: () => void }) {
  // Mỗi thẻ mới kéo theo vài lượt ôn trong những ngày sau; ước lượng thô ~ 5 lượt/ngày cho mỗi thẻ mới/ngày ở giai đoạn đầu.
  const heavy = avg7 > Math.max(60, newPerDay * 8)
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
      <p className="max-w-lg">
        {heavy
          ? `7 ngày tới trung bình ${Math.round(avg7)} thẻ/ngày, khá nặng. Giảm thẻ mới mỗi ngày (đang là ${newPerDay}) để lịch nhẹ dần.`
          : `Đang học ${newPerDay} thẻ mới mỗi ngày. Thấy ngày nào quá nặng thì giảm con số này.`}
      </p>
      <Button variant="soft" onClick={onGoSettings}>Đổi số thẻ mới / ngày</Button>
    </div>
  )
}
