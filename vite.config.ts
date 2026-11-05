// Cấu hình Vite: công cụ chạy thử và đóng gói app.
// - react(): hiểu code React
// - tailwindcss(): tạo CSS từ các class tiện ích
// - VitePWA(): biến website thành app cài được và chạy offline
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Hibi Nihongo',
        short_name: 'Hibi',
        description: 'Học tiếng Nhật mỗi ngày qua manga, anime và giáo trình',
        lang: 'vi',
        theme_color: '#A86F0C',
        background_color: '#FAF7F2',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Lưu sẵn font và code để mở app khi không có mạng
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Tauri (bản Windows) cần cổng cố định khi chạy thử
  server: { port: 5173, strictPort: true },
  clearScreen: false,
})
