/**
 * Bộ nhớ đệm cho dữ liệu người dùng (thẻ, manga, anime...): đọc kho một lần, gõ tiếp thì dùng lại.
 * Khi bảng bị ghi (ở bất kỳ màn hình nào), bản đệm tự bỏ để lần tìm sau đọc lại.
 */
import { onDbChange, type StoreName } from '@/core/db'

const cache = new Map<string, Promise<unknown>>()

export function cached<T>(key: string, stores: StoreName[], load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined
  if (!p) {
    p = load()
    cache.set(key, p)
    p.catch(() => cache.delete(key))
    const stop = onDbChange(stores, () => { cache.delete(key); stop() })
  }
  return p
}
