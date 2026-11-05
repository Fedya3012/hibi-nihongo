/**
 * ĐỌC/GHI DỮ LIỆU MANGA trong kho offline (IndexedDB, qua '@/core/db').
 */
import {
  get, getAll, getAllByIndex, put, transaction, promisify, kvGet, kvSet, count,
} from '@/core/db'
import {
  DEFAULT_PREFS, THUMB_INDEX,
  type MangaBlob, type MangaChapter, type MangaSeries, type ReaderPrefs,
} from './types'
import { naturalCompare } from './naming'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** Khoảng khóa chứa mọi file của một chương (kể cả ảnh bìa ở index -1). */
const chapterRange = (chapterId: string) => IDBKeyRange.bound([chapterId, -Infinity], [chapterId, Infinity])

// ----- Series -----

export async function listSeries(): Promise<MangaSeries[]> {
  const all = await getAll<MangaSeries>('mangaSeries')
  // Đọc gần đây lên đầu, series chưa đọc xếp theo tên
  return all.sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0) || naturalCompare(a.title, b.title))
}

export const getSeries = (id: string) => get<MangaSeries>('mangaSeries', id)

export async function createSeries(title: string, titleJp?: string): Promise<MangaSeries> {
  const now = Date.now()
  const s: MangaSeries = { id: newId(), title: title.trim() || 'Manga chưa đặt tên', titleJp: titleJp?.trim() || undefined, createdAt: now, updatedAt: now }
  await put('mangaSeries', s)
  return s
}

export async function updateSeries(id: string, patch: Partial<Omit<MangaSeries, 'id'>>): Promise<void> {
  await transaction('mangaSeries', 'readwrite', async (tx) => {
    const os = tx.objectStore('mangaSeries')
    const s = await promisify<MangaSeries | undefined>(os.get(id))
    if (s) os.put({ ...s, ...patch, updatedAt: Date.now() })
  })
}

/** Xóa series cùng mọi chương và ảnh của nó. */
export async function deleteSeries(id: string): Promise<void> {
  const chapters = await listChapters(id)
  await transaction(['mangaSeries', 'mangaChapters', 'mangaBlobs'], 'readwrite', (tx) => {
    for (const c of chapters) {
      tx.objectStore('mangaChapters').delete(c.id)
      tx.objectStore('mangaBlobs').delete(chapterRange(c.id))
    }
    tx.objectStore('mangaSeries').delete(id)
  })
}

// ----- Chương -----

/** Sắp chương theo tập → số chương → tên. */
export function sortChapters(list: MangaChapter[]): MangaChapter[] {
  return list.sort((a, b) =>
    (a.volume ?? -1) - (b.volume ?? -1) ||
    (a.number ?? Infinity) - (b.number ?? Infinity) ||
    naturalCompare(a.fileName, b.fileName))
}

export async function listChapters(seriesId: string): Promise<MangaChapter[]> {
  return sortChapters(await getAllByIndex<MangaChapter>('mangaChapters', 'by_series', seriesId))
}

export async function listAllChapters(): Promise<MangaChapter[]> {
  return getAll<MangaChapter>('mangaChapters')
}

export const getChapter = (id: string) => get<MangaChapter>('mangaChapters', id)

export async function updateChapter(id: string, patch: Partial<Omit<MangaChapter, 'id'>>): Promise<void> {
  await transaction('mangaChapters', 'readwrite', async (tx) => {
    const os = tx.objectStore('mangaChapters')
    const c = await promisify<MangaChapter | undefined>(os.get(id))
    if (c) os.put({ ...c, ...patch })
  })
}

/**
 * Lưu một chương cùng toàn bộ ảnh trong MỘT giao dịch: hoặc lưu đủ, hoặc không lưu gì.
 * Ảnh cũ của chương (nếu đang nhập lại) bị xóa trước.
 */
