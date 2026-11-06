/**
 * NỐI GIAO DIỆN VỚI PHẦN WINDOWS (src-tauri/src/desktop.rs).
 * Bản web không có phần này: mọi hàm ở đây chỉ gọi khi isDesktopApp() là true.
 */
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export const isDesktopApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Trang đang chạy trong cửa sổ tra nhanh (cửa sổ nhỏ hiện khi bấm phím tắt)?
 * Cửa sổ đó mở cùng file index.html với app, nên nhận ra bằng tên cửa sổ ("lookup").
 * Trên web, mở #/quick-lookup để xem thử giao diện cửa sổ này.
 */
export function isLookupWindow(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.hash.startsWith('#/quick-lookup')) return true
  const internals = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } }).__TAURI_INTERNALS__
  return internals?.metadata?.currentWindow?.label === 'lookup'
}

/** Áp cài đặt. hotkey '' = tắt phím tắt. Lỗi (phím đã bị app khác giữ...) ném ra dạng chữ tiếng Việt. */
export const applyDesktop = (hotkey: string, closeToTray: boolean) =>
  invoke<void>('desktop_apply', { hotkey, closeToTray })

export const takeLookupText = () => invoke<string | null>('desktop_take_lookup')
export const readClipboard = () => invoke<string>('desktop_clipboard')
export const showLookup = () => invoke<void>('desktop_show_lookup')
export const hideLookup = () => invoke<void>('desktop_hide_lookup')
/** Mở một trang trong cửa sổ chính, ví dụ '/dictionary?q=食べる'. */
export const openInMain = (path: string) => invoke<void>('desktop_open_in_main', { path })

/** Phím tắt được bấm lần nữa khi cửa sổ tra đang mở: nhận chữ mới. */
export const onLookupText = (f: (text: string) => void): Promise<UnlistenFn> =>
  listen<string>('hibi://lookup', (e) => f(e.payload))

/** Cửa sổ tra nhanh nhờ cửa sổ chính mở một trang. */
export const onNavigate = (f: (path: string) => void): Promise<UnlistenFn> =>
  listen<string>('hibi://navigate', (e) => f(e.payload))
