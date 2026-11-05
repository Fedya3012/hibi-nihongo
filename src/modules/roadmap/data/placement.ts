/**
 * NGÂN HÀNG CÂU HỎI XẾP LỚP — Hibi Nihongo tự soạn (không lấy từ đề thi JLPT hay sách nào).
 *
 * Mỗi phần ứng với một chặng: kana, N5, N4, N3, N2. Mỗi câu có đúng một đáp án đúng,
 * LUÔN đặt ở vị trí đầu tiên trong `choices` (lúc làm bài sẽ tự xáo trộn).
 * Câu điền chỗ trống viết "＿＿". `note` là giải thích ngắn hiện sau khi làm xong.
 *
 * Thêm câu: thêm một dòng vào đúng phần. Nên giữ câu ngắn, chỉ một cách hiểu,
 * và tránh các đáp án sai mà vẫn "đúng ngữ pháp" theo nghĩa khác.
 */
import type { LevelId } from '../types'

export type QuestionKind = 'kana' | 'kanji' | 'vocab' | 'grammar'

export interface PlacementQuestion {
  id: string
  level: LevelId
  kind: QuestionKind
  /** Câu hỏi (tiếng Nhật). */
  q: string
  /** Đáp án; đáp án đúng đứng đầu. */
  choices: [string, string, string, string]
  /** Giải thích ngắn bằng tiếng Việt. */
  note?: string
}

const K = (id: string, q: string, choices: PlacementQuestion['choices']): PlacementQuestion =>
  ({ id: `kana-${id}`, level: 'kana', kind: 'kana', q, choices })

