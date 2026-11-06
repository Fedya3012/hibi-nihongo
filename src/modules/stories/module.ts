/** Đăng ký module "Truyện theo cấp độ". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'stories',
  // Đường dẫn nằm dưới /immersion/ nên tự hiện trong trang Immersion (cạnh Đọc văn bản, manga, anime)
  path: '/immersion/stories',
  title: 'Truyện theo cấp độ',
  icon: '話',
  nav: 'hidden',
  status: 'ready',
  phase: 2,
  order: 34,
  description: 'Truyện ngắn N5–N3 có sẵn, giọng đọc tô sáng từng câu, furigana, bản dịch tiếng Việt, câu hỏi đọc hiểu',
  text: {
    en: { title: 'Graded stories', description: 'Ready-made N5–N3 short stories with sentence-by-sentence voice, furigana, Vietnamese translation and quizzes' },
    ja: { title: 'レベル別読み物', description: 'N5〜N3の短い読み物。一文ずつ読み上げ、ふりがな、ベトナム語訳、内容理解の問題つき' },
  },
  page: lazy(() => import('./StoriesPage')),
})
