/**
 * SAO LƯU VÀ KHÔI PHỤC
 * --------------------
 * File sao lưu là một file .zip:
 *   hibi-backup.json            thông tin file (ngày tạo, máy tạo, số dòng mỗi bảng, cài đặt giao diện)
 *   stores/<bảng>/0000.json     dữ liệu học, mỗi phần tối đa 1000 dòng [khóa, giá trị]
 *   media/<id thẻ>/image.jpg    ảnh, tiếng của thẻ ôn tập, mỗi thứ một file riêng
 * Ghi và đọc từng phần, nên dữ liệu hàng trăm MB không làm trình duyệt hết bộ nhớ.
 * Vẫn đọc được file .json kiểu cũ (format 1).
 *
 * Khôi phục an toàn:
 *   - Trước khi khôi phục, app tự chụp một "bản an toàn" của dữ liệu hiện tại (bảng backupSnapshots),
 *     nên bấm "Hoàn tác khôi phục" là quay lại y như trước.
 *   - Chỉ thay những bảng CÓ trong file. File cũ chưa có một bảng (vd Kho từ) thì bảng đó giữ nguyên.
 *   - Lỗi giữa chừng: tự trả lại dữ liệu cũ từ bản an toàn.
 * Gói nội dung (từ điển...) không nằm trong file vì tải lại được, nhờ vậy file sao lưu nhỏ.
 */
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from 'fflate'
import { DB_VERSION, STORES, backupStores, splitCardMedia, MEDIA_FIELDS, type CardMediaRecord, type MediaField, type StoreName } from './schema'
import { promisify, transaction } from './idb'
import { onDbChange } from './events'
import { useSettings } from '../settings'
import { isZip, listZip, readZipEntry, readZipText, type ZipEntry } from './zipread'

/** Định dạng cũ: một file .json chứa mọi thứ. Vẫn khôi phục được. */
export interface BackupFile {
  app: 'hibi-nihongo'
  format: 1
  dbVersion: number
  createdAt: number
  /** Mỗi bảng là danh sách [khóa, giá trị]. */
  stores: Partial<Record<StoreName, [IDBValidKey, unknown][]>>
  /** Cài đặt giao diện (Sáng/Tối, cỡ chữ...). */
  settings?: unknown
}

/** File hibi-backup.json bên trong file .zip. */
export interface BackupManifest {
  app: 'hibi-nihongo'
  format: 2
  dbVersion: number
  createdAt: number
  /** Mã ngắn của máy tạo file (để nhận ra bản sao lưu từ máy khác). */
  deviceId: string
  stores: Partial<Record<StoreName, { rows: number; parts: number }>>
  /** Số file ảnh / tiếng trong thư mục media/. */
  media: number
  settings?: unknown
}

/** Xem trước một file sao lưu (trước khi khôi phục). */
export interface BackupSummary {
  format: 1 | 2
  createdAt: number
  dbVersion: number
  deviceId?: string
  /** Số dòng của từng bảng có trong file. */
  counts: Partial<Record<StoreName, number>>
  /** Số ảnh / tiếng của thẻ. */
  media: number
  hasSettings: boolean
  /** Bảng app đang dùng mà file không có: sẽ được GIỮ NGUYÊN khi khôi phục. */
  missing: StoreName[]
  size: number
}

export interface RestoreResult {
  records: number
  media: number
  /** Đã chụp bản an toàn trước khi khôi phục (bấm "Hoàn tác khôi phục" để quay lại). */
  snapshot: boolean
}

const SETTINGS_KEY = 'hibi-settings' // tên lưu của useSettings
const LAST_BACKUP_KEY = 'hibi-last-backup'
const LAST_CHANGE_KEY = 'hibi-last-change'
const DEVICE_KEY = 'hibi-device-id'
const MANIFEST = 'hibi-backup.json'
const ROWS_PER_PART = 1000
const NOT_OURS = 'File này không phải file sao lưu của Hibi Nihongo.'

