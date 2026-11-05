/** Đăng ký module "Học". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'learn',
  path: '/learn',
  title: 'Học',
  icon: '学',
  nav: 'main',
  status: 'building',
  phase: 1,
  order: 30,
  description: 'Cổng vào Kana, Kanji, Ngữ pháp, Giáo trình',
  text: {
    en: { title: 'Learn', description: 'Kana, Kanji, Grammar, Textbooks' },
    ja: { title: '学習', description: 'かな・漢字・文法・教科書' },
  },
  page: lazy(() => import('./LearnPage')),
})
