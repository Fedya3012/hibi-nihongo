/**
 * TÌM THẺ ĐÃ CÓ THEO NGUỒN / THEO MẶT TRƯỚC — dùng khi thêm thẻ để không tạo trùng.
 *
 * Nếu kho đã có chỉ mục `by_source` (['source.module', 'source.ref']) và `by_front` trên bảng srsCards,
 * chỉ tra đúng những thẻ cần xem (nhanh dù có hàng chục nghìn thẻ). Kho cũ chưa có chỉ mục thì
 * tự quay về cách cũ: đọc hết thẻ một lần.
 */
import { getAll, promisify, transaction } from '@/core/db'
import type { SrsCard } from './types'

export type Source = { module: string; ref: string }

export const sourceKey = (s: Source) => `${s.module}:${s.ref}`

/** Lấy mọi kết quả của nhiều lần tra chỉ mục trong một giao dịch. Trả về null nếu chưa có chỉ mục. */
async function lookupMany(index: 'by_source' | 'by_front', keys: IDBValidKey[]): Promise<SrsCard[] | null> {
  return transaction('srsCards', 'readonly', async (tx) => {
    const os = tx.objectStore('srsCards')
    if (!os.indexNames.contains(index)) return null
    const idx = os.index(index)
    const lists = await Promise.all(keys.map((k) => promisify<SrsCard[]>(idx.getAll(k))))
    return lists.flat()
  })
}

/** Các thẻ có nguồn nằm trong `sources`. */
export async function cardsWithSources(sources: Source[]): Promise<SrsCard[]> {
  if (!sources.length) return []
  const want = new Set(sources.map(sourceKey))
  const keys = [...want].map((k) => { const i = k.indexOf(':'); return [k.slice(0, i), k.slice(i + 1)] })
  const found = await lookupMany('by_source', keys)
  if (found) return found
  return (await getAll<SrsCard>('srsCards')).filter((c) => c.source && want.has(sourceKey(c.source)))
}

/**
 * Thẻ có thể trùng với các thẻ sắp thêm: cùng nguồn, hoặc cùng mặt trước.
 * (Bên gọi tự so thêm bộ + loại thẻ.) Kho chưa có chỉ mục thì trả về mọi thẻ.
 */
export async function possibleDuplicates(inputs: { front: string; source?: Source }[]): Promise<SrsCard[]> {
  const fronts = [...new Set(inputs.map((i) => i.front.trim()).filter(Boolean))]
  const sources = inputs.flatMap((i) => (i.source ? [i.source] : []))
  const [byFront, bySrc] = await Promise.all([
    lookupMany('by_front', fronts),
    sources.length ? lookupMany('by_source', sources.map((s) => [s.module, s.ref])) : Promise.resolve([]),
  ])
  if (!byFront || !bySrc) return getAll<SrsCard>('srsCards')
  const seen = new Map<string, SrsCard>()
  for (const c of [...byFront, ...bySrc]) seen.set(c.id, c)
  return [...seen.values()]
}
