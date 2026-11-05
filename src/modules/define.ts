/**
 * MỖI MODULE TỰ ĐĂNG KÝ
 * ---------------------
 * Mỗi tính năng có một file `module.ts` nằm trong chính thư mục của nó, ví dụ:
 *   src/modules/grammar/module.ts
 *   src/modules/immersion/manga/module.ts   (module con: sâu tối đa 2 cấp)
 * File đó `export default defineModule({...})`. src/modules/registry.ts tự tìm mọi file `module.ts`,
 * nên THÊM TÍNH NĂNG MỚI KHÔNG CẦN SỬA FILE DÙNG CHUNG NÀO. Nhờ vậy hai PR làm hai tính năng
 * khác nhau không bao giờ đụng cùng một dòng (trước đây mọi module nằm chung một danh sách,
 * hai PR sửa hai dòng sát nhau là git báo conflict).
 *
 * File này chỉ chứa kiểu dữ liệu, không import gì của module nào.
 */
import type { ComponentType, LazyExoticComponent } from 'react'

export interface ModuleText {
  title: string
  description?: string
}

export interface AppModule {
  id: string
  path: string
  /** Tên tiếng Việt (ngôn ngữ gốc của app). */
  title: string
  icon: string // một ký tự tiếng Nhật làm biểu tượng, nhẹ và không cần thư viện icon
  /** 'main' = thanh chính, 'learn' = trong mục Học, 'hidden' = không hiện, mở bằng đường dẫn */
  nav: 'main' | 'learn' | 'hidden'
  /** 'planned' (chưa làm) | 'building' (đang làm) | 'ready' (dùng được) */
  status: 'planned' | 'building' | 'ready'
  phase: 1 | 2 | 3 | 4
  /**
   * Thứ tự hiện trên thanh điều hướng / trong mục Học, số nhỏ đứng trước. Cách nhau 10 để chen
   * module mới vào giữa mà không phải đánh số lại module khác. Trùng số thì xếp theo id.
   */
  order: number
  /** Mô tả tiếng Việt. */
  description: string
  /** Tên + mô tả tiếng Anh / Nhật (không bắt buộc; thiếu thì dùng tiếng Việt). */
  text?: { en?: ModuleText; ja?: ModuleText }
  page: LazyExoticComponent<ComponentType>
}

/** Chỉ để có gợi ý và kiểm tra kiểu khi viết module.ts. */
export function defineModule(m: AppModule): AppModule {
  return m
}
