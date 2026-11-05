/** Đăng ký module "Giáo trình". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'textbook',
  path: '/learn/textbook',
  title: 'Giáo trình',
  icon: '本',
  nav: 'learn',
  status: 'building',
  phase: 2,
  order: 150,
  description: 'Minna no Nihongo, Genki và sách khác: học theo bài, từ vựng vào Ôn tập theo bài, Kanji của bài, học tuần tự',
  text: {
    en: { title: 'Textbooks', description: 'Minna no Nihongo, Genki and other books: study by lesson, lesson vocab into Review, lesson kanji, step-by-step' },
    ja: { title: '教科書', description: 'みんなの日本語・げんき等：課ごとに学習、課の語彙を復習へ、課の漢字、順番に学ぶ' },
  },
  page: lazy(() => import('./TextbookPage')),
})
