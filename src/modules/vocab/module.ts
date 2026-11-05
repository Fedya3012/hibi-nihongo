/** Đăng ký module "Kho từ của tôi". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'vocab',
  path: '/learn/words',
  title: 'Kho từ của tôi',
  icon: '語',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 135,
  description: 'Từ đã biết / đang học dùng chung cho cả app: tô màu chữ khi đọc manga, xem anime, học giáo trình',
  text: {
    en: { title: 'My words', description: 'Shared known / learning words: colors text in manga, anime and textbooks' },
    ja: { title: 'マイ単語', description: '既知・学習中の単語をアプリ全体で共有し、読むときに色分け' },
  },
  page: lazy(() => import('./VocabPage')),
})
