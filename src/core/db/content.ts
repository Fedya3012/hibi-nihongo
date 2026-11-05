/**
 * GÓI NỘI DUNG CÓ PHIÊN BẢN
 * -------------------------
 * Nội dung lớn (từ điển JMdict, KANJIDIC, câu ví dụ...) được chia thành "gói" (pack).
 * Mỗi gói có số phiên bản. Khi có bản mới, app chỉ tải PHẦN THAY ĐỔI (bản vá / patch)
 * thay vì tải lại cả gói. Nếu thiếu bản vá thì mới tải bản đầy đủ.
 *
 * Trên mạng có một file danh mục (manifest.json) liệt kê các gói, phiên bản mới nhất,
 * link bản đầy đủ và các bản vá. Định dạng các file xem trong README.md cùng thư mục.
 * File có đuôi .gz được tự giải nén.
 */
import { promisify, transaction, get, getAll, getAllByIndex } from './idb'

// ----- Kiểu dữ liệu -----

/** Một mục nội dung, ví dụ một từ trong từ điển. `data` do module sở hữu gói tự định nghĩa. */
export interface PackItem<D = unknown> {
  pack: string
  id: string
  /** Loại mục trong gói, ví dụ 'word', 'kanji', 'sentence'. */
  kind?: string
  /** Các chuỗi dùng để tra cứu nhanh: chữ viết, cách đọc... (xem findByKey). */
  keys?: string[]
  data: D
}

/** Mục nội dung như trong file gói (chưa có trường pack). */
export type PackFileItem<D = unknown> = Omit<PackItem<D>, 'pack'>

export interface InstalledPack {
  id: string
  title: string
  version: number
  itemCount: number
  /** 'installing' = đang cài dở (ví dụ bị tắt app giữa chừng); lần cập nhật sau sẽ cài lại đầy đủ. */
  status: 'ready' | 'installing'
  license?: string
  installedAt: number
  updatedAt: number
}

/** File gói đầy đủ. */
export interface PackFull<D = unknown> {
  format: 1
  type: 'full'
  pack: string
  version: number
  title?: string
  license?: string
  items: PackFileItem<D>[]
}

/** File bản vá: đưa gói từ phiên bản `from` lên `to`. */
export interface PackPatch<D = unknown> {
  format: 1
  type: 'patch'
  pack: string
  from: number
  to: number
  /** Mục mới hoặc mục được sửa (ghi đè theo id). */
  upsert?: PackFileItem<D>[]
  /** id các mục bị xóa. */
  delete?: string[]
}

export interface RemoteFile {
  url: string // đường dẫn tuyệt đối, hoặc tương đối so với vị trí manifest.json
  size?: number // byte, để hiện dung lượng sẽ tải
  sha256?: string // mã kiểm tra (hex) để chắc file tải về không bị hỏng
}

export interface ManifestPack {
  id: string
  title: string
  description?: string
  license?: string
  version: number
  full: RemoteFile
  patches?: (RemoteFile & { from: number; to: number })[]
}

export interface PackManifest {
  format: 1
  packs: ManifestPack[]
}

export interface UpdatePlanItem {
  pack: ManifestPack
  installedVersion: number | null // null = chưa cài
  /** 'patch' = chỉ tải phần thay đổi, 'full' = tải cả gói. */
  method: 'patch' | 'full'
  files: RemoteFile[]
  downloadSize: number | null // null = không biết trước
}

export interface Progress {
  pack: string
  phase: 'download' | 'install'
  done: number
  total: number
}

/** Danh mục gói mặc định: public/content/manifest.json (đi kèm app). Đổi được bằng biến VITE_CONTENT_MANIFEST_URL. */
export const DEFAULT_MANIFEST_URL: string =
  import.meta.env.VITE_CONTENT_MANIFEST_URL ?? `${import.meta.env.BASE_URL}content/manifest.json`

const BATCH = 5000 // số mục ghi trong một giao dịch khi cài gói lớn

/** Khoảng khóa bao trọn mọi mục của một gói (khóa là [pack, id], id là chuỗi). */
const packRange = (pack: string) => IDBKeyRange.bound([pack], [pack, []])

// ----- Đọc nội dung -----

export function listPacks(): Promise<InstalledPack[]> {
  return getAll<InstalledPack>('packs')
}

export function getPack(id: string): Promise<InstalledPack | undefined> {
  return get<InstalledPack>('packs', id)
}

export function getItem<D = unknown>(pack: string, id: string): Promise<PackItem<D> | undefined> {
  return get<PackItem<D>>('packItems', [pack, id])
}

