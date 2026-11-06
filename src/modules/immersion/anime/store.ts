/**
 * ĐỌC/GHI DỮ LIỆU ANIME trong kho offline (IndexedDB, qua '@/core/db').
 * Bảng: animeSeries, animeEpisodes, animeSubs (có sao lưu), animeMedia (không sao lưu).
 */
import { get, getAll, getAllByIndex, put, transaction, promisify, kvGet, kvSet } from '@/core/db'
import { naturalCompare } from '../manga/naming'
import {
  DEFAULT_PLAYER_PREFS, type AnimeClip, type AnimeEpisode, type AnimeMedia, type AnimeSeries, type AnimeSubs,
  type CardLink, type PlayerPrefs, type SavedSentence, type SubTrack,
} from './types'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// ----- Series -----

export async function listSeries(): Promise<AnimeSeries[]> {
  const all = await getAll<AnimeSeries>('animeSeries')
  return all.sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0) || naturalCompare(a.title, b.title))
}

export const getSeries = (id: string) => get<AnimeSeries>('animeSeries', id)

export async function createSeries(title: string, titleJp?: string): Promise<AnimeSeries> {
  const now = Date.now()
  const s: AnimeSeries = { id: newId(), title: title.trim() || 'Anime chưa đặt tên', titleJp: titleJp?.trim() || undefined, createdAt: now, updatedAt: now }
  await put('animeSeries', s)
  return s
}

export async function updateSeries(id: string, patch: Partial<Omit<AnimeSeries, 'id'>>): Promise<void> {
  await transaction('animeSeries', 'readwrite', async (tx) => {
    const os = tx.objectStore('animeSeries')
    const s = await promisify<AnimeSeries | undefined>(os.get(id))
    if (s) os.put({ ...s, ...patch, updatedAt: Date.now() })
  })
}

const subRange = (episodeId: string) => IDBKeyRange.bound([episodeId, ''], [episodeId, '￿'])

/** Xóa series cùng mọi tập, phụ đề và video đã chép. (File gốc trên máy KHÔNG bị xóa.) */
export async function deleteSeries(id: string): Promise<void> {
  const eps = await listEpisodes(id)
  const sentences = await listSentencesBySeries(id)
  await transaction(['animeSeries', 'animeEpisodes', 'animeSubs', 'animeMedia', 'animeSentences', 'animeClips'], 'readwrite', (tx) => {
    for (const e of eps) {
      tx.objectStore('animeEpisodes').delete(e.id)
      tx.objectStore('animeSubs').delete(subRange(e.id))
      tx.objectStore('animeMedia').delete(e.id)
    }
    for (const x of sentences) {
      tx.objectStore('animeSentences').delete(x.id)
      tx.objectStore('animeClips').delete(x.id)
    }
    tx.objectStore('animeSeries').delete(id)
  })
}

// ----- Tập phim -----

/** Sắp tập theo mùa → số tập → tên file. */
export function sortEpisodes(list: AnimeEpisode[]): AnimeEpisode[] {
  return list.sort((a, b) =>
    (a.season ?? -1) - (b.season ?? -1) ||
    (a.number ?? Infinity) - (b.number ?? Infinity) ||
    naturalCompare(a.fileName, b.fileName))
}

export async function listEpisodes(seriesId: string): Promise<AnimeEpisode[]> {
  return sortEpisodes(await getAllByIndex<AnimeEpisode>('animeEpisodes', 'by_series', seriesId))
}

export const listAllEpisodes = () => getAll<AnimeEpisode>('animeEpisodes')
export const getEpisode = (id: string) => get<AnimeEpisode>('animeEpisodes', id)

export async function updateEpisode(id: string, patch: Partial<Omit<AnimeEpisode, 'id'>>): Promise<void> {
  await transaction('animeEpisodes', 'readwrite', async (tx) => {
    const os = tx.objectStore('animeEpisodes')
    const e = await promisify<AnimeEpisode | undefined>(os.get(id))
    if (e) os.put({ ...e, ...patch })
  })
}

/**
 * Lưu một tập cùng phụ đề và video trong MỘT giao dịch.
 * subs: undefined = giữ phụ đề cũ; null = xóa track đó.
 */
