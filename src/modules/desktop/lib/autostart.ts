/** Chạy cùng Windows: bật thì mỗi lần mở máy, Hibi tự mở sẵn dưới khay (không hiện cửa sổ). */
export async function isAutostartOn(): Promise<boolean> {
  const { isEnabled } = await import('@tauri-apps/plugin-autostart')
  return isEnabled()
}

export async function setAutostart(on: boolean): Promise<void> {
  const m = await import('@tauri-apps/plugin-autostart')
  await (on ? m.enable() : m.disable())
}
