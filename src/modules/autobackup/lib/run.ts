/**
 * CHẠY MỘT LẦN SAO LƯU TỰ ĐỘNG
 * 1. Gom dữ liệu học thành file .zip (dùng đúng hàm của nút "Tạo file sao lưu": createBackupZip).
 * 2. Dữ liệu không đổi so với lần trước → không ghi file mới (tránh 30 file giống hệt nhau).
 * 3. Ghi file vào thư mục đã chọn, xóa file tự động cũ quá số lượng cần giữ.
 */
import { SafetySnapshotError, createBackupZip, markBackedUp, restoreBackup } from '@/core/db'
import { getAutoBackupSettings, getState, setState } from './settings'
import { desktop, downloadFile, fileName, folder, platform } from './targets'

export type RunResult =
  | { kind: 'written'; file: string }
  | { kind: 'unchanged' }
  | { kind: 'empty' }
  /** Cần bạn bấm nút: trình duyệt cần hỏi quyền, hoặc chưa chọn thư mục. */
  | { kind: 'needs-action' }
  | { kind: 'error'; message: string }

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

    const backup = await createBackupZip()
    if (backup.rows === 0 && !force) {
      setState({ lastRunAt: now, lastError: null })
      return { kind: 'empty' }
    }
    const hash = backup.hash
    const st = getState()
    if (!force && hash === st.lastHash && st.lastWrittenAt) {
      setState({ lastRunAt: now, lastError: null, snoozeUntil: null })
      return { kind: 'unchanged' }
    }

    const name = fileName(new Date(now))
    let file: string
    if (where === 'desktop') {
      const dir = await desktopDir()
      file = await desktop.write(dir, name, backup.blob)
      await desktop.prune(dir, s.keep)
    } else if (where === 'folder' && (await folder.handle())) {
      file = await folder.write(name, backup.blob)
      await folder.prune(s.keep)
    } else {
      // Firefox / Safari / điện thoại, hoặc Chrome chưa chọn thư mục: tải file về
      if (!interactive) return { kind: 'needs-action' }
      downloadFile(name, backup.blob)
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

/** Đọc một file sao lưu tự động trong thư mục. */
export async function readBackupFile(name: string): Promise<Blob> {
  return platform() === 'desktop' ? desktop.read(await desktopDir(), name) : folder.read(name)
}

/**
 * Khôi phục từ một file sao lưu tự động trong thư mục.
 * restoreBackup tự chụp bản an toàn trước (hoàn tác được trong Cài đặt). Nếu máy không đủ chỗ để
 * chụp bản an toàn thì lưu dữ liệu hiện tại thành một file mới trong thư mục thay cho bản an toàn.
 */
export async function restoreFrom(name: string): Promise<number> {
  // Đọc file cần khôi phục TRƯỚC, vì ghi thêm file có thể làm file cũ nhất bị dọn đi.
  let blob = await readBackupFile(name)
  let records: number
  try {
    records = (await restoreBackup(blob, { label: name })).records
  } catch (e) {
    if (!(e instanceof SafetySnapshotError)) throw e
    // Trên web, file trong thư mục có thể bị dọn khi ghi thêm file: giữ một bản trong bộ nhớ trước
    if (platform() === 'folder') blob = new Blob([await blob.arrayBuffer()], { type: blob.type })
    const safety = await runAutoBackup({ force: true })
    if (safety.kind === 'error') throw new Error(safety.message)
    records = (await restoreBackup(blob, { safety: false, label: name })).records
  }
  // Dữ liệu vừa đổi: lần tới so sánh lại từ đầu
  setState({ lastHash: null })
  return records
}
