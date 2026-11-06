/** Chạy tối ưu FSRS trong luồng riêng để giao diện không bị đứng khi lịch sử ôn dài. */
import { optimize, prepare } from './optimizer'
import type { SrsLog } from './types'

self.onmessage = (e: MessageEvent<{ logs: SrsLog[]; current?: number[] }>) => {
  try {
    const data = prepare(e.data.logs)
    const result = optimize(data, {
      current: e.data.current,
      onProgress: (p) => self.postMessage({ type: 'progress', p }),
    })
    self.postMessage({ type: 'done', result })
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
