/**
 * CÁC KHỐI (WIDGET) TRÊN MÀN HÌNH HÔM NAY
 * Mỗi khối là một component nhận thống kê chung. Thêm khối mới:
 *   1. viết component ở đây,
 *   2. thêm một dòng vào WIDGETS (cuối file).
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { useReviewOverview } from '@/modules/review/api'
import { getGrammarPoint, getGrammarProgress, grammarPath } from '@/modules/grammar/api'
import { listBooks } from '@/modules/textbook/store'
import { useMangaResume } from '@/modules/immersion/manga/api'
import { useAnimeResume } from '@/modules/immersion/anime/api'
import type { StudyStats } from '../lib/stats'
import { addDays, dayRange, fmtMinutes, parseDay, weekdayShort } from '../lib/days'
import { CATEGORY_SERIES, dailyMinuteRows, heatmapCells } from '../lib/chartData'
import { SENTENCES } from '../data/sentences'
import { BarChart, Heatmap, Legend } from './charts'

export interface WidgetProps { stats: StudyStats; onOpenSettings: () => void }

const Label = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted">{children}</p>

// ---------- Tiếp tục (Smart Resume) ----------

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.round(h / 24)
  return d === 1 ? 'hôm qua' : `${d} ngày trước`
}

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

interface ResumeItem { key: string; icon: string; kind: string; title: string; detail: string; progress?: number; path: string; cta: string; at: number }

/** Giáo trình mở gần nhất (đọc thẳng kho của module Giáo trình, chỉ đọc). */
function useTextbookResume() {
  return useDbQuery(async () => {
    const book = (await listBooks()).find((b) => b.lastOpenedAt && b.lastLesson != null)
    return book ? { id: book.id, title: book.title, lesson: book.lastLesson!, at: book.lastOpenedAt! } : null
  }, [], ['textbooks']).data
}

/** Mẫu ngữ pháp vừa học / luyện gần nhất. */
function useGrammarResume() {
  return useDbQuery(async () => {
    const prog = await getGrammarProgress()
    let best: { id: string; at: number } | null = null
    for (const [id, st] of Object.entries(prog)) {
      const at = Math.max(st.last ?? 0, st.learned ?? 0)
      if (at && (!best || at > best.at)) best = { id, at }
    }
    if (!best) return null
    const p = await getGrammarPoint(best.id)
    return p ? { id: p.id, pattern: p.pattern, meaning: p.meaning, at: best.at } : null
  }, [], ['kv']).data
}

