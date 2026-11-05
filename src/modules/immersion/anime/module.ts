/** Đăng ký module "Xem anime". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'anime',
  path: '/immersion/anime',
  title: 'Xem anime',
  icon: '映',
  nav: 'hidden',
  status: 'ready',
  phase: 1,
  order: 32,
  description: 'Video + phụ đề .srt/.ass/.vtt, bấm tra từ, điểm hiểu, tạo thẻ từ phụ đề, lặp câu (shadowing)',
  text: {
    en: { title: 'Anime player', description: 'Video + .srt/.ass/.vtt subtitles, click to look up, comprehension score, cards from subtitles, shadowing' },
    ja: { title: 'アニメプレーヤー', description: '動画＋字幕（.srt/.ass/.vtt）、クリックで辞書、理解度、字幕からカード作成' },
  },
  page: lazy(() => import('./AnimePage')),
})
