/**
 * Áp cài đặt giao diện lên trang: Sáng/Tối, cỡ chữ, furigana, tương phản cao.
 * Gọi một lần ở gốc app (App.tsx).
 */
import { useEffect } from 'react'
import { useSettings } from './settings'

export function useApplySettings() {
  const { theme, fontScale, furigana, highContrast } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      const next = dark ? 'dark' : 'light'
      if (root.dataset.theme !== next) {
        // Bật hiệu ứng chuyển màu 300ms rồi tắt, để các thao tác khác không bị chậm
        root.classList.add('theme-transition')
        root.dataset.theme = next
        window.setTimeout(() => root.classList.remove('theme-transition'), 320)
      }
    }
    apply()
    try { localStorage.setItem('hibi-theme', theme) } catch { /* chế độ riêng tư */ }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-scale', String(fontScale))
    root.dataset.furigana = furigana
    root.dataset.contrast = highContrast ? 'high' : 'normal'
  }, [fontScale, furigana, highContrast])
}
