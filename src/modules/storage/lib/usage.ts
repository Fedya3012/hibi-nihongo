/**
 * ĐO DUNG LƯỢNG TỪNG PHẦN và DỌN DẸP
 * ----------------------------------
 * Trình duyệt chỉ cho biết TỔNG dung lượng app dùng. Để biết từng phần (manga, anime, thẻ...)
 * chiếm bao nhiêu, app đọc qua từng bảng và cộng kích thước: ảnh/video (Blob) lấy đúng kích thước
 * file, chữ thì tính theo độ dài. Kết quả là con số ước lượng, đủ để biết phần nào nặng nhất.
 *
 * Dọn dẹp chỉ xóa thứ nhập lại được hoặc không còn ai dùng:
 *   - Ảnh trang của chương manga đã đọc xong (giữ ảnh bìa, trang đang đọc, bong bóng, ghi chú).
 *   - Bản chép video của tập anime đã xem xong (giữ phụ đề, câu đã lưu, tiến độ).
 *   - File "mồ côi": ảnh/tiếng/video của thẻ, chương, tập, bài đã bị xóa.
 *   - Bản an toàn trước lần khôi phục gần nhất.
 */
import {
  count, deleteRestoreSnapshot, promisify, transaction, STORE_LABELS, type StoreName,
} from '@/core/db'

export type CategoryId = 'cards' | 'cardMedia' | 'manga' | 'anime' | 'textbook' | 'packs' | 'other' | 'snapshot'

export const CATEGORIES: { id: CategoryId; label: string; stores: StoreName[]; hint: string }[] = [
  { id: 'manga', label: 'Manga', stores: ['mangaBlobs', 'mangaChapters', 'mangaSeries', 'mangaNotes'], hint: 'Ảnh trang không nằm trong file sao lưu, nhập lại được từ file gốc.' },
  { id: 'anime', label: 'Anime', stores: ['animeMedia', 'animeClips', 'animeSubs', 'animeSentences', 'animeEpisodes', 'animeSeries', 'animeLinks'], hint: 'Video chép vào app và ảnh/tiếng của câu đã lưu.' },
  { id: 'textbook', label: 'Giáo trình', stores: ['textbookMedia', 'textbookLessons', 'textbooks', 'textbookNotes'], hint: 'File sách gốc và audio bạn nhập.' },
  { id: 'cardMedia', label: 'Ảnh, tiếng của thẻ ôn tập', stores: ['srsMedia'], hint: 'Có trong file sao lưu.' },
  { id: 'cards', label: 'Thẻ ôn tập và lịch sử ôn', stores: ['srsCards', 'srsLogs'], hint: 'Có trong file sao lưu.' },
  { id: 'packs', label: 'Từ điển, kanji (gói nội dung)', stores: ['packItems', 'packs'], hint: 'Tải lại được bất cứ lúc nào.' },
  { id: 'other', label: 'Kho từ, thời gian học, cài đặt', stores: ['knownWords', 'studyDays', 'kv'], hint: 'Có trong file sao lưu.' },
  { id: 'snapshot', label: 'Bản an toàn trước khi khôi phục', stores: ['backupSnapshots'], hint: 'Dùng để hoàn tác lần khôi phục gần nhất.' },
]

/** Kích thước ước lượng của một giá trị (byte). */
export function sizeOf(v: unknown, depth = 0): number {
  if (v == null) return 0
  if (typeof v === 'string') return v.length
  if (typeof v === 'number') return 8
  if (typeof v === 'boolean') return 4
  if (typeof Blob !== 'undefined' && v instanceof Blob) return v.size
  if (v instanceof ArrayBuffer) return v.byteLength
  if (ArrayBuffer.isView(v)) return v.byteLength
  if (depth > 6 || typeof v !== 'object') return 0
  // Tay cầm file (FileSystemFileHandle): file nằm ngoài app, không tính
  if (typeof (v as { getFile?: unknown }).getFile === 'function') return 0
  let n = 0
  if (Array.isArray(v)) for (const x of v) n += sizeOf(x, depth + 1)
  else for (const [k, x] of Object.entries(v)) n += k.length + sizeOf(x, depth + 1)
  return n
}

