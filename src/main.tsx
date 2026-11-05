import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Font được đóng gói sẵn vào app để dùng offline
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/noto-serif-jp/400.css'
import './index.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
