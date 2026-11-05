/**
 * GHI VÀO KHO TỪ (đánh dấu, nhập danh sách, xuất danh sách).
 * Sau khi ghi, bảng tra trong bộ nhớ được làm mới ngay để chữ đổi màu tức thì.
 */
import { invalidateKnowledge, loadKnowledge } from './knowledge'
import { clearAll, listAll, writeStatus } from './store'
import type { KnownWord, ManualStatus, WordInput } from './types'

/**
 * Đánh dấu một hoặc nhiều từ. status = null để bỏ đánh dấu.
 * src: nơi đánh dấu ('popup', 'anime', 'textbook', 'import'...). Trả về số từ thay đổi.
 */
export async function setWordStatus(
  words: string | WordInput | (string | WordInput)[], status: ManualStatus | null, src?: string,
): Promise<number> {
  const list = Array.isArray(words) ? words : [words]
  const n = await writeStatus(list, status, src)
  invalidateKnowledge()
  void loadKnowledge().catch(() => {})
  return n
}

/**
 * Tách một đoạn dán thành danh sách từ. Mỗi dòng một từ; nếu dòng có Tab / dấu phẩy / dấu chấm phẩy
 * (vd chép từ Anki hay Excel) thì chỉ lấy cột đầu. Dòng chỉ có chữ cách cũng được tách theo dấu cách.
 */
export function parseWordList(text: string): string[] {
  const out = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const first = line.split(/[\t,;，、；]/)[0]
    for (const w of first.split(/[\s　]+/)) {
      const t = w.replace(/^["'「『【\[(（]+|["'」』】\])）]+$/g, '').trim()
      if (t && /[぀-ヿ㐀-鿿豈-﫿々]/.test(t)) out.add(t)
    }
  }
  return [...out]
}

/** Nhập nhiều từ cùng lúc (dùng cho trang Kho từ, sau này cho nhập từ Anki). Trả về số từ thay đổi. */
export function importWords(words: (string | WordInput)[], status: ManualStatus = 'known', src = 'import'): Promise<number> {
  return setWordStatus(words, status, src)
}

/** Toàn bộ từ đã đánh dấu (mới nhất trước). */
export const listKnownWords = (): Promise<KnownWord[]> => listAll()

/** Xóa mọi đánh dấu (thẻ Ôn tập không bị ảnh hưởng). */
export async function clearKnownWords(): Promise<void> {
  await clearAll()
  invalidateKnowledge()
}

/** Danh sách dạng chữ, mỗi dòng: từ<Tab>cách đọc<Tab>trạng thái. */
export async function exportWordsText(): Promise<string> {
  const all = await listAll()
  return all.map((x) => [x.w, x.r ?? '', x.status].join('\t')).join('\n')
}
