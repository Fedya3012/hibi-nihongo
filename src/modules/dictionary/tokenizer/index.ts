/**
 * TÁCH TỪ — API cho giao diện.
 *   const segments = await tokenize('昨日ケーキを食べさせられた')
 *   → [昨日][ケーキ][を][食べさせられた]  (mỗi phần có thể từ điển, cách đọc, từ loại)
 * Bộ tách từ chạy trong Web Worker và chỉ được khởi động ở lần gọi đầu tiên.
 */
import { create } from 'zustand'
import type { IpadicToken } from 'kuromoji/src/Tokenizer'
import type { Segment } from '../types'
import { groupTokens } from './segment'
import type { WorkerRequest, WorkerResponse } from './worker'

export type TokenizerStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Trạng thái bộ tách từ, để giao diện hiện "Đang chuẩn bị bộ tách từ…". */
export const useTokenizerStatus = create<{ status: TokenizerStatus; error?: string }>(() => ({ status: 'idle' }))

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (t: IpadicToken[]) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  useTokenizerStatus.setState({ status: 'loading', error: undefined })
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data
    if ('status' in msg) { useTokenizerStatus.setState({ status: 'ready' }); return }
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    if ('error' in msg) {
      useTokenizerStatus.setState({ status: 'error', error: msg.error })
      p.reject(new Error(msg.error))
      // Lần sau thử khởi động lại (ví dụ lúc trước mất mạng)
      worker?.terminate()
      worker = null
    } else {
      useTokenizerStatus.setState({ status: 'ready' })
      p.resolve(msg.tokens)
    }
  }
  worker.onerror = (e) => {
    const error = e.message || 'Không khởi động được bộ tách từ.'
    useTokenizerStatus.setState({ status: 'error', error })
    for (const p of pending.values()) p.reject(new Error(error))
    pending.clear()
    worker = null
  }
  return worker
}

/** Khởi động sẵn bộ tách từ (tải từ điển ngầm) trước khi người dùng cần. */
export function warmUpTokenizer() { getWorker() }

/** Tách câu thành các mảnh nhỏ nhất của Kuromoji (ít khi cần dùng trực tiếp). */
export function tokenizeRaw(text: string): Promise<IpadicToken[]> {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, text } satisfies WorkerRequest)
  })
}

const cache = new Map<string, Promise<Segment[]>>()

/** Tách câu thành các "từ" dễ hiểu cho người học (động từ gộp cùng đuôi chia). */
export function tokenize(text: string): Promise<Segment[]> {
  let p = cache.get(text)
  if (!p) {
    p = tokenizeRaw(text).then(groupTokens)
    cache.set(text, p)
    p.catch(() => cache.delete(text))
    if (cache.size > 300) cache.delete(cache.keys().next().value as string)
  }
  return p
}
