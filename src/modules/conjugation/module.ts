/** Đăng ký module "Luyện chia động từ". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'conjugation',
  path: '/learn/conjugation',
  title: 'Luyện chia động từ',
  icon: '活',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 145,
  description: 'Chia động từ, tính từ sang thể ます, ない, て, た, khả năng, ý chí, bị động… Gõ hoặc chọn đáp án, có giải thích và bảng chia',
  text: {
    en: { title: 'Conjugation drill', description: 'Conjugate verbs and adjectives: masu, nai, te, ta, potential, volitional, passive… Type or pick answers, with explanations and tables' },
    ja: { title: '活用練習', description: '動詞・形容詞の活用（ます・ない・て・た・可能・意向・受身…）を入力か選択で練習、解説と活用表つき' },
  },
  page: lazy(() => import('./ConjugationPage')),
})