// ---------- Máy này, lần đổi dữ liệu gần nhất ----------

/** Mã ngắn ngẫu nhiên của máy này (lưu trong trình duyệt / app, không nằm trong file sao lưu). */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2, 8).padEnd(6, '0')
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

/** Lần cuối dữ liệu học trên máy này thay đổi (dùng để biết bản sao lưu ở máy khác có mới hơn không). */
export function lastLocalChangeAt(): number {
  try { return Number(localStorage.getItem(LAST_CHANGE_KEY)) || 0 } catch { return 0 }
}

if (typeof window !== 'undefined') {
  onDbChange(backupStores, () => {
    try { localStorage.setItem(LAST_CHANGE_KEY, String(Date.now())) } catch { /* bỏ qua */ }
  })
}

// ---------- Ảnh, tiếng: data URL <-> file ----------

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav',
  'audio/x-wav': 'wav', 'audio/aac': 'aac', 'audio/flac': 'flac', 'video/webm': 'vwebm', 'video/mp4': 'mp4',
}
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXT).reverse().map(([m, e]) => [e, m]))

/** data URL → [đuôi file, nội dung]. Kiểu lạ thì giữ nguyên chuỗi trong file .dataurl. */
async function dataUrlToFile(url: string): Promise<[string, Uint8Array]> {
  const m = /^data:([^;,]*)[^,]*?(;base64)?,/.exec(url)
  const ext = m && m[2] ? EXT[m[1].toLowerCase()] : undefined
  if (ext) {
    try { return [ext, new Uint8Array(await (await fetch(url)).arrayBuffer())] } catch { /* thử cách khác */ }
    try {
      const bin = atob(url.slice(m![0].length))
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return [ext, out]
    } catch { /* lưu nguyên chuỗi */ }
  }
  return ['dataurl', strToU8(url)]
}

function bytesToBase64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

