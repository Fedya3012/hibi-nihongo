/**
 * DANH SÁCH MODULE (TÍNH NĂNG)
 * ----------------------------
 * File này KHÔNG cần sửa khi thêm tính năng. Mỗi module tự khai báo trong
 * src/modules/<id>/module.ts (xem src/modules/define.ts); ở đây chỉ gom tất cả lại và sắp xếp.
 *
 * Thêm tính năng mới = tạo thư mục src/modules/<id>/ có file module.ts. Xong.
 */
import type { AppModule } from './define'

export type { AppModule, ModuleText } from './define'

// Vite tìm mọi file module.ts lúc build (eager: nạp ngay, vì file nào cũng nhỏ; trang thật vẫn lazy)
const found = import.meta.glob<{ default: AppModule }>(['./*/module.ts', './*/*/module.ts'], { eager: true })

export const modules: AppModule[] = Object.values(found)
  .map((f) => f.default)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

// Báo lỗi sớm nếu hai module vô tình trùng id hoặc đường dẫn
for (const key of ['id', 'path'] as const) {
  const seen = new Set<string>()
  for (const m of modules) {
    if (seen.has(m[key])) console.error(`[registry] Hai module trùng ${key}: "${m[key]}"`)
    seen.add(m[key])
  }
}

export const mainNav = modules.filter((m) => m.nav === 'main')
export const learnModules = modules.filter((m) => m.nav === 'learn')
