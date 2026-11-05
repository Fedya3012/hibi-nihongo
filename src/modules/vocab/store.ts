/**
 * ĐỌC/GHI BẢNG `knownWords` (kho từ dùng chung) trong kho offline.
 * Module khác KHÔNG gọi file này trực tiếp: dùng '@/modules/vocab/api'.
 */
import { getAll, getAllByIndex, kvDelete, kvGet, promisify, transaction } from '@/core/db'
import type { KnownWord, ManualStatus, WordInput } from './types'

const toInput = (x: string | WordInput): WordInput => (typeof x === 'string' ? { w: x } : x)
const clean = (s: string | undefined) => s?.trim() || undefined

/** Gộp hai danh sách cách viết khác, bỏ trùng và bỏ chính chữ viết chính. */
function mergeAlt(w: string, ...lists: (string[] | undefined)[]): string[] | undefined {
  const set = new Set<string>()
  for (const l of lists) for (const a of l ?? []) { const t = a.trim(); if (t && t !== w) set.add(t) }
  return set.size ? [...set] : undefined
}

/**
 * Đánh dấu (hoặc bỏ đánh dấu khi status = null) một hoặc nhiều từ, trong MỘT giao dịch.
 * Trả về số từ thực sự thay đổi.
 */
export async function writeStatus(
  items: (string | WordInput)[], status: ManualStatus | null, src?: string,
): Promise<number> {
  const inputs = items.map(toInput).filter((x) => x.w.trim())
  if (!inputs.length) return 0
  const now = Date.now()
  let changed = 0
  await transaction('knownWords', 'readwrite', async (tx) => {
    const os = tx.objectStore('knownWords')
    for (const inp of inputs) {
      const w = inp.w.trim()
      const id = clean(inp.id)
      const old = await promisify<KnownWord | undefined>(os.get(w))
      // Cùng một từ điển id nhưng lưu dưới chữ viết khác (vd lần trước đánh dấu bằng kana) → gộp lại
      const sameId = id ? (await promisify<KnownWord[]>(os.index('by_dict').getAll(id))).filter((x) => x.w !== w) : []
      for (const x of sameId) os.delete(x.w)
      if (status === null) {
        if (old || sameId.length) { os.delete(w); changed++ }
        continue
      }
      if (old?.status === status && !sameId.length && (!id || old.id === id)) continue
      const rec: KnownWord = {
        w, status, at: now,
        r: clean(inp.r) ?? old?.r ?? sameId[0]?.r,
        id: id ?? old?.id,
        alt: mergeAlt(w, old?.alt, inp.alt, ...sameId.map((x) => [x.w, ...(x.alt ?? [])])),
        src: src ?? old?.src,
      }
      os.put(rec)
      changed++
    }
  })
  return changed
}

/** Toàn bộ từ đã đánh dấu, mới nhất trước. */
export async function listAll(): Promise<KnownWord[]> {
  const all = await getAll<KnownWord>('knownWords')
  return all.sort((a, b) => b.at - a.at)
}

export const listByStatus = (status: ManualStatus) => getAllByIndex<KnownWord>('knownWords', 'by_status', status)

/** Xóa toàn bộ từ đã đánh dấu (chỉ bảng này, không đụng tới thẻ Ôn tập). */
export async function clearAll(): Promise<void> {
  await transaction('knownWords', 'readwrite', (tx) => { tx.objectStore('knownWords').clear() })
}

// ---------- Chuyển dữ liệu cũ ----------

/** Trước đây module Anime giữ danh sách "Đã biết" riêng ở kv 'anime:known'. */
const LEGACY_ANIME_KEY = 'anime:known'

/**
 * Chuyển danh sách cũ của Anime sang kho chung rồi xóa khóa cũ. Gọi mỗi lần nạp kho (rất nhẹ),
 * nên khôi phục một bản sao lưu cũ có 'anime:known' cũng được chuyển tự động.
 */
export async function migrateLegacy(): Promise<void> {
  const old = await kvGet<string[]>(LEGACY_ANIME_KEY, [])
  if (!old.length) return
  // Không ghi đè từ bạn đã đánh dấu lại ở kho mới
  const existing = new Set((await getAll<KnownWord>('knownWords')).map((x) => x.w))
  await writeStatus(old.filter((w) => !existing.has(w)), 'known', 'anime')
  await kvDelete(LEGACY_ANIME_KEY)
}
