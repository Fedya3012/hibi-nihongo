/**
 * ĐỌC FILE PHỤ ĐỀ: .srt, .vtt, .ass / .ssa
 * Kết quả là danh sách dòng { s: bắt đầu (ms), e: kết thúc (ms), t: chữ }, đã bỏ mã định dạng.
 *
 * Phụ đề tiếng Nhật cũ hay lưu bằng bảng mã Shift_JIS (không phải UTF-8),
 * nên hàm decodeText tự thử vài bảng mã cho tới khi đọc được.
 */
import type { Cue } from './types'

export const SUB_EXT = ['srt', 'vtt', 'ass', 'ssa']
export const VIDEO_EXT = ['mp4', 'm4v', 'mkv', 'webm', 'mov', 'ogv', 'avi', 'ts']

const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase()
export const isSubName = (name: string) => SUB_EXT.includes(extOf(name))
export const isVideoName = (name: string) => VIDEO_EXT.includes(extOf(name))

/** Đọc chữ từ file, tự nhận bảng mã: UTF-8 (có/không BOM), UTF-16, Shift_JIS, EUC-JP. */
export function decodeText(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf)
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3))
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2))
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2))
  for (const enc of ['utf-8', 'shift_jis', 'euc-jp']) {
    try { return new TextDecoder(enc, { fatal: true }).decode(b) } catch { /* thử bảng mã tiếp theo */ }
  }
  return new TextDecoder('utf-8').decode(b)
}

/** "01:02:03,456", "02:03.456", "1:02:03.45" (ASS) → mili giây. */
function parseTime(s: string): number {
  const m = s.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/)
  if (!m) return NaN
  const frac = m[4] ? Number(m[4].padEnd(3, '0')) : 0
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + frac
}

/** Bỏ thẻ HTML (<i>, <font>, <c.vang>...), giữ chữ gốc của furigana (<ruby>漢字<rt>かんじ</rt></ruby> → 漢字). */
export function stripHtml(t: string): string {
  return t
    .replace(/<rt>[\s\S]*?<\/rt>|<rp>[\s\S]*?<\/rp>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\\[^}]*\}/g, '') // mã ASS lọt vào file SRT, ví dụ {\an8}
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}

export const clean = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')

/** SRT và VTT có cấu trúc gần giống nhau: các khối cách nhau một dòng trống, dòng thời gian có "-->". */
function parseSrtVtt(text: string): Cue[] {
  const cues: Cue[] = []
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue // WEBVTT, NOTE, STYLE... không phải dòng phụ đề
    const [a, rest] = lines[i].split('-->')
    const s = parseTime(a)
    const e = parseTime(rest.trim().split(/\s+/)[0]) // bỏ phần cài đặt vị trí của VTT
    const t = clean(stripHtml(lines.slice(i + 1).join('\n')))
    if (Number.isFinite(s) && Number.isFinite(e) && t) cues.push({ s, e, t })
  }
  return cues
}

/** Chữ của một dòng ASS: bỏ mã hiệu ứng {\\...}, \\N = xuống dòng. Trả về '' nếu là hình vẽ (\\p1). */
export function assText(raw: string): string {
  if (/\\p[1-9]/.test(raw)) return '' // hình vẽ (biển hiệu, logo), không phải lời thoại
  return clean(raw.replace(/\{[^}]*\}/g, '').replace(/\\[Nn]/g, '\n').replace(/\\h/g, ' '))
}

/** ASS/SSA: đọc mục [Events], các dòng "Dialogue:". Bỏ mã hiệu ứng {\...} và hình vẽ (\p1). */
function parseAss(text: string): Cue[] {
  const cues: Cue[] = []
  let inEvents = false
  let fields = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text']
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('[')) { inEvents = /^\[events\]/i.test(line); continue }
    if (!inEvents) continue
    if (/^format\s*:/i.test(line)) {
      fields = line.slice(line.indexOf(':') + 1).split(',').map((f) => f.trim().toLowerCase())
      continue
    }
    if (!/^dialogue\s*:/i.test(line)) continue
    const body = line.slice(line.indexOf(':') + 1)
    // Phần Text là trường cuối và có thể chứa dấu phẩy → chỉ tách (số trường - 1) lần
    const parts: string[] = []
    let rest = body
    for (let k = 0; k < fields.length - 1; k++) {
      const j = rest.indexOf(',')
      if (j < 0) break
      parts.push(rest.slice(0, j))
      rest = rest.slice(j + 1)
    }
    parts.push(rest)
    const get = (f: string) => parts[fields.indexOf(f)] ?? ''
    const t = assText(get('text'))
    const s = parseTime(get('start'))
    const e = parseTime(get('end'))
    const n = get('name').trim() || undefined
    if (Number.isFinite(s) && Number.isFinite(e) && t) cues.push(n ? { s, e, t, n } : { s, e, t })
  }
  return cues
}

/** Đọc nội dung phụ đề theo đuôi file (đoán theo nội dung nếu đuôi lạ). */
export function parseSubtitles(text: string, fileName = ''): Cue[] {
  const ext = extOf(fileName)
  const isAss = ext === 'ass' || ext === 'ssa' || (!SUB_EXT.includes(ext) && /^\[script info\]/im.test(text))
  const cues = isAss ? parseAss(text) : parseSrtVtt(text)
  return tidyCues(cues)
}

/** Sắp theo thời gian, bỏ dòng trùng hệt nhau (hiệu ứng karaoke hay tạo nhiều bản sao). */
export function tidyCues(cues: Cue[]): Cue[] {
  cues.sort((a, b) => a.s - b.s || a.e - b.e)
  const out: Cue[] = []
  const seen = new Set<string>()
  for (const c of cues) {
    if (c.e <= c.s) c.e = c.s + 1500
    const key = `${c.s}|${c.e}|${c.t}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export async function readSubtitleFile(file: File): Promise<Cue[]> {
  return parseSubtitles(decodeText(await file.arrayBuffer()), file.name)
}

/** Phụ đề này có phải tiếng Nhật không? (có kana trong phần lớn các dòng; tiếng Trung không có kana) */
export function looksJapanese(cues: Cue[]): boolean {
  if (!cues.length) return false
  const withKana = cues.filter((c) => /[぀-ヿ]/.test(c.t)).length
  return withKana / cues.length >= 0.3
}

/**
 * Tìm các dòng đang hiện ở thời điểm `ms` (đã cộng lệch phụ đề).
 * Danh sách đã sắp theo thời gian bắt đầu → tìm nhị phân dòng cuối cùng bắt đầu trước `ms`.
 */
export function lastStartedIndex(cues: Cue[], ms: number): number {
  let lo = 0, hi = cues.length - 1, ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cues[mid].s <= ms) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

export function activeCues(cues: Cue[], ms: number): number[] {
  const out: number[] = []
  // Dòng dài có thể bắt đầu sớm hơn vài dòng ngắn → lùi lại tối đa 8 dòng để tìm
  const last = lastStartedIndex(cues, ms)
  for (let i = last; i >= 0 && i >= last - 8; i--) {
    if (cues[i].e > ms) out.unshift(i)
  }
  return out
}

/** "1:02:03" hoặc "2:03" từ số giây. */
export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}
