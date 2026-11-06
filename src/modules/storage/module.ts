/** Đăng ký module "Dung lượng và dọn dẹp". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'storage',
  path: '/storage',
  title: 'Dung lượng và dọn dẹp',
  icon: '容',
  nav: 'hidden', // mở từ Cài đặt → Dữ liệu trên máy, từ cảnh báo "bộ nhớ đầy", hoặc Ctrl+K
  status: 'ready',
  phase: 2,
  order: 930,
  description: 'Xem manga, anime, sách, thẻ mỗi phần chiếm bao nhiêu chỗ; xóa ảnh, video đã xem xong và file không còn dùng',
  text: {
    en: { title: 'Storage and cleanup', description: 'See how much space manga, anime, books and cards use; remove finished pages, videos and unused files' },
    ja: { title: '容量と整理', description: '漫画・アニメ・本・カードの使用容量を確認し、不要なデータを削除' },
  },
  page: lazy(() => import('./StoragePage')),
})
