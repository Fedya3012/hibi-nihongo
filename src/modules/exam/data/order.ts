/**
 * CÂU SẮP XẾP ★ SOẠN SẴN (文の組み立て) — Hibi Nihongo tự soạn, không lấy từ đề thi JLPT hay sách nào.
 * Dùng thêm khi câu ví dụ của module Ngữ pháp không đủ (câu ví dụ N5, N4 phần lớn quá ngắn để đục 4 ô).
 *
 * `chunks` là 4 cụm ĐÚNG THỨ TỰ; ô ★ là cụm thứ 3. Giống đề thật, trợ từ thường tách thành cụm riêng
 * để chỉ có MỘT cách xếp đúng. Khi thêm câu, tự kiểm tra không có cách xếp thứ hai nghe vẫn tự nhiên.
 */
import type { Level } from '../types'

export interface OrderItem { level: Level; before: string; chunks: [string, string, string, string]; after: string; note: string }

export const ORDER_BANK: OrderItem[] = [
  // N5
  { level: 5, before: 'Ａ「いつ　日本へ　きましたか。」Ｂ「', chunks: ['きょねん', 'の', '九月', 'に'], after: 'きました。」', note: 'きょねんの九月にきました: tôi đến vào tháng 9 năm ngoái.' },
  { level: 5, before: 'これは', chunks: ['わたし', 'が', 'つくった', 'ケーキ'], after: 'です。', note: 'わたしがつくったケーキ: cái bánh tôi làm (câu bổ nghĩa cho danh từ).' },
  { level: 5, before: 'えきの', chunks: ['まえ', 'に', 'ある', '店'], after: 'で　かいました。', note: 'えきのまえにある店: cửa hàng ở trước ga.' },
  { level: 5, before: 'わたしは', chunks: ['ごはんを', 'たべた', 'あとで', 'さんぽ'], after: 'を　します。', note: 'V-た あとで: sau khi ăn cơm thì đi dạo.' },
  { level: 5, before: 'あそこで', chunks: ['しんぶん', 'を', 'よんで', 'いる'], after: '人は　だれですか。', note: 'しんぶんをよんでいる人: người đang đọc báo.' },
  { level: 5, before: 'にほんごの', chunks: ['べんきょう', 'は', 'むずかしい', 'です'], after: 'が、おもしろいです。', note: 'Việc học tiếng Nhật khó nhưng thú vị.' },
  // N4
  { level: 4, before: '雨が', chunks: ['降り', 'そう', 'だから', 'かさを'], after: '持っていこう。', note: '降りそうだから: vì trông có vẻ sắp mưa.' },
  { level: 4, before: '母に', chunks: ['部屋', 'を', '掃除', 'させられ'], after: 'ました。', note: 'Thể bị bắt làm: 掃除させられました (bị mẹ bắt dọn phòng).' },
  { level: 4, before: '日本へ', chunks: ['来た', 'ばかり', 'なので', '日本語が'], after: 'よく　わかりません。', note: '来たばかりなので: vì mới đến.' },
  { level: 4, before: 'この本は', chunks: ['子ども', 'でも', '読める', 'ように'], after: 'やさしく　書いて　あります。', note: '〜ように: để (trẻ con cũng đọc được).' },
  { level: 4, before: '先生に', chunks: ['聞いた', 'ほうが', 'いい', 'と'], after: '思います。', note: 'V-た ほうがいい: nên làm gì.' },
  { level: 4, before: '部屋の', chunks: ['電気', 'が', 'ついて', 'いる'], after: 'から、だれか　いるでしょう。', note: '電気がついている: đèn đang bật (trạng thái).' },
]