export interface StoreUsage { store: StoreName; label: string; rows: number; bytes: number; approx: boolean }

/** Đọc lần lượt mọi dòng của bảng (không nạp cả bảng vào bộ nhớ một lúc). */
function eachRow(store: StoreName, fn: (value: unknown, key: IDBValidKey) => void, range?: IDBKeyRange): Promise<void> {
  return transaction(store, 'readonly', (tx) => new Promise<void>((resolve, reject) => {
    const req = tx.objectStore(store).openCursor(range)
    req.onsuccess = () => {
      const c = req.result
      if (!c) { resolve(); return }
      fn(c.value, c.primaryKey)
      c.continue()
    }
    req.onerror = () => reject(req.error)
  }))
}

const SAMPLE_OVER = 20_000 // bảng rất nhiều dòng (gói từ điển): chỉ đo 2000 dòng đầu rồi nhân lên

async function measureStore(store: StoreName): Promise<StoreUsage> {
  const rows = await count(store)
  let bytes = 0
  let approx = false
  if (rows > SAMPLE_OVER) {
    const sample = await transaction(store, 'readonly', (tx) => promisify<unknown[]>(tx.objectStore(store).getAll(null, 2000)))
    const s = sample.reduce<number>((n, v) => n + sizeOf(v), 0)
    bytes = Math.round((s / Math.max(1, sample.length)) * rows)
    approx = true
  } else {
    await eachRow(store, (v) => { bytes += sizeOf(v) })
  }
  return { store, label: STORE_LABELS[store], rows, bytes, approx }
}

export interface CategoryUsage { id: CategoryId; label: string; hint: string; bytes: number; approx: boolean; stores: StoreUsage[] }

export async function measureUsage(onProgress?: (done: number, total: number) => void): Promise<CategoryUsage[]> {
  const out: CategoryUsage[] = []
  const total = CATEGORIES.reduce((n, c) => n + c.stores.length, 0)
  let done = 0
  for (const c of CATEGORIES) {
    const stores: StoreUsage[] = []
    for (const s of c.stores) {
      stores.push(await measureStore(s))
      onProgress?.(++done, total)
    }
    out.push({
      id: c.id, label: c.label, hint: c.hint, stores,
      bytes: stores.reduce((n, s) => n + s.bytes, 0),
      approx: stores.some((s) => s.approx),
    })
  }
  return out.sort((a, b) => b.bytes - a.bytes)
}

// ---------- Dọn dẹp ----------

interface ChapterLite { id: string; finishedAt?: number }
interface EpisodeLite { id: string; finishedAt?: number }
interface AnimeMediaLite { episodeId: string; kind: 'handle' | 'blob' }
interface TextbookMediaLite { id: string; bookId?: string; lessonId: string; kind: string }

const pagesOf = (chapterId: string) => IDBKeyRange.bound([chapterId, 0], [chapterId, Infinity])

async function keysOf(store: StoreName): Promise<Set<string>> {
  const keys = await transaction(store, 'readonly', (tx) => promisify(tx.objectStore(store).getAllKeys()))
  return new Set(keys.map(String))
}

export interface CleanupItem { rows: number; bytes: number }
export interface CleanupPlan {
  /** Ảnh trang của chương đã đọc xong. */
  manga: CleanupItem & { chapters: number }
  /** Bản chép video của tập đã xem xong. */
  anime: CleanupItem & { episodes: number }
  /** Ảnh/tiếng/video không còn thuộc về thẻ, chương, tập, bài nào. */
  orphans: CleanupItem
  snapshot: CleanupItem
}

interface Targets {
  mangaChapters: string[]
  animeEpisodes: string[]
  orphans: { store: StoreName; key: IDBValidKey }[]
}

