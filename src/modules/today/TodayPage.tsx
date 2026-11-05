/**
 * MÀN HÌNH HÔM NAY (module today)
 * - Các khối: Tiếp tục (Smart Resume), Ôn nhanh 5 phút, Mục tiêu, Streak, 7 ngày qua, Heatmap, Đã học, Câu của ngày
 * - Bấm "Tùy chỉnh" để kéo thả đổi thứ tự, ẩn/hiện khối (trên điện thoại dùng nút ↑ ↓)
 * - Mở app sau vài ngày nghỉ: tự dùng đóng băng streak nếu còn lượt
 */
import { useEffect, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { autoFreeze, useStudyStats } from './lib/stats'
import { fmtDayLong, fmtMinutes } from './lib/days'
import { getLayout, saveLayout, type TodayLayout } from './lib/store'
import { WIDGETS, WIDGET_BY_ID } from './components/widgets'
import { GoalSettings } from './components/GoalSettings'

const SPAN = { 1: '', 2: 'md:col-span-2', 3: 'md:col-span-3' } as const

/** Bố cục đã lưu + khối mới (thêm sau này) tự chèn vào cuối. */
function resolveLayout(saved: TodayLayout | null | undefined): TodayLayout {
  const known = new Set(WIDGETS.map((w) => w.id))
  const order = (saved?.order ?? []).filter((id) => known.has(id))
  for (const w of WIDGETS) if (!order.includes(w.id)) order.push(w.id)
  return { order, hidden: (saved?.hidden ?? []).filter((id) => known.has(id)) }
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 4) return 'Khuya rồi, học nhẹ thôi nhé'
  if (h < 11) return 'Chào buổi sáng'
  if (h < 13) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function TodayPage() {
  const stats = useStudyStats()
  const { data: saved, loading: layoutLoading } = useDbQuery(getLayout, [], ['kv'])
  const [editing, setEditing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [frozeNotice, setFrozeNotice] = useState(0)
  const [dragId, setDragId] = useState<string | null>(null)
  // Bản nháp khi đang kéo, để thấy thứ tự thay đổi ngay mà chưa cần ghi
  const [draft, setDraft] = useState<TodayLayout | null>(null)

  useEffect(() => {
    autoFreeze().then(setFrozeNotice).catch(() => {})
  }, [])

  const layout = draft ?? resolveLayout(saved)
  const commit = (l: TodayLayout) => { setDraft(null); void saveLayout(l) }

  const move = (id: string, delta: number) => {
    const visible = layout.order.filter((x) => !layout.hidden.includes(x))
    const i = visible.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= visible.length) return
    const order = [...layout.order]
    const a = order.indexOf(visible[i])
    const b = order.indexOf(visible[j])
    ;[order[a], order[b]] = [order[b], order[a]]
    commit({ ...layout, order })
  }
  const hide = (id: string) => commit({ ...layout, hidden: [...layout.hidden, id] })
  const show = (id: string) => commit({ ...layout, hidden: layout.hidden.filter((x) => x !== id) })

  // Kéo thả (chuột): kéo qua khối khác thì đổi chỗ ngay
  const onDragStart = (id: string) => (e: DragEvent) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const onDragOver = (overId: string) => (e: DragEvent) => {
    if (!dragId || dragId === overId) return
    e.preventDefault()
    const order = layout.order.filter((x) => x !== dragId)
    const at = order.indexOf(overId)
    const from = layout.order.indexOf(dragId)
    const to = layout.order.indexOf(overId)
    order.splice(from < to ? at + 1 : at, 0, dragId)
    if (order.join() !== layout.order.join()) setDraft({ ...layout, order })
  }
  const onDragEnd = () => {
    setDragId(null)
    if (draft) commit(draft)
  }

  if (!stats || layoutLoading) return <p className="text-muted">Đang tải…</p>

  const todayMin = stats.days.get(stats.today)?.totalMin ?? 0
  const visible = layout.order.filter((id) => !layout.hidden.includes(id))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{fmtDayLong(stats.today)}</p>
          <h1 className="text-2xl font-bold">{greeting()}</h1>
          <p className="text-sm text-muted">
            Hôm nay bạn đã học <b className="text-text">{fmtMinutes(todayMin)}</b>
            {stats.streak.current > 0 && <> · streak <b className="text-text">{stats.streak.current} ngày</b></>}
            {' · '}<Link to="/me" className="text-primary hover:underline">Tiến độ</Link>
          </p>
        </div>
        <Button variant={editing ? 'primary' : 'soft'} onClick={() => setEditing((v) => !v)}>
          {editing ? 'Xong' : 'Tùy chỉnh'}
        </Button>
      </div>

      {frozeNotice > 0 && (
        <Card className="mb-4 flex items-center justify-between gap-3 border-primary bg-primary-soft">
          <p>❄ Đã dùng <b>{frozeNotice}</b> lần đóng băng để giữ streak <b>{stats.streak.current} ngày</b> của bạn. Học hôm nay để tiếp tục nhé!</p>
          <Button variant="ghost" onClick={() => setFrozeNotice(0)} aria-label="Đóng thông báo">✕</Button>
        </Card>
      )}

      {editing && (
        <p className="mb-3 rounded-xl bg-surface-2 px-4 py-2 text-sm text-muted">
          Kéo thả khối để đổi chỗ (trên điện thoại dùng nút ↑ ↓). Bấm “Ẩn” để giấu khối không cần.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {settingsOpen && <GoalSettings settings={stats.settings} onClose={() => setSettingsOpen(false)} />}
        {visible.map((id, i) => {
          const w = WIDGET_BY_ID.get(id)!
          const W = w.component
          return (
            <Card
              key={id}
              className={`min-w-0 ${SPAN[w.span]} ${editing ? 'cursor-grab border-dashed' : ''} ${dragId === id ? 'opacity-50' : ''}`}
              draggable={editing}
              onDragStart={editing ? onDragStart(id) : undefined}
              onDragOver={editing ? onDragOver(id) : undefined}
              onDrop={editing ? (e) => e.preventDefault() : undefined}
              onDragEnd={editing ? onDragEnd : undefined}
            >
              {editing && (
                <div className="-mt-2 mb-3 flex items-center gap-1 border-b border-border pb-2 text-sm">
                  <span className="mr-auto flex items-center gap-2 font-medium" aria-hidden>
                    <span className="text-muted">⠿</span>{w.title}
                  </span>
                  <button className="min-h-9 min-w-9 rounded-lg hover:bg-surface-2 disabled:opacity-30" onClick={() => move(id, -1)} disabled={i === 0} aria-label={`Đưa ${w.title} lên`}>↑</button>
                  <button className="min-h-9 min-w-9 rounded-lg hover:bg-surface-2 disabled:opacity-30" onClick={() => move(id, 1)} disabled={i === visible.length - 1} aria-label={`Đưa ${w.title} xuống`}>↓</button>
                  <button className="min-h-9 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text" onClick={() => hide(id)}>Ẩn</button>
                </div>
              )}
              <div className={editing ? 'pointer-events-none' : ''}>
                <W stats={stats} onOpenSettings={() => setSettingsOpen(true)} />
              </div>
            </Card>
          )
        })}
      </div>

      {editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {layout.hidden.length > 0 && <span className="text-sm text-muted">Khối đang ẩn:</span>}
          {layout.hidden.map((id) => (
            <Button key={id} variant="soft" onClick={() => show(id)}>+ {WIDGET_BY_ID.get(id)?.title}</Button>
          ))}
          <Button variant="ghost" className="ml-auto" onClick={() => commit(resolveLayout(null))}>Về bố cục mặc định</Button>
        </div>
      )}
    </div>
  )
}