/** Tra chính xác theo khóa tra cứu: findByKey('たべる') → các mục có 'たべる' trong keys. */
export async function findByKey<D = unknown>(
  key: string, opts: { pack?: string; limit?: number } = {},
): Promise<PackItem<D>[]> {
  const rows = await getAllByIndex<PackItem<D>>('packItems', 'by_key', key, opts.pack ? undefined : opts.limit)
  return opts.pack ? rows.filter((r) => r.pack === opts.pack).slice(0, opts.limit) : rows
}

/** Tra theo phần đầu của khóa: findByKeyPrefix('たべ') → たべる, たべもの... */
export async function findByKeyPrefix<D = unknown>(
  prefix: string, opts: { pack?: string; limit?: number } = {},
): Promise<PackItem<D>[]> {
  const limit = opts.limit ?? 50
  return transaction('packItems', 'readonly', (tx) => new Promise<PackItem<D>[]>((resolve, reject) => {
    const out: PackItem<D>[] = []
    const seen = new Set<string>()
    const range = IDBKeyRange.bound(prefix, prefix + '￿')
    const req = tx.objectStore('packItems').index('by_key').openCursor(range)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cur = req.result
      if (!cur || out.length >= limit) return resolve(out)
      const item = cur.value as PackItem<D>
      const uid = item.pack + '\u0000' + item.id // một mục có nhiều khóa cùng tiền tố thì chỉ lấy một lần
      if ((!opts.pack || item.pack === opts.pack) && !seen.has(uid)) {
        seen.add(uid)
        out.push(item)
      }
      cur.continue()
    }
  }))
}

/** Liệt kê mục của một gói (có thể lọc theo loại). Dùng cho danh sách, không dùng để tra cứu. */
export function listItems<D = unknown>(pack: string, opts: { kind?: string; limit?: number } = {}): Promise<PackItem<D>[]> {
  return opts.kind
    ? getAllByIndex<PackItem<D>>('packItems', 'by_pack_kind', [pack, opts.kind], opts.limit)
    : getAll<PackItem<D>>('packItems', packRange(pack), opts.limit)
}

// ----- Cài và gỡ gói -----

/** Gỡ hẳn một gói khỏi máy. */
export async function removePack(id: string): Promise<void> {
  await transaction(['packs', 'packItems'], 'readwrite', (tx) => {
    tx.objectStore('packItems').delete(packRange(id))
    tx.objectStore('packs').delete(id)
  })
}

/** Cài một file gói đã đọc sẵn (đầy đủ hoặc bản vá). */
export async function installPackData(
  data: PackFull | PackPatch,
  opts: { title?: string; license?: string; onProgress?: (p: Progress) => void } = {},
): Promise<InstalledPack> {
  validatePackData(data)
  return data.type === 'full' ? installFull(data, opts) : applyPatch(data)
}

/** Cài gói từ file người dùng chọn (.json hoặc .json.gz). Dùng khi không có mạng. */
export async function installPackFile(file: Blob, onProgress?: (p: Progress) => void): Promise<InstalledPack> {
  const data = await parsePackBytes(new Uint8Array(await file.arrayBuffer()))
  return installPackData(data as PackFull | PackPatch, { onProgress })
}

async function installFull(
  data: PackFull,
  opts: { title?: string; license?: string; onProgress?: (p: Progress) => void },
): Promise<InstalledPack> {
  const now = Date.now()
  const old = await getPack(data.pack)
  const record: InstalledPack = {
    id: data.pack,
    title: data.title ?? opts.title ?? old?.title ?? data.pack,
    license: data.license ?? opts.license ?? old?.license,
    version: data.version,
    itemCount: 0,
    status: 'installing',
    installedAt: old?.installedAt ?? now,
    updatedAt: now,
  }
  // Bước 1: đánh dấu "đang cài" và xóa nội dung cũ của gói
  await transaction(['packs', 'packItems'], 'readwrite', (tx) => {
    tx.objectStore('packItems').delete(packRange(data.pack))
    tx.objectStore('packs').put(record)
  })
  // Bước 2: ghi từng đợt để không giữ một giao dịch quá lớn
  const total = data.items.length
  for (let i = 0; i < total; i += BATCH) {
    const slice = data.items.slice(i, i + BATCH)
    await writeItems(data.pack, slice)
    opts.onProgress?.({ pack: data.pack, phase: 'install', done: Math.min(i + BATCH, total), total })
  }
  // Bước 3: xong hết mới đánh dấu "sẵn sàng"
  const ready: InstalledPack = { ...record, itemCount: total, status: 'ready', updatedAt: Date.now() }
  await transaction('packs', 'readwrite', (tx) => { tx.objectStore('packs').put(ready) })
  return ready
}

