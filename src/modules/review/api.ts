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
import { getAll, useDbQuery } from '@/core/db'
import type { SrsCard } from './types'
import { addCards, attachMediaBySource, getOverview, tagCardsBySource, type NewCardInput, type Overview } from './store'

/*
 * Ảnh: truyền `image` là Blob/File (vd ảnh panel manga cắt từ trang) hoặc data URL.
 * Ảnh tự được nén thành JPEG cạnh dài ≤ 900px và hiện ở mặt đáp án.
 * Tiếng nói: truyền `audio` là Blob (vd đoạn thoại anime) hoặc data URL. Thẻ có tiếng thì tự phát khi lật thẻ.
 * Mở thẳng tab Thẻ và tìm sẵn: /review?tab=cards&q=<chữ cần tìm>
 */

export type { NewCardInput as ReviewCardInput, Overview as ReviewOverview } from './store'
export type { CardKind, SrsCard, SrsLog, Rating } from './types'

/*
 * Ảnh/tiếng của thẻ nằm ở bảng riêng (srsMedia), thẻ đọc từ srsCards chỉ có cờ `media`.
 * Cần ảnh/tiếng thì đọc kèm:
 *   const full = await withCardMedia(card)   // full.image, full.audio, full.frontImage
 *   const shown = useCardMedia(card)         // hook React
 *   hasCardMedia(card, 'audio')              // có tiếng không, không cần đọc
 */
export { withMedia as withCardMedia, useCardMedia, hasMedia as hasCardMedia } from './media'

/** Thêm thẻ vào SRS. Trả về số thẻ được thêm (thẻ trùng bị bỏ qua). */
export const addReviewCards = (cards: NewCardInput[]) => addCards(cards)

/**
 * Gắn thêm nhãn cho thẻ đã có theo nguồn, không tạo thẻ mới. Trả về tập "module:ref" đã có thẻ.
 *   await tagReviewCards([{ module: 'dictionary', ref: '1358280' }], 'minna-5')
 */
export const tagReviewCards = (sources: { module: string; ref: string }[], tag: string) => tagCardsBySource(sources, tag)

/** Thẻ theo nguồn: Map "module:ref" → thẻ (vd để biết từ nào trong bài giáo trình đã thuộc). */
export async function getReviewCardsBySource(): Promise<Map<string, SrsCard>> {
  const map = new Map<string, SrsCard>()
  for (const c of await getAll<SrsCard>('srsCards')) if (c.source) map.set(`${c.source.module}:${c.source.ref}`, c)
  return map
}

export const getReviewOverview = (): Promise<Overview> => getOverview()

/** Hook React: tổng quan ôn tập, tự cập nhật khi có thẻ được ôn/thêm. */
export function useReviewOverview(): Overview | undefined {
  return useDbQuery(() => getOverview(), [], ['srsCards', 'srsLogs', 'kv']).data
}

/**
 * Gắn ảnh / tiếng nói vào thẻ đã có theo nguồn (không tạo thẻ mới). Trả về số thẻ được cập nhật.
 *   await attachReviewMedia({ module: 'dictionary', ref: '1358280' }, { image: blob, audio: clip })
 */
export const attachReviewMedia = (
  source: { module: string; ref: string },
  media: { image?: string | Blob; audio?: string | Blob },
) => attachMediaBySource(source, media)

/**
 * Những ngày đang/đã bật chế độ nghỉ ('YYYY-MM-DD'). Module Hôm nay dùng để không làm đứt streak.
 *   const rest = await getVacationDays()
 */
export { getVacationDays } from './vacation'