export async function saveChapterWithBlobs(chapter: MangaChapter, blobs: MangaBlob[]): Promise<void> {
  await transaction(['mangaChapters', 'mangaBlobs', 'mangaSeries'], 'readwrite', async (tx) => {
    const store = tx.objectStore('mangaBlobs')
    store.delete(chapterRange(chapter.id))
    for (const b of blobs) store.put(b)
    tx.objectStore('mangaChapters').put(chapter)
    const ss = tx.objectStore('mangaSeries')
    const s = await promisify<MangaSeries | undefined>(ss.get(chapter.seriesId))
    if (s) ss.put({ ...s, updatedAt: Date.now() })
  })
}

export async function deleteChapter(id: string): Promise<void> {
  await transaction(['mangaChapters', 'mangaBlobs', 'mangaSeries'], 'readwrite', async (tx) => {
    const c = await promisify<MangaChapter | undefined>(tx.objectStore('mangaChapters').get(id))
    tx.objectStore('mangaChapters').delete(id)
    tx.objectStore('mangaBlobs').delete(chapterRange(id))
    if (c) {
      const ss = tx.objectStore('mangaSeries')
      const s = await promisify<MangaSeries | undefined>(ss.get(c.seriesId))
      if (s && s.lastChapterId === id) ss.put({ ...s, lastChapterId: undefined })
    }
  })
}

// ----- Ảnh -----

export async function getBlob(chapterId: string, index: number): Promise<Blob | undefined> {
  return (await get<MangaBlob>('mangaBlobs', [chapterId, index]))?.blob
}

export const getThumb = (chapterId: string) => getBlob(chapterId, THUMB_INDEX)

/** Chương còn ảnh trên máy không? (Sau khi khôi phục sao lưu ở máy khác thì chưa có.) */
export async function hasFiles(chapterId: string): Promise<boolean> {
  return (await count('mangaBlobs', IDBKeyRange.bound([chapterId, 0], [chapterId, Infinity]))) > 0
}

// ----- Tiến độ đọc (Smart Resume) -----

/**
 * Ghi lại trang đang đọc. Gọi mỗi khi lật trang (đã được giãn nhịp trong trình đọc).
 * Tới trang cuối thì đánh dấu chương đã đọc xong.
 */
export async function saveProgress(chapterId: string, page: number): Promise<void> {
  const now = Date.now()
  await transaction(['mangaChapters', 'mangaSeries'], 'readwrite', async (tx) => {
    const cs = tx.objectStore('mangaChapters')
    const c = await promisify<MangaChapter | undefined>(cs.get(chapterId))
    if (!c) return
    const atEnd = page >= c.pageCount - 1
    cs.put({ ...c, lastPage: page, lastReadAt: now, finishedAt: atEnd ? (c.finishedAt ?? now) : c.finishedAt })
    const ss = tx.objectStore('mangaSeries')
    const s = await promisify<MangaSeries | undefined>(ss.get(c.seriesId))
    if (s) ss.put({ ...s, lastReadAt: now, lastChapterId: chapterId })
  })
}

export async function setFinished(chapterId: string, finished: boolean): Promise<void> {
  const c = await getChapter(chapterId)
  if (!c) return
  await updateChapter(chapterId, finished
    ? { finishedAt: c.finishedAt ?? Date.now(), lastPage: c.pageCount - 1 }
    : { finishedAt: undefined, lastPage: 0 })
}

// ----- Cài đặt đọc -----

const PREFS_KEY = 'manga:prefs'

export async function getDefaultPrefs(): Promise<ReaderPrefs> {
  return { ...DEFAULT_PREFS, ...(await kvGet<Partial<ReaderPrefs>>(PREFS_KEY, {})) }
}

export const setDefaultPrefs = (p: ReaderPrefs) => kvSet(PREFS_KEY, p)

/** Cài đặt thực tế của một series = cài đặt chung + phần riêng của series. */
export async function getSeriesPrefs(series: MangaSeries | undefined): Promise<ReaderPrefs> {
  return { ...(await getDefaultPrefs()), ...(series?.prefs ?? {}) }
}
