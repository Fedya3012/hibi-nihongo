/**
 * SAO LƯU VÀ KHÔI PHỤC
 * File sao lưu là một file .json chứa toàn bộ dữ liệu học của bạn (các bảng có backup: true
 * trong schema.ts) cùng cài đặt giao diện. Gói nội dung (từ điển...) không nằm trong file
 * vì tải lại được, nhờ vậy file sao lưu nhỏ.
 */
import { DB_VERSION, backupStores, type StoreName } from './schema'
import { promisify, transaction } from './idb'
import { useSettings } from '../settings'

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

const SETTINGS_KEY = 'hibi-settings' // tên lưu của useSettings
const LAST_BACKUP_KEY = 'hibi-last-backup'

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

/** Tạo file sao lưu và tải về máy (hiện hộp thoại lưu file). */
export async function downloadBackup(): Promise<void> {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hibi-nihongo-sao-luu-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  try { localStorage.setItem(LAST_BACKUP_KEY, String(backup.createdAt)) } catch { /* bỏ qua */ }
}

export function lastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

/**
 * Khôi phục từ file sao lưu. Dữ liệu học hiện tại trên máy bị THAY THẾ hoàn toàn.
 * Bảng có trong file nhưng app không còn dùng thì bỏ qua; bảng mới mà file chưa có thì để trống.
 */
export async function restoreBackup(input: Blob | BackupFile): Promise<{ records: number }> {
  let data: BackupFile
  if (input instanceof Blob) {
    try { data = JSON.parse(await input.text()) } catch { throw new Error('File này không phải file sao lưu của Hibi Nihongo.') }
  } else {
    data = input
  }
  if (data?.app !== 'hibi-nihongo' || data.format !== 1 || typeof data.stores !== 'object') {
    throw new Error('File này không phải file sao lưu của Hibi Nihongo.')
  }
  if (data.dbVersion > DB_VERSION) {
    throw new Error('File sao lưu được tạo từ phiên bản app mới hơn. Hãy cập nhật app rồi thử lại.')
  }
  let records = 0
  await transaction(backupStores, 'readwrite', (tx) => {
    for (const name of backupStores) {
      const os = tx.objectStore(name)
      os.clear()
      const rows = data.stores[name] ?? []
      const inline = os.keyPath !== null
      for (const [key, value] of rows) {
        // Bảng có khóa nằm trong giá trị (keyPath) thì không được truyền khóa riêng
        if (inline) os.put(value)
        else os.put(value, key)
        records++
      }
    }
  })
  if (data.settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings))
      await useSettings.persist.rehydrate()
    } catch { /* bỏ qua */ }
  }
  return { records }
}
