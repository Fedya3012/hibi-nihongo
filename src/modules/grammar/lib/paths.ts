/** Đường dẫn trong app tới các màn hình của module Ngữ pháp. */
import type { JlptLevel } from '../types'

/** Trang một mẫu ngữ pháp: /learn/grammar?p=te-mo-ii */
export const grammarPath = (id: string) => `/learn/grammar?p=${encodeURIComponent(id)}`
/** Danh sách theo cấp: /learn/grammar?lv=4 */
export const grammarLevelPath = (level: JlptLevel) => `/learn/grammar?lv=${level}`
/** Luyện tập, có thể chỉ một số mẫu: /learn/grammar?tab=practice&ids=a,b */
export const grammarPracticePath = (ids?: string[]) =>
  `/learn/grammar?tab=practice${ids?.length ? `&ids=${ids.map(encodeURIComponent).join(',')}` : ''}`
