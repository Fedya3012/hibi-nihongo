/** Đăng ký module "Nhắc học hằng ngày". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'
// Bộ hẹn giờ nhắc học chạy ngầm trong cả app (giống đồng hồ đếm giờ của module Hôm nay)
import './lib/scheduler'

export default defineModule({
  id: 'reminders',
  path: '/reminders',
  title: 'Nhắc học hằng ngày',
  icon: '鈴',
  nav: 'hidden', // mở từ Cài đặt, hoặc tìm "nhắc học" bằng Ctrl+K
  status: 'ready',
  phase: 2,
  order: 910,
  description: 'Thông báo nhắc học mỗi ngày: chọn giờ, số thẻ đến hạn, nhắc giữ chuỗi ngày học',
  text: {
    en: { title: 'Daily reminders', description: 'Study notifications every day: pick times, cards due, keep your streak' },
    ja: { title: '毎日のリマインダー', description: '学習の通知：時刻、復習カード数、連続記録' },
  },
  page: lazy(() => import('./RemindersPage')),
})
