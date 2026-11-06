/**
 * ĐỌC PHỤ ĐỀ NHÚNG TRONG FILE .MKV (Matroska)
 *
 * File .mkv giống một "hộp" chứa nhiều luồng: video, âm thanh, phụ đề. Phụ đề dạng chữ
 * (S_TEXT/ASS, S_TEXT/UTF8 = SRT, S_TEXT/WEBVTT) nằm rải rác suốt file, nên app phải đọc lướt cả file
 * (từng khúc 16 MB, không nạp hết vào bộ nhớ). File 1 GB mất khoảng vài giây đến vài chục giây.
 *
 * Phụ đề dạng ảnh (PGS/VobSub của đĩa Blu-ray/DVD) không đọc được chữ nên bị bỏ qua.
 * Cấu trúc file theo chuẩn EBML: mỗi phần tử = [ID][độ dài][nội dung], ID và độ dài là số "vint" 1–8 byte.
 */
import { unzlibSync } from 'fflate'
import type { Cue } from './types'
import { assText, clean, stripHtml, tidyCues } from './subtitles'

export interface EmbeddedTrack {
  number: number
  codec: string
  /** Mã ngôn ngữ: jpn, eng, vie... (có thể không có) */
  lang?: string
  name?: string
  cues: Cue[]
}

const ID = {
  EBML: 0x1a45dfa3, Segment: 0x18538067, Info: 0x1549a966, TimecodeScale: 0x2ad7b1,
  Tracks: 0x1654ae6b, TrackEntry: 0xae, TrackNumber: 0xd7, TrackType: 0x83, CodecID: 0x86,
  Language: 0x22b59c, LanguageIETF: 0x22b59d, Name: 0x536e, CodecPrivate: 0x63a2,
  ContentEncodings: 0x6d80, ContentEncoding: 0x6240, ContentCompression: 0x5034,
  ContentCompAlgo: 0x4254, ContentCompSettings: 0x4255,
  Cluster: 0x1f43b675, Timecode: 0xe7, SimpleBlock: 0xa3, BlockGroup: 0xa0, Block: 0xa1, BlockDuration: 0x9b,
}

const TEXT_CODECS = ['S_TEXT/UTF8', 'S_TEXT/ASS', 'S_TEXT/SSA', 'S_TEXT/WEBVTT', 'S_TEXT/ASCII']
const CHUNK = 16 * 1024 * 1024

/** Đọc file theo khúc lớn, giữ một khúc trong bộ nhớ. */
class Reader {
  private buf = new Uint8Array(0)
  private start = 0
  constructor(private blob: Blob) {}
  get size() { return this.blob.size }
  /** Bảo đảm có n byte bắt đầu từ vị trí pos trong bộ nhớ. */
  async ensure(pos: number, n: number) {
    if (pos >= this.start && pos + n <= this.start + this.buf.length) return
    const end = Math.min(this.size, pos + Math.max(n, CHUNK))
    this.buf = new Uint8Array(await this.blob.slice(pos, end).arrayBuffer())
    this.start = pos
  }
  byte(pos: number) { return this.buf[pos - this.start] }
  bytes(pos: number, n: number) { return this.buf.subarray(pos - this.start, pos - this.start + n) }
}

const decoder = new TextDecoder('utf-8')

/** Đọc một số vint. keepMarker = true cho ID (giữ bit đánh dấu độ dài). */
async function vint(r: Reader, pos: number, keepMarker: boolean): Promise<{ value: number; len: number; unknown: boolean }> {
  await r.ensure(pos, 8)
  const first = r.byte(pos)
  let len = 1
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++
  if (len > 8) throw new Error('File MKV hỏng (vint)')
  let value = keepMarker ? first : first & (0xff >> len)
  let allOnes = value === (0xff >> len)
  for (let i = 1; i < len; i++) {
    const b = r.byte(pos + i)
    value = value * 256 + b
    if (b !== 0xff) allOnes = false
  }
  return { value, len, unknown: !keepMarker && allOnes }
}

const uint = (b: Uint8Array) => b.reduce((v, x) => v * 256 + x, 0)

