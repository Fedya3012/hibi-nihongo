/** Đăng ký module "Lộ trình". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'roadmap',
  path: '/learn/roadmap',
  title: 'Lộ trình',
  icon: '道',
  nav: 'learn',
  status: 'planned',
  phase: 2,
  order: 160,
  description: 'Lộ trình N5→N1, theo series, tùy chỉnh; onboarding',
  text: {
    en: { title: 'Roadmap', description: 'N5→N1 roadmap, by series, customisable; onboarding' },
    ja: { title: 'ロードマップ', description: 'N5→N1の学習計画、シリーズ別、カスタマイズ' },
  },
  page: lazy(() => import('@/modules/_placeholder/PlaceholderPage')),
})