function ResumeWidget() {
  const manga = useMangaResume()
  const anime = useAnimeResume()
  const book = useTextbookResume()
  const grammar = useGrammarResume()
  const ov = useReviewOverview()
  const items: ResumeItem[] = []
  if (book) {
    items.push({
      key: 'textbook', icon: '本', kind: 'Giáo trình', title: book.title,
      detail: `Bài ${book.lesson} · ${ago(book.at)}`,
      path: `/learn/textbook?b=${encodeURIComponent(book.id)}&l=${book.lesson}`, cta: 'Học tiếp', at: book.at,
    })
  }
  if (grammar) {
    items.push({
      key: 'grammar', icon: '文', kind: 'Ngữ pháp', title: grammar.pattern,
      detail: `${grammar.meaning} · ${ago(grammar.at)}`,
      path: grammarPath(grammar.id), cta: 'Xem lại', at: grammar.at,
    })
  }
  if (manga) {
    items.push({
      key: 'manga', icon: '画', kind: 'Manga', title: manga.seriesTitle,
      detail: `${manga.chapterLabel} · trang ${manga.page + 1}/${manga.pageCount} · ${ago(manga.lastReadAt)}`,
      progress: manga.pageCount ? (manga.page + 1) / manga.pageCount : undefined,
      path: manga.path, cta: 'Đọc tiếp', at: manga.lastReadAt,
    })
  }
  if (anime) {
    items.push({
      key: 'anime', icon: '映', kind: 'Anime', title: anime.seriesTitle,
      detail: `${anime.episodeLabel} · ${clock(anime.position)}${anime.duration ? ` / ${clock(anime.duration)}` : ''} · ${ago(anime.lastWatchedAt)}`,
      progress: anime.duration ? anime.position / anime.duration : undefined,
      path: anime.path, cta: 'Xem tiếp', at: anime.lastWatchedAt,
    })
  }
  items.sort((a, b) => b.at - a.at)
  items.splice(3) // tối đa 3 việc dở gần nhất, để khối không quá dài
  if (ov && ov.dueNow > 0) {
    // Thẻ đến hạn luôn được nhắc, đứng sau bài đang dở gần nhất
    items.splice(Math.min(1, items.length), 0, {
      key: 'review', icon: '復', kind: 'Ôn tập', title: `${ov.dueNow} thẻ đến hạn`,
      detail: ov.newAvailable ? `và ${ov.newAvailable} thẻ mới có thể học hôm nay` : 'Ôn ngay để không quên',
      path: '/review', cta: 'Ôn ngay', at: 0,
    })
  }

  return (
    <div>
      <Label>Tiếp tục</Label>
      {items.length === 0 ? (
        <>
          <h2 className="mt-1 text-lg font-semibold">Chưa có bài học dở</h2>
          <p className="mt-1 text-sm text-muted">
            Khi bạn học giáo trình, ngữ pháp, đọc manga hay xem anime, app sẽ đưa bạn về đúng chỗ đó.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/learn/textbook" variant="soft">Học theo giáo trình</ButtonLink>
            <ButtonLink to="/learn/grammar" variant="soft">Ngữ pháp</ButtonLink>
            <ButtonLink to="/immersion/manga" variant="soft">Đọc manga</ButtonLink>
            <ButtonLink to="/immersion/anime" variant="soft">Xem anime</ButtonLink>
          </div>
        </>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0">
              <span className={`jp grid size-11 shrink-0 place-items-center rounded-xl text-xl ${i === 0 ? 'bg-primary text-on-primary' : 'bg-surface-2 text-primary'}`} aria-hidden>{it.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{it.kind}</p>
                <p className={`truncate font-semibold ${i === 0 ? 'text-lg' : ''}`}>{it.title}</p>
                <p className="truncate text-sm text-muted">{it.detail}</p>
                {it.progress !== undefined && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, it.progress * 100)}%` }} />
                  </div>
                )}
              </div>
              <ButtonLink to={it.path} variant={i === 0 ? 'primary' : 'soft'} className="shrink-0" aria-label={`${it.cta}: ${it.title}`}>
                {it.cta}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Ôn nhanh ----------

function QuickWidget() {
  const ov = useReviewOverview()
  return (
    <div className="flex h-full flex-col">
      <Label>Thẻ cần ôn</Label>
      <p className="mt-1 text-3xl font-bold">{ov?.dueNow ?? '–'}</p>
      <p className="text-sm text-muted">
        {ov ? `${ov.reviewedToday} lượt đã ôn hôm nay · ${ov.newAvailable} thẻ mới` : 'Đang tải…'}
      </p>
      <div className="mt-auto pt-4">
        <ButtonLink to="/review?quick=1" className="w-full">Ôn nhanh 5 phút</ButtonLink>
      </div>
    </div>
  )
}

// ---------- Mục tiêu ngày ----------

function GoalWidget({ stats, onOpenSettings }: WidgetProps) {
  const t = stats.days.get(stats.today)
  const s = stats.settings
  const isMin = s.goalType === 'minutes'
  const value = isMin ? Math.floor(t?.totalMin ?? 0) : t?.cards ?? 0
  const target = isMin ? s.goalMinutes : s.goalCards
  const pct = Math.min(1, value / Math.max(1, target))
  const r = 30
  const C = 2 * Math.PI * r
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <Label>Mục tiêu hôm nay</Label>
        <button onClick={onOpenSettings} className="-mt-1 -mr-2 rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-text">Đổi</button>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`Đã đạt ${Math.round(pct * 100)}% mục tiêu`}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={pct >= 1 ? 'var(--good)' : 'var(--primary)'} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 38 38)" />
          <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">{Math.round(pct * 100)}%</text>
        </svg>
        <div>
          <p className="text-2xl font-bold">{value}<span className="text-base font-normal text-muted"> / {target} {isMin ? 'phút' : 'thẻ'}</span></p>
          <p className="text-sm text-muted">
            {pct >= 1 ? '🎉 Đã đạt mục tiêu!' : `Còn ${target - value} ${isMin ? 'phút' : 'thẻ'} nữa`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------- Streak ----------

function StreakWidget({ stats, onOpenSettings }: WidgetProps) {
  const { streak, today } = stats
  const week = dayRange(addDays(today, -6), today)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <Label>Streak</Label>
        <button onClick={onOpenSettings} className="-mt-1 -mr-2 rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-text">Cài đặt</button>
      </div>
      <p className="mt-1 text-3xl font-bold">
        <span className={streak.todayDone ? 'text-primary' : ''}>{streak.current}</span> ngày
      </p>
      <p className="text-sm text-muted">
        {streak.todayDone ? 'Hôm nay đã giữ streak ✓' : streak.current > 0 ? 'Học hôm nay để giữ streak nhé' : 'Học hôm nay để bắt đầu streak'}
      </p>
      <ol className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {week.map((d) => {
          const s = stats.days.get(d)
          const state = s?.active ? 'done' : s?.frozen ? 'frozen' : 'none'
          return (
            <li key={d}>
              <span className={`mx-auto grid size-7 place-items-center rounded-full ${
                state === 'done' ? 'bg-primary text-on-primary' : state === 'frozen' ? 'bg-surface-2 text-text' : 'border border-border'
              } ${d === today ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                title={state === 'done' ? 'Đã học' : state === 'frozen' ? 'Đóng băng' : 'Chưa học'}>
                {state === 'done' ? '✓' : state === 'frozen' ? '❄' : ''}
              </span>
              <span className="mt-1 block">{weekdayShort(d)}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-auto pt-3 text-sm text-muted">
        ❄ Còn {streak.freezesLeft}/{stats.settings.freezesPerMonth} lần đóng băng tháng {parseDay(today).getMonth() + 1} · Dài nhất {streak.best} ngày
      </p>
    </div>
  )
}

// ---------- 7 ngày qua ----------

function WeekWidget({ stats }: WidgetProps) {
  const rows = dailyMinuteRows(stats, 7)
  const total = rows.reduce((a, r) => a + r.values.reduce((x, y) => x + y, 0), 0)
  const used = CATEGORY_SERIES.filter((_, i) => rows.some((r) => r.values[i] > 0))
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>7 ngày qua</Label>
        <p className="text-sm"><b>{fmtMinutes(total)}</b> <span className="text-muted">· TB {fmtMinutes(total / 7)}/ngày</span></p>
      </div>
      <div className="mt-2">
        <BarChart rows={rows} series={CATEGORY_SERIES} unit="phút" height={150} />
      </div>
      {used.length > 0 ? <Legend series={used} /> : <p className="text-xs text-muted">Chưa có giờ học nào trong tuần.</p>}
    </div>
  )
}

// ---------- Heatmap ----------

function HeatmapWidget({ stats }: WidgetProps) {
  // Số tuần vừa khít bề ngang khối (mỗi tuần một cột 15px), tối đa 1 năm
  const [ref, setRef] = useState<HTMLDivElement | null>(null)
  const [weeks, setWeeks] = useState(17)
  useEffect(() => {
    if (!ref) return
    const ro = new ResizeObserver(([e]) => setWeeks(Math.max(8, Math.min(53, Math.floor((e.contentRect.width - 24) / 15)))))
    ro.observe(ref)
    return () => ro.disconnect()
  }, [ref])
  const { cells, monthLabels } = heatmapCells(stats, weeks)
  return (
    <div ref={setRef}>
      <div className="flex items-baseline justify-between">
        <Label>Lịch học {weeks} tuần gần đây</Label>
        <Link to="/me" className="text-sm text-primary hover:underline">Xem tiến độ →</Link>
      </div>
      <div className="mt-2"><Heatmap cells={cells} monthLabels={monthLabels} /></div>
    </div>
  )
}

// ---------- Đã học ----------

function LearnedWidget({ stats }: WidgetProps) {
  const l = stats.learnedTotal
  const t = stats.days.get(stats.today)?.learned
  const items = [
    { label: 'Từ vựng', v: l.vocab, today: t?.vocab },
    { label: 'Kanji', v: l.kanji, today: t?.kanji },
    { label: 'Ngữ pháp', v: l.grammar, today: t?.grammar },
    { label: 'Kana', v: l.kana },
  ]
  return (
    <div>
      <Label>Đã học</Label>
      <dl className="mt-2 grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-xs text-muted">{it.label}</dt>
            <dd className="text-2xl font-bold">
              {it.v}
              {!!it.today && <span className="ml-1 text-sm font-medium text-good">+{it.today}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ---------- Câu của ngày ----------

function SentenceWidget({ stats }: WidgetProps) {
  const idx = Math.floor(parseDay(stats.today).getTime() / 86_400_000)
  const s = SENTENCES[((idx % SENTENCES.length) + SENTENCES.length) % SENTENCES.length]
  return (
    <div>
      <Label>Câu của ngày</Label>
      <p className="jp mt-2 text-xl">
        {s.parts.map(([text, reading], i) => reading ? <ruby key={i}>{text}<rt>{reading}</rt></ruby> : <span key={i}>{text}</span>)}
      </p>
      <p className="mt-1 text-sm text-muted">{s.vi}</p>
    </div>
  )
}

// ---------- Danh sách khối ----------

export interface WidgetDef {
  id: string
  title: string
  /** 1 = một cột, 2 = hai cột, 3 = cả hàng (trên màn rộng). */
  span: 1 | 2 | 3
  component: ComponentType<WidgetProps>
}

export const WIDGETS: WidgetDef[] = [
  { id: 'resume', title: 'Tiếp tục', span: 2, component: ResumeWidget },
  { id: 'streak', title: 'Streak', span: 1, component: StreakWidget },
  { id: 'quick', title: 'Ôn nhanh 5 phút', span: 1, component: QuickWidget },
  { id: 'goal', title: 'Mục tiêu hôm nay', span: 1, component: GoalWidget },
  { id: 'sentence', title: 'Câu của ngày', span: 1, component: SentenceWidget },
  { id: 'week', title: '7 ngày qua', span: 2, component: WeekWidget },
  { id: 'learned', title: 'Đã học', span: 1, component: LearnedWidget },
  { id: 'heatmap', title: 'Lịch học (heatmap)', span: 3, component: HeatmapWidget },
]

export const WIDGET_BY_ID = new Map(WIDGETS.map((w) => [w.id, w]))
