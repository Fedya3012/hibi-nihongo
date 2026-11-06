/** Tên dễ hiểu của từng bảng, để hiện khi xem trước file sao lưu và ở trang Dung lượng. */
import type { StoreName } from './schema'

export const STORE_LABELS: Record<StoreName, string> = {
  kv: 'Cài đặt và ghi nhớ nhỏ',
  packs: 'Danh sách gói nội dung',
  packItems: 'Từ điển, kanji (gói nội dung)',
  srsCards: 'Thẻ ôn tập',
  srsLogs: 'Lịch sử ôn tập',
  mangaSeries: 'Bộ manga',
  mangaChapters: 'Chương manga',
  mangaBlobs: 'Ảnh trang manga',
  animeSeries: 'Bộ anime',
  animeEpisodes: 'Tập anime',
  animeSubs: 'Phụ đề anime',
  animeMedia: 'Video anime',
  mangaNotes: 'Bong bóng thoại, ghi chú manga',
  studyDays: 'Thời gian học mỗi ngày',
  textbooks: 'Giáo trình',
  textbookLessons: 'Bài trong giáo trình',
  textbookMedia: 'Audio, file sách của giáo trình',
  textbookNotes: 'Ghi chú trên sách',
  knownWords: 'Kho từ',
  animeSentences: 'Câu anime đã lưu',
  animeClips: 'Ảnh, tiếng của câu anime',
  animeLinks: 'Liên kết thẻ với tập anime',
  srsMedia: 'Ảnh, tiếng của thẻ ôn tập',
  backupSnapshots: 'Bản an toàn trước khi khôi phục',
}
