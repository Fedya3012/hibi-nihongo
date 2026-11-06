// Cấu hình chạy kiểm tra tự động (npm test). Chỉ cần đường tắt '@/…' giống app, không cần plugin của Vite.
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
