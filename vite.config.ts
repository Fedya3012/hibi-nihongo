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
        // Lưu sẵn code để mở app khi không có mạng.
        // Font tiếng Nhật được chia thành ~120 phần nhỏ theo nhóm chữ (tổng 11 MB). Chỉ lưu sẵn các phần
        // chứa kana và kanji hay gặp nhất (số 100–119); phần còn lại trình duyệt tự tải khi trang thật sự
        // cần chữ đó, rồi được giữ lại để dùng offline (xem runtimeCaching bên dưới).
        globPatterns: [
          '**/*.{js,css,html,svg}',
          'assets/be-vietnam-pro-*.woff2',
          'assets/noto-sans-jp-1[01][0-9]-400-normal-*.woff2',
          'assets/noto-sans-jp-11[0-9]-700-normal-*.woff2',
          'assets/noto-serif-jp-11[0-9]-400-normal-*.woff2',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Phần font tải sau: tải một lần, sau đó luôn lấy từ máy (kể cả khi offline)
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'hibi-fonts',
              expiration: { maxEntries: 600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Tauri (bản Windows) cần cổng cố định khi chạy thử
  server: { port: 5173, strictPort: true },
  clearScreen: false,
})