function writeItems(pack: string, items: PackFileItem[]) {
  return transaction('packItems', 'readwrite', (tx) => {
    const os = tx.objectStore('packItems')
    for (const it of items) os.put({ ...it, pack })
  })
}

/** Áp một bản vá trong MỘT giao dịch: lỗi giữa chừng thì gói giữ nguyên phiên bản cũ. */
function applyPatch(p: PackPatch): Promise<InstalledPack> {
  return transaction(['packs', 'packItems'], 'readwrite', async (tx) => {
    const packs = tx.objectStore('packs')
    const items = tx.objectStore('packItems')
    const cur = await promisify<InstalledPack | undefined>(packs.get(p.pack))
    if (!cur || cur.status !== 'ready') throw new Error(`Gói "${p.pack}" chưa được cài đầy đủ, không thể vá.`)
    if (cur.version !== p.from) {
      throw new Error(`Bản vá dành cho phiên bản ${p.from}, nhưng máy đang có phiên bản ${cur.version}.`)
    }
    for (const id of p.delete ?? []) items.delete([p.pack, id])
    for (const it of p.upsert ?? []) items.put({ ...it, pack: p.pack })
    const itemCount = await promisify(items.count(packRange(p.pack)))
    const next: InstalledPack = { ...cur, version: p.to, itemCount, updatedAt: Date.now() }
    packs.put(next)
    return next
  })
}

// ----- Cập nhật từ mạng -----