export async function saveEpisode(
  ep: AnimeEpisode,
  opts: { media?: AnimeMedia | null; subs?: Partial<Record<SubTrack, AnimeSubs | null>> } = {},
): Promise<void> {
  await transaction(['animeEpisodes', 'animeSubs', 'animeMedia', 'animeSeries'], 'readwrite', async (tx) => {
    tx.objectStore('animeEpisodes').put(ep)
    if (opts.media) tx.objectStore('animeMedia').put(opts.media)
    else if (opts.media === null) tx.objectStore('animeMedia').delete(ep.id)
    for (const track of ['jp', 'tr'] as SubTrack[]) {
      const v = opts.subs?.[track]
      if (v) tx.objectStore('animeSubs').put(v)
      else if (v === null) tx.objectStore('animeSubs').delete([ep.id, track])
    }
    const ss = tx.objectStore('animeSeries')
    const s = await promisify<AnimeSeries | undefined>(ss.get(ep.seriesId))
    if (s) ss.put({ ...s, updatedAt: Date.now() })
  })
}

export async function deleteEpisode(id: string): Promise<void> {
  const sentences = await listSentences(id)
  await transaction(['animeEpisodes', 'animeSubs', 'animeMedia', 'animeSeries', 'animeSentences', 'animeClips'], 'readwrite', async (tx) => {
    for (const x of sentences) {
      tx.objectStore('animeSentences').delete(x.id)
      tx.objectStore('animeClips').delete(x.id)
    }
    const e = await promisify<AnimeEpisode | undefined>(tx.objectStore('animeEpisodes').get(id))
    tx.objectStore('animeEpisodes').delete(id)
    tx.objectStore('animeSubs').delete(subRange(id))
    tx.objectStore('animeMedia').delete(id)
    if (e) {
      const ss = tx.objectStore('animeSeries')
      const s = await promisify<AnimeSeries | undefined>(ss.get(e.seriesId))
      if (s && s.lastEpisodeId === id) ss.put({ ...s, lastEpisodeId: undefined })
    }
  })
}

// ----- Phụ đề -----

export const getSubs = (episodeId: string, track: SubTrack) => get<AnimeSubs>('animeSubs', [episodeId, track])

export async function putSubs(subs: AnimeSubs): Promise<void> {
  await put('animeSubs', subs)
}

// ----- Video -----

export const getMedia = (episodeId: string) => get<AnimeMedia>('animeMedia', episodeId)
export const putMedia = (m: AnimeMedia) => put('animeMedia', m)

/** Tập nào đang có video gắn sẵn (dùng để hiện "thiếu video" trong danh sách). */
export async function episodesWithMedia(ids: string[]): Promise<Set<string>> {
  const found = await Promise.all(ids.map((id) => getMedia(id)))
  return new Set(found.flatMap((m) => (m ? [m.episodeId] : [])))
}

// ----- Tiến độ xem (Smart Resume) -----

/** Đã xem gần hết (chỉ còn đoạn nhạc cuối) thì tính là xem xong. */
export const isNearEnd = (pos: number, duration: number) => duration > 0 && duration - pos <= Math.min(120, duration * 0.1)

export async function saveProgress(episodeId: string, position: number, duration?: number): Promise<void> {
  const now = Date.now()
  await transaction(['animeEpisodes', 'animeSeries'], 'readwrite', async (tx) => {
    const es = tx.objectStore('animeEpisodes')
    const e = await promisify<AnimeEpisode | undefined>(es.get(episodeId))
    if (!e) return
    const dur = duration && Number.isFinite(duration) ? duration : e.duration
    const done = dur ? isNearEnd(position, dur) : false
    es.put({ ...e, position, duration: dur, lastWatchedAt: now, finishedAt: done ? (e.finishedAt ?? now) : e.finishedAt })
    const ss = tx.objectStore('animeSeries')
    const s = await promisify<AnimeSeries | undefined>(ss.get(e.seriesId))
    if (s) ss.put({ ...s, lastWatchedAt: now, lastEpisodeId: episodeId, status: s.status === 'completed' ? s.status : 'watching' })
  })
}

/** Cộng thời gian đã xem (giây) vào tập, để thống kê. */
export async function addWatchTime(episodeId: string, seconds: number): Promise<void> {
  if (seconds <= 0) return
  await transaction('animeEpisodes', 'readwrite', async (tx) => {
    const os = tx.objectStore('animeEpisodes')
    const e = await promisify<AnimeEpisode | undefined>(os.get(episodeId))
    if (e) os.put({ ...e, watchSeconds: (e.watchSeconds ?? 0) + seconds })
  })
}

