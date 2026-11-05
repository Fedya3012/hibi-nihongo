/**
 * BỘ THẺ MẪU N5 (tự soạn, không lấy từ giáo trình có bản quyền)
 * Để người mới có thẻ học thử ngay. Thêm bằng nút "Thêm bộ thẻ mẫu N5" trên trang Ôn tập.
 * Định dạng mỗi dòng: [mặt trước, cách đọc, nghĩa, câu ví dụ?, nghĩa câu ví dụ?]
 */
import type { NewCardInput } from './store'

type Row = [string, string, string, string?, string?]

const VOCAB: Row[] = [
  ['私', 'わたし', 'tôi', '私は学生です。', 'Tôi là học sinh.'],
  ['学生', 'がくせい', 'học sinh, sinh viên', '兄は大学の学生です。', 'Anh trai tôi là sinh viên đại học.'],
  ['先生', 'せんせい', 'giáo viên, thầy/cô', '田中先生は優しいです。', 'Thầy Tanaka hiền.'],
  ['友達', 'ともだち', 'bạn bè', '友達と映画を見ます。', 'Tôi xem phim với bạn.'],
  ['水', 'みず', 'nước', '水を飲みます。', 'Tôi uống nước.'],
  ['お茶', 'おちゃ', 'trà', 'お茶をください。', 'Cho tôi trà.'],
  ['ご飯', 'ごはん', 'cơm, bữa ăn', '朝ご飯を食べましたか。', 'Bạn ăn sáng chưa?'],
  ['食べる', 'たべる', 'ăn', '毎朝パンを食べます。', 'Sáng nào tôi cũng ăn bánh mì.'],
  ['飲む', 'のむ', 'uống', 'コーヒーを飲みます。', 'Tôi uống cà phê.'],
  ['見る', 'みる', 'xem, nhìn', 'テレビを見ます。', 'Tôi xem ti vi.'],
  ['行く', 'いく', 'đi', '明日学校へ行きます。', 'Ngày mai tôi đi học.'],
  ['来る', 'くる', 'đến', '友達が家に来ます。', 'Bạn tôi đến nhà.'],
  ['帰る', 'かえる', 'về (nhà, nước)', '六時に家へ帰ります。', 'Tôi về nhà lúc 6 giờ.'],
  ['読む', 'よむ', 'đọc', '漫画を読みます。', 'Tôi đọc manga.'],
  ['書く', 'かく', 'viết', '手紙を書きます。', 'Tôi viết thư.'],
  ['聞く', 'きく', 'nghe; hỏi', '音楽を聞きます。', 'Tôi nghe nhạc.'],
  ['話す', 'はなす', 'nói chuyện', '日本語で話します。', 'Tôi nói bằng tiếng Nhật.'],
  ['買う', 'かう', 'mua', '本を買いました。', 'Tôi đã mua sách.'],
  ['寝る', 'ねる', 'ngủ', '十一時に寝ます。', 'Tôi ngủ lúc 11 giờ.'],
  ['起きる', 'おきる', 'thức dậy', '七時に起きます。', 'Tôi dậy lúc 7 giờ.'],
  ['分かる', 'わかる', 'hiểu', '日本語が少し分かります。', 'Tôi hiểu một chút tiếng Nhật.'],
  ['大きい', 'おおきい', 'to, lớn', '大きい犬ですね。', 'Con chó to nhỉ.'],
  ['小さい', 'ちいさい', 'nhỏ, bé', '小さいかばんを買いました。', 'Tôi đã mua cái túi nhỏ.'],
  ['新しい', 'あたらしい', 'mới', '新しい靴です。', 'Đây là đôi giày mới.'],
  ['古い', 'ふるい', 'cũ', 'この家は古いです。', 'Ngôi nhà này cũ.'],
  ['高い', 'たかい', 'cao; đắt', 'このカメラは高いです。', 'Cái máy ảnh này đắt.'],
  ['安い', 'やすい', 'rẻ', 'この店は安いです。', 'Cửa hàng này rẻ.'],
  ['面白い', 'おもしろい', 'thú vị, hay', 'このアニメは面白いです。', 'Bộ anime này hay.'],
  ['今日', 'きょう', 'hôm nay', '今日は暑いです。', 'Hôm nay trời nóng.'],
  ['明日', 'あした', 'ngày mai', '明日は休みです。', 'Ngày mai được nghỉ.'],
  ['昨日', 'きのう', 'hôm qua', '昨日は雨でした。', 'Hôm qua trời mưa.'],
  ['毎日', 'まいにち', 'mỗi ngày', '毎日日本語を勉強します。', 'Mỗi ngày tôi học tiếng Nhật.'],
  ['時間', 'じかん', 'thời gian', '時間がありません。', 'Tôi không có thời gian.'],
  ['電車', 'でんしゃ', 'tàu điện', '電車で会社へ行きます。', 'Tôi đi làm bằng tàu điện.'],
  ['駅', 'えき', 'nhà ga', '駅はどこですか。', 'Nhà ga ở đâu?'],
  ['勉強', 'べんきょう', 'việc học', '図書館で勉強します。', 'Tôi học ở thư viện.'],
  ['本', 'ほん', 'sách', 'これは私の本です。', 'Đây là sách của tôi.'],
  ['猫', 'ねこ', 'con mèo', '猫が好きです。', 'Tôi thích mèo.'],
  ['天気', 'てんき', 'thời tiết', 'いい天気ですね。', 'Thời tiết đẹp nhỉ.'],
  ['好き', 'すき', 'thích', 'アニメが好きです。', 'Tôi thích anime.'],
]

