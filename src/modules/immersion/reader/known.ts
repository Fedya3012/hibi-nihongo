/**
 * CẦU NỐI VỚI "KHO TỪ ĐÃ BIẾT" (module vocab, dùng chung toàn app)
 * Trình đọc chỉ hỏi kho từ qua file này. Xem src/modules/vocab/api.ts.
 * Chữ trong trình đọc tự được gạch chân theo trạng thái vì trình đọc dùng <JapaneseText>.
 */
import { setWordStatus, type WordInput } from '@/modules/vocab/api'

export { useKnowledge, segmentStatus, isStudyWord, coverageOf, type Knowledge, type Coverage, type WordStatus } from '@/modules/vocab/api'

/** Đánh dấu / bỏ đánh dấu "Đã biết". Có id JMdict thì khớp chắc chắn hơn. */
export async function markKnown(word: string | WordInput, known: boolean): Promise<void> {
  await setWordStatus(word, known ? 'known' : null, 'reader')
}
