/** Cài đặt của bản Windows, lưu trong localStorage ('hibi-desktop'). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_HOTKEY = 'Ctrl+Alt+D'

export interface DesktopPrefs {
  /** Phím tắt tra từ ở mọi app, dạng "Ctrl+Alt+D" (cùng cách ghi với src/modules/shortcuts). */
  hotkey: string
  hotkeyOn: boolean
  /** Cửa sổ tra đang mở: sao chép chữ mới là tự tra luôn, không cần bấm phím tắt lại. */
  lookupOnCopy: boolean
  /** Bấm X thì thu xuống khay (app vẫn chạy để phím tắt dùng được). */
  closeToTray: boolean
  /** Tự kiểm tra bản mới lúc mở app và mỗi 6 giờ. */
  autoUpdate: boolean
  set: (p: Partial<Omit<DesktopPrefs, 'set'>>) => void
}

export const useDesktopPrefs = create<DesktopPrefs>()(
  persist(
    (set) => ({
      hotkey: DEFAULT_HOTKEY,
      hotkeyOn: true,
      lookupOnCopy: true,
      closeToTray: true,
      autoUpdate: true,
      set: (p) => set(p),
    }),
    { name: 'hibi-desktop', partialize: ({ set: _, ...rest }) => rest },
  ),
)

/** Lỗi khi đăng ký phím tắt (ví dụ app khác đã giữ phím đó). Trang Bản Windows hiện lỗi này. */
export const useHotkeyError = create<{ error: string | null }>(() => ({ error: null }))
