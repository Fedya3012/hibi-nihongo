/**
 * API CÔNG KHAI CỦA MODULE XEM ANIME cho module khác (Hôm nay, Smart Resume...).
 *
 *   import { useAnimeResume } from '@/modules/immersion/anime/api'
 *   const r = useAnimeResume()   // undefined khi chưa xem gì
 *   // r.seriesTitle, r.episodeLabel, r.position, r.duration (giây), r.path → <Link to={r.path}>Xem tiếp</Link>
 */
import { useDbQuery } from '@/core/db'
import { getEpisode, listSeries } from './store'
import { episodeLabel } from './importer'

export interface AnimeResume {
  seriesId: string
  seriesTitle: string
  episodeId: string
  episodeLabel: string
  /** Chỗ đang xem và thời lượng, tính bằng giây (duration có thể chưa biết). */
  position: number
  duration?: number
  lastWatchedAt: number
  /** Đường dẫn trong app để mở thẳng trình xem ở đúng chỗ. */
  path: string
}

export const ANIME_PATH = '/immersion/anime'
export const animePlayerPath = (episodeId: string) => `${ANIME_PATH}?watch=${encodeURIComponent(episodeId)}`
export const animeSeriesPath = (seriesId: string) => `${ANIME_PATH}?series=${encodeURIComponent(seriesId)}`

/** Tập xem gần nhất (của series xem gần nhất). */
export async function getAnimeResume(): Promise<AnimeResume | undefined> {
  const s = (await listSeries()).find((x) => x.lastWatchedAt && x.lastEpisodeId)
  if (!s?.lastEpisodeId) return undefined
  const e = await getEpisode(s.lastEpisodeId)
  if (!e) return undefined
  return {
    seriesId: s.id, seriesTitle: s.title, episodeId: e.id, episodeLabel: episodeLabel(e),
    position: e.position, duration: e.duration, lastWatchedAt: s.lastWatchedAt!, path: animePlayerPath(e.id),
  }
}

/** Hook React: tự cập nhật khi xem tiếp. */
export function useAnimeResume(): AnimeResume | undefined {
  return useDbQuery(getAnimeResume, [], ['animeSeries', 'animeEpisodes']).data
}
