/**
 * API CÔNG KHAI CỦA MODULE HÔM NAY & TIẾN ĐỘ cho module khác (Tóm tắt, Lộ trình, Trợ lý...).
 *
 *   import { useStudyStats, logStudyTime } from '@/modules/today/api'
 *
 *   const stats = useStudyStats()
 *   // stats?.streak.current, stats?.days.get(stats.today)?.totalMin, stats?.learnedTotal.kanji ...
 *
 *   // Ghi thêm thời gian học mà đồng hồ tự động không thấy được (ví dụ nghe audio ngoài app):
 *   await logStudyTime('other', 10 * 60)   // 10 phút
 *
 * Đồng hồ tự đếm giờ khi bạn ở các trang học. Module mới có đường dẫn riêng thì thêm một dòng
 * vào ROUTES trong lib/categories.ts để được tính giờ.
 */
import { dayKey, getDayStartHour } from './lib/days'
import { addStudyTime } from './lib/store'
import type { Category } from './lib/categories'

export { useStudyStats, getStudyStats, type StudyStats, type DaySummary, type StreakInfo } from './lib/stats'
export { CATEGORIES, CATEGORY_LABEL, type Category } from './lib/categories'
export { flush as flushStudyTimer } from './lib/tracker'

/** Cộng thêm thời gian học (giây) vào hôm nay. */
export async function logStudyTime(category: Category, seconds: number, at = Date.now()) {
  const day = dayKey(at, await getDayStartHour())
  await addStudyTime([{ day, c: category, s: at - seconds * 1000, e: at, secs: seconds }])
}
