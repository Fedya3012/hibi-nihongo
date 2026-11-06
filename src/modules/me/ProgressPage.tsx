/**
 * TRANG TIẾN ĐỘ (module me, tab "Tôi")
 * - Số liệu tổng: streak, tổng giờ học, số ngày học, từ vựng / kanji / ngữ pháp / kana đã học
 * - Biểu đồ theo thời gian: phút học (chia theo hoạt động), số thẻ ôn, tích lũy đã học
 * - Heatmap cả năm, tóm tắt ngày/tuần/tháng (sao chép / tải Markdown), lịch sử từng ngày
 * Dữ liệu lấy từ module Hôm nay (src/modules/today/lib/stats.ts).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useStudyStats, type StudyStats } from '@/modules/today/lib/stats'
import { flush } from '@/modules/today/lib/tracker'
import { CATEGORIES, CATEGORY_LABEL, catColor } from '@/modules/today/lib/categories'
import { addDays, dayRange, fmtClock, fmtDayLong, fmtDayShort, fmtMinutes } from '@/modules/today/lib/days'
import { CATEGORY_SERIES, dailyMinuteRows, heatmapCells, weeklyCardRows, weeklyMinuteRows } from '@/modules/today/lib/chartData'
import { BarChart, Heatmap, Legend, LineChart, type Series } from '@/modules/today/components/charts'
import { compareText, fileName, shiftAnchor, summarize, toMarkdown, type PeriodKind } from './summary'

type Range = '7' | '30' | '90' | '365'
const RANGE_LABEL: Record<Range, string> = { '7': '7 ngày', '30': '30 ngày', '90': '3 tháng', '365': '1 năm' }

export default function ProgressPage() {
  const stats = useStudyStats()
  // Ghi ngay phần giờ học đang đếm dở để số liệu mới nhất
  useEffect(() => { void flush() }, [])
  if (!stats) return <p className="text-muted">Đang tải…</p>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Tiến độ</h1>
          <p className="text-sm text-muted">
            {stats.firstDay ? `Bắt đầu học từ ${fmtDayLong(stats.firstDay)}` : 'Chưa có dữ liệu học. Học vài phút rồi quay lại nhé!'}
          </p>
        </div>
        <div className="flex gap-4">
          <Link to="/achievements" className="text-sm text-primary hover:underline">🦊 Thành tích →</Link>
          <Link to="/" className="text-sm text-primary hover:underline">← Hôm nay</Link>
        </div>
      </div>
      <Overview stats={stats} />
      <Charts stats={stats} />
      <Card>
        <h2 className="font-semibold">Lịch học cả năm</h2>
        <p className="mb-3 text-sm text-muted">Mỗi ô là một ngày. Màu đậm hơn = học lâu hơn (so với mục tiêu ngày).</p>
        <YearHeatmap stats={stats} />
      </Card>
      <Summaries stats={stats} />
      <History stats={stats} />
    </div>
  )
}

// ---------- Số liệu tổng ----------

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Card>
  )
}

function Overview({ stats }: { stats: StudyStats }) {
  const { streak, totals, learnedTotal: l } = stats
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Streak hiện tại" value={`${streak.current} ngày`} sub={`Dài nhất ${streak.best} ngày · ❄ còn ${streak.freezesLeft}`} />
      <Tile label="Tổng thời gian học" value={fmtMinutes(totals.minutes)} sub={`${totals.cards.toLocaleString('vi-VN')} lượt ôn thẻ`} />
      <Tile label="Số ngày đã học" value={totals.activeDays} sub={stats.firstDay ? `trên ${dayRange(stats.firstDay, stats.today).length} ngày` : undefined} />
      <Tile label="Kana đã thuộc" value={l.kana} sub="trên 214 chữ" />
      <Tile label="Từ vựng đã học" value={l.vocab} />
      <Tile label="Kanji đã học" value={l.kanji} />
      <Tile label="Ngữ pháp đã học" value={l.grammar} />
      <Tile label="Hôm nay" value={fmtMinutes(stats.days.get(stats.today)?.totalMin ?? 0)} sub={`${stats.days.get(stats.today)?.cards ?? 0} thẻ ôn`} />
    </div>
  )
}

// ---------- Biểu đồ ----------

const LEARNED_SERIES: Series[] = [
  { key: 'vocab', label: 'Từ vựng', color: 'var(--cat-review)' },
  { key: 'kanji', label: 'Kanji', color: 'var(--cat-manga)' },
  { key: 'grammar', label: 'Ngữ pháp', color: 'var(--cat-anime)' },
]

function Charts({ stats }: { stats: StudyStats }) {
  const [range, setRange] = useState<Range>('30')
  const n = Number(range)
  const weekly = n > 90
  const minuteRows = useMemo(
    () => (weekly ? weeklyMinuteRows(stats, 52) : dailyMinuteRows(stats, n)), [stats, n, weekly],
  )
  const days = useMemo(() => dayRange(addDays(stats.today, -(n - 1)), stats.today), [stats, n])
  const cardRows = useMemo(
    () => (weekly
      ? weeklyCardRows(stats, 52)
      : days.map((d) => ({ label: fmtDayShort(d), title: fmtDayLong(d), values: [stats.days.get(d)?.cards ?? 0] }))),
    [stats, days, weekly],
  )
  const learned = useMemo(() => {
    // Tích lũy: số đã học trước khoảng + cộng dồn từng ngày trong khoảng
    const base = { vocab: 0, kanji: 0, grammar: 0 }
    const first = days[0]
    for (const d of stats.days.values()) {
      if (d.day < first) { base.vocab += d.learned.vocab; base.kanji += d.learned.kanji; base.grammar += d.learned.grammar }
    }
    const data: number[][] = [[], [], []]
    const acc = { ...base }
    for (const d of days) {
      const s = stats.days.get(d)
      if (s) { acc.vocab += s.learned.vocab; acc.kanji += s.learned.kanji; acc.grammar += s.learned.grammar }
      data[0].push(acc.vocab); data[1].push(acc.kanji); data[2].push(acc.grammar)
    }
    return data
  }, [stats, days])

  const total = minuteRows.reduce((a, r) => a + r.values.reduce((x, y) => x + y, 0), 0)
  const usedCats = CATEGORY_SERIES.filter((_, i) => minuteRows.some((r) => r.values[i] > 0))
  const totalCards = cardRows.reduce((a, r) => a + r.values[0], 0)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Theo thời gian</h2>
        <Segmented<Range> label="Khoảng thời gian" value={range} onChange={setRange}
          options={(Object.keys(RANGE_LABEL) as Range[]).map((v) => ({ value: v, label: RANGE_LABEL[v] }))} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Thời gian học {weekly ? 'mỗi tuần' : 'mỗi ngày'} (phút)</h3>
            <p className="text-sm text-muted">Tổng <b className="text-text">{fmtMinutes(total)}</b> · TB {fmtMinutes(total / n)}/ngày</p>
          </div>
          <div className="mt-3"><BarChart rows={minuteRows} series={CATEGORY_SERIES} unit="phút" height={200} /></div>
          {usedCats.length ? <Legend series={usedCats} /> : <p className="text-xs text-muted">Chưa có giờ học trong khoảng này.</p>}
        </Card>
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Thẻ đã ôn {weekly ? 'mỗi tuần' : 'mỗi ngày'}</h3>
            <p className="text-sm text-muted">Tổng <b className="text-text">{totalCards.toLocaleString('vi-VN')}</b> lượt</p>
          </div>
          <div className="mt-3">
            <BarChart rows={cardRows} series={[{ key: 'cards', label: 'Thẻ', color: 'var(--cat-review)' }]} unit="thẻ" height={170} />
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold">Tích lũy đã học (từ thẻ Ôn tập)</h3>
          <div className="mt-3">
            <LineChart labels={days.map(fmtDayShort)} titles={days.map(fmtDayLong)} series={LEARNED_SERIES} data={learned} unit="mục" height={170} />
          </div>
          <Legend series={LEARNED_SERIES} />
        </Card>
      </div>
    </>
  )
}

// ---------- Heatmap ----------

function YearHeatmap({ stats }: { stats: StudyStats }) {
  const { cells, monthLabels } = useMemo(() => heatmapCells(stats, 53), [stats])
  return <Heatmap cells={cells} monthLabels={monthLabels} />
}

// ---------- Tóm tắt ----------

function Summaries({ stats }: { stats: StudyStats }) {
  const [kind, setKind] = useState<PeriodKind>('week')
  const [anchor, setAnchor] = useState(stats.today)
  const [copied, setCopied] = useState(false)
  const p = useMemo(() => summarize(stats, kind, anchor), [stats, kind, anchor])
  const md = useMemo(() => toMarkdown(p, stats), [p, stats])
  const [showMd, setShowMd] = useState(false)
  const isCurrent = p.to >= stats.today
  const cmp = compareText(p)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      // Trình duyệt chặn clipboard: dùng cách cũ
      const ta = document.createElement('textarea')
      ta.value = md
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(p)
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const catRows = CATEGORIES.filter((c) => p.byCat[c] >= 0.5).sort((a, b) => p.byCat[b] - p.byCat[a])

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Tóm tắt</h2>
        <Segmented<PeriodKind> label="Loại tóm tắt" value={kind} onChange={(k) => { setKind(k); setAnchor(stats.today) }}
          options={[{ value: 'day', label: 'Ngày' }, { value: 'week', label: 'Tuần' }, { value: 'month', label: 'Tháng' }]} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setAnchor(shiftAnchor(kind, p.from, -1))} aria-label="Kỳ trước">‹</Button>
        <p className="flex-1 text-center font-medium">{p.title}</p>
        <Button variant="ghost" disabled={isCurrent} onClick={() => setAnchor(shiftAnchor(kind, p.from, 1))} aria-label="Kỳ sau">›</Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><dt className="text-xs text-muted">Thời gian học</dt><dd className="text-xl font-bold">{fmtMinutes(p.totalMin)}</dd>{cmp && <dd className="text-xs text-muted">{cmp}</dd>}</div>
        {kind === 'day'
          ? <div><dt className="text-xs text-muted">Mục tiêu</dt><dd className="text-xl font-bold">{p.days[0]?.goalMet ? 'Đạt ✓' : 'Chưa đạt'}</dd></div>
          : <div><dt className="text-xs text-muted">Số ngày học</dt><dd className="text-xl font-bold">{p.activeDays}/{p.elapsedDays}</dd><dd className="text-xs text-muted">đạt mục tiêu {p.goalDays} ngày</dd></div>}
        <div><dt className="text-xs text-muted">Thẻ đã ôn</dt><dd className="text-xl font-bold">{p.cards}</dd>{p.cards > 0 && <dd className="text-xs text-muted">nhớ đúng {Math.round((p.correct / p.cards) * 100)}%</dd>}</div>
        <div><dt className="text-xs text-muted">Học mới</dt><dd className="text-xl font-bold">{p.learned.vocab + p.learned.kanji + p.learned.grammar}</dd><dd className="text-xs text-muted">{p.learned.vocab} từ · {p.learned.kanji} kanji · {p.learned.grammar} NP</dd></div>
      </dl>

      {catRows.length > 0 && (
        <div className="mt-4">
          {/* Thanh tỉ lệ theo hoạt động */}
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {catRows.map((c) => (
              <div key={c} style={{ width: `${(p.byCat[c] / p.totalMin) * 100}%`, background: catColor(c) }} title={CATEGORY_LABEL[c]} />
            ))}
          </div>
          <ul className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {catRows.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-sm" style={{ background: catColor(c) }} />
                <span className="flex-1">{CATEGORY_LABEL[c]}</span>
                <span className="text-muted">{fmtMinutes(p.byCat[c])} · {Math.round((p.byCat[c] / p.totalMin) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={copy}>{copied ? 'Đã sao chép ✓' : 'Sao chép Markdown'}</Button>
        <Button variant="soft" onClick={download}>Tải file .md</Button>
        <Button variant="ghost" onClick={() => setShowMd((v) => !v)}>{showMd ? 'Ẩn bản xem trước' : 'Xem trước'}</Button>
      </div>
      {showMd && (
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-xs">{md}</pre>
      )}
    </Card>
  )
}

// ---------- Lịch sử từng ngày ----------

function History({ stats }: { stats: StudyStats }) {
  const [limit, setLimit] = useState(14)
  const [open, setOpen] = useState<string | null>(stats.today)
  const days = useMemo(
    () => [...stats.days.values()].filter((d) => d.totalMin >= 0.5 || d.cards > 0 || d.frozen).sort((a, b) => b.day.localeCompare(a.day)),
    [stats],
  )
  return (
    <Card>
      <h2 className="font-semibold">Lịch sử từng ngày</h2>
      {days.length === 0 && <p className="mt-2 text-sm text-muted">Chưa có ngày học nào.</p>}
      <ul className="mt-2 divide-y divide-border">
        {days.slice(0, limit).map((d) => {
          const isOpen = open === d.day
          const cats = CATEGORIES.filter((c) => d.seconds[c] >= 30)
          const learnedN = d.learned.vocab + d.learned.kanji + d.learned.grammar
          return (
            <li key={d.day}>
              <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setOpen(isOpen ? null : d.day)} aria-expanded={isOpen}>
                <span className="w-4 text-muted" aria-hidden>{isOpen ? '▾' : '▸'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {fmtDayLong(d.day)} {d.day === stats.today && <span className="text-sm text-primary">· hôm nay</span>}
                  </span>
                  <span className="block text-sm text-muted">
                    {d.frozen && !d.active ? '❄ Đóng băng streak' : `${fmtMinutes(d.totalMin)} · ${d.cards} thẻ${learnedN ? ` · +${learnedN} mục mới` : ''}`}
                    {d.goalMet && ' · 🎯 đạt mục tiêu'}
                  </span>
                </span>
                {/* Thanh nhỏ: tỉ lệ thời gian từng hoạt động */}
                <span className="hidden h-2 w-28 gap-px overflow-hidden rounded-full bg-surface-2 sm:flex" aria-hidden>
                  {cats.map((c) => <span key={c} style={{ width: `${(d.seconds[c] / 60 / d.totalMin) * 100}%`, background: catColor(c) }} />)}
                </span>
              </button>
              {isOpen && (
                <div className="mb-3 ml-7 space-y-2 text-sm">
                  {cats.length > 0 && (
                    <p className="flex flex-wrap gap-x-4 gap-y-1">
                      {cats.map((c) => (
                        <span key={c} className="flex items-center gap-1.5">
                          <span className="inline-block size-2.5 rounded-sm" style={{ background: catColor(c) }} />
                          {CATEGORY_LABEL[c]}: <b>{fmtMinutes(d.seconds[c] / 60)}</b>
                        </span>
                      ))}
                    </p>
                  )}
                  {d.cards > 0 && (
                    <p className="text-muted">
                      Ôn {d.cards} lượt, nhớ đúng {Math.round((d.correct / d.cards) * 100)}% · {d.newCards} thẻ mới
                      {learnedN > 0 && ` (${d.learned.vocab} từ, ${d.learned.kanji} kanji, ${d.learned.grammar} ngữ pháp)`}
                    </p>
                  )}
                  {d.sessions.length > 0 ? (
                    <ol className="space-y-1">
                      {d.sessions.map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted">
                          <span className="inline-block size-2 rounded-full" style={{ background: catColor(s.c) }} />
                          <span className="tabular-nums">{fmtClock(s.s)}–{fmtClock(s.e)}</span>
                          <span className="text-text">{CATEGORY_LABEL[s.c]}</span>
                          <span>({fmtMinutes(Math.max(1, (s.e - s.s) / 60_000))})</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    d.cards > 0 && <p className="text-xs text-muted">Thời gian ngày này được ước tính từ lịch sử ôn thẻ.</p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {days.length > limit && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setLimit((l) => l + 30)}>Xem thêm</Button>
      )}
    </Card>
  )
}
