/** Đăng ký module "Thành tích". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'
// Bộ theo dõi chạy ngầm: thấy huy hiệu mới / lên cấp thì hiện thông báo nhỏ góc màn hình
import './lib/watcher'

export default defineModule({
  id: 'achievements',
  path: '/achievements',
  title: 'Thành tích',
  icon: '賞',
  nav: 'hidden', // mở từ khối "Cấp độ" ở Hôm nay, trang Tôi, hoặc Ctrl+K "thành tích"
  status: 'ready',
  phase: 2,
  order: 920,
  description: 'Cấp độ, điểm kinh nghiệm (XP), huy hiệu và chú cáo lên cấp theo quá trình học',
  text: {
    en: { title: 'Achievements', description: 'Level, XP, badges and a fox that grows as you study' },
    ja: { title: '実績', description: 'レベル・経験値・バッジ、学ぶほど育つキツネ' },
  },
  page: lazy(() => import('./AchievementsPage')),
})
