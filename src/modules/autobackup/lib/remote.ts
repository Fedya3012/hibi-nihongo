/**
 * DÙNG CHUNG DỮ LIỆU GIỮA HAI MÁY QUA THƯ MỤC (bản nhẹ của đồng bộ)
 * ------------------------------------------------------------------
 * Hai máy cùng sao lưu tự động vào một thư mục nằm trong Google Drive / OneDrive / Dropbox.
 * Tên mỗi file có mã của máy tạo ra nó (xem targets.ts). Khi mở app, nếu thấy file của MÁY KHÁC
 * mới hơn lần cuối máy này sao lưu hoặc lấy về, app hỏi "Có bản mới hơn từ máy khác, lấy về?".
 * Không tự thay dữ liệu: luôn hỏi trước, và khôi phục luôn có bản an toàn để hoàn tác.
 */
import { deviceId, lastLocalChangeAt } from '@/core/db'
import { getAutoBackupSettings, getState } from './settings'
import { desktop, folder, parseName, platform, type BackupEntry } from './targets'
import { desktopDir } from './run'

export interface RemoteBackup {
  name: string
  /** Thời điểm tạo (theo tên file). */
  at: number
  device: string
  /** Máy này có thay đổi chưa sao lưu (sẽ bị thay nếu lấy về). */
  localChanged: boolean
}

/** Tìm bản sao lưu mới hơn từ máy khác trong thư mục sao lưu. Không hỏi quyền, không đọc nội dung file. */
export async function findNewerRemote(): Promise<RemoteBackup | null> {
  const where = platform()
  if (where === 'download') return null
  const s = await getAutoBackupSettings()
  if (!s.enabled) return null
  let list: BackupEntry[]
  if (where === 'desktop') list = await desktop.list(await desktopDir())
  else if ((await folder.permission(false)) === 'granted') list = await folder.list()
  else return null

  const me = deviceId()
  const st = getState()
  const seen = Math.max(st.lastWrittenAt ?? 0, st.remoteSeenAt ?? 0)
  for (const e of list) { // mới nhất trước
    const { at, device } = parseName(e.name)
    if (!at || !device || device === me) continue
    if (at <= seen) return null
    return { name: e.name, at, device, localChanged: lastLocalChangeAt() > (st.lastWrittenAt ?? 0) }
  }
  return null
}

