/**
 * CHẠY MỘT LẦN SAO LƯU TỰ ĐỘNG
 * 1. Gom dữ liệu học (dùng đúng hàm của nút "Tạo file sao lưu": createBackup).
 * 2. Dữ liệu không đổi so với lần trước → không ghi file mới (tránh 30 file giống hệt nhau).
 * 3. Ghi file vào thư mục đã chọn, xóa file tự động cũ quá số lượng cần giữ.
 */
import { createBackup, markBackedUp, restoreBackup } from '@/core/db'
import { getAutoBackupSettings, getState, setState } from './settings'
import { desktop, downloadFile, fileName, folder, platform } from './targets'

export type RunResult =
  | { kind: 'written'; file: string }
  | { kind: 'unchanged' }
  | { kind: 'empty' }
  /** Cần bạn bấm nút: trình duyệt cần hỏi quyền, hoặc chưa chọn thư mục. */
  | { kind: 'needs-action' }
  | { kind: 'error'; message: string }

/** Dấu vân tay ngắn của dữ liệu (SHA-256; máy không có thì dùng cách đơn giản hơn). */
async function fingerprint(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
    return `fnv-${(h >>> 0).toString(16)}-${text.length}`
  }
}

export async function desktopDir(): Promise<string> {
  const s = await getAutoBackupSettings()
  return s.desktopDir ?? (await desktop.defaultDir())
}

/**
 * interactive: đang chạy vì người dùng bấm nút (được hỏi quyền / tải file).
 * force: ghi file kể cả khi dữ liệu không đổi (nút "Sao lưu ngay").
 */
export async function runAutoBackup({ interactive = false, force = false } = {}): Promise<RunResult> {
  const now = Date.now()
  try {
    const s = await getAutoBackupSettings()
    const where = platform()

    // Bản web: kiểm tra quyền TRƯỚC khi gom dữ liệu. requestPermission phải được gọi ngay khi bấm,
    // nếu đợi gom dữ liệu xong mới hỏi thì trình duyệt coi như không còn "đang bấm" và từ chối.
    if (where === 'folder') {
      const p = await folder.permission(interactive)
      if (p === 'none' && !interactive) return { kind: 'needs-action' }
      if (p === 'prompt' || p === 'denied') return { kind: 'needs-action' }
    }

    const backup = await createBackup()
    const hasData = Object.values(backup.stores).some((rows) => rows && rows.length > 0)
    if (!hasData && !force) {
      setState({ lastRunAt: now, lastError: null })
      return { kind: 'empty' }
    }
    const hash = await fingerprint(JSON.stringify({ ...backup, createdAt: 0 }))
    const st = getState()
    if (!force && hash === st.lastHash && st.lastWrittenAt) {
      setState({ lastRunAt: now, lastError: null, snoozeUntil: null })
      return { kind: 'unchanged' }
    }

    const name = fileName(new Date(now))
    const text = JSON.stringify(backup)
    let file: string
    if (where === 'desktop') {
      const dir = await desktopDir()
      file = await desktop.write(dir, name, text)
      await desktop.prune(dir, s.keep)
    } else if (where === 'folder' && (await folder.handle())) {
      file = await folder.write(name, text)
      await folder.prune(s.keep)
    } else {
      // Firefox / Safari / điện thoại, hoặc Chrome chưa chọn thư mục: tải file về
      if (!interactive) return { kind: 'needs-action' }
      downloadFile(name, text)
      file = name
    }
    markBackedUp(now)
    setState({ lastRunAt: now, lastWrittenAt: now, lastFile: file, lastHash: hash, lastError: null, snoozeUntil: null })
    return { kind: 'written', file }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    setState({ lastError: message })
    return { kind: 'error', message }
  }
}

/** Khôi phục từ một file sao lưu tự động trong thư mục. */
export async function restoreFrom(name: string): Promise<number> {
  const text = platform() === 'desktop' ? await desktop.read(await desktopDir(), name) : await folder.read(name)
  // Lưu dữ liệu hiện tại thành một file mới trước khi thay thế, để lỡ chọn nhầm vẫn quay lại được.
  // (Đọc file cần khôi phục TRƯỚC, vì ghi thêm file có thể làm file cũ nhất bị dọn đi.)
  const safety = await runAutoBackup({ force: true })
  if (safety.kind === 'error') throw new Error(safety.message)
  const { records } = await restoreBackup(new Blob([text], { type: 'application/json' }))
  // Dữ liệu vừa đổi: lần tới so sánh lại từ đầu
  setState({ lastHash: null })
  return records
}
