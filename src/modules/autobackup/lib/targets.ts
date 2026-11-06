/**
 * NƠI GHI FILE SAO LƯU — một cách dùng chung cho cả bản Windows và bản web.
 * Chỉ đụng tới file có tên bắt đầu bằng PREFIX, nên không bao giờ xóa nhầm file khác trong thư mục.
 */
import { platform } from './platform'
import { getDirHandle, setDirHandle } from './handles'

export const PREFIX = 'hibi-nihongo-tu-dong-'

export interface BackupEntry {
  name: string
  size: number
  /** Mili giây (như Date.now()). */
  modified: number
}

const pad = (n: number) => String(n).padStart(2, '0')
/** hibi-nihongo-tu-dong-2026-11-06_093015.json (giờ máy, có cả giây để hai lần lưu liền nhau không đè nhau). Xếp theo tên = xếp theo thời gian. */
export function fileName(at = new Date()): string {
  return `${PREFIX}${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}_${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.json`
}

const isOurs = (name: string) => name.startsWith(PREFIX) && name.endsWith('.json')

// ---------- Bản Windows: gọi các lệnh trong src-tauri/src/backup.rs ----------

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

export const desktop = {
  defaultDir: () => invoke<string>('backup_default_dir'),
  write: (dir: string, name: string, contents: string) => invoke<string>('backup_write', { dir, name, contents }),
  list: (dir: string) => invoke<BackupEntry[]>('backup_list', { dir }),
  prune: (dir: string, keep: number) => invoke<number>('backup_prune', { dir, keep }),
  read: (dir: string, name: string) => invoke<string>('backup_read', { dir, name }),
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
  async write(name: string, contents: string): Promise<string> {
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
  async read(name: string): Promise<string> {
    const h = await folder.handle()
    if (!h) throw new Error('no-folder')
    return (await (await h.getFileHandle(name)).getFile()).text()
  },
}

// ---------- Không ghi được vào thư mục: tải file về ----------

export function downloadFile(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export { platform }
