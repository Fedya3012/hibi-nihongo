/**
 * NHẬP ANIME: ghép file video với file phụ đề, đoán số tập và tên series.
 *
 * Ghép theo thứ tự ưu tiên:
 *   1. Cùng tên file (bỏ đuôi và mã ngôn ngữ): "Frieren - 05.mkv" ↔ "Frieren - 05.ja.srt"
 *   2. Cùng số tập: "[Nhóm] Frieren - 05 (1080p).mkv" ↔ "frieren_ep05.ass"
 * Phụ đề có kana → phụ đề tiếng Nhật; không có → phụ đề dịch (tiếng Việt/Anh) để đối chiếu.
 */
import { baseName, guessChapter, guessSeriesTitle, naturalCompare, stripExt } from '../manga/naming'
import { isSubName, isVideoName, looksJapanese, readSubtitleFile } from './subtitles'
import { makeMedia, type PickedFile } from './media'
import { getEpisode, newId, saveEpisode } from './store'
import type { AnimeEpisode, Cue } from './types'

export interface ParsedSub {
  file: File
  cues: Cue[]
  japanese: boolean
  error?: string
}

export interface EpisodeDraft {
  key: string
  number: number | null
  season: number | null
  title: string
  video?: PickedFile
  /** Index trong danh sách phụ đề (ImportPlan.subs), -1 = không có. */
  jp: number
  tr: number
  /** Tập đã có trong series (nhập lại cùng tên file → giữ chỗ đang xem). */
  existingId?: string
}

export interface ImportPlan {
  drafts: EpisodeDraft[]
  subs: ParsedSub[]
  ignored: string[]
  seriesGuess: string
}

/** Tên để so khớp: bỏ đuôi, mã ngôn ngữ (.ja, .jpn, .vi, .en...), ngoặc, ký tự phân cách. */
const LANG = /[._-](?:ja|jp|jpn|japanese|vi|vie|vn|en|eng|english|zh|chs|cht|default|forced|cc|sdh)$/i
export function matchKey(name: string): string {
  let s = stripExt(baseName(name))
  while (LANG.test(s)) s = s.replace(LANG, '')
  return s.toLowerCase().replace(/[\s._\-[\]()【】]+/g, '')
}

/** Đoán mùa và số tập. Hỗ trợ "S01E05", "第5話", "- 05", "Ep 5", "#05"... */
export function guessEpisode(name: string): { season: number | null; number: number | null } {
  const s = stripExt(baseName(name))
  const se = s.match(/s(\d{1,2})[\s._-]*e(\d{1,4}(?:\.\d)?)/i)
  if (se) return { season: Number(se[1]), number: Number(se[2]) }
  // Bỏ độ phân giải, mã hóa, năm để không bị nhầm thành số tập
  const cleaned = s
    .replace(/\b(?:\d{3,4}p|[xh]\.?26[45]|hevc|av1|10bit|8bit|aac|flac|bd|web(?:-?dl|rip)?|x\d{3,4})\b/gi, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\[[0-9a-f]{8}\]/gi, ' ')
  const season = cleaned.match(/(?:season|mùa|s)\s*(\d{1,2})(?!\d)/i)?.[1]
  const g = guessChapter(cleaned.replace(/(?:season|mùa)\s*\d{1,2}(?!\d)|\bs\d{1,2}\b/gi, ' '))
  return { season: season ? Number(season) : null, number: g.number }
}

