/** Gốc của app: áp cài đặt giao diện và khai báo đường dẫn cho từng module. */
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { modules } from '@/modules/registry'
import { useApplySettings } from '@/core/useApplySettings'
import { RouteError } from './RouteError'

// Dùng HashRouter (đường dẫn dạng /#/review) để chạy được cả trong file .exe của Tauri
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    // Lỗi trong một trang chỉ thay nội dung trang đó, thanh bên vẫn còn
    children: modules.map((m) => ({ path: m.path, element: <m.page />, errorElement: <RouteError /> })),
  },
])

export function App() {
  useApplySettings()
  return <RouterProvider router={router} />
}
