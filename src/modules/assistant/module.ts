/** Đăng ký module "Trợ lý". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'assistant',
  path: '/assistant',
  title: 'Trợ lý',
  icon: '狐',
  nav: 'hidden',
  status: 'planned',
  phase: 3,
  order: 170,
  description: 'Chú cáo trợ lý AI, sửa câu, role-play',
  text: {
    en: { title: 'Assistant', description: 'Fox AI assistant, sentence correction, role-play' },
    ja: { title: 'アシスタント', description: 'キツネのAIアシスタント、添削、ロールプレイ' },
  },
  page: lazy(() => import('@/modules/_placeholder/PlaceholderPage')),
})
