/**
 * ĐỌC FILE BỘ THẺ ANKI (.apkg / .colpkg)
 * --------------------------------------
 * File .apkg là file ZIP, bên trong có:
 *   - collection.anki21b : cơ sở dữ liệu SQLite nén zstd (Anki 2.1.50 trở lên, kiểu mới nhất)
 *   - collection.anki21  : SQLite thường (Anki 2.1.x)
 *   - collection.anki2   : SQLite kiểu cũ (Anki 2.0). Ở file xuất từ Anki mới, file này chỉ là
 *                          một thẻ giả "Hãy cập nhật Anki", nên luôn ưu tiên hai file trên.
 *   - media              : danh sách file ảnh/âm thanh (JSON ở bản cũ, protobuf nén zstd ở bản mới)
 *   - 0, 1, 2, …         : chính các file ảnh/âm thanh, đặt tên bằng số
 *
 * Trong Anki, một "ghi chú" (note) có nhiều "trường" (field) như Front / Back / Reading…
 * và sinh ra một hoặc nhiều "thẻ" (card). Mỗi thẻ có lịch ôn riêng.
 */
import { unzipSync, strFromU8 } from 'fflate'
import { decompress as zstdDecompress } from 'fzstd'
import type { Database } from 'sql.js'
import { getSql } from './sqlite'
import { pbString, readFields } from './protobuf'

export interface AnkiNoteType {
  id: number
  name: string
  fields: string[]
  cloze: boolean
}

export interface AnkiCard {
  id: number
  ord: number
  deckId: number
  type: number // 0 mới · 1 đang học · 2 ôn theo ngày · 3 học lại
  queue: number // -1 tạm ẩn · -2/-3 chôn · 0 mới · 1/3 đang học · 2 ôn
  due: number
  ivl: number // khoảng cách (ngày); số âm = giây
  factor: number // độ dễ ‰ (2500 = 250%)
  reps: number
  lapses: number
  /** Trạng thái trí nhớ FSRS nếu người dùng đã bật FSRS trong Anki. */
  fsrs?: { s: number; d: number }
}

export interface AnkiNote {
  id: number
  guid: string
  typeId: number
  fields: string[]
  tags: string[]
  cards: AnkiCard[]
}

export interface AnkiPackage {
  fileName: string
  format: 'anki21b' | 'anki21' | 'anki2'
  /** Thời điểm tạo bộ sưu tập (giây). Ngày đến hạn của thẻ được tính từ mốc này. */
  createdSec: number
  noteTypes: Map<number, AnkiNoteType>
  decks: Map<number, string>
  notes: AnkiNote[]
  /** Tên file media có trong gói (vd "panel.jpg"). */
  mediaNames: Set<string>
  /** Lấy file media theo tên. Gọi readMedia một lần cho nhiều file để giải nén nhanh hơn. */
  readMedia: (names: string[]) => Map<string, Blob>
}

const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd]
const isZstd = (b: Uint8Array) => ZSTD_MAGIC.every((x, i) => b[i] === x)
const maybeZstd = (b: Uint8Array) => (isZstd(b) ? zstdDecompress(b) : b)

export class AnkiReadError extends Error {}

export async function readApkg(file: File): Promise<AnkiPackage> {
  const zipBytes = new Uint8Array(await file.arrayBuffer())
  const wanted = new Set(['collection.anki21b', 'collection.anki21', 'collection.anki2', 'media'])
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(zipBytes, { filter: (f) => wanted.has(f.name) })
  } catch {
    throw new AnkiReadError('File này không phải gói Anki (.apkg). Hãy xuất lại từ Anki: Tệp → Xuất → “Gói bộ thẻ Anki”.')
  }
  const format = entries['collection.anki21b'] ? 'anki21b' : entries['collection.anki21'] ? 'anki21' : entries['collection.anki2'] ? 'anki2' : null
  if (!format) throw new AnkiReadError('Không tìm thấy dữ liệu thẻ trong file. Có thể file bị hỏng.')
  const raw = entries[`collection.${format}`]
  const dbBytes = format === 'anki21b' ? zstdDecompress(raw) : raw

  // Danh sách media: tên file thật → tên trong ZIP ("0", "1", …)
  const mediaMap = new Map<string, string>()
  if (entries.media?.length) {
    const m = maybeZstd(entries.media)
    if (m[0] === 0x7b /* { */) {
      for (const [zipName, real] of Object.entries(JSON.parse(strFromU8(m)) as Record<string, string>)) mediaMap.set(real, zipName)
    } else {
      // protobuf: MediaEntries { repeated MediaEntry entries = 1 } · MediaEntry { name = 1; …; legacy_zip_filename = 255 }
      readFields(m).filter((f) => f.no === 1 && f.bytes).forEach((f, i) => {
        const e = readFields(f.bytes!)
        const name = pbString(e.find((x) => x.no === 1)?.bytes)
        const legacy = e.find((x) => x.no === 255)?.int
        if (name) mediaMap.set(name, String(legacy ?? i))
      })
    }
  }

  const SQL = await getSql()
  const db = new SQL.Database(dbBytes)
  try {
    const pkg = readCollection(db)
    return {
      fileName: file.name,
      format,
      ...pkg,
      mediaNames: new Set(mediaMap.keys()),
      readMedia: (names) => {
        const zipNames = new Map<string, string>()
        for (const n of names) { const z = mediaMap.get(n); if (z) zipNames.set(z, n) }
        const out = new Map<string, Blob>()
        if (!zipNames.size) return out
        const files = unzipSync(zipBytes, { filter: (f) => zipNames.has(f.name) })
        for (const [z, data] of Object.entries(files)) {
          const name = zipNames.get(z)!
          out.set(name, new Blob([maybeZstd(data) as Uint8Array<ArrayBuffer>], { type: mimeOf(name) }))
        }
        return out
      },
    }
  } finally {
    db.close()
  }
}

function mimeOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', avif: 'image/avif',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
    aac: 'audio/aac', flac: 'audio/flac', webm: 'audio/webm', weba: 'audio/webm', spx: 'audio/ogg',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

/** Chạy câu lệnh SQL, trả về mảng dòng (mỗi dòng là mảng giá trị). */
function rows(db: Database, sql: string): unknown[][] {
  const r = db.exec(sql)
  return r[0]?.values ?? []
}

function readCollection(db: Database) {
  const hasTable = (name: string) => rows(db, `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${name}'`).length > 0
  const createdSec = Number(rows(db, 'SELECT crt FROM col')[0]?.[0] ?? 0)
  const noteTypes = new Map<number, AnkiNoteType>()
  const decks = new Map<number, string>()

  if (hasTable('notetypes')) {
    // Kiểu mới (schema 18): mỗi loại ghi chú, trường, bộ thẻ nằm ở bảng riêng
    for (const [id, name, config] of rows(db, 'SELECT id, name, config FROM notetypes')) {
      // NotetypeConfig: trường số 1 là "kind" (0 thường, 1 cloze)
      const kind = config instanceof Uint8Array ? readFields(config).find((f) => f.no === 1)?.int : 0
      noteTypes.set(Number(id), { id: Number(id), name: String(name), fields: [], cloze: kind === 1 })
    }
    for (const [ntid, , name] of rows(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')) {
      noteTypes.get(Number(ntid))?.fields.push(String(name))
    }
    for (const [id, name] of rows(db, 'SELECT id, name FROM decks')) {
      decks.set(Number(id), String(name).replaceAll('\x1f', '::')) // bộ con: "Cha\x1fCon" → "Cha::Con"
    }
  } else {
    // Kiểu cũ (schema 11): loại ghi chú và bộ thẻ là JSON trong bảng col
    const [models, deckJson] = rows(db, 'SELECT models, decks FROM col')[0] as [string, string]
    for (const m of Object.values(JSON.parse(models || '{}') as Record<string, { id: number; name: string; type?: number; flds: { name: string; ord: number }[] }>)) {
      noteTypes.set(Number(m.id), {
        id: Number(m.id),
        name: m.name,
        fields: [...m.flds].sort((a, b) => a.ord - b.ord).map((f) => f.name),
        cloze: m.type === 1,
      })
    }
    for (const d of Object.values(JSON.parse(deckJson || '{}') as Record<string, { id: number; name: string }>)) {
      decks.set(Number(d.id), d.name)
    }
  }

  const notes = new Map<number, AnkiNote>()
  for (const [id, guid, mid, tags, flds] of rows(db, 'SELECT id, guid, mid, tags, flds FROM notes')) {
    notes.set(Number(id), {
      id: Number(id),
      guid: String(guid),
      typeId: Number(mid),
      fields: String(flds).split('\x1f'),
      tags: String(tags).trim().split(/\s+/).filter(Boolean),
      cards: [],
    })
  }
  const cardSql = 'SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses, odue, odid, data FROM cards ORDER BY nid, ord'
  for (const [id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses, odue, odid, data] of rows(db, cardSql)) {
    const note = notes.get(Number(nid))
    if (!note) continue
    // Thẻ đang nằm trong "bộ lọc" (filtered deck): lấy bộ gốc và hạn gốc
    const inFiltered = Number(odid) !== 0
    note.cards.push({
      id: Number(id),
      ord: Number(ord),
      deckId: Number(inFiltered ? odid : did),
      type: Number(type),
      queue: Number(queue),
      due: Number(inFiltered && Number(odue) ? odue : due),
      ivl: Number(ivl),
      factor: Number(factor),
      reps: Number(reps),
      lapses: Number(lapses),
      fsrs: parseFsrs(data),
    })
  }

  // Bản xuất từ Anki mới có kèm collection.anki2 giả chỉ để báo "hãy cập nhật Anki"
  return { createdSec, noteTypes, decks, notes: [...notes.values()].filter((n) => n.cards.length > 0) }
}

function parseFsrs(data: unknown): AnkiCard['fsrs'] {
  if (typeof data !== 'string' || !data.startsWith('{')) return undefined
  try {
    const j = JSON.parse(data) as { s?: number; d?: number }
    return typeof j.s === 'number' && typeof j.d === 'number' && j.s > 0 ? { s: j.s, d: j.d } : undefined
  } catch {
    return undefined
  }
}
