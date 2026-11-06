/** Đăng ký module "Phím tắt". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'shortcuts',
  path: '/shortcuts',
  title: 'Phím tắt',
  icon: '鍵',
  nav: 'hidden', // mở từ Cài đặt, bảng xem nhanh (phím ?), hoặc tìm "phím tắt" bằng Ctrl+K
  status: 'ready',
  phase: 2,
  order: 930,
  description: 'Đổi phím tắt cho toàn app, Ôn tập, xem anime và đọc manga; bấm ? để xem nhanh',
  text: {
    en: { title: 'Keyboard shortcuts', description: 'Customize keys for the whole app, Review, anime and manga; press ? for a cheat sheet' },
    ja: { title: 'ショートカット', description: 'アプリ全体・復習・アニメ・マンガのキーを変更、?で一覧' },
  },
  page: lazy(() => import('./ShortcutsPage')),
})
