/**
 * CẤU TRÚC ĐIỀU HƯỚNG (dùng chung cho thanh bên, thanh dưới, tiêu đề tab trình duyệt)
 * ----------------------------------------------------------------------------------
 * Tự dựng từ registry, không cần sửa khi thêm module:
 *   - Mỗi module `nav: 'main'` là một mục chính.
 *   - Module có đường dẫn nằm "bên trong" mục chính (vd /learn/grammar nằm trong /learn) là mục con
 *     của nó, hiện ngay dưới mục chính trên thanh bên máy tính, để mở thẳng không phải qua trang cổng.
 *   - Module chưa làm (`status: 'planned'`) không hiện trên thanh bên, chỉ hiện ở mục "Sắp có".
 */
import { mainNav, modules, type AppModule } from '@/modules/registry'

export interface NavEntry {
  module: AppModule
  children: AppModule[]
}

const isInside = (child: AppModule, parent: AppModule) =>
  parent.path !== '/' && child.path.startsWith(parent.path + '/')

/** Mục con (đã dùng được hoặc đang làm) của một mục chính. Module `nav: 'learn'` luôn thuộc mục Học. */
export function childrenOf(parent: AppModule): AppModule[] {
  const list = modules.filter(
    (m) => m.status !== 'planned' && m.nav !== 'main' && (isInside(m, parent) || (parent.id === 'learn' && m.nav === 'learn')),
  )
  // Công cụ dùng chung nằm ngoài đường dẫn của mục (vd Từ điển /dictionary) xếp cuối nhóm
  return [...list.filter((m) => isInside(m, parent)), ...list.filter((m) => !isInside(m, parent))]
}

export const navTree: NavEntry[] = mainNav.map((m) => ({ module: m, children: childrenOf(m) }))

/** Module ứng với đường dẫn hiện tại (khớp dài nhất), để đặt tiêu đề tab và đánh dấu mục đang mở. */
export function moduleForPath(pathname: string): AppModule | undefined {
  let best: AppModule | undefined
  for (const m of modules) {
    const hit = m.path === '/' ? pathname === '/' : pathname === m.path || pathname.startsWith(m.path + '/')
    if (hit && (!best || m.path.length > best.path.length)) best = m
  }
  return best
}
