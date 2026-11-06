/**
 * TỰ CẬP NHẬT BẢN WINDOWS
 * Hỏi GitHub Releases có bản mới không (file latest.json do workflow Release tạo ra, có chữ ký số
 * để chắc chắn file cài đặt là của bạn). Có bản mới thì tải về, cài, rồi mở lại app.
 */
import { create } from 'zustand'
import type { Update } from '@tauri-apps/plugin-updater'

export type UpdateStatus = 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'installing' | 'error'

interface UpdateState {
  status: UpdateStatus
  version?: string
  notes?: string
  /** 0–1 khi đang tải */
  progress?: number
  error?: string
  lastCheck?: number
  /** Bản người dùng bấm "Để sau" (không nhắc lại trong lần mở app này). */
  dismissed?: string
}

export const useUpdate = create<UpdateState>(() => ({ status: 'idle' }))

let pending: Update | null = null

export async function checkForUpdate(): Promise<void> {
  const s = useUpdate.getState().status
  if (s === 'checking' || s === 'downloading' || s === 'installing') return
  useUpdate.setState({ status: 'checking', error: undefined })
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const u = await check()
    pending = u
    useUpdate.setState(u
      ? { status: 'available', version: u.version, notes: u.body ?? undefined, lastCheck: Date.now() }
      : { status: 'none', lastCheck: Date.now() })
  } catch (e) {
    useUpdate.setState({ status: 'error', error: e instanceof Error ? e.message : String(e), lastCheck: Date.now() })
  }
}

export async function installUpdate(): Promise<void> {
  if (!pending) return
  useUpdate.setState({ status: 'downloading', progress: 0 })
  try {
    let total = 0
    let done = 0
    await pending.downloadAndInstall((ev) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0
      else if (ev.event === 'Progress') {
        done += ev.data.chunkLength
        useUpdate.setState({ progress: total ? Math.min(1, done / total) : undefined })
      } else if (ev.event === 'Finished') useUpdate.setState({ status: 'installing' })
    })
    // Trên Windows, trình cài đặt thường tự đóng và mở lại app. Nếu chưa, tự mở lại ở đây.
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (e) {
    useUpdate.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
}
