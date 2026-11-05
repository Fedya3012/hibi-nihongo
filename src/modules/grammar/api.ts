/**
 * API CÔNG KHAI CỦA MODULE NGỮ PHÁP cho các module khác (Giáo trình, Lộ trình, trợ lý AI, manga…).
 * File này nhẹ: nội dung bài chỉ được tải khi gọi hàm.
 *
 *   import { getGrammarPoints, grammarForLesson, grammarPath, GrammarChips } from '@/modules/grammar/api'
 *
 *   // Bài 15 Minna dạy những mẫu nào?
 *   const pts = await grammarForLesson('minna', 15)        // [〜てもいいです, 〜てはいけません, 〜ています…]
 *
 *   // Hiện các nút mở bài ngữ pháp (vd trong trang bài học của Giáo trình)
 *   <GrammarChips ids={pts.map((p) => p.id)} />
 *
 *   // Mở bài / luyện riêng mấy mẫu
 *   navigate(grammarPath('te-mo-ii'))
 *   navigate(grammarPracticePath(['te-mo-ii', 'te-wa-ikemasen']))
 *
 * Mã mẫu (id) là cố định; danh sách mã nằm trong data/n5.ts, data/n4.ts.
 */
import type { GrammarPoint, JlptLevel } from './types'
import { loadGrammar } from './lib/content'

export type { GrammarPoint, GrammarExample, GrammarCat, JlptLevel } from './types'
export { grammarPath, grammarLevelPath, grammarPracticePath } from './lib/paths'
export { GrammarChips } from './components/GrammarChips'
export { useGrammarState, getGrammarProgress, addGrammarCards, type GrammarState, type GrammarProgress } from './lib/progress'
export { plainText as grammarPlainText } from './lib/parse'

/** Mọi mẫu (đúng thứ tự học), có thể lọc theo cấp. */
export async function listGrammarPoints(level?: JlptLevel): Promise<GrammarPoint[]> {
  const { list } = await loadGrammar()
  return level ? list.filter((p) => p.level === level) : list
}

export async function getGrammarPoint(id: string): Promise<GrammarPoint | undefined> {
  return (await loadGrammar()).byId.get(id)
}

/** Nhiều mẫu theo mã, giữ thứ tự của `ids`; mã không tồn tại bị bỏ qua. */
export async function getGrammarPoints(ids: string[]): Promise<GrammarPoint[]> {
  const { byId } = await loadGrammar()
  return ids.flatMap((id) => byId.get(id) ?? [])
}

/**
 * Các mẫu được dạy lần đầu ở bài `lesson` của sách `book` ('minna', 'genki', hoặc mã sách mới).
 * Dựa vào trường `lessons` của từng mẫu.
 */
export async function grammarForLesson(book: string, lesson: number): Promise<GrammarPoint[]> {
  const { list } = await loadGrammar()
  return list.filter((p) => p.lessons?.[book] === lesson)
}