async function findTargets(): Promise<{ plan: CleanupPlan; targets: Targets }> {
  const plan: CleanupPlan = {
    manga: { rows: 0, bytes: 0, chapters: 0 }, anime: { rows: 0, bytes: 0, episodes: 0 },
    orphans: { rows: 0, bytes: 0 }, snapshot: { rows: 0, bytes: 0 },
  }
  const targets: Targets = { mangaChapters: [], animeEpisodes: [], orphans: [] }
  const orphan = (store: StoreName, key: IDBValidKey, v: unknown) => {
    targets.orphans.push({ store, key })
    plan.orphans.rows++
    plan.orphans.bytes += sizeOf(v)
  }

  // Manga
  const chapters = new Map<string, ChapterLite>()
  await eachRow('mangaChapters', (v) => { const c = v as ChapterLite; chapters.set(c.id, c) })
  const finished = new Set([...chapters.values()].filter((c) => c.finishedAt).map((c) => c.id))
  const finishedWithPages = new Set<string>()
  await eachRow('mangaBlobs', (v, key) => {
    const [chapterId, index] = key as [string, number]
    if (!chapters.has(chapterId)) orphan('mangaBlobs', key, v)
    else if (finished.has(chapterId) && index >= 0) {
      finishedWithPages.add(chapterId)
      plan.manga.rows++
      plan.manga.bytes += sizeOf(v)
    }
  })
  targets.mangaChapters = [...finishedWithPages]
  plan.manga.chapters = finishedWithPages.size

  // Anime
  const episodes = new Map<string, EpisodeLite>()
  await eachRow('animeEpisodes', (v) => { const e = v as EpisodeLite; episodes.set(e.id, e) })
  await eachRow('animeMedia', (v, key) => {
    const m = v as AnimeMediaLite
    const ep = episodes.get(m.episodeId)
    if (!ep) orphan('animeMedia', key, v)
    else if (ep.finishedAt && m.kind === 'blob') {
      targets.animeEpisodes.push(m.episodeId)
      plan.anime.rows++
      plan.anime.bytes += sizeOf(v)
    }
  })
  plan.anime.episodes = targets.animeEpisodes.length
  const sentences = await keysOf('animeSentences')
  await eachRow('animeClips', (v, key) => { if (!sentences.has(String(key))) orphan('animeClips', key, v) })

  // Thẻ ôn tập
  const cards = await keysOf('srsCards')
  await eachRow('srsMedia', (v, key) => { if (!cards.has(String(key))) orphan('srsMedia', key, v) })

  // Giáo trình
  const books = await keysOf('textbooks')
  const lessons = await keysOf('textbookLessons')
  await eachRow('textbookMedia', (v, key) => {
    const m = v as TextbookMediaLite
    const gone = m.bookId != null ? !books.has(m.bookId) : m.kind === 'audio' && !lessons.has(m.lessonId)
    if (gone) orphan('textbookMedia', key, v)
  })

  await eachRow('backupSnapshots', (v) => { plan.snapshot.rows++; plan.snapshot.bytes += sizeOf(v) })
  return { plan, targets }
}

/** Xem trước có thể dọn được bao nhiêu (không xóa gì). */
export async function planCleanup(): Promise<CleanupPlan> {
  return (await findTargets()).plan
}

export type CleanupKind = 'manga' | 'anime' | 'orphans' | 'snapshot'

/** Dọn một loại. Trả về số dòng đã xóa. */
export async function runCleanup(kind: CleanupKind): Promise<number> {
  if (kind === 'snapshot') { await deleteRestoreSnapshot(); return 1 }
  const { plan, targets } = await findTargets()
  if (kind === 'manga') {
    await transaction('mangaBlobs', 'readwrite', (tx) => {
      for (const id of targets.mangaChapters) tx.objectStore('mangaBlobs').delete(pagesOf(id))
    })
    return plan.manga.rows
  }
  if (kind === 'anime') {
    await transaction('animeMedia', 'readwrite', (tx) => {
      for (const id of targets.animeEpisodes) tx.objectStore('animeMedia').delete(id)
    })
    return plan.anime.rows
  }
  const stores = [...new Set(targets.orphans.map((o) => o.store))]
  if (stores.length) {
    await transaction(stores, 'readwrite', (tx) => {
      for (const o of targets.orphans) tx.objectStore(o.store).delete(o.key)
    })
  }
  return plan.orphans.rows
}