const KANJI: Row[] = [
  ['日', 'ニチ、ジツ／ひ、か', 'ngày; mặt trời (NHẬT)'],
  ['月', 'ゲツ、ガツ／つき', 'tháng; mặt trăng (NGUYỆT)'],
  ['火', 'カ／ひ', 'lửa (HỎA)'],
  ['水', 'スイ／みず', 'nước (THỦY)'],
  ['木', 'モク、ボク／き', 'cây (MỘC)'],
  ['金', 'キン、コン／かね', 'vàng; tiền (KIM)'],
  ['土', 'ド、ト／つち', 'đất (THỔ)'],
  ['山', 'サン／やま', 'núi (SƠN)'],
  ['川', 'セン／かわ', 'sông (XUYÊN)'],
  ['人', 'ジン、ニン／ひと', 'người (NHÂN)'],
  ['口', 'コウ、ク／くち', 'miệng (KHẨU)'],
  ['目', 'モク／め', 'mắt (MỤC)'],
  ['手', 'シュ／て', 'tay (THỦ)'],
  ['大', 'ダイ、タイ／おお(きい)', 'to, lớn (ĐẠI)'],
  ['小', 'ショウ／ちい(さい)、こ', 'nhỏ (TIỂU)'],
  ['上', 'ジョウ／うえ、あ(がる)', 'trên (THƯỢNG)'],
  ['下', 'カ、ゲ／した、さ(がる)', 'dưới (HẠ)'],
  ['中', 'チュウ／なか', 'giữa, bên trong (TRUNG)'],
  ['学', 'ガク／まな(ぶ)', 'học (HỌC)'],
  ['語', 'ゴ／かた(る)', 'ngôn ngữ, lời (NGỮ)'],
]

const GRAMMAR: Row[] = [
  ['〜は〜です', '', 'A là B (câu khẳng định lịch sự)', '私{{は}}ベトナム人{{です}}。', 'Tôi là người Việt Nam.'],
  ['〜じゃありません', '', 'không phải là ~ (phủ định của です)', '私は先生{{じゃありません}}。', 'Tôi không phải là giáo viên.'],
  ['〜か', '', 'trợ từ cuối câu, biến câu thành câu hỏi', 'これは本です{{か}}。', 'Đây có phải là sách không?'],
  ['〜の〜', '', 'của (nối hai danh từ, chỉ sở hữu)', 'これは私{{の}}かばんです。', 'Đây là cặp của tôi.'],
  ['〜ます／〜ません', '', 'động từ thể lịch sự: làm / không làm', '肉を食べ{{ません}}。', 'Tôi không ăn thịt.'],
  ['〜ました', '', 'đã làm (quá khứ lịch sự)', '昨日映画を見{{ました}}。', 'Hôm qua tôi đã xem phim.'],
  ['〜を', '', 'trợ từ chỉ tân ngữ (cái bị tác động)', 'パン{{を}}食べます。', 'Tôi ăn bánh mì.'],
  ['〜に／〜へ 行きます', '', 'đi đến ~ (chỉ hướng/đích đến)', '日本{{へ}}行きます。', 'Tôi đi Nhật.'],
  ['〜で', '', 'tại ~ (nơi hành động xảy ra); bằng ~ (phương tiện)', 'バス{{で}}学校へ行きます。', 'Tôi đi học bằng xe buýt.'],
  ['〜たいです', '', 'muốn làm ~', '日本へ行き{{たいです}}。', 'Tôi muốn đi Nhật.'],
  ['〜てください', '', 'hãy làm ~ (nhờ, đề nghị lịch sự)', 'ここに名前を書い{{てください}}。', 'Hãy viết tên vào đây.'],
  ['〜ましょう', '', 'cùng làm ~ nhé (rủ rê)', '一緒に昼ご飯を食べ{{ましょう}}。', 'Cùng ăn trưa nhé.'],
]

export const STARTER_DECKS = { vocab: 'Từ vựng N5 (mẫu)', kanji: 'Kanji N5 (mẫu)', grammar: 'Ngữ pháp N5 (mẫu)' } as const

/** Toàn bộ thẻ mẫu, sẵn sàng đưa vào addCards(). */
export function starterCards(): NewCardInput[] {
  const map = (rows: Row[], kind: NewCardInput['kind']): NewCardInput[] =>
    rows.map(([front, reading, meaning, example, exampleMeaning]) => ({
      deck: STARTER_DECKS[kind], kind, front, reading: reading || undefined, meaning, example, exampleMeaning,
      tags: ['N5'],
    }))
  return [...map(VOCAB, 'vocab'), ...map(KANJI, 'kanji'), ...map(GRAMMAR, 'grammar')]
}
