/**
 * API CÔNG KHAI CỦA MODULE ÔN TẬP cho các module khác (từ điển, kanji, kana, anime...).
 *
 *   import { addReviewCards, useReviewOverview } from '@/modules/review/api'
 *
 *   // Tạo thẻ từ một từ trong từ điển (không tạo trùng nếu bấm 2 lần):
 *   await addReviewCards([{ deck: 'Từ vựng của tôi', kind: 'vocab', front: '食べる', reading: 'たべる',
 *     meaning: 'ăn', source: { module: 'dictionary', ref: '1358280' } }])
 *
 *   // Số thẻ đến hạn cho màn hình Hôm nay (tự cập nhật):
 *   const ov = useReviewOverview()   // ov?.dueNow, ov?.newAvailable, ov?.reviewedToday
 *
 * Đường dẫn mở thẳng ôn nhanh 5 phút: /review?quick=1
 */
import { useDbQuery } from '@/core/db'
import { addCards, getOverview, type NewCardInput, type Overview } from './store'

/*
 * Ảnh: truyền `image` là Blob/File (vd ảnh panel manga cắt từ trang) hoặc data URL.
 * Ảnh tự được nén thành JPEG cạnh dài ≤ 900px và hiện ở mặt đáp án.
 * Mở thẳng tab Thẻ và tìm sẵn: /review?tab=cards&q=<chữ cần tìm>
 */

export type { NewCardInput as ReviewCardInput, Overview as ReviewOverview } from './store'
export type { CardKind, SrsCard, SrsLog, Rating } from './types'

/** Thêm thẻ vào SRS. Trả về số thẻ được thêm (thẻ trùng bị bỏ qua). */
export const addReviewCards = (cards: NewCardInput[]) => addCards(cards)

export const getReviewOverview = (): Promise<Overview> => getOverview()

/** Hook React: tổng quan ôn tập, tự cập nhật khi có thẻ được ôn/thêm. */
export function useReviewOverview(): Overview | undefined {
  return useDbQuery(() => getOverview(), [], ['srsCards', 'srsLogs', 'kv']).data
}
