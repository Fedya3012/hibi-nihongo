/** Đăng ký module "Hiragana & Katakana". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'kana',
  path: '/learn/kana',
  title: 'Hiragana & Katakana',
  icon: 'あ',
  nav: 'learn',
  status: 'ready',
  phase: 1,
  order: 110,
  description: 'Bảng chữ, luyện viết, nghe nhận diện, nhận diện nhanh',
  text: {
    en: { title: 'Hiragana & Katakana', description: 'Charts, writing practice, listening, quick recognition' },
    ja: { title: 'ひらがな・カタカナ', description: '五十音表、書き取り、聞き取り、早押し認識' },
  },
  page: lazy(() => import('./KanaPage')),
})
