/** Đăng ký module "Ôn tập". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'review',
  path: '/review',
  title: 'Ôn tập',
  icon: '復',
  nav: 'main',
  status: 'ready',
  phase: 1,
  order: 20,
  description: 'Flashcard SRS (thuật toán FSRS), Again/Hard/Good/Easy, nhiều dạng câu hỏi',
  text: {
    en: { title: 'Review', description: 'SRS flashcards (FSRS), Again/Hard/Good/Easy, several question types' },
    ja: { title: '復習', description: 'SRSフラッシュカード（FSRS）、もう一度／難しい／正解／簡単' },
  },
  page: lazy(() => import('./ReviewPage')),
})
