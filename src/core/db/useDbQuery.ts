/**
 * HOOK REACT: đọc dữ liệu và TỰ CẬP NHẬT khi dữ liệu thay đổi.
 *
 *   const { data: goal } = useDbQuery(() => kvGet('today:goal', 20), [], ['kv'])
 *
 * - query: hàm đọc dữ liệu (async)
 * - deps: giống useEffect, đổi thì đọc lại
 * - watch: các bảng cần theo dõi; bảng đó bị ghi thì đọc lại
 *   (nhiều lần ghi sát nhau chỉ làm đọc lại MỘT lần, sau REFRESH_DELAY_MS — xem coalesce.ts)
 */
import { useEffect, useState } from 'react'
import { coalesce } from './coalesce'
import { onDbChange } from './events'
import type { StoreName } from './schema'

export interface DbQueryState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/** Chờ bao lâu sau lần ghi cuối mới đọc lại (đủ ngắn để không thấy trễ, đủ dài để gộp một loạt ghi). */
export const REFRESH_DELAY_MS = 100

export function useDbQuery<T>(query: () => Promise<T>, deps: unknown[], watch: StoreName[]): DbQueryState<T> {
  const [state, setState] = useState<DbQueryState<T>>({ data: undefined, error: undefined, loading: true })

  useEffect(() => {
    let alive = true
    let run = 0
    const load = () => {
      const id = ++run
      query().then(
        (data) => { if (alive && id === run) setState({ data, error: undefined, loading: false }) },
        (e: unknown) => {
          if (alive && id === run) {
            setState((s) => ({ ...s, error: e instanceof Error ? e : new Error(String(e)), loading: false }))
          }
        },
      )
    }
    load()
    const refresh = coalesce(load, REFRESH_DELAY_MS)
    const off = onDbChange(watch, refresh.call)
    return () => { alive = false; refresh.cancel(); off() }
  }, [...deps, watch.join(',')])

  return state
}
