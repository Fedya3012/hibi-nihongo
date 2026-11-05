/**
 * HỘI THOẠI / BÀI NGHE / BÀI ĐỌC CỦA BÀI
 * Bạn dán chữ từ sách, mỗi dòng một câu. Nhận được:
 *   ミラー：はじめまして。 | Xin chào (lần đầu gặp).
 *   [0:12] 山田：どうぞよろしく。 | Rất mong được giúp đỡ.
 *   山田：どうぞよろしく。        ← dòng sau không có chữ Nhật thì coi là bản dịch của câu trên
 *   Rất mong được giúp đỡ.
 * "Tên：" hoặc "Tên:" ở đầu dòng là người nói; "[phút:giây]" ở đầu dòng là thời điểm trong audio.
 * Audio là file của bạn (bảng textbookMedia, không sao lưu).
 */
import { get, put, remove } from '@/core/db'
import { hasJapanese } from '@/modules/dictionary'
import { makeId, updateLesson } from '../store'
import type { Lesson, LessonAudio, Track, TrackLine, TrackSection } from '../types'

const TIME = /^\[?(\d{1,2}):(\d{2}(?:\.\d+)?)\]?\s*/
const SPEAKER = /^([^\s:：「」『』。、|｜[\]]{1,12})\s*[:：]\s*/

export function parseTrackText(text: string): TrackLine[] {
  const out: TrackLine[] = []
  for (const raw of text.split(/\r?\n/)) {
    let s = raw.trim()
    if (!s) continue
    let t: number | undefined
    const tm = s.match(TIME)
    if (tm) { t = Number(tm[1]) * 60 + Number(tm[2]); s = s.slice(tm[0].length) }
    const prev = out[out.length - 1]
    // Dòng không có chữ Nhật ngay sau một câu chưa có dịch → bản dịch của câu đó
    if (!hasJapanese(s) && prev && !prev.vi && t == null) { prev.vi = s; continue }
    let speaker: string | undefined
    const sp = s.match(SPEAKER)
    if (sp) { speaker = sp[1]; s = s.slice(sp[0].length) }
    const [jp, ...vi] = s.split(/\s*[|｜]\s*/)
    if (!jp.trim()) continue
    out.push({ id: makeId(), speaker, jp: jp.trim(), vi: vi.join(' | ').trim() || undefined, t })
  }
  return out
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`

/** Ngược lại parseTrackText (để sửa). */
export function trackToText(lines: TrackLine[]): string {
  return lines.map((l) => [
    l.t != null ? `[${fmt(l.t)}] ` : '',
    l.speaker ? `${l.speaker}：` : '',
    l.jp,
    l.vi ? ` | ${l.vi}` : '',
  ].join('')).join('\n')
}

export const formatTime = fmt

export function newTrack(section: TrackSection): Track {
  return { id: makeId(), section, lines: [], createdAt: Date.now() }
}

/** Lưu (thêm mới hoặc sửa) một đoạn của bài. */
export const saveTrack = (bookId: string, n: number, tr: Track) => updateLesson(bookId, n, (l) => {
  const list = l.tracks ?? []
  const i = list.findIndex((x) => x.id === tr.id)
  return { ...l, tracks: i < 0 ? [...list, tr] : list.map((x) => (x.id === tr.id ? tr : x)) }
})

export async function deleteTrack(bookId: string, n: number, tr: Track) {
  await updateLesson(bookId, n, (l) => ({ ...l, tracks: (l.tracks ?? []).filter((x) => x.id !== tr.id) }))
  if (tr.audioId) await remove('textbookMedia', tr.audioId)
}

export const tracksOf = (l: Lesson, section: TrackSection) => (l.tracks ?? []).filter((t) => t.section === section)

/* ---------- Audio ---------- */

export async function addAudio(lessonId: string, f: File): Promise<string> {
  const a: LessonAudio = { id: makeId(), lessonId, kind: 'audio', name: f.name, size: f.size, blob: f, createdAt: Date.now() }
  await put('textbookMedia', a)
  return a.id
}

export const getAudio = (id: string) => get<LessonAudio>('textbookMedia', id)
export const removeAudio = (id: string) => remove('textbookMedia', id)

/** Câu đang phát ở giây `time` (câu có mốc lớn nhất ≤ time). -1 nếu chưa tới câu nào. */
export function lineAt(lines: TrackLine[], time: number): number {
  let best = -1
  lines.forEach((l, i) => { if (l.t != null && l.t <= time + 0.05 && (best < 0 || l.t >= (lines[best].t ?? 0))) best = i })
  return best
}

/** Khoảng phát của câu i: [bắt đầu, kết thúc) (kết thúc = mốc câu sau, hoặc hết file). */
export function lineRange(lines: TrackLine[], i: number, duration: number): [number, number] | null {
  const start = lines[i]?.t
  if (start == null) return null
  const next = lines.slice(i + 1).find((l) => l.t != null && l.t > start)?.t
  return [start, next ?? duration]
}

export const isSynced = (lines: TrackLine[]) => lines.length > 0 && lines.every((l) => l.t != null)
