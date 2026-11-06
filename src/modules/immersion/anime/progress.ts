/**
 * TIẾN ĐỘ & THỐNG KÊ HỌC QUA ANIME
 * Ghép thẻ ôn tập (srsCards) với liên kết anime (animeLinks) để biết thẻ nào thuộc tập / mùa / bộ nào,
 * từ đó: ôn theo tập, đếm từ đã thuộc nhờ anime, % đã học của mỗi mùa, gợi ý ôn trước tập mới.
 */
import { getAll } from '@/core/db'
import { CardState, type SrsCard } from '@/modules/review/types'
import { isBuried } from '@/modules/review/store'
import { listAllEpisodes, listLinks, listAllSentences, listSeries, sortEpisodes } from './store'
import type { AnimeEpisode, AnimeSeries, CardLink, SavedSentence } from './types'

export interface AnimeCardItem {
  card: SrsCard
  link: CardLink
  episode?: AnimeEpisode
  sentence?: SavedSentence
}

export interface AnimeData {
  items: AnimeCardItem[]
  series: AnimeSeries[]
  episodes: AnimeEpisode[]
  sentences: SavedSentence[]
}

/** Đọc một lần mọi thứ cần cho thống kê / ôn tập. */
export async function loadAnimeData(): Promise<AnimeData> {
  const [cards, links, episodes, sentences, series] = await Promise.all([
    getAll<SrsCard>('srsCards'), listLinks(), listAllEpisodes(), listAllSentences(), listSeries(),
  ])
  const bySource = new Map<string, SrsCard>()
  for (const c of cards) if (c.source) bySource.set(`${c.source.module}:${c.source.ref}`, c)
  const epMap = new Map(episodes.map((e) => [e.id, e]))
  const senMap = new Map(sentences.map((s) => [s.id, s]))
  const items: AnimeCardItem[] = []
  for (const link of links) {
    const card = bySource.get(link.key)
    if (!card) continue // thẻ đã bị xóa trong Ôn tập
    items.push({ card, link, episode: epMap.get(link.episodeId), sentence: link.sentenceId ? senMap.get(link.sentenceId) : undefined })
  }
  return { items, series, episodes, sentences }
}

export const seasonOf = (e: Pick<AnimeEpisode, 'season'>) => e.season ?? 1
export const isLearned = (c: SrsCard) => c.state === CardState.Review && !c.suspended
export const isDue = (c: SrsCard, now = Date.now()) => !c.suspended && !isBuried(c, now) && c.due <= now

/** Phạm vi ôn tập. */
export type ReviewScope =
  | { kind: 'all' }
  | { kind: 'series'; seriesId: string }
  | { kind: 'season'; seriesId: string; season: number }
  | { kind: 'episode'; episodeId: string }
  | { kind: 'recent'; seriesId?: string; count: number }

/** Các tập xem gần nhất (đã mở xem), mới nhất trước. */
export function recentEpisodes(episodes: AnimeEpisode[], count: number, seriesId?: string): AnimeEpisode[] {
  return episodes
    .filter((e) => e.lastWatchedAt && (!seriesId || e.seriesId === seriesId))
    .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0))
    .slice(0, count)
}

export function inScope(items: AnimeCardItem[], scope: ReviewScope, episodes: AnimeEpisode[]): AnimeCardItem[] {
  switch (scope.kind) {
    case 'all': return items
    case 'series': return items.filter((x) => x.link.seriesId === scope.seriesId)
    case 'season': return items.filter((x) => x.link.seriesId === scope.seriesId && x.episode && seasonOf(x.episode) === scope.season)
    case 'episode': return items.filter((x) => x.link.episodeId === scope.episodeId)
    case 'recent': {
      const ids = new Set(recentEpisodes(episodes, scope.count, scope.seriesId).map((e) => e.id))
      return items.filter((x) => ids.has(x.link.episodeId))
    }
  }
}

/** Bỏ trùng (một thẻ có thể gắn với nhiều tập: giữ tập đầu tiên). */
export function uniqueCards(items: AnimeCardItem[]): AnimeCardItem[] {
  const seen = new Set<string>()
  return items.filter((x) => (seen.has(x.card.id) ? false : (seen.add(x.card.id), true)))
}

export interface EpisodeProgress {
  cards: number
  learned: number
  due: number
  newWords: number // số thẻ từ (không tính thẻ câu) tạo từ tập này
  sentences: number
}

export function episodeProgress(data: AnimeData, episodeId: string, now = Date.now()): EpisodeProgress {
  const its = uniqueCards(data.items.filter((x) => x.link.episodeId === episodeId))
  return {
    cards: its.length,
    learned: its.filter((x) => isLearned(x.card)).length,
    due: its.filter((x) => isDue(x.card, now)).length,
    newWords: its.filter((x) => x.card.source?.module !== 'anime').length,
    sentences: data.sentences.filter((s) => s.episodeId === episodeId).length,
  }
}

export interface SeasonSummary {
  season: number
  episodes: AnimeEpisode[]
  watched: number
  studied: number
  cards: number
  learned: number
  /** Tỉ lệ đã học của mùa (0..1): trung bình giữa tỉ lệ tập đã học và tỉ lệ thẻ đã thuộc. */
  percent: number
}

export function seasonSummaries(data: AnimeData, seriesEpisodes: AnimeEpisode[]): SeasonSummary[] {
  const groups = new Map<number, AnimeEpisode[]>()
  for (const e of sortEpisodes(seriesEpisodes)) {
    const s = seasonOf(e)
    groups.set(s, [...(groups.get(s) ?? []), e])
  }
  return [...groups].sort((a, b) => a[0] - b[0]).map(([season, eps]) => {
    const ids = new Set(eps.map((e) => e.id))
    const its = uniqueCards(data.items.filter((x) => ids.has(x.link.episodeId)))
    const learned = its.filter((x) => isLearned(x.card)).length
    const studied = eps.filter((e) => e.studiedAt).length
    const parts = [studied / eps.length, ...(its.length ? [learned / its.length] : [])]
    return {
      season, episodes: eps, watched: eps.filter((e) => e.finishedAt).length, studied,
      cards: its.length, learned, percent: parts.reduce((a, b) => a + b, 0) / parts.length,
    }
  })
}

export interface LibraryStats {
  watchSeconds: number
  episodesWatched: number
  cards: number
  wordsLearned: number
  sentences: number
}

export function libraryStats(data: AnimeData, seriesId?: string): LibraryStats {
  const eps = seriesId ? data.episodes.filter((e) => e.seriesId === seriesId) : data.episodes
  const its = uniqueCards(seriesId ? data.items.filter((x) => x.link.seriesId === seriesId) : data.items)
  return {
    watchSeconds: eps.reduce((a, e) => a + (e.watchSeconds ?? 0), 0),
    episodesWatched: eps.filter((e) => e.finishedAt).length,
    cards: its.length,
    wordsLearned: its.filter((x) => x.card.kind === 'vocab' && x.card.source?.module !== 'anime' && isLearned(x.card)).length,
    sentences: (seriesId ? data.sentences.filter((s) => s.seriesId === seriesId) : data.sentences).length,
  }
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  if (h) return `${h} giờ ${m} phút`
  return `${m} phút`
}

/** Độ khó theo tốc độ nói (chữ / phút). */
export function speedLabel(cpm?: number): string | undefined {
  if (!cpm) return undefined
  if (cpm < 250) return 'nói chậm'
  if (cpm < 340) return 'tốc độ vừa'
  return 'nói nhanh'
}
