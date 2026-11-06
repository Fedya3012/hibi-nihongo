import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
// Font được đóng gói sẵn vào app để dùng offline
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/noto-serif-jp/400.css'
import './index.css'
import { App } from './app/App'
import { installStaleChunkReload } from './app/staleChunk'
import { isLookupWindow } from './modules/desktop/lib/native'

// Bản Windows: cửa sổ tra nhanh (bấm phím tắt ở app khác) chỉ hiện ô tra, không có thanh bên
const QuickLookup = lazy(() => import('./modules/desktop/QuickLookup'))

installStaleChunkReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLookupWindow() ? <Suspense><QuickLookup /></Suspense> : <App />}
  </StrictMode>,
)
