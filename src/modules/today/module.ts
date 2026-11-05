/** Đăng ký module "Hôm nay". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'
// Đồng hồ đếm giờ học chạy ngầm trong cả app (streak, mục tiêu, thống kê): nạp một lần ở đây
import './lib/tracker'

export default defineModule({
  id: 'today',
  path: '/',
  title: 'Hôm nay',
  icon: '日',
  nav: 'main',
  status: 'ready',
  phase: 1,
  order: 10,
  description: 'Màn hình chính: tiếp tục bài dở, ôn nhanh, streak, mục tiêu ngày',
  text: {
    en: { title: 'Today', description: 'Home: continue where you left off, quick review, streak, daily goal' },
    ja: { title: '今日', description: 'ホーム：続きから、クイック復習、連続記録、今日の目標' },
  },
  page: lazy(() => import('./TodayPage')),
})
