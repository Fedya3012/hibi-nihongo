/** Đăng ký module "Đọc văn bản". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'reader',
  path: '/immersion/reader',
  title: 'Đọc văn bản',
  icon: '読',
  nav: 'hidden',
  status: 'ready',
  phase: 1,
  order: 33,
  description: 'Dán chữ, mở bài báo từ link, file TXT/EPUB, clipboard; bấm tra từ, furigana, tô màu từ mới, lưu câu vào Ôn tập',
  text: {
    en: { title: 'Text reader', description: 'Paste text, open an article link, TXT/EPUB files, clipboard; tap to look up, furigana, new-word highlights, sentence cards' },
    ja: { title: 'テキストリーダー', description: 'テキスト貼り付け・記事URL・TXT/EPUB・クリップボード。タップで辞書、ふりがな、未知語の色分け、例文カード' },
  },
  page: lazy(() => import('./ReaderPage')),
})
