/**
 * KHUNG SÁCH CÓ SẴN
 * Chỉ gồm tên sách, phiên bản và số bài: đây là thông tin sự thật, không phải nội dung sách.
 * Tên sách dùng để cho biết "tương thích với", app không liên quan tới nhà xuất bản.
 * Thêm sách mới: thêm một dòng vào đây (tagPrefix nên ngắn, viết thường, không dấu).
 */
import type { BookTemplate } from './types'

export const TEMPLATES: BookTemplate[] = [
  { id: 'minna-1', title: 'Minna no Nihongo Sơ cấp I', short: 'Minna I', edition: 'bản 2 (第2版)',
    grammarBook: 'minna', tagPrefix: 'minna', firstLesson: 1, lessonCount: 25 },
  { id: 'minna-2', title: 'Minna no Nihongo Sơ cấp II', short: 'Minna II', edition: 'bản 2 (第2版)',
    grammarBook: 'minna', tagPrefix: 'minna', firstLesson: 26, lessonCount: 25 },
  { id: 'genki-1', title: 'Genki I', short: 'Genki I', edition: 'bản 3',
    grammarBook: 'genki', tagPrefix: 'genki', firstLesson: 1, lessonCount: 12 },
  { id: 'genki-2', title: 'Genki II', short: 'Genki II', edition: 'bản 3',
    grammarBook: 'genki', tagPrefix: 'genki', firstLesson: 13, lessonCount: 11 },
]
