/**
 * BONG BÓNG THOẠI, ĐÁNH DẤU TRANG, GHI CHÚ (bảng mangaNotes, có sao lưu).
 */
import { getAll, getAllByIndex, put, remove, get } from '@/core/db'
import { newId } from './store'
import type { Box, MangaBookmark, MangaBubble, MangaNote } from './types'

export const listChapterNotes = (chapterId: string) =>
  getAllByIndex<MangaNote>('mangaNotes', 'by_chapter', chapterId)

export const listAllNotes = () => getAll<MangaNote>('mangaNotes')

export const getNote = (id: string) => get<MangaNote>('mangaNotes', id)

export async function addBubble(input: {
  seriesId: string; chapterId: string; page: number; box: Box; text: string; speaker?: string
}): Promise<MangaBubble> {
  const b: MangaBubble = { id: newId(), kind: 'bubble', createdAt: Date.now(), ...input, text: input.text.trim() }
  await put('mangaNotes', b)
  return b
}

export async function saveNote(n: MangaNote): Promise<void> {
  await put('mangaNotes', n)
}

export const deleteNote = (id: string) => remove('mangaNotes', id)

export async function toggleBookmark(seriesId: string, chapterId: string, page: number, existing?: MangaBookmark): Promise<void> {
  if (existing) return deleteNote(existing.id)
  const b: MangaBookmark = { id: newId(), kind: 'bookmark', seriesId, chapterId, page, note: '', createdAt: Date.now() }
  await put('mangaNotes', b)
}

/** Sắp bong bóng theo thứ tự đọc manga: trên xuống, rồi phải sang trái (hoặc trái sang phải). */
export function readingOrder(list: MangaBubble[], rtl: boolean): MangaBubble[] {
  return [...list].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page
    // Cùng "hàng" (chồng lên nhau theo chiều dọc) thì xét ngang
    const overlap = Math.min(a.box.y + a.box.h, b.box.y + b.box.h) - Math.max(a.box.y, b.box.y)
    if (overlap > Math.min(a.box.h, b.box.h) * 0.4) return rtl ? b.box.x - a.box.x : a.box.x - b.box.x
    return a.box.y - b.box.y
  })
}

/** Bỏ dấu tiếng Việt và đưa katakana về hiragana để tìm kiếm dễ hơn. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}
