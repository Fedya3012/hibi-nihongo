/** Đăng ký module "Immersion". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'immersion',
  path: '/immersion',
  title: 'Immersion',
  icon: '漫',
  nav: 'main',
  status: 'building',
  phase: 1,
  order: 30,
  description: 'Đọc manga từ file và xem anime kèm phụ đề tra từ',
  text: {
    en: { title: 'Immersion', description: 'Read manga from your files and watch anime with clickable subtitles' },
    ja: { title: '多読・多聴', description: '自分のファイルで漫画を読み、字幕付きでアニメを見る' },
  },
  page: lazy(() => import('./ImmersionPage')),
})
