/** Đăng ký module "Lộ trình". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'roadmap',
  path: '/learn/roadmap',
  title: 'Lộ trình',
  icon: '道',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 160,
  description: 'Lộ trình Kana → N5 → N1 nối Kana, Kanji, Ngữ pháp, Giáo trình, Từ vựng; bài kiểm tra xếp lớp',
  text: {
    en: { title: 'Roadmap', description: 'Kana → N5 → N1 path tying Kana, Kanji, Grammar, Textbook and Vocabulary; placement test' },
    ja: { title: 'ロードマップ', description: 'かな→N5→N1の学習計画（かな・漢字・文法・教科書・語彙）とレベル判定テスト' },
  },
  page: lazy(() => import('./RoadmapPage')),
})
