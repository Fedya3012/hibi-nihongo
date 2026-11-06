/** Đăng ký module "Pomodoro". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'
// Đồng hồ Pomodoro chạy ngầm trong cả app: hết giờ thì chuyển phiên, kêu chuông, thông báo
import './ticker'
import './flight/ticker'

export default defineModule({
  id: 'pomodoro',
  path: '/pomodoro',
  title: 'Pomodoro',
  icon: '集',
  nav: 'hidden', // mở bằng nút 集 trên thanh trên cùng, Alt+7, hoặc tìm "pomodoro" bằng Ctrl+K
  status: 'ready',
  phase: 2,
  order: 920,
  description: 'Chuyến bay tập trung tới Nhật Bản: đặt vé, sân bay, nhập cảnh, ngắm cảnh từng vùng, hộ chiếu; kèm hẹn giờ 25/5',
  text: {
    en: { title: 'Pomodoro', description: 'Focus timer: 25 minutes of study, 5 minutes break; daily session stats' },
    ja: { title: 'ポモドーロ', description: '集中タイマー：25分学習・5分休憩、毎日の記録' },
  },
  page: lazy(() => import('./FlightPage')),
})