export async function setFinished(episodeId: string, finished: boolean): Promise<void> {
  await updateEpisode(episodeId, finished ? { finishedAt: Date.now() } : { finishedAt: undefined, position: 0 })
}

// ----- Cài đặt trình phát -----

const PREFS_KEY = 'anime:prefs'

export async function getPlayerPrefs(): Promise<PlayerPrefs> {
  return { ...DEFAULT_PLAYER_PREFS, ...(await kvGet<Partial<PlayerPrefs>>(PREFS_KEY, {})) }
}
export const savePlayerPrefs = (p: PlayerPrefs) => kvSet(PREFS_KEY, p)

// ----- Từ đã biết -----
// Đã chuyển sang Kho từ dùng chung: '@/modules/vocab/api' (setWordStatus, useKnowledge...).
// Danh sách cũ ở kv 'anime:known' được module vocab tự chuyển sang rồi xóa.

// ----- Câu đã lưu + ảnh/âm thanh -----

export const listSentences = (episodeId: string) => getAllByIndex<SavedSentence>('animeSentences', 'by_episode', episodeId)
export const listSentencesBySeries = (seriesId: string) => getAllByIndex<SavedSentence>('animeSentences', 'by_series', seriesId)
export const listAllSentences = () => getAll<SavedSentence>('animeSentences')
export const getSentence = (id: string) => get<SavedSentence>('animeSentences', id)
export const getClip = (id: string) => get<AnimeClip>('animeClips', id)

export async function saveSentence(x: SavedSentence, clip?: AnimeClip): Promise<void> {
  await transaction(['animeSentences', 'animeClips'], 'readwrite', (tx) => {
    tx.objectStore('animeSentences').put({ ...x, hasImage: !!clip?.image || x.hasImage, hasAudio: !!clip?.audio || x.hasAudio })
    if (clip) tx.objectStore('animeClips').put(clip)
  })
}

export async function updateSentence(id: string, patch: Partial<Omit<SavedSentence, 'id'>>): Promise<void> {
  await transaction('animeSentences', 'readwrite', async (tx) => {
    const os = tx.objectStore('animeSentences')
    const x = await promisify<SavedSentence | undefined>(os.get(id))
    if (x) os.put({ ...x, ...patch })
  })
}

/** Thêm ảnh / âm thanh cho câu đã lưu (ghi âm xong sau khi đã lưu câu). */
export async function updateClip(id: string, patch: Partial<Omit<AnimeClip, 'id'>>): Promise<void> {
  await transaction(['animeClips', 'animeSentences'], 'readwrite', async (tx) => {
    const cs = tx.objectStore('animeClips')
    const c = await promisify<AnimeClip | undefined>(cs.get(id))
    cs.put({ ...(c ?? { id }), ...patch })
    const ss = tx.objectStore('animeSentences')
    const x = await promisify<SavedSentence | undefined>(ss.get(id))
    if (x) ss.put({ ...x, hasImage: x.hasImage || !!patch.image, hasAudio: x.hasAudio || !!patch.audio })
  })
}

export async function deleteSentence(id: string): Promise<void> {
  await transaction(['animeSentences', 'animeClips'], 'readwrite', (tx) => {
    tx.objectStore('animeSentences').delete(id)
    tx.objectStore('animeClips').delete(id)
  })
}

// ----- Liên kết thẻ ôn tập ↔ tập anime -----

export const linkKey = (src: { module: string; ref: string }) => `${src.module}:${src.ref}`
export const listLinks = () => getAll<CardLink>('animeLinks')
export const listLinksBySeries = (seriesId: string) => getAllByIndex<CardLink>('animeLinks', 'by_series', seriesId)

/** Ghi nhớ thẻ này đến từ tập nào. Thẻ đã có liên kết (từ tập trước) thì giữ nguyên tập đầu tiên. */
export async function addLinks(links: CardLink[]): Promise<void> {
  if (!links.length) return
  await transaction('animeLinks', 'readwrite', async (tx) => {
    const os = tx.objectStore('animeLinks')
    for (const l of links) {
      const old = await promisify<CardLink | undefined>(os.get(l.key))
      if (!old) os.put(l)
      else if (!old.sentenceId && l.sentenceId) os.put({ ...old, sentenceId: l.sentenceId, category: l.category ?? old.category })
    }
  })
}
