/** Đăng ký module "Ngữ pháp". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'grammar',
  path: '/learn/grammar',
  title: 'Ngữ pháp',
  icon: '文',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 140,
  description: 'Mẫu ngữ pháp N5 đến N1 giải thích tiếng Việt, ví dụ tra từ được, luyện điền/sắp xếp câu, đưa vào Ôn tập',
  text: {
    en: { title: 'Grammar', description: 'N5–N1 grammar points explained in Vietnamese, clickable examples, fill-in and word-order drills, add to SRS' },
    ja: { title: '文法', description: 'N5〜N1の文法解説（ベトナム語）、辞書付き例文、穴埋め・並べ替え練習、SRSに追加' },
  },
  page: lazy(() => import('./GrammarPage')),
})
