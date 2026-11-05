/**
 * API CÔNG KHAI CỦA MODULE ĐỌC MANGA cho module khác (Hôm nay, Tiện ích chung "Smart Resume"...).
 *
 *   import { useMangaResume, mangaReaderPath } from '@/modules/immersion/manga/api'
 *   const r = useMangaResume()   // undefined khi chưa đọc gì
 *   // r.seriesTitle, r.chapterLabel, r.page (đếm từ 0), r.pageCount, r.path → <Link to={r.path}>
 */
import { useDbQuery } from '@/core/db'
import { getChapter, listSeries } from './store'
import { chapterLabel } from './naming'

export interface MangaResume {
  seriesId: string
  seriesTitle: string
  chapterId: string
  chapterLabel: string
  page: number
  pageCount: number
  lastReadAt: number
  /** Đường dẫn trong app để mở thẳng trình đọc ở đúng trang. */
  path: string
}

export const MANGA_PATH = '/immersion/manga'
export const mangaReaderPath = (chapterId: string) => `${MANGA_PATH}?read=${encodeURIComponent(chapterId)}`
export const mangaSeriesPath = (seriesId: string) => `${MANGA_PATH}?series=${encodeURIComponent(seriesId)}`

/** Chương đọc gần nhất (của series đọc gần nhất). */
export async function getMangaResume(): Promise<MangaResume | undefined> {
  const series = (await listSeries()).filter((s) => s.lastReadAt && s.lastChapterId)
  const s = series[0]
  if (!s?.lastChapterId) return undefined
  const c = await getChapter(s.lastChapterId)
  if (!c) return undefined
  return {
    seriesId: s.id,
    seriesTitle: s.title,
    chapterId: c.id,
    chapterLabel: chapterLabel(c),
    page: c.lastPage,
    pageCount: c.pageCount,
    lastReadAt: s.lastReadAt!,
    path: mangaReaderPath(c.id),
  }
}

/** Hook React: tự cập nhật khi đọc tiếp. */
export function useMangaResume(): MangaResume | undefined {
  return useDbQuery(getMangaResume, [], ['mangaSeries', 'mangaChapters']).data
}
