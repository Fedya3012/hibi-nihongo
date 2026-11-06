/**
 * CÀI ĐẶT SAO LƯU TỰ ĐỘNG và TÌNH TRẠNG LẦN CHẠY GẦN NHẤT.
 *
 * - Cài đặt (bật/tắt, bao lâu một lần, giữ mấy file, thư mục) nằm trong kho kv, khóa
 *   "autobackup:settings", nên cũng đi theo file sao lưu.
 * - Tình trạng (lần chạy gần nhất, lỗi gần nhất...) nằm trong localStorage, KHÔNG nằm trong kho:
 *   nếu nằm trong kho thì khôi phục một file cũ sẽ kéo theo "lần chạy gần nhất" cũ, làm app
 *   tưởng vừa sao lưu xong hoặc chạy lại ngay không cần thiết.
 */
import { useSyncExternalStore } from 'react'
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import { isDesktopApp } from './platform'

export interface AutoBackupSettings {
  enabled: boolean
  /** Bao nhiêu ngày sao lưu một lần. */
  everyDays: number
  /** Giữ lại bao nhiêu file mới nhất (file cũ hơn tự xóa). */
  keep: number
  /** Bản Windows: thư mục lưu. null = thư mục mặc định (Tài liệu/Hibi Nihongo/Sao lưu). */
  desktopDir: string | null
}

export const EVERY_OPTIONS = [1, 3, 7] as const
export const KEEP_OPTIONS = [5, 10, 30] as const

/**
 * Mặc định: bản Windows tự sao lưu mỗi ngày (ghi file lặng lẽ, không làm phiền).
 * Website: mỗi tuần, vì có thể phải hiện thanh nhắc để bạn bấm.
 */
export function defaultSettings(): AutoBackupSettings {
  return { enabled: true, everyDays: isDesktopApp() ? 1 : 7, keep: 10, desktopDir: null }
}

const KEY = 'autobackup:settings'

export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  return { ...defaultSettings(), ...(await kvGet<Partial<AutoBackupSettings>>(KEY, {})) }
}

export async function saveAutoBackupSettings(patch: Partial<AutoBackupSettings>) {
  await kvSet(KEY, { ...(await getAutoBackupSettings()), ...patch })
}

export function useAutoBackupSettings(): AutoBackupSettings | undefined {
  return useDbQuery(() => getAutoBackupSettings(), [], ['kv']).data
}

// ---------- Tình trạng (localStorage) ----------

export interface AutoBackupState {
  /** Lần gần nhất đã xử lý xong (ghi file, hoặc thấy dữ liệu không đổi nên không cần ghi). */
  lastRunAt: number | null
  /** Lần gần nhất thật sự ghi ra file. */
  lastWrittenAt: number | null
  lastFile: string | null
  /** Dấu vân tay của dữ liệu lần trước, để không ghi file giống hệt nhau mỗi ngày. */
  lastHash: string | null
  lastError: string | null
  /** Bấm "Để sau" trên thanh nhắc: không nhắc lại trước thời điểm này. */
  snoozeUntil: number | null
  /** Bản sao lưu từ máy khác mới nhất đã lấy về hoặc đã bấm "Bỏ qua" (thời điểm tạo của bản đó). */
  remoteSeenAt: number | null
}

const STATE_KEY = 'hibi-autobackup-state'
const EMPTY: AutoBackupState = {
  lastRunAt: null, lastWrittenAt: null, lastFile: null, lastHash: null, lastError: null, snoozeUntil: null, remoteSeenAt: null,
}

let cache: AutoBackupState | null = null
const listeners = new Set<() => void>()

export function getState(): AutoBackupState {
  if (cache) return cache
  try { cache = { ...EMPTY, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') } } catch { cache = { ...EMPTY } }
  return cache!
}

export function setState(patch: Partial<AutoBackupState>) {
  cache = { ...getState(), ...patch }
  try { localStorage.setItem(STATE_KEY, JSON.stringify(cache)) } catch { /* bỏ qua */ }
  listeners.forEach((l) => l())
}

// Tab khác vừa sao lưu: cập nhật luôn ở tab này
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STATE_KEY) return
    cache = null
    listeners.forEach((l) => l())
  })
}

export function useAutoBackupState(): AutoBackupState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, getState)
}

/** Thời điểm tới lượt sao lưu kế tiếp (null = đang tắt). */
export function nextDueAt(s: AutoBackupSettings, st: AutoBackupState): number | null {
  if (!s.enabled) return null
  const base = st.lastRunAt ?? 0
  return Math.max(base + s.everyDays * 86_400_000, st.snoozeUntil ?? 0)
}