export const QUESTIONS: PlacementQuestion[] = [
  // ---------- Kana: chữ này đọc là gì ----------
  K('ne', 'ね', ['ne', 're', 'wa', 'nu']),
  K('so', 'ソ', ['so', 'n', 'ri', 'tsu']),
  K('ki', 'き', ['ki', 'sa', 'chi', 'ri']),
  K('shi', 'シ', ['shi', 'tsu', 'so', 'n']),
  K('nu', 'ぬ', ['nu', 'me', 'ne', 'ru']),
  K('ma', 'マ', ['ma', 'mu', 'ya', 'a']),
  K('kyo', 'きょ', ['kyo', 'kya', 'kyu', 'kiyo']),
  K('tsu', 'ツ', ['tsu', 'shi', 'so', 'n']),

  // ---------- N5 ----------
  { id: 'n5-yama', level: 'n5', kind: 'kanji', q: '山', choices: ['やま', 'かわ', 'き', 'た'], note: '山 (やま): núi.' },
  { id: 'n5-mizu', level: 'n5', kind: 'kanji', q: '水', choices: ['みず', 'ひ', 'き', 'つち'], note: '水 (みず): nước. ひ là 火 (lửa).' },
  { id: 'n5-sensei', level: 'n5', kind: 'kanji', q: '先生', choices: ['せんせい', 'せんせ', 'さきせい', 'せいせん'], note: '先生 (せんせい): thầy cô. Chú ý trường âm い.' },
  { id: 'n5-tabemasu', level: 'n5', kind: 'vocab', q: 'たべます', choices: ['ăn', 'uống', 'ngủ', 'đi'] },
  { id: 'n5-asatte', level: 'n5', kind: 'vocab', q: 'あさって', choices: ['ngày kia', 'hôm qua', 'ngày mai', 'hôm nay'], note: 'あした = ngày mai, あさって = ngày kia.' },
  { id: 'n5-wa', level: 'n5', kind: 'grammar', q: 'わたし＿＿学生です。', choices: ['は', 'を', 'に', 'で'], note: 'は đánh dấu chủ đề: "Tôi là sinh viên".' },
  { id: 'n5-de', level: 'n5', kind: 'grammar', q: 'バス＿＿学校へ行きます。', choices: ['で', 'を', 'が', 'と'], note: 'で chỉ phương tiện: đi bằng xe buýt.' },
  { id: 'n5-mimashita', level: 'n5', kind: 'grammar', q: 'きのう、えいがを＿＿。', choices: ['見ました', '見ます', '見ません', '見ましょう'], note: 'きのう (hôm qua) → dùng thì quá khứ 〜ました.' },
  { id: 'n5-imasu', level: 'n5', kind: 'grammar', q: 'へやにねこが＿＿。', choices: ['います', 'あります', 'です', 'ます'], note: 'Con vật, người → います; đồ vật → あります.' },

  // ---------- N4 ----------
  { id: 'n4-totte', level: 'n4', kind: 'grammar', q: 'ここでしゃしんを＿＿もいいですか。', choices: ['とって', 'とり', 'とる', 'とった'], note: '〜てもいいですか: xin phép làm gì.' },
  { id: 'n4-node', level: 'n4', kind: 'grammar', q: 'あしたテストがある＿＿、きょうはべんきょうします。', choices: ['ので', 'のに', 'けど', 'ても'], note: '〜ので: vì… nên…' },
  { id: 'n4-yomemasu', level: 'n4', kind: 'grammar', q: 'わたしはかんじがすこし＿＿。', choices: ['読めます', '読まれます', '読ませます', '読みます'], note: 'Thể khả năng đi với が: 漢字が読めます (đọc được kanji).' },
  { id: 'n4-aite', level: 'n4', kind: 'grammar', q: 'まどが＿＿います。', choices: ['あいて', 'あけて', 'あく', 'あいた'], note: 'Tự động từ + ています chỉ trạng thái: cửa sổ đang mở.' },
  { id: 'n4-nagara', level: 'n4', kind: 'grammar', q: 'へやを＿＿ながら、おんがくをききます。', choices: ['そうじし', 'そうじして', 'そうじする', 'そうじした'], note: '〜ながら ghép với thể ます bỏ ます.' },
  { id: 'n4-nomeba', level: 'n4', kind: 'grammar', q: 'このくすりを＿＿ば、すぐなおります。', choices: ['のめ', 'のむ', 'のみ', 'のんで'], note: 'Thể điều kiện 〜ば: 飲む → 飲めば.' },
  { id: 'n4-unten', level: 'n4', kind: 'kanji', q: '運転', choices: ['うんてん', 'うんでん', 'うでん', 'うんて'], note: '運転 (うんてん): lái xe.' },
  { id: 'n4-tokubetsu', level: 'n4', kind: 'kanji', q: '特別', choices: ['とくべつ', 'とくべち', 'どくべつ', 'とくへつ'], note: '特別 (とくべつ): đặc biệt.' },
  { id: 'n4-taitei', level: 'n4', kind: 'vocab', q: 'たいてい', choices: ['thường thì, phần lớn', 'không bao giờ', 'vừa mới', 'chắc chắn'] },

  // ---------- N3 ----------
  { id: 'n3-sou', level: 'n3', kind: 'grammar', q: '雨が降り＿＿だから、かさを持っていこう。', choices: ['そう', 'よう', 'らしい', 'みたい'], note: 'Gốc ます + そう: trông có vẻ sắp… (降りそう).' },
  { id: 'n3-noni', level: 'n3', kind: 'grammar', q: '日本に来た＿＿、まだすしを食べたことがない。', choices: ['のに', 'ので', 'ため', 'から'], note: '〜のに: vậy mà, dù… (trái với mong đợi).' },
  { id: 'n3-kuseni', level: 'n3', kind: 'grammar', q: '彼は医者の＿＿、たばこをやめない。', choices: ['くせに', 'せいで', 'おかげで', 'ために'], note: '〜くせに: dù là… vậy mà (chê trách).' },
  { id: 'n3-madeni', level: 'n3', kind: 'grammar', q: 'このレポートは金曜日まで＿＿出してください。', choices: ['に', 'で', 'を', 'が'], note: 'までに: hạn chót (trước…). まで: liên tục cho tới.' },
  { id: 'n3-temo', level: 'n3', kind: 'grammar', q: '何度説明して＿＿、彼は分かってくれない。', choices: ['も', 'は', 'から', 'ので'], note: '〜ても: dù có… cũng không.' },
  { id: 'n3-keiken', level: 'n3', kind: 'kanji', q: '経験', choices: ['けいけん', 'きょうけん', 'けいげん', 'けんけい'], note: '経験 (けいけん): kinh nghiệm.' },
  { id: 'n3-todoku', level: 'n3', kind: 'kanji', q: '届く', choices: ['とどく', 'とおく', 'ととく', 'とどうく'], note: '届く (とどく): được gửi tới.' },
  { id: 'n3-ukkari', level: 'n3', kind: 'vocab', q: 'うっかり', choices: ['lơ đễnh, vô ý', 'cẩn thận', 'rõ ràng', 'dần dần'] },

  // ---------- N2 ----------
  { id: 'n2-nashi', level: 'n2', kind: 'grammar', q: '社長の許可＿＿、この部屋には入れません。', choices: ['なしには', 'にとって', 'について', 'に対して'], note: '〜なしには: nếu không có… thì không.' },
  { id: 'n2-nimokakawarazu', level: 'n2', kind: 'grammar', q: '忙しい＿＿、彼は毎日ジョギングを続けている。', choices: ['にもかかわらず', 'からには', 'うえは', 'ばかりに'], note: '〜にもかかわらず: mặc dù.' },
  { id: 'n2-karaniwa', level: 'n2', kind: 'grammar', q: '約束した＿＿、最後までやるつもりだ。', choices: ['からには', 'くせに', 'わりに', 'どころか'], note: '〜からには: một khi đã… thì phải.' },
  { id: 'n2-wari', level: 'n2', kind: 'grammar', q: 'この店は値段の＿＿、味がいい。', choices: ['わりに', 'うえに', 'かわりに', 'ばかりか'], note: '〜わりに: so với… thì (hơn mong đợi).' },
  { id: 'n2-ueni', level: 'n2', kind: 'grammar', q: '彼女は歌が上手な＿＿、ダンスも上手だ。', choices: ['うえに', 'わりに', 'くせに', 'かわりに'], note: '〜うえに: không những… mà còn.' },
  { id: 'n2-henken', level: 'n2', kind: 'kanji', q: '偏見', choices: ['へんけん', 'へんげん', 'べんけん', 'へんみ'], note: '偏見 (へんけん): định kiến.' },
  { id: 'n2-ichijirushii', level: 'n2', kind: 'kanji', q: '著しい', choices: ['いちじるしい', 'いちじろしい', 'ちょしい', 'あらわしい'], note: '著しい (いちじるしい): rõ rệt, đáng kể.' },
  { id: 'n2-ainiku', level: 'n2', kind: 'vocab', q: 'あいにく', choices: ['tiếc là, không may', 'may mắn thay', 'đương nhiên', 'thỉnh thoảng'] },
]

/** Các phần của bài, theo thứ tự làm. */
export const TEST_LEVELS: LevelId[] = ['kana', 'n5', 'n4', 'n3', 'n2']
/** Số câu mỗi phần. */
export const PER_LEVEL = 6
/** Đúng từ chừng này câu trong một phần thì được làm tiếp phần khó hơn. */
export const PASS_RIGHT = 4
