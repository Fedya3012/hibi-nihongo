/**
 * CÀI ĐẶT "LỊCH ÔN THÔNG MINH" (trong tab Cài đặt của Ôn tập)
 *  - Tối ưu FSRS theo lịch sử ôn của bạn (optimizer.ts, chạy trong optimizer.worker.ts)
 *  - Dàn đều thẻ mỗi ngày và ngày học nhẹ (load.ts)
 */
import { useState } from 'react'
import { getAll } from '@/core/db'
import { Button } from '@/design/components/Button'
import { validWeights, DEFAULT_W } from './fsrs'
import { MIN_REVIEWS, optimize, prepare, type OptimizeResult } from './optimizer'
import { saveSettings } from './store'
import type { EasyDay, ReviewSettings, SrsLog } from './types'

type Run =
  | { phase: 'idle' }
  | { phase: 'running'; progress: number }
  | { phase: 'few'; reviews: number }
  | { phase: 'done'; result: OptimizeResult }
  | { phase: 'error'; message: string }

/** Chạy tối ưu trong Web Worker; trình duyệt không hỗ trợ thì chạy luôn ở đây. */
function runOptimizer(logs: SrsLog[], current: number[], onProgress: (p: number) => void): Promise<OptimizeResult> {
  if (typeof Worker === 'undefined') return Promise.resolve(optimize(prepare(logs), { current, onProgress }))
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const m = e.data
      if (m.type === 'progress') onProgress(m.p)
      else {
        worker.terminate()
        if (m.type === 'done') resolve(m.result)
        else reject(new Error(m.message))
      }
    }
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || 'Lỗi khi tối ưu')) }
    worker.postMessage({ logs, current })
  })
}

const pct = (x: number) => `${Math.round(x * 100)}%`
const fmtDate = (t: number) => new Date(t).toLocaleDateString('vi-VN')

export function OptimizerRow({ s }: { s: ReviewSettings }) {
  const [run, setRun] = useState<Run>({ phase: 'idle' })
  const custom = validWeights(s.weights) !== DEFAULT_W

  const start = async () => {
    setRun({ phase: 'running', progress: 0 })
    try {
      const logs = await getAll<SrsLog>('srsLogs')
      const reviews = prepare(logs).reviews
      if (reviews < MIN_REVIEWS) { setRun({ phase: 'few', reviews }); return }
      const result = await runOptimizer(logs, [...validWeights(s.weights)], (p) => setRun({ phase: 'running', progress: p }))
      setRun({ phase: 'done', result })
    } catch (e) {
      setRun({ phase: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const apply = async (r: OptimizeResult) => {
    await saveSettings({ weights: r.weights, optimized: { at: Date.now(), reviews: r.reviews } })
    setRun({ phase: 'idle' })
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm">
        Đang dùng:{' '}
        {custom && s.optimized
          ? <b>tham số riêng của bạn</b>
          : <b>tham số mặc định</b>}
        {custom && s.optimized && <span className="text-muted"> (tối ưu ngày {fmtDate(s.optimized.at)}, từ {s.optimized.reviews} lượt ôn)</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" disabled={run.phase === 'running'} onClick={() => void start()}>
          {run.phase === 'running' ? `Đang tối ưu… ${pct(run.progress)}` : 'Tối ưu theo lịch sử ôn của tôi'}
        </Button>
        {custom && (
          <Button variant="ghost" disabled={run.phase === 'running'}
            onClick={() => void saveSettings({ weights: null, optimized: null })}>
            Về tham số mặc định
          </Button>
        )}
      </div>
      {run.phase === 'running' && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(run.progress * 100)}>
          <div className="h-full bg-primary transition-all" style={{ width: pct(run.progress) }} />
        </div>
      )}
      {run.phase === 'few' && (
        <p className="text-sm text-muted">
          Cần ít nhất {MIN_REVIEWS} lượt ôn thẻ đã thuộc (ôn cách nhau từ 1 ngày) để tối ưu cho chính xác. Bạn đang có {run.reviews}.
          Cứ ôn đều, vài tuần nữa quay lại bấm nhé.
        </p>
      )}
      {run.phase === 'error' && <p className="text-sm text-bad">Không tối ưu được: {run.message}</p>}
      {run.phase === 'done' && <OptimizeResultBox r={run.result} onApply={() => void apply(run.result)} onCancel={() => setRun({ phase: 'idle' })} />}
    </div>
  )
}

function OptimizeResultBox({ r, onApply, onCancel }: { r: OptimizeResult; onApply: () => void; onCancel: () => void }) {
  const better = r.lossCurrent > 0 ? (r.lossCurrent - r.lossNew) / r.lossCurrent : 0
  if (better < 0.002) {
    return (
      <div className="rounded-xl bg-surface-2 p-3 text-sm">
        Đã xem {r.reviews} lượt ôn của {r.cards} thẻ. Tham số đang dùng đã khớp với trí nhớ của bạn, không cần đổi.
        <div className="mt-2"><Button variant="ghost" onClick={onCancel}>Đóng</Button></div>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-sm">
      <p>
        Đã học từ {r.reviews} lượt ôn của {r.cards} thẻ. Với tham số mới, FSRS đoán đúng hơn
        <b className="text-good"> {Math.max(1, Math.round(better * 100))}%</b> lần nào bạn nhớ, lần nào bạn quên
        (sai số {r.lossCurrent.toFixed(4)} → {r.lossNew.toFixed(4)}).
      </p>
      <p className="mt-1 text-muted">
        Chỉ đổi cách tính những lần ôn sau, không đổi hạn của thẻ hiện có. Có thể quay về mặc định bất cứ lúc nào.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onApply}>Dùng tham số mới</Button>
        <Button variant="ghost" onClick={onCancel}>Bỏ qua</Button>
      </div>
    </div>
  )
}

/** Thứ tự hiển thị: Thứ 2 → Chủ nhật. Chỉ số trong easyDays: 0 = CN. */
const WEEK: [number, string][] = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [0, 'CN']]
const LEVEL_LABEL: Record<EasyDay, string> = { normal: 'Thường', reduced: 'Nhẹ', minimum: 'Nghỉ' }

export function EasyDaysRow({ s }: { s: ReviewSettings }) {
  const days = s.easyDays?.length === 7 ? s.easyDays : Array<EasyDay>(7).fill('normal')
  const set = (i: number, v: EasyDay) => void saveSettings({ easyDays: days.map((d, j) => (j === i ? v : d)) })
  return (
    <div className="grid w-full grid-cols-7 gap-1 sm:w-auto">
      {WEEK.map(([i, label]) => (
        <label key={i} className="flex flex-col items-center gap-1 text-xs text-muted">
          {label}
          <select value={days[i]} aria-label={`Mức học ${label}`} onChange={(e) => set(i, e.target.value as EasyDay)}
            className={`min-h-9 w-full rounded-lg border border-border px-0.5 text-xs text-text ${days[i] === 'normal' ? 'bg-surface' : 'bg-primary-soft'}`}>
            {(Object.keys(LEVEL_LABEL) as EasyDay[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}