interface TrackInfo extends EmbeddedTrack {
  type: number
  zlib?: boolean
  strip?: Uint8Array // nén kiểu "bỏ phần đầu": phải ghép lại phần đầu này
}

function payloadText(track: TrackInfo, raw: Uint8Array): { t: string; n?: string } {
  let data = raw
  if (track.zlib) { try { data = unzlibSync(raw) } catch { return { t: '' } } }
  else if (track.strip) { const x = new Uint8Array(track.strip.length + raw.length); x.set(track.strip); x.set(raw, track.strip.length); data = x }
  const text = decoder.decode(data)
  if (track.codec === 'S_TEXT/ASS' || track.codec === 'S_TEXT/SSA') {
    // ReadOrder, Layer, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const parts = text.split(',')
    if (parts.length < 9) return { t: assText(text) }
    return { t: assText(parts.slice(8).join(',')), n: parts[3].trim() || undefined }
  }
  return { t: clean(stripHtml(text.replace(/\r\n?/g, '\n'))) }
}

/**
 * Liệt kê các phụ đề chữ nhúng trong file MKV/WebM, kèm toàn bộ dòng phụ đề.
 * onProgress(0..1) báo tiến độ đọc file.
 */
export async function extractEmbeddedSubs(file: Blob, onProgress?: (p: number) => void): Promise<EmbeddedTrack[]> {
  const r = new Reader(file)
  const tracks = new Map<number, TrackInfo>()
  let scale = 1_000_000 // TimecodeScale mặc định: 1 ms (đơn vị ns)
  let clusterTime = 0
  let lastReport = 0

  // Đọc tiêu đề phần tử tại pos → { id, size, dataStart }
  const header = async (pos: number) => {
    const id = await vint(r, pos, true)
    const size = await vint(r, pos + id.len, false)
    return { id: id.value, size: size.unknown ? Infinity : size.value, dataStart: pos + id.len + size.len }
  }

  const readChildren = async (start: number, end: number, fn: (id: number, dataStart: number, size: number) => Promise<void> | void) => {
    let pos = start
    while (pos < end && pos < r.size - 2) {
      const h = await header(pos)
      await fn(h.id, h.dataStart, h.size)
      if (h.size === Infinity) return
      pos = h.dataStart + h.size
    }
  }
  const data = async (pos: number, size: number) => { await r.ensure(pos, size); return r.bytes(pos, size) }

  const parseTrack = async (start: number, end: number) => {
    const t: TrackInfo = { number: 0, type: 0, codec: '', cues: [] }
    await readChildren(start, end, async (id, ds, sz) => {
      if (id === ID.TrackNumber) t.number = uint(await data(ds, sz))
      else if (id === ID.TrackType) t.type = uint(await data(ds, sz))
      else if (id === ID.CodecID) t.codec = decoder.decode(await data(ds, sz)).replace(/\0+$/, '')
      else if (id === ID.Language) t.lang ??= decoder.decode(await data(ds, sz)).replace(/\0+$/, '')
      else if (id === ID.LanguageIETF) t.lang = decoder.decode(await data(ds, sz)).replace(/\0+$/, '')
      else if (id === ID.Name) t.name = decoder.decode(await data(ds, sz)).replace(/\0+$/, '')
      else if (id === ID.ContentEncodings) {
        await readChildren(ds, ds + sz, (id2, ds2, sz2) => (id2 !== ID.ContentEncoding ? undefined
          : readChildren(ds2, ds2 + sz2, (id3, ds3, sz3) => {
            if (id3 !== ID.ContentCompression) return
            t.zlib = true // không ghi thuật toán = zlib (mặc định của chuẩn)
            return readChildren(ds3, ds3 + sz3, async (id4, ds4, sz4) => {
              if (id4 === ID.ContentCompAlgo) t.zlib = uint(await data(ds4, sz4)) === 0
              else if (id4 === ID.ContentCompSettings) t.strip = (await data(ds4, sz4)).slice()
            })
          })))
        if (!t.zlib && t.strip === undefined) t.zlib = false
        if (t.zlib) t.strip = undefined
      }
    })
    if (t.type === 0x11 && TEXT_CODECS.includes(t.codec)) tracks.set(t.number, t)
  }

  const handleBlock = async (ds: number, size: number, duration?: number) => {
    const tn = await vint(r, ds, false)
    const track = tracks.get(tn.value)
    if (!track) return
    await r.ensure(ds + tn.len, 3)
    const b = r.bytes(ds + tn.len, 2)
    const rel = (b[0] << 8 | b[1]) << 16 >> 16 // số có dấu 16 bit
    const head = tn.len + 3
    const raw = (await data(ds + head, size - head)).slice()
    const { t, n } = payloadText(track, raw)
    if (!t) return
    const s = ((clusterTime + rel) * scale) / 1e6
    const e = duration != null ? s + (duration * scale) / 1e6 : NaN
    track.cues.push(n ? { s, e, t, n } : { s, e, t })
  }

  const parseCluster = async (start: number, end: number): Promise<void> => {
    await readChildren(start, end, async (id, ds, sz) => {
      if (id === ID.Timecode) clusterTime = uint(await data(ds, sz))
      else if (id === ID.Cluster) await parseCluster(ds, sz === Infinity ? end : ds + sz) // sau một Cluster không rõ độ dài
      else if (id === ID.SimpleBlock) await handleBlock(ds, sz)
      else if (id === ID.BlockGroup) {
        let blockPos = -1, blockSize = 0, dur: number | undefined
        await readChildren(ds, ds + sz, async (id2, ds2, sz2) => {
          if (id2 === ID.Block) { blockPos = ds2; blockSize = sz2 }
          else if (id2 === ID.BlockDuration) dur = uint(await data(ds2, sz2))
        })
        if (blockPos >= 0) await handleBlock(blockPos, blockSize, dur)
      }
    })
    if (onProgress && end - lastReport > 8 * 1024 * 1024) { lastReport = end; onProgress(Math.min(1, end / r.size)) }
  }

  // Phần tử gốc: EBML (tiêu đề) rồi Segment
  let pos = 0
  let seenTracks = false
  while (pos < r.size - 2) {
    const h = await header(pos)
    if (h.id === ID.EBML) { pos = h.dataStart + h.size; continue }
    if (h.id !== ID.Segment) throw new Error('Không phải file Matroska/WebM')
    const segEnd = h.size === Infinity ? r.size : h.dataStart + h.size
    let p = h.dataStart
    while (p < segEnd && p < r.size - 2) {
      const c = await header(p)
      if (c.id === ID.Info) {
        await readChildren(c.dataStart, c.dataStart + c.size, async (id, ds, sz) => { if (id === ID.TimecodeScale) scale = uint(await data(ds, sz)) })
      } else if (c.id === ID.Tracks) {
        await readChildren(c.dataStart, c.dataStart + c.size, (id, ds, sz) => (id === ID.TrackEntry ? parseTrack(ds, ds + sz) : undefined))
        seenTracks = true
        if (!tracks.size) return [] // không có phụ đề chữ → khỏi đọc hết file
      } else if (c.id === ID.Cluster) {
        if (seenTracks && !tracks.size) return []
        // Cluster không rõ độ dài (file ghi trực tiếp): đọc tới khi gặp Cluster kế tiếp
        const end = c.size === Infinity ? segEnd : c.dataStart + c.size
        await parseCluster(c.dataStart, end)
        if (c.size === Infinity) break
      }
      if (c.size === Infinity) break
      p = c.dataStart + c.size
    }
    break
  }
  onProgress?.(1)

  return [...tracks.values()].map(({ number, codec, lang, name, cues }) => {
    // Dòng không ghi thời lượng: kết thúc khi dòng sau bắt đầu (tối đa 6 giây)
    const sorted = [...cues].sort((a, b) => a.s - b.s)
    sorted.forEach((c, i) => { if (!Number.isFinite(c.e)) c.e = Math.min(c.s + 6000, sorted[i + 1]?.s ?? c.s + 3000) })
    return { number, codec, lang, name, cues: tidyCues(sorted) }
  })
}

/** Phụ đề này có vẻ là tiếng Nhật không (theo mã ngôn ngữ, nếu có). */
export const isJapaneseLang = (lang?: string) => !!lang && /^(ja|jp|jpn)\b/i.test(lang)
