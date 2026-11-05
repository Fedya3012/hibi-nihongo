/**
 * KIỂU DỮ LIỆU CỦA MODULE NGỮ PHÁP
 * Mỗi "mẫu ngữ pháp" (GrammarPoint) là một bài nhỏ: mẫu câu, nghĩa, cách ghép, giải thích, ví dụ.
 * Nội dung nằm trong data/n5.ts, data/n4.ts... (tự soạn, tiếng Việt).
 */

/** Cấp JLPT: 5 = N5 (dễ nhất) … 1 = N1. */
export type JlptLevel = 5 | 4 | 3 | 2 | 1

/** Nhóm ngữ pháp, dùng để lọc và để chọn đáp án nhiễu cho bài luyện. */
export type GrammarCat =
  | 'particle' // trợ từ: は, が, を, に, で...
  | 'verb' // thể động từ: ます, て, ない, た...
  | 'adjective' // tính từ い / な
  | 'connect' // nối câu: から, ので, けど, とき...
  | 'ending' // cuối câu: でしょう, と思います, かもしれません...
  | 'compare' // so sánh: より, いちばん...
  | 'demonstrative' // chỉ định, từ để hỏi: これ, この, ここ, どこ...
  | 'expression' // mẫu cố định khác

/**
 * Câu ví dụ: [câu tiếng Nhật, nghĩa tiếng Việt, đáp án khác cũng đúng (tùy chọn)].
 *
 * CÁCH VIẾT CÂU TIẾNG NHẬT (để app tự làm furigana, tô màu và bài luyện):
 *   - `漢字[かんじ]`  : furigana cho cụm Kanji ngay trước dấu [ ].
 *   - `{{ ... }}`     : phần chính của mẫu ngữ pháp (được tô màu; thành ô trống trong bài luyện).
 *   - dấu cách        : ranh giới giữa các cụm, dùng cho bài "Sắp xếp câu". Khi hiển thị, dấu cách bị bỏ.
 * Ví dụ: '私[わたし]{{は}} 学生[がくせい]{{です}}。'
 *
 * Phần tử thứ 3 (nếu có): những đáp án khác cũng đúng cho ô trống, để bài luyện không lấy chúng
 * làm đáp án sai. Ví dụ câu '日本{{へ}}行きます' thì に cũng đúng → ['に'].
 */
export type GrammarExample = [jp: string, vi: string, alsoOk?: string[]]

export interface GrammarPoint {
  /** Mã cố định, không đổi sau khi đã phát hành (tiến độ, thẻ Ôn tập, giáo trình đều trỏ tới mã này). */
  id: string
  level: JlptLevel
  /** Mẫu ngữ pháp, ví dụ '〜てもいいです'. */
  pattern: string
  /** Nghĩa ngắn tiếng Việt. */
  meaning: string
  cat: GrammarCat
  /** Cách ghép, mỗi dòng một công thức. Ví dụ 'V-て ＋ もいいです'. */
  form: string[]
  /** Giải thích tiếng Việt. Xuống dòng hai lần = đoạn mới. */
  explain: string
  /** Lưu ý, chỗ dễ nhầm. */
  notes?: string[]
  examples: GrammarExample[]
  /** Mã các mẫu liên quan (so sánh, dễ nhầm, học tiếp). */
  related?: string[]
  /**
   * Bài đầu tiên dạy mẫu này trong giáo trình: { minna: 15, genki: 6 }.
   * Mã sách: 'minna' (Minna no Nihongo Shokyū I + II, bài 1–50), 'genki' (Genki I + II, bài 1–23).
   * Sách mới chỉ cần thêm mã mới, không phải sửa kiểu dữ liệu. Module Giáo trình đọc trường này.
   */
  lessons?: Record<string, number>
}
