/** Đăng ký module "Cài đặt". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'settings',
  path: '/settings',
  title: 'Cài đặt',
  icon: '設',
  nav: 'hidden',
  status: 'building',
  phase: 1,
  order: 900,
  description: 'Giao diện, cỡ chữ, furigana, âm thanh',
  text: {
    en: { title: 'Settings', description: 'Appearance, text size, furigana, sound, language' },
    ja: { title: '設定', description: '外観、文字サイズ、ふりがな、音、言語' },
  },
  page: lazy(() => import('./SettingsPage')),
})
