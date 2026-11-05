/**
 * KHO KHÓA–GIÁ TRỊ: lưu các giá trị nhỏ của module (mục tiêu ngày, trang đang đọc, lựa chọn gần nhất...).
 * Giá trị nên là dữ liệu JSON thuần (số, chữ, mảng, object). Ngày giờ lưu dạng số (Date.now()).
 * Khóa nên bắt đầu bằng id module: "today:goal", "manga:lastBook".
 */
import { get, put, remove } from './idb'

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const v = await get<T>('kv', key)
  return v === undefined ? fallback : v
}

export function kvSet<T>(key: string, value: T): Promise<void> {
  return put('kv', value, key)
}

export function kvDelete(key: string): Promise<void> {
  return remove('kv', key)
}
