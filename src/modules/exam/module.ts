/** Đăng ký module "Thi thử JLPT". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'exam',
  path: '/learn/exam',
  title: 'Thi thử JLPT',
  icon: '試',
  nav: 'learn',
  status: 'ready',
  phase: 2,
  order: 165,
  description: 'Đề thi thử N5–N1 theo cấu trúc JLPT: tính giờ từng buổi, chấm điểm theo thang JLPT, xem lại câu sai',
  text: {
    en: { title: 'JLPT mock test', description: 'N5–N1 mock tests in the JLPT format: timed sections, JLPT-scale scoring, review mistakes' },
    ja: { title: 'JLPT模擬試験', description: 'N5〜N1の模擬試験：科目ごとの時間制限、JLPT形式の採点、間違いの復習' },
  },
  page: lazy(() => import('./ExamPage')),
})
