/** Đăng ký module "Sao lưu tự động". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'
// Bộ hẹn giờ sao lưu chạy ngầm trong cả app (giống bộ hẹn giờ của Nhắc học)
import './lib/scheduler'

export default defineModule({
  id: 'autobackup',
  path: '/autobackup',
  title: 'Sao lưu tự động',
  icon: '保',
  nav: 'hidden', // mở từ Cài đặt, hoặc tìm "sao lưu" bằng Ctrl+K
  status: 'ready',
  phase: 2,
  order: 920,
  description: 'Tự lưu dữ liệu học ra thư mục trên máy định kỳ, giữ nhiều bản, khôi phục một chạm',
  text: {
    en: { title: 'Automatic backup', description: 'Save your study data to a folder on a schedule, keep several copies, restore in one click' },
    ja: { title: '自動バックアップ', description: '学習データを定期的にフォルダへ保存・復元' },
  },
  page: lazy(() => import('./AutoBackupPage')),
})