export async function planImport(
  files: PickedFile[],
  existing: AnimeEpisode[] = [],
): Promise<ImportPlan> {
  const videos = files.filter((f) => isVideoName(f.file.name)).sort((a, b) => naturalCompare(a.file.name, b.file.name))
  const subFiles = files.filter((f) => isSubName(f.file.name)).sort((a, b) => naturalCompare(a.file.name, b.file.name))
  const ignored = files.filter((f) => !isVideoName(f.file.name) && !isSubName(f.file.name)).map((f) => f.file.name)

  const subs: ParsedSub[] = await Promise.all(subFiles.map(async ({ file }) => {
    try {
      const cues = await readSubtitleFile(file)
      return { file, cues, japanese: looksJapanese(cues), error: cues.length ? undefined : 'Không đọc được dòng phụ đề nào' }
    } catch {
      return { file, cues: [], japanese: false, error: 'Không đọc được file' }
    }
  }))

  const used = new Set<number>()
  const findSub = (key: string, num: number | null, japanese: boolean): number => {
    const ok = (i: number) => !used.has(i) && !subs[i].error && subs[i].japanese === japanese
    let i = subs.findIndex((s, k) => ok(k) && matchKey(s.file.name) === key)
    if (i < 0 && num != null) i = subs.findIndex((s, k) => ok(k) && guessEpisode(s.file.name).number === num)
    if (i >= 0) used.add(i)
    return i
  }

  const drafts: EpisodeDraft[] = videos.map((v) => {
    const { season, number } = guessEpisode(v.file.name)
    const key = matchKey(v.file.name)
    const ex = existing.find((e) => e.fileName === v.file.name)
    return {
      key: v.file.name, number: ex?.number ?? number, season: ex?.season ?? season,
      title: ex?.title ?? stripExt(baseName(v.file.name)), video: v, existingId: ex?.id,
      jp: findSub(key, number, true), tr: findSub(key, number, false),
    }
  })

  // Phụ đề tiếng Nhật chưa ghép được với video nào → tập chỉ có phụ đề (gắn video sau),
  // hoặc thêm phụ đề cho tập đã có sẵn trong series (khớp theo số tập).
  subs.forEach((s, i) => {
    if (used.has(i) || s.error || !s.japanese) return
    const { season, number } = guessEpisode(s.file.name)
    const ex = existing.find((e) => matchKey(e.fileName) === matchKey(s.file.name)) ??
      (number != null ? existing.find((e) => e.number === number) : undefined)
    used.add(i)
    drafts.push({
      key: s.file.name, number: ex?.number ?? number, season: ex?.season ?? season,
      title: ex?.title ?? stripExt(baseName(s.file.name)).replace(LANG, ''),
      existingId: ex?.id, jp: i, tr: findSub(matchKey(s.file.name), number, false),
    })
  })

  drafts.sort((a, b) => (a.season ?? -1) - (b.season ?? -1) || (a.number ?? Infinity) - (b.number ?? Infinity) || naturalCompare(a.key, b.key))
  return {
    drafts, subs, ignored,
    seriesGuess: guessSeriesTitle([...videos, ...subFiles].map((f) => f.file.name)
      .map((n) => n.replace(/s\d{1,2}[\s._-]*e\d{1,4}/i, ' '))),
  }
}

/** Nhãn tập dễ đọc: "Tập 5", "Mùa 2 · Tập 5". */
export function episodeLabel(e: { number: number | null; season?: number | null; title: string }): string {
  const parts: string[] = []
  if (e.season != null) parts.push(`Mùa ${e.season}`)
  if (e.number != null) parts.push(`Tập ${e.number}`)
  return parts.length ? parts.join(' · ') : e.title
}

/**
 * Lưu các tập đã duyệt vào kho. Tập đã có (nhập lại) giữ nguyên chỗ đang xem và lệch phụ đề.
 * copy = chép video vào app (tốn dung lượng, nhưng không phải chọn lại file).
 */
export async function commitImport(
  seriesId: string,
  plan: ImportPlan,
  drafts: EpisodeDraft[],
  copy: boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const ids: string[] = []
  let done = 0
  for (const d of drafts) {
    const old = d.existingId ? await getEpisode(d.existingId) : undefined
    const id = old?.id ?? newId()
    const jp = d.jp >= 0 ? plan.subs[d.jp] : undefined
    const tr = d.tr >= 0 ? plan.subs[d.tr] : undefined
    const ep: AnimeEpisode = {
      id, seriesId,
      title: d.title, number: d.number, season: d.season,
      fileName: d.video?.file.name ?? old?.fileName ?? d.key,
      size: d.video?.file.size ?? old?.size ?? 0,
      addedAt: old?.addedAt ?? Date.now(),
      duration: old?.duration,
      position: old?.position ?? 0,
      lastWatchedAt: old?.lastWatchedAt,
      finishedAt: old?.finishedAt,
      subOffset: jp ? 0 : (old?.subOffset ?? 0), // phụ đề mới → đặt lại lệch phụ đề
      subFile: jp?.file.name ?? old?.subFile,
      trFile: tr?.file.name ?? old?.trFile,
      // Phụ đề mới → bỏ số liệu phân tích cũ, sẽ phân tích lại
      stats: jp ? undefined : old?.stats,
    }
    const media = d.video ? makeMedia(id, d.video, copy) : undefined
    await saveEpisode(ep, {
      media,
      subs: {
        jp: jp ? { episodeId: id, track: 'jp', fileName: jp.file.name, cues: jp.cues } : undefined,
        tr: tr ? { episodeId: id, track: 'tr', fileName: tr.file.name, cues: tr.cues } : undefined,
      },
    })
    ids.push(id)
    onProgress?.(++done, drafts.length)
  }
  return ids
}
