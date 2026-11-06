/** Đăng ký module "Bản Windows". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'desktop',
  path: '/desktop',
  title: 'Bản Windows',
  icon: '窓',
  nav: 'hidden', // mở từ Cài đặt, hoặc tìm "Windows" bằng Ctrl+K
  status: 'ready',
  phase: 2,
  order: 930,
  description: 'Tự cập nhật, phím tắt tra từ ở mọi app, thu xuống khay, chạy cùng Windows',
  text: {
    en: { title: 'Windows app', description: 'Auto-update, a lookup hotkey that works in any app, tray icon, start with Windows' },
    ja: { title: 'Windows 版', description: '自動更新・どのアプリでも使える辞書ショートカット・タスクトレイ' },
  },
  page: lazy(() => import('./DesktopPage')),
})
