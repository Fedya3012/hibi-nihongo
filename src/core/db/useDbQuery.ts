/**
 * HOOK REACT: đọc dữ liệu và TỰ CẬP NHẬT khi dữ liệu thay đổi.
 *
 *   const { data: goal } = useDbQuery(() => kvGet('today:goal', 20), [], ['kv'])
 *
 * - query: hàm đọc dữ liệu (async)
 * - deps: giống useEffect, đổi thì đọc lại
 * - watch: các bảng cần theo dõi; bảng đó bị ghi thì đọc lại
 */
import { useEffect, useState } from 'react'
import { onDbChange } from './events'
import type { StoreName } from './schema'

export interface DbQueryState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

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
    const off = onDbChange(watch, load)
    return () => { alive = false; off() }
  }, [...deps, watch.join(',')])

  return state
}
