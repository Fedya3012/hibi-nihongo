/**
 * NƠI GHI FILE SAO LƯU — một cách dùng chung cho cả bản Windows và bản web.
 * Chỉ đụng tới file có tên bắt đầu bằng PREFIX, nên không bao giờ xóa nhầm file khác trong thư mục.
 */
import { platform } from './platform'
import { getDirHandle, setDirHandle } from './handles'
import { deviceId } from '@/core/db'

export const PREFIX = 'hibi-nihongo-tu-dong-'

export interface BackupEntry {
  name: string
  size: number
  /** Mili giây (như Date.now()). */
  modified: number
}

const pad = (n: number) => String(n).padStart(2, '0')
/**
 * hibi-nihongo-tu-dong-2026-11-06_093015-k3x9qa.zip
 * (giờ máy, có cả giây để hai lần lưu liền nhau không đè nhau; cuối tên là mã của máy tạo file,
 * để máy khác dùng chung thư mục biết đây là bản từ máy khác). Xếp theo tên = xếp theo thời gian.
 * File cũ dạng .json (không có mã máy) vẫn được liệt kê và khôi phục được.
 */
export function fileName(at = new Date(), device = deviceId()): string {
  return `${PREFIX}${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}_${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}-${device}.zip`
}

/** Đọc thời điểm tạo và mã máy từ tên file. */
export function parseName(name: string): { at: number | null; device: string | null } {
  const m = /^hibi-nihongo-tu-dong-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})(?:-([a-z0-9]+))?\.(?:json|zip)$/.exec(name)
  if (!m) return { at: null, device: null }
  const at = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
  return { at, device: m[7] ?? null }
}

const isOurs = (name: string) => name.startsWith(PREFIX) && (name.endsWith('.json') || name.endsWith('.zip'))

// ---------- Bản Windows: gọi các lệnh trong src-tauri/src/backup.rs ----------

async function invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, headers?: Record<string, string>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args, headers ? { headers } : undefined)
}

export const desktop = {
  defaultDir: () => invoke<string>('backup_default_dir'),
  /** Ghi file nhị phân (.zip): gửi thẳng các byte, tên thư mục và tên file đi kèm trong "header". */
  async write(dir: string, name: string, contents: Blob): Promise<string> {
    const bytes = new Uint8Array(await contents.arrayBuffer())
    return invoke<string>('backup_write_bin', bytes, { 'x-dir': encodeURIComponent(dir), 'x-name': encodeURIComponent(name) })
  },
  list: (dir: string) => invoke<BackupEntry[]>('backup_list', { dir }),
  prune: (dir: string, keep: number) => invoke<number>('backup_prune', { dir, keep }),
  async read(dir: string, name: string): Promise<Blob> {
    const buf = await invoke<ArrayBuffer>('backup_read_bin', { dir, name })
    return new Blob([buf], { type: name.endsWith('.zip') ? 'application/zip' : 'application/json' })
  },
  /** Mở hộp thoại chọn thư mục của Windows. null = bấm Hủy. */
  async pick(current: string): Promise<string | null> {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const r = await open({ directory: true, multiple: false, defaultPath: current })
    return typeof r === 'string' ? r : null
  },
}

// ---------- Bản web (Chrome/Edge): File System Access API ----------

type PermState = 'granted' | 'denied' | 'prompt'
interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(o: { mode: 'readwrite' }): Promise<PermState>
  requestPermission(o: { mode: 'readwrite' }): Promise<PermState>
}

export const folder = {
  handle: async () => (await getDirHandle()) as DirHandle | null,
  /** Mở hộp thoại chọn thư mục (phải gọi khi người dùng bấm nút). false = bấm Hủy. */
  async pick(): Promise<boolean> {
    try {
      // Gọi kèm "window." (không tách hàm ra biến), nếu không trình duyệt báo "Illegal invocation"
      const w = window as unknown as { showDirectoryPicker(o: object): Promise<DirHandle> }
      const h = await w.showDirectoryPicker({ id: 'hibi-backup', mode: 'readwrite', startIn: 'documents' })
      await setDirHandle(h)
      return true
    } catch {
      return false // bấm Hủy, hoặc chọn thư mục hệ thống bị trình duyệt chặn
    }
  },
  forget: () => setDirHandle(null),
  /**
   * Có ghi được không. interactive = true (đang trong lúc người dùng bấm nút) thì được phép hỏi quyền.
   * Sau khi mở lại trình duyệt, Chrome thường hỏi lại một lần ("Cho phép sửa tệp?").
   */
  async permission(interactive: boolean): Promise<PermState | 'none'> {
    const h = await folder.handle()
    if (!h) return 'none'
    let p = await h.queryPermission({ mode: 'readwrite' })
    if (p === 'prompt' && interactive) p = await h.requestPermission({ mode: 'readwrite' })
    return p
  },
  async write(name: string, contents: Blob): Promise<string> {
    const h = await folder.handle()
    if (!h) throw new Error('no-folder')
    const f = await h.getFileHandle(name, { create: true })
    const w = await f.createWritable()
    await w.write(contents)
    await w.close()
    return `${h.name}/${name}`
  },
  async list(): Promise<BackupEntry[]> {
    const h = await folder.handle()
    if (!h) return []
    const out: BackupEntry[] = []
    for await (const e of h.values()) {
      if (e.kind !== 'file' || !isOurs(e.name)) continue
      const file = await (e as FileSystemFileHandle).getFile()
      out.push({ name: e.name, size: file.size, modified: file.lastModified })
    }
    return out.sort((a, b) => b.name.localeCompare(a.name))
  },
  async prune(keep: number): Promise<void> {
    const h = await folder.handle()
    if (!h) return
    for (const e of (await folder.list()).slice(Math.max(1, keep))) {
      try { await h.removeEntry(e.name) } catch { /* bỏ qua */ }
    }
  },
  async read(name: string): Promise<Blob> {
    const h = await folder.handle()
    if (!h) throw new Error('no-folder')
    return (await h.getFileHandle(name)).getFile()
  },
}

// ---------- Không ghi được vào thư mục: tải file về ----------

export function downloadFile(name: string, contents: Blob) {
  const url = URL.createObjectURL(contents)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export { platform }
