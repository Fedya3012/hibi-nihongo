/** Đăng ký module "Luyện nghe". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'listening',
  path: '/learn/listening',
  title: 'Luyện nghe',
  icon: '聴',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 147,
  description: 'Nghe rồi gõ lại: chép chính tả câu mẫu và câu phụ đề anime, luyện nghe số đếm, giờ, ngày tháng',
  text: {
    en: { title: 'Listening practice', description: 'Listen and type: dictation from example sentences and anime subtitles, numbers, times and dates' },
    ja: { title: '聞き取り練習', description: '例文やアニメ字幕のディクテーション、数字・時刻・日付の聞き取り' },
  },
  page: lazy(() => import('./ListeningPage')),
})
