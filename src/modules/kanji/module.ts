/** Đăng ký module "Kanji". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'kanji',
  path: '/learn/kanji',
  title: 'Kanji',
  icon: '字',
  nav: 'learn',
  status: 'ready',
  phase: 1,
  order: 120,
  description: 'Học theo JLPT và bộ thủ, câu chuyện ghi nhớ, thứ tự nét, on/kun, ví dụ, luyện viết chấm từng nét',
  text: {
    en: { title: 'Kanji', description: 'By JLPT level and radical, mnemonics, stroke order, on/kun, examples, graded writing' },
    ja: { title: '漢字', description: 'JLPT・部首別、覚え方、筆順、音読み・訓読み、例、書き取り採点' },
  },
  page: lazy(() => import('./KanjiPage')),
})
