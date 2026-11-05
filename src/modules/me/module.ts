/** Đăng ký module "Tôi". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'me',
  path: '/me',
  title: 'Tôi',
  icon: '私',
  nav: 'main',
  status: 'ready',
  phase: 1,
  order: 50,
  description: 'Tiến độ: streak, biểu đồ, heatmap, lịch sử từng ngày, tóm tắt ngày/tuần/tháng',
  text: {
    en: { title: 'Me', description: 'Progress, heatmap, history, summaries' },
    ja: { title: 'マイページ', description: '進捗、ヒートマップ、履歴、まとめ' },
  },
  page: lazy(() => import('./ProgressPage')),
})
