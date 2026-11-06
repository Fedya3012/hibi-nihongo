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
  description: 'Video + phụ đề (cả phụ đề nhúng .mkv), bấm tra từ, lưu câu kèm ảnh + tiếng, shadowing, chép chính tả, ôn theo cảnh phim, xuất Anki',
  text: {
    en: { title: 'Anime player', description: 'Video + subtitles (incl. embedded .mkv), click to look up, sentence mining with image + audio, shadowing, dictation, scene review, Anki export' },
    ja: { title: 'アニメプレーヤー', description: '動画＋字幕（.srt/.ass/.vtt）、クリックで辞書、理解度、字幕からカード作成' },
  },
  page: lazy(() => import('./AnimePage')),
})
