/**
 * TRANG ÔN TẬP (module review)
 * 3 tab: Ôn tập (tổng quan + bắt đầu ôn) · Thẻ (thêm, sửa, tìm) · Cài đặt.
 * Mở thẳng chế độ ôn nhanh: đường dẫn /review?quick=1 (nút "Ôn nhanh 5 phút" ở trang Hôm nay dùng được).
 * Mở tab Thẻ và tìm sẵn: /review?tab=cards&q=食べる (dùng cho tìm kiếm toàn cục Ctrl+K).
 * Ôn riêng các thẻ có nhãn: /review?tags=minna-5,minna-6 (module Giáo trình: ôn một hoặc nhiều bài).
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { buildQueue, QUESTION_LABEL } from './queue'
import { addCards, allCards, getOverview, getSettings, saveSettings } from './store'
import { starterCards } from './starter'
import { Session } from './Session'
import { CardsTab } from './CardsTab'
import { SettingsTab } from './SettingsTab'
import type { QuestionMode, ReviewSettings, SrsCard } from './types'

type Tab = 'study' | 'cards' | 'settings'

interface Running {
  queue: SrsCard[]
  pool: SrsCard[]
  settings: ReviewSettings
  quick: boolean
}

export default function ReviewPage() {
  const [tab, setTab] = useState<Tab>('study')
  const [running, setRunning] = useState<Running | null>(null)
  const [params, setParams] = useSearchParams()
  const [cardQuery, setCardQuery] = useState('')

  const start = async (quick: boolean, deck: string | null = null, tags?: string[]) => {
    const [queue, pool, settings] = await Promise.all([buildQueue({ quick, deck, tags }), allCards(), getSettings()])
    setRunning({ queue, pool, settings, quick })
  }

  // /review?quick=1 → vào thẳng ôn nhanh 5 phút
  // /review?tab=cards&q=… → mở tab Thẻ, ô tìm kiếm điền sẵn
  useEffect(() => {
    const t = params.get('tab')
    const tags = params.get('tags')
    if (params.get('quick')) {
      setParams({}, { replace: true })
      void start(true)
    } else if (tags) {
      setParams({}, { replace: true })
      void start(false, null, tags.split(',').filter(Boolean))
    } else if (t === 'cards' || t === 'settings' || t === 'study') {
      setRunning(null)
      setTab(t)
      if (t === 'cards') setCardQuery(params.get('q') ?? '')
      setParams({}, { replace: true })
    }
  }, [params])

  if (running) {
    return (
      <Session
        initial={running.queue}
        pool={running.pool}
        settings={running.settings}
        quick={running.quick}
        onExit={() => setRunning(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ôn tập</h1>
        <Segmented<Tab> label="Mục" value={tab} onChange={setTab}
          options={[{ value: 'study', label: 'Ôn tập' }, { value: 'cards', label: 'Thẻ' }, { value: 'settings', label: 'Cài đặt' }]} />
      </div>
      {tab === 'study' && <StudyTab onStart={start} onGoCards={() => setTab('cards')} />}
      {tab === 'cards' && <CardsTab initialQuery={cardQuery} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

function StudyTab({ onStart, onGoCards }: { onStart: (quick: boolean, deck?: string | null) => Promise<void>; onGoCards: () => void }) {
  const { data: ov, loading } = useDbQuery(() => getOverview(), [], ['srsCards', 'srsLogs', 'kv'])
  const { data: settings } = useDbQuery(getSettings, [], ['kv'])
  const [adding, setAdding] = useState(false)

  if (loading || !ov) return <p className="text-muted">Đang tải…</p>

  if (ov.decks.length === 0) {
    return (
      <Card className="text-center">
        <p className="jp text-5xl text-primary">復</p>
        <h2 className="mt-3 text-xl font-semibold">Chưa có thẻ nào</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Thêm bộ thẻ mẫu N5 (40 từ vựng, 20 Kanji, 12 mẫu ngữ pháp) để học thử ngay, hoặc tự tạo thẻ của bạn.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button disabled={adding} onClick={async () => { setAdding(true); await addCards(starterCards()); setAdding(false) }}>
            {adding ? 'Đang thêm…' : 'Thêm bộ thẻ mẫu N5'}
          </Button>
          <Button variant="soft" onClick={onGoCards}>Tự tạo thẻ</Button>
        </div>
      </Card>
    )
  }

  const total = ov.dueNow + ov.newAvailable
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-6">
          <Stat label="Đến hạn" value={ov.dueNow} accent />
          <Stat label="Thẻ mới hôm nay" value={ov.newAvailable} />
          <Stat label="Đã ôn hôm nay" value={ov.reviewedToday} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="flex-1" disabled={total === 0} onClick={() => void onStart(false)}>
            {total === 0 ? 'Đã ôn xong hôm nay 🎉' : `Bắt đầu ôn (${total})`}
          </Button>
          <Button variant="soft" className="flex-1" disabled={total === 0} onClick={() => void onStart(true)}>
            ⏱ Ôn nhanh 5 phút
          </Button>
        </div>
        {total === 0 && (
          <p className="mt-3 text-sm text-muted">
            {ov.learningLater > 0 && `${ov.learningLater} thẻ đang học sẽ quay lại sau ít phút nữa. `}
            Ngày mai có khoảng {ov.dueTomorrow} thẻ đến hạn.
          </p>
        )}
        {settings && (
          <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            Dạng câu hỏi:
            <select
              value={settings.questionMode}
              onChange={(e) => void saveSettings({ questionMode: e.target.value as QuestionMode })}
              className="min-h-9 rounded-lg border border-border bg-surface px-2 text-text"
            >
              {(Object.keys(QUESTION_LABEL) as QuestionMode[]).map((q) => (
                <option key={q} value={q}>{QUESTION_LABEL[q]}</option>
              ))}
            </select>
          </label>
        )}
      </Card>

      <Card className="p-0">
        <h2 className="px-5 pt-4 font-semibold">Bộ thẻ</h2>
        <ul>
          {ov.decks.map((d) => (
            <li key={d.deck} className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.deck}</p>
                <p className="text-sm text-muted">
                  {d.total} thẻ · <span className="text-primary">{d.due} đến hạn</span> · {d.fresh} chưa học
                  {d.suspended > 0 && ` · ${d.suspended} tạm ẩn`}
                  {d.buried > 0 && ` · ${d.buried} đang chôn`}
                  {d.leeches > 0 && <span className="text-bad"> · {d.leeches} khó nhớ</span>}
                </p>
              </div>
              <Button variant="soft" disabled={d.due === 0 && (d.fresh === 0 || ov.newAvailable === 0)} onClick={() => void onStart(false, d.deck)}>Ôn</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}
