/** Đăng ký module "Đọc manga". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'manga',
  path: '/immersion/manga',
  title: 'Đọc manga',
  icon: '本',
  nav: 'hidden',
  status: 'ready',
  phase: 1,
  order: 31,
  description: 'CBZ, CBR, PDF, thư mục ảnh; zoom, 2 trang, phải→trái, nhớ trang đang đọc',
  text: {
    en: { title: 'Manga reader', description: 'CBZ, CBR, PDF, image folders; zoom, two pages, right-to-left, remembers your page' },
    ja: { title: '漫画リーダー', description: 'CBZ・CBR・PDF・画像フォルダ、ズーム、見開き、右→左、ページを記憶' },
  },
  page: lazy(() => import('./MangaPage')),
})