export async function fetchManifest(url = DEFAULT_MANIFEST_URL): Promise<PackManifest> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Không tải được danh mục nội dung (mã ${res.status}).`)
  const m = (await res.json()) as PackManifest
  if (m?.format !== 1 || !Array.isArray(m.packs)) throw new Error('Danh mục nội dung không đúng định dạng.')
  // Đổi link tương đối thành tuyệt đối dựa trên vị trí manifest
  const base = new URL(url, location.href)
  const abs = <F extends RemoteFile>(f: F): F => ({ ...f, url: new URL(f.url, base).href })
  return { ...m, packs: m.packs.map((p) => ({ ...p, full: abs(p.full), patches: p.patches?.map(abs) })) }
}

/**
 * Tìm đường cập nhật ngắn nhất bằng bản vá: from → ... → bản mới nhất.
 * Trả về null nếu thiếu mắt xích nào đó.
 */
function patchChain(pack: ManifestPack, from: number) {
  const chain: NonNullable<ManifestPack['patches']> = []
  let v = from
  while (v < pack.version) {
    // Ưu tiên bản vá nhảy xa nhất (ví dụ có sẵn 3→6 thì không cần 3→4→5→6)
    const step = (pack.patches ?? [])
      .filter((p) => p.from === v && p.to > v && p.to <= pack.version)
      .sort((a, b) => b.to - a.to)[0]
    if (!step) return null
    chain.push(step)
    v = step.to
  }
  return chain
}

const sumSize = (files: RemoteFile[]) =>
  files.every((f) => f.size != null) ? files.reduce((s, f) => s + (f.size ?? 0), 0) : null

/**
 * So sánh gói trên máy với danh mục: gói nào cần cập nhật, tải bản vá hay bản đầy đủ, bao nhiêu MB.
 * includeNew: true thì liệt kê cả gói chưa cài.
 */
export async function planUpdates(
  manifest: PackManifest, opts: { includeNew?: boolean; only?: string[] } = {},
): Promise<UpdatePlanItem[]> {
  const installed = new Map((await listPacks()).map((p) => [p.id, p]))
  const plan: UpdatePlanItem[] = []
  for (const pack of manifest.packs) {
    if (opts.only && !opts.only.includes(pack.id)) continue
    const cur = installed.get(pack.id)
    if (!cur && !opts.includeNew && !opts.only) continue
    if (cur && cur.status === 'ready' && cur.version >= pack.version) continue
    const chain = cur?.status === 'ready' ? patchChain(pack, cur.version) : null
    // Nếu tổng bản vá còn nặng hơn bản đầy đủ thì tải bản đầy đủ cho nhanh
    const chainSize = chain ? sumSize(chain) : null
    const useChain = chain && chain.length > 0 &&
      !(chainSize != null && pack.full.size != null && chainSize >= pack.full.size)
    const files = useChain ? chain : [pack.full]
    plan.push({
      pack,
      installedVersion: cur?.status === 'ready' ? cur.version : null,
      method: useChain ? 'patch' : 'full',
      files,
      downloadSize: sumSize(files),
    })
  }
  return plan
}

/** Thực hiện kế hoạch cập nhật. Gói nào lỗi thì bỏ qua gói đó và báo lại, các gói khác vẫn cập nhật. */
/**
 * Mỗi gói chỉ được cài bởi MỘT nơi tại một thời điểm (kể cả khi mở app ở nhiều tab).
 * Không có khóa này, hai nút "Tải" bấm gần nhau (hai màn hình, hai tab, bấm đúp) sẽ cùng cài một gói:
 * lần cài thứ hai xóa dữ liệu và đặt lại trạng thái "đang cài" ngay sau khi lần đầu đã "sẵn sàng".
 */
const localLocks = new Map<string, Promise<unknown>>()
function withPackLock<T>(pack: string, fn: () => Promise<T>): Promise<T> {
  const name = `hibi-pack:${pack}`
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(name, fn) as Promise<T>
  // Trình duyệt cũ không có Web Locks: chỉ chặn trùng trong cùng một tab
  const prev = localLocks.get(name) ?? Promise.resolve()
  const run = prev.catch(() => {}).then(fn)
  localLocks.set(name, run)
  return run
}

/** Thực hiện kế hoạch cập nhật. Gói nào lỗi thì bỏ qua gói đó và báo lại, các gói khác vẫn cập nhật. */
export async function runUpdates(
  plan: UpdatePlanItem[], onProgress?: (p: Progress) => void,
): Promise<{ updated: InstalledPack[]; failed: { pack: string; error: string }[] }> {
  const updated: InstalledPack[] = []
  const failed: { pack: string; error: string }[] = []
  for (const item of plan) {
    try {
      const last = await withPackLock(item.pack.id, async () => {
        // Trong lúc chờ khóa, nơi khác có thể đã cài xong gói này: xem lại trạng thái thật trên máy
        const cur = await getPack(item.pack.id)
        if (cur?.status === 'ready' && cur.version >= item.pack.version) return cur
        const curVersion = cur?.status === 'ready' ? cur.version : null
        const files = curVersion === item.installedVersion
          ? item.files
          : (await planUpdates({ format: 1, packs: [item.pack] }, { only: [item.pack.id] }))[0]?.files ?? []
        let done: InstalledPack | undefined
        for (let i = 0; i < files.length; i++) {
          onProgress?.({ pack: item.pack.id, phase: 'download', done: i, total: files.length })
          const data = (await downloadPackFile(files[i])) as PackFull | PackPatch
          if (data.pack !== item.pack.id) throw new Error('File tải về không thuộc gói này.')
          done = await installPackData(data, { title: item.pack.title, license: item.pack.license, onProgress })
        }
        return done
      })
      if (last) updated.push(last)
    } catch (e) {
      failed.push({ pack: item.pack.id, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { updated, failed }
}

/** Một bước gọn: tải danh mục rồi cập nhật mọi gói đã cài. */
export async function updateInstalledPacks(url = DEFAULT_MANIFEST_URL, onProgress?: (p: Progress) => void) {
  const plan = await planUpdates(await fetchManifest(url))
  return runUpdates(plan, onProgress)
}

// ----- Đọc file -----

async function downloadPackFile(file: RemoteFile): Promise<unknown> {
  const res = await fetch(file.url)
  if (!res.ok) throw new Error(`Tải file thất bại (mã ${res.status}).`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (file.sha256) {
    const hash = await sha256Hex(bytes)
    if (hash !== file.sha256.toLowerCase()) throw new Error('File tải về bị hỏng (sai mã kiểm tra). Hãy thử lại.')
  }
  return parsePackBytes(bytes)
}

/** Đọc nội dung file gói: tự nhận biết file nén gzip qua 2 byte đầu (1f 8b). */
export async function parsePackBytes(bytes: Uint8Array): Promise<unknown> {
  let raw: Uint8Array = bytes
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
    raw = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  try {
    return JSON.parse(new TextDecoder().decode(raw))
  } catch {
    throw new Error('File không phải gói nội dung hợp lệ.')
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function validatePackData(d: PackFull | PackPatch) {
  const ok = d && d.format === 1 && typeof d.pack === 'string' && d.pack.length > 0 &&
    (d.type === 'full'
      ? Number.isInteger(d.version) && Array.isArray(d.items)
      : d.type === 'patch' && Number.isInteger(d.from) && Number.isInteger(d.to) && d.to > d.from)
  if (!ok) throw new Error('File không phải gói nội dung hợp lệ.')
}

