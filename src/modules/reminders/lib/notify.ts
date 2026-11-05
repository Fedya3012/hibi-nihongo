/**
 * HIỆN THÔNG BÁO TRÊN MÁY — một hàm dùng chung cho cả hai nơi app chạy:
 *   - Bản Windows (Tauri): dùng plugin thông báo của Tauri → hiện ở góc màn hình như app thường.
 *   - Website / PWA: dùng Notification API của trình duyệt (phải được bạn cho phép một lần).
 */

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface AppNotification {
  title: string
  body: string
  /** Trang mở khi bấm vào thông báo (chỉ trên website; bản Windows thì mở lại cửa sổ app). */
  to?: string
}

/** Đang chạy trong bản Windows (Tauri) không. */
export const isDesktopApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const tauri = () => import('@tauri-apps/plugin-notification')

export async function getPermission(): Promise<Permission> {
  if (isDesktopApp()) {
    try { return (await (await tauri()).isPermissionGranted()) ? 'granted' : 'default' } catch { return 'unsupported' }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/** Hỏi quyền (trình duyệt hiện hộp "Cho phép thông báo?"). Phải gọi khi người dùng bấm nút. */
export async function requestPermission(): Promise<Permission> {
  if (isDesktopApp()) {
    try {
      const t = await tauri()
      if (await t.isPermissionGranted()) return 'granted'
      return (await t.requestPermission()) as Permission
    } catch { return 'unsupported' }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Hiện một thông báo. Trả về false nếu không hiện được (chưa cho phép, máy không hỗ trợ). */
export async function showNotification(n: AppNotification): Promise<boolean> {
  if ((await getPermission()) !== 'granted') return false
  if (isDesktopApp()) {
    try { (await tauri()).sendNotification({ title: n.title, body: n.body }); return true } catch { return false }
  }
  const icon = `${import.meta.env.BASE_URL}icon-512.png`
  const openApp = () => {
    window.focus()
    if (n.to) window.location.hash = `#${n.to}` // app dùng đường dẫn dạng /#/review
  }
  try {
    // tag: thông báo nhắc mới thay cho cái cũ, không chất đống
    const x = new Notification(n.title, { body: n.body, icon, tag: 'hibi-reminder' })
    x.onclick = () => { openApp(); x.close() }
    return true
  } catch {
    // Vài trình duyệt chỉ cho hiện thông báo qua service worker của PWA
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg) return false
      await reg.showNotification(n.title, { body: n.body, icon, tag: 'hibi-reminder' })
      return true
    } catch { return false }
  }
}
