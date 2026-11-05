/**
 * BÁO THAY ĐỔI DỮ LIỆU
 * Khi một bảng bị ghi, mọi màn hình đang hiển thị bảng đó được báo để tự cập nhật,
 * kể cả ở tab/cửa sổ khác của app (qua BroadcastChannel).
 */
import type { StoreName } from './schema'

type Listener = (stores: StoreName[]) => void
const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hibi-db') : null

channel?.addEventListener('message', (e: MessageEvent<StoreName[]>) => {
  for (const l of listeners) l(e.data)
})

/** Gọi sau khi ghi xong (các hàm trong kho đã tự gọi, module ít khi phải dùng). */
export function emitChange(stores: StoreName | StoreName[]) {
  const list = Array.isArray(stores) ? stores : [stores]
  for (const l of listeners) l(list)
  channel?.postMessage(list)
}

/** Nghe thay đổi của một số bảng. Trả về hàm để ngừng nghe. */
export function onDbChange(stores: StoreName[], cb: () => void): () => void {
  const l: Listener = (changed) => {
    if (changed.some((s) => stores.includes(s))) cb()
  }
  listeners.add(l)
  return () => listeners.delete(l)
}