function fileToDataUrl(ext: string, bytes: Uint8Array): string {
  if (ext === 'dataurl') return new TextDecoder().decode(bytes)
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${bytesToBase64(bytes)}`
}

// ---------- Dấu vân tay (để sao lưu tự động biết dữ liệu có đổi không) ----------

class Hasher {
  private a = 0x811c9dc5
  private b = 0x01000193
  private n = 0
  update(s: string) {
    let a = this.a
    let b = this.b
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      a = Math.imul(a ^ c, 0x01000193)
      b = Math.imul(b ^ c, 0x5bd1e995) + 0x6b43a9b5
    }
    this.a = a
    this.b = b
    this.n += s.length
  }
  digest() { return `${(this.a >>> 0).toString(16)}${(this.b >>> 0).toString(16)}-${this.n}` }
}

// ---------- Tạo file sao lưu ----------

async function readPage(store: StoreName, after: IDBValidKey | undefined, n: number) {
  return transaction(store, 'readonly', async (tx) => {
    const os = tx.objectStore(store)
    const range = after === undefined ? null : IDBKeyRange.lowerBound(after, true)
    const [keys, values] = await Promise.all([promisify(os.getAllKeys(range, n)), promisify(os.getAll(range, n))])
    return { keys, values }
  })
}

export interface BuiltBackup {
  blob: Blob
  createdAt: number
  /** Dấu vân tay của dữ liệu (không tính thời điểm tạo). Giống nhau = dữ liệu không đổi. */
  hash: string
  /** Tổng số dòng (0 = chưa có dữ liệu học). */
  rows: number
  media: number
}

/**
 * Tạo file sao lưu .zip. Đọc từng phần, ghi từng phần, và gom thành Blob theo khối ~8 MB
 * (trình duyệt có thể cất Blob lớn xuống ổ đĩa), nên không cần giữ cả file trong bộ nhớ.
 */
export async function createBackupZip(): Promise<BuiltBackup> {
  const createdAt = Date.now()
  const hash = new Hasher()
  const blobs: Blob[] = []
  let pending: Uint8Array[] = []
  let pendingSize = 0
  let zipError: Error | null = null
  const flush = () => {
    if (!pending.length) return
    blobs.push(new Blob(pending as BlobPart[]))
    pending = []
    pendingSize = 0
  }
  const zip = new Zip((err, chunk, final) => {
    if (err) { zipError = err; return }
    pending.push(chunk)
    pendingSize += chunk.length
    if (pendingSize > 8_000_000 || final) flush()
  })
  const addText = (name: string, text: string) => {
    const f = new ZipDeflate(name, { level: 6 })
    zip.add(f)
    f.push(strToU8(text), true)
  }
  const addBytes = (name: string, data: Uint8Array) => {
    const f = new ZipPassThrough(name) // ảnh, tiếng đã nén sẵn: nén thêm chỉ tốn thời gian
    zip.add(f)
    f.push(data, true)
  }

  const manifest: BackupManifest = {
    app: 'hibi-nihongo', format: 2, dbVersion: DB_VERSION, createdAt, deviceId: deviceId(), stores: {}, media: 0,
  }
  let rows = 0
  for (const name of backupStores) {
    const media = name === 'srsMedia'
    let after: IDBValidKey | undefined
    let parts = 0
    let count = 0
    for (;;) {
      const { keys, values } = await readPage(name, after, media ? 25 : ROWS_PER_PART)
      if (!keys.length) break
      after = keys[keys.length - 1]
      count += keys.length
      if (media) {
        for (const rec of values as CardMediaRecord[]) {
          for (const f of MEDIA_FIELDS) {
            const v = rec[f]
            if (!v) continue
            const [ext, data] = await dataUrlToFile(v)
            addBytes(`media/${encodeURIComponent(rec.id)}/${f}.${ext}`, data)
            hash.update(`${rec.id}/${f}:${v.length}:${v.slice(-64)}`)
            manifest.media++
          }
        }
      } else {
        const text = JSON.stringify(keys.map((k, i) => [k, values[i]]))
        hash.update(name)
        hash.update(text)
        addText(`stores/${name}/${String(parts).padStart(4, '0')}.json`, text)
        parts++
      }
      if (zipError) throw zipError
      if (keys.length < (media ? 25 : ROWS_PER_PART)) break
    }
    manifest.stores[name] = { rows: count, parts }
    rows += count
  }
  try { manifest.settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') ?? undefined } catch { /* bỏ qua */ }
  if (manifest.settings) hash.update(JSON.stringify(manifest.settings))
  addText(MANIFEST, JSON.stringify(manifest))
  zip.end()
  if (zipError) throw zipError
  flush()
  return { blob: new Blob(blobs, { type: 'application/zip' }), createdAt, hash: hash.digest(), rows, media: manifest.media }
}

/** Định dạng cũ (một object .json). Giữ lại cho module nào còn cần đọc toàn bộ dữ liệu một lúc. */
export async function createBackup(): Promise<BackupFile> {
  const stores: BackupFile['stores'] = {}
  await transaction(backupStores, 'readonly', async (tx) => {
    for (const name of backupStores) {
      const os = tx.objectStore(name)
      const [keys, values] = await Promise.all([promisify(os.getAllKeys()), promisify(os.getAll())])
      stores[name] = keys.map((k, i) => [k, values[i]])
    }
  })
  let settings: unknown
  try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') ?? undefined } catch { /* bỏ qua */ }
  return { app: 'hibi-nihongo', format: 1, dbVersion: DB_VERSION, createdAt: Date.now(), stores, settings }
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Tạo file sao lưu và tải về máy (hiện hộp thoại lưu file). */
export async function downloadBackup(): Promise<void> {
  const b = await createBackupZip()
  saveBlob(b.blob, `hibi-nihongo-sao-luu-${new Date(b.createdAt).toISOString().slice(0, 10)}.zip`)
  markBackedUp(b.createdAt)
}

/** Ghi lại thời điểm vừa sao lưu (dùng cả cho sao lưu tự động: src/modules/autobackup). */
export function markBackedUp(at: number = Date.now()): void {
  try { localStorage.setItem(LAST_BACKUP_KEY, String(at)) } catch { /* bỏ qua */ }
}

export function lastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

// ---------- Đọc file sao lưu ----------

type Opened =
  | { kind: 'zip'; summary: BackupSummary; manifest: BackupManifest; entries: ZipEntry[] }
  | { kind: 'json'; summary: BackupSummary; data: BackupFile }

const isKnownStore = (s: string): s is StoreName => s in STORES && STORES[s as StoreName].backup

function checkVersion(v: number) {
  if (typeof v !== 'number') throw new Error(NOT_OURS)
  if (v > DB_VERSION) throw new Error('File sao lưu được tạo từ phiên bản app mới hơn. Hãy cập nhật app rồi thử lại.')
}

const missingOf = (present: StoreName[]) =>
  backupStores.filter((s) => s !== 'srsMedia' && !present.includes(s))

async function openBackup(input: Blob): Promise<Opened> {
  if (await isZip(input)) {
    const entries = await listZip(input)
    const m = entries.find((e) => e.name === MANIFEST)
    if (!m) throw new Error(NOT_OURS)
    let manifest: BackupManifest
    try { manifest = JSON.parse(await readZipText(input, m)) } catch { throw new Error(NOT_OURS) }
    if (manifest?.app !== 'hibi-nihongo' || manifest.format !== 2 || typeof manifest.stores !== 'object') throw new Error(NOT_OURS)
    checkVersion(manifest.dbVersion)
    const present = (Object.keys(manifest.stores) as string[]).filter(isKnownStore)
    const counts: BackupSummary['counts'] = {}
    for (const s of present) counts[s] = manifest.stores[s]!.rows
    return {
      kind: 'zip', manifest, entries,
      summary: {
        format: 2, createdAt: manifest.createdAt, dbVersion: manifest.dbVersion, deviceId: manifest.deviceId,
        counts, media: manifest.media ?? 0, hasSettings: !!manifest.settings, missing: missingOf(present), size: input.size,
      },
    }
  }
  let data: BackupFile
  try { data = JSON.parse(await input.text()) } catch { throw new Error(NOT_OURS) }
  if (data?.app !== 'hibi-nihongo' || data.format !== 1 || typeof data.stores !== 'object') throw new Error(NOT_OURS)
  checkVersion(data.dbVersion)
  const present = (Object.keys(data.stores) as string[]).filter(isKnownStore)
  const counts: BackupSummary['counts'] = {}
  let media = 0
  for (const s of present) counts[s] = data.stores[s]?.length ?? 0
  for (const [, v] of data.stores.srsCards ?? []) {
    const c = v as Partial<Record<MediaField, unknown>>
    media += MEDIA_FIELDS.filter((f) => typeof c[f] === 'string' && c[f]).length
  }
  return {
    kind: 'json', data,
    summary: {
      format: 1, createdAt: data.createdAt, dbVersion: data.dbVersion, counts, media,
      hasSettings: !!data.settings, missing: missingOf(present), size: input.size,
    },
  }
}

/** Xem trước file sao lưu: tạo lúc nào, có bao nhiêu dòng mỗi bảng. Không thay đổi gì. */
export async function inspectBackup(input: Blob): Promise<BackupSummary> {
  return (await openBackup(input)).summary
}

// ---------- Bản an toàn trước khi khôi phục ----------

export interface RestoreSnapshotInfo {
  createdAt: number
  size: number
  /** Khôi phục từ file nào (tên file), để hiện cho dễ nhớ. */
  label?: string
}
interface SnapshotRow extends RestoreSnapshotInfo { id: string; blob: Blob }
const SNAPSHOT_ID = 'before-restore'

/** Không chụp được bản an toàn (thường do máy hết chỗ). Giao diện cho chọn "vẫn khôi phục". */
export class SafetySnapshotError extends Error {
  constructor(cause: unknown) {
    super(`Không chụp được bản an toàn của dữ liệu hiện tại (${cause instanceof Error ? cause.message : String(cause)}). Nên tải file sao lưu dữ liệu hiện tại về trước, rồi mới khôi phục.`)
    this.name = 'SafetySnapshotError'
  }
}

async function saveSnapshot(label?: string): Promise<void> {
  try {
    const b = await createBackupZip()
    const row: SnapshotRow = { id: SNAPSHOT_ID, createdAt: b.createdAt, size: b.blob.size, label, blob: b.blob }
    await transaction('backupSnapshots', 'readwrite', (tx) => { tx.objectStore('backupSnapshots').put(row) })
  } catch (e) {
    throw new SafetySnapshotError(e)
  }
}

async function snapshotRow(): Promise<SnapshotRow | undefined> {
  return transaction('backupSnapshots', 'readonly', (tx) =>
    promisify<SnapshotRow | undefined>(tx.objectStore('backupSnapshots').get(SNAPSHOT_ID)))
}

/** Bản an toàn của lần khôi phục gần nhất (null = không có). */
export async function getRestoreSnapshot(): Promise<RestoreSnapshotInfo | null> {
  const r = await snapshotRow()
  return r ? { createdAt: r.createdAt, size: r.size, label: r.label } : null
}

/** Hoàn tác lần khôi phục gần nhất: đưa dữ liệu về đúng như trước khi khôi phục. */
export async function undoLastRestore(onProgress?: (done: number, total: number) => void): Promise<RestoreResult> {
  const r = await snapshotRow()
  if (!r) throw new Error('Không còn bản an toàn để hoàn tác.')
  const res = await restoreBackup(r.blob, { safety: false, onProgress })
  await deleteRestoreSnapshot()
  return res
}

export async function deleteRestoreSnapshot(): Promise<void> {
  await transaction('backupSnapshots', 'readwrite', (tx) => { tx.objectStore('backupSnapshots').delete(SNAPSHOT_ID) })
}

export async function downloadRestoreSnapshot(): Promise<void> {
  const r = await snapshotRow()
  if (!r) throw new Error('Không còn bản an toàn.')
  saveBlob(r.blob, `hibi-nihongo-ban-an-toan-${new Date(r.createdAt).toISOString().slice(0, 10)}.zip`)
}

// ---------- Khôi phục ----------

/** Ghi một nhóm dòng vào bảng. Thẻ ôn tập còn chứa ảnh/tiếng (file cũ) thì tách sang srsMedia. */
async function putRows(name: StoreName, rows: [IDBValidKey, unknown][]): Promise<number> {
  const stores: StoreName[] = name === 'srsCards' ? ['srsCards', 'srsMedia'] : [name]
  await transaction(stores, 'readwrite', (tx) => {
    const os = tx.objectStore(name)
    const inline = os.keyPath !== null
    for (const [key, raw] of rows) {
      let value = raw
      if (name === 'srsCards' && raw && typeof raw === 'object') {
        const split = splitCardMedia(raw as { id: string })
        value = split.card
        if (split.media) tx.objectStore('srsMedia').put(split.media)
      }
      // Bảng có khóa nằm trong giá trị (keyPath) thì không được truyền khóa riêng
      if (inline) os.put(value)
      else os.put(value, key)
    }
  })
  return rows.length
}

/**
 * Khôi phục từ file sao lưu (.zip mới hoặc .json cũ).
 * - safety (mặc định bật): chụp bản an toàn trước, để hoàn tác được và để tự quay lại nếu lỗi giữa chừng.
 * - Chỉ thay các bảng có trong file; bảng file không có thì giữ nguyên.
 */
export async function restoreBackup(
  input: Blob | BackupFile,
  opts: { safety?: boolean; label?: string; onProgress?: (done: number, total: number) => void } = {},
): Promise<RestoreResult> {
  const blob = input instanceof Blob ? input : new Blob([JSON.stringify(input)], { type: 'application/json' })
  const src = await openBackup(blob)
  const present = Object.keys(src.summary.counts) as StoreName[]
  // Thẻ ôn tập được thay thì ảnh/tiếng của thẻ cũng thay theo
  const targets = [...new Set<StoreName>([...present, ...(present.includes('srsCards') ? ['srsMedia' as const] : [])])]

  const snapshot = opts.safety !== false
  if (snapshot) await saveSnapshot(opts.label ?? (input instanceof File ? input.name : undefined))

  let records = 0
  let media = 0
  try {
    await transaction(targets, 'readwrite', (tx) => { for (const s of targets) tx.objectStore(s).clear() })
    if (src.kind === 'json') {
      const total = present.length
      let done = 0
      for (const name of present) {
        const rows = src.data.stores[name] ?? []
        for (let i = 0; i < rows.length; i += ROWS_PER_PART) records += await putRows(name, rows.slice(i, i + ROWS_PER_PART))
        opts.onProgress?.(++done, total)
      }
    } else {
      const dataEntries = src.entries.filter((e) => e.name.startsWith('stores/'))
      const mediaEntries = src.entries.filter((e) => e.name.startsWith('media/'))
      const total = dataEntries.length + mediaEntries.length
      let done = 0
      for (const e of dataEntries.sort((a, b) => a.name.localeCompare(b.name))) {
        const name = e.name.split('/')[1]
        if (isKnownStore(name) && name !== 'srsMedia') records += await putRows(name, JSON.parse(await readZipText(blob, e)))
        opts.onProgress?.(++done, total)
      }
      // Ảnh, tiếng: gom theo thẻ, ghi từng nhóm nhỏ
      if (present.includes('srsMedia')) {
        const byCard = new Map<string, ZipEntry[]>()
        for (const e of mediaEntries) {
          const [, id] = e.name.split('/')
          byCard.set(id, [...(byCard.get(id) ?? []), e])
        }
        let batch: CardMediaRecord[] = []
        const flush = async () => {
          if (!batch.length) return
          const rows = batch
          batch = []
          await transaction('srsMedia', 'readwrite', (tx) => { for (const r of rows) tx.objectStore('srsMedia').put(r) })
        }
        for (const [id, files] of byCard) {
          const rec: CardMediaRecord = { id: decodeURIComponent(id) }
          for (const e of files) {
            const file = e.name.split('/')[2] ?? ''
            const dot = file.indexOf('.')
            const field = file.slice(0, dot) as MediaField
            if (!MEDIA_FIELDS.includes(field)) continue
            rec[field] = await fileToDataUrl(file.slice(dot + 1), await readZipEntry(blob, e))
            media++
            opts.onProgress?.(++done, total)
          }
          batch.push(rec)
          if (batch.length >= 20) await flush()
        }
        await flush()
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (snapshot) {
      const r = await snapshotRow().catch(() => undefined)
      const back = r ? await restoreBackup(r.blob, { safety: false }).then(() => true, () => false) : false
      if (back) throw new Error(`Khôi phục bị lỗi giữa chừng (${msg}). Dữ liệu cũ đã được trả lại như trước.`)
    }
    throw new Error(`Khôi phục bị lỗi giữa chừng: ${msg}`)
  }

  const settings = src.kind === 'zip' ? src.manifest.settings : src.data.settings
  if (settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      await useSettings.persist.rehydrate()
    } catch { /* bỏ qua */ }
  }
  return { records, media, snapshot }
}
