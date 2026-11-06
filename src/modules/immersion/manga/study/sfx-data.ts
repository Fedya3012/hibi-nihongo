/**
 * THƯ VIỆN TỪ TƯỢNG THANH (オノマトペ) VÀ KHẨU NGỮ hay gặp trong manga.
 * Hibi Nihongo tự soạn: giải thích tiếng Việt, câu ví dụ tự viết. Muốn thêm: thêm một dòng vào mảng.
 *
 * Loại từ tượng thanh:
 *  - 擬音語 (giongo): âm thanh thật (tiếng nổ, tiếng mưa, tiếng gõ cửa...)
 *  - 擬態語 (gitaigo): dáng vẻ, chuyển động, trạng thái (lấp lánh, lững thững...)
 *  - 擬情語 (gijougo): cảm xúc, cảm giác trong người (hồi hộp, bực bội...)
 */

export type SfxKind = 'sound' | 'state' | 'feeling'

export const SFX_KIND_LABEL: Record<SfxKind, string> = {
  sound: 'Âm thanh (擬音語)',
  state: 'Dáng vẻ, chuyển động (擬態語)',
  feeling: 'Cảm xúc (擬情語)',
}

export interface Sfx {
  /** Cách viết hay gặp nhất (manga thường viết katakana). */
  w: string
  /** Các cách viết khác để nhận diện (hiragana/katakana, dạng ngắn có っ...). */
  alt?: string[]
  kind: SfxKind
  vi: string
  /** Câu ví dụ tự viết + nghĩa. */
  ex: string
  exVi: string
}

export const SFX: Sfx[] = [
  // ----- Cảm xúc -----
  { w: 'ドキドキ', alt: ['どきどき', 'ドキッ', 'どきっ'], kind: 'feeling', vi: 'Tim đập thình thịch: hồi hộp, sợ, hoặc rung động. ドキッ = giật thót một cái.', ex: '彼と目が合って、ドキドキした。', exVi: 'Chạm mắt anh ấy, tim mình đập thình thịch.' },
  { w: 'ワクワク', alt: ['わくわく'], kind: 'feeling', vi: 'Háo hức, nôn nao mong chờ điều vui.', ex: '明日の旅行、ワクワクする！', exVi: 'Chuyến đi ngày mai, háo hức quá!' },
  { w: 'イライラ', alt: ['いらいら'], kind: 'feeling', vi: 'Bực bội, sốt ruột, cáu.', ex: '電車が来なくてイライラする。', exVi: 'Tàu mãi không tới, bực cả mình.' },
  { w: 'ムカムカ', alt: ['むかむか', 'ムカッ'], kind: 'feeling', vi: 'Tức sôi lên; hoặc buồn nôn. ムカッ = nổi cáu tức thì.', ex: 'あいつの顔を見るとムカムカする。', exVi: 'Thấy mặt thằng đó là tức sôi máu.' },
  { w: 'ハラハラ', alt: ['はらはら'], kind: 'feeling', vi: 'Thót tim, lo lắng khi xem ai đó gặp nguy.', ex: '試合の最後はハラハラした。', exVi: 'Cuối trận làm mình thót tim.' },
  { w: 'ビクッ', alt: ['びくっ', 'ビクビク', 'びくびく'], kind: 'feeling', vi: 'Giật mình (ビクッ); run sợ, nơm nớp (ビクビク).', ex: '急に呼ばれてビクッとした。', exVi: 'Bị gọi bất ngờ nên giật bắn mình.' },
  { w: 'ゾクッ', alt: ['ぞくっ', 'ゾクゾク', 'ぞくぞく'], kind: 'feeling', vi: 'Ớn lạnh sống lưng (sợ, lạnh, hoặc phấn khích).', ex: '背中がゾクッとした。', exVi: 'Sống lưng lạnh toát.' },
  { w: 'モヤモヤ', alt: ['もやもや'], kind: 'feeling', vi: 'Lấn cấn, khó chịu trong lòng mà không rõ vì sao.', ex: 'まだ気持ちがモヤモヤしている。', exVi: 'Trong lòng vẫn còn lấn cấn.' },
  { w: 'ホッ', alt: ['ほっ', 'ホッと', 'ほっと'], kind: 'feeling', vi: 'Thở phào nhẹ nhõm.', ex: '無事だと聞いてホッとした。', exVi: 'Nghe nói bình an, mình thở phào.' },
  { w: 'ウキウキ', alt: ['うきうき'], kind: 'feeling', vi: 'Vui phơi phới, lâng lâng.', ex: 'デートの前でウキウキしている。', exVi: 'Sắp hẹn hò nên vui phơi phới.' },
  { w: 'ガーン', alt: ['がーん'], kind: 'feeling', vi: 'Sốc, choáng váng (như bị đánh trúng đầu).', ex: 'ガーン！テストが０点…', exVi: 'Sốc! Bài kiểm tra 0 điểm…' },
  { w: 'キュン', alt: ['きゅん', 'キュンキュン'], kind: 'feeling', vi: 'Tim thắt lại vì rung động, cảm động (hay dùng trong shoujo).', ex: 'その笑顔に胸がキュンとした。', exVi: 'Nụ cười ấy làm tim mình thắt lại.' },
  { w: 'ギクッ', alt: ['ぎくっ', 'ギクリ'], kind: 'feeling', vi: 'Chột dạ, giật mình vì bị nói trúng.', ex: '「嘘でしょ？」と言われてギクッとした。', exVi: 'Bị hỏi "Nói dối phải không?" là chột dạ.' },
  { w: 'ルンルン', alt: ['るんるん'], kind: 'feeling', vi: 'Vui vẻ, nhún nhảy trong lòng.', ex: '給料日なのでルンルンだ。', exVi: 'Ngày lĩnh lương nên vui như hội.' },
  { w: 'しょんぼり', alt: ['ショボン', 'しょぼん'], kind: 'feeling', vi: 'Buồn thiu, ỉu xìu.', ex: '怒られてしょんぼりしている。', exVi: 'Bị mắng nên buồn thiu.' },

  // ----- Dáng vẻ, chuyển động, trạng thái -----
  { w: 'ゴゴゴ', alt: ['ゴゴゴゴ'], kind: 'state', vi: 'Không khí đe dọa, sát khí tỏa ra (kiểu JoJo). Cũng là tiếng ầm ầm.', ex: '（ゴゴゴ…）', exVi: '(Sát khí bốc lên…)' },
  { w: 'シーン', alt: ['しーん'], kind: 'state', vi: 'Im phăng phắc, không khí lặng ngắt (sau câu đùa nhạt...).', ex: '教室がシーンとなった。', exVi: 'Cả lớp im phăng phắc.' },
  { w: 'キラキラ', alt: ['きらきら', 'キラッ'], kind: 'state', vi: 'Lấp lánh, long lanh (sao, mắt, đồ trang sức).', ex: '目がキラキラしている。', exVi: 'Mắt long lanh.' },
  { w: 'ピカピカ', alt: ['ぴかぴか', 'ピカッ'], kind: 'state', vi: 'Sáng bóng, mới tinh; ピカッ = lóe sáng (tia chớp).', ex: '靴をピカピカに磨いた。', exVi: 'Đánh giày bóng loáng.' },
  { w: 'ニコニコ', alt: ['にこにこ', 'ニコッ', 'にこっ'], kind: 'state', vi: 'Mỉm cười tươi tắn; ニコッ = cười một cái.', ex: '彼女はいつもニコニコしている。', exVi: 'Cô ấy lúc nào cũng tươi cười.' },
  { w: 'ニヤニヤ', alt: ['にやにや', 'ニヤッ', 'ニヤリ'], kind: 'state', vi: 'Cười nhăn nhở, cười đểu, cười thầm.', ex: '何ニヤニヤしてるの？', exVi: 'Cười nhăn nhở gì thế?' },
  { w: 'ジー', alt: ['ジーッ', 'じーっ', 'じっ', 'ジッ'], kind: 'state', vi: 'Nhìn chằm chằm, im lặng nhìn.', ex: '猫がこっちをジーッと見ている。', exVi: 'Con mèo đang nhìn chằm chằm về phía này.' },
  { w: 'チラッ', alt: ['ちらっ', 'チラチラ', 'ちらちら'], kind: 'state', vi: 'Liếc nhìn thoáng qua; チラチラ = liếc nhiều lần.', ex: '彼の方をチラッと見た。', exVi: 'Liếc nhìn anh ấy một cái.' },
  { w: 'ペコペコ', alt: ['ぺこぺこ', 'ペコリ', 'ぺこり'], kind: 'state', vi: 'Đói meo; cũng là cúi đầu lia lịa. ペコリ = cúi chào một cái.', ex: 'お腹がペコペコだ。', exVi: 'Bụng đói meo rồi.' },
  { w: 'フラフラ', alt: ['ふらふら'], kind: 'state', vi: 'Lảo đảo, choáng; hoặc đi lang thang không mục đích.', ex: '熱でフラフラする。', exVi: 'Sốt nên lảo đảo.' },
  { w: 'ヘトヘト', alt: ['へとへと'], kind: 'state', vi: 'Mệt rã rời.', ex: '練習でヘトヘトだ。', exVi: 'Tập luyện mệt rã rời.' },
  { w: 'ボロボロ', alt: ['ぼろぼろ'], kind: 'state', vi: 'Tả tơi, rách nát; kiệt quệ (người).', ex: '戦いの後、服がボロボロだ。', exVi: 'Sau trận chiến, quần áo rách tả tơi.' },
  { w: 'ゴロゴロ', alt: ['ごろごろ'], kind: 'state', vi: 'Nằm ườn lăn lộn; cũng là tiếng sấm ì ầm, vật lăn lộc cộc.', ex: '休みの日は家でゴロゴロする。', exVi: 'Ngày nghỉ thì nằm ườn ở nhà.' },
  { w: 'ダラダラ', alt: ['だらだら'], kind: 'state', vi: 'Uể oải, lề mề; mồ hôi chảy ròng ròng.', ex: 'ダラダラしないで早くやれ！', exVi: 'Đừng lề mề, làm nhanh lên!' },
  { w: 'ソワソワ', alt: ['そわそわ'], kind: 'state', vi: 'Bồn chồn, đứng ngồi không yên.', ex: '発表の前でソワソワしている。', exVi: 'Sắp thuyết trình nên bồn chồn.' },
  { w: 'オロオロ', alt: ['おろおろ'], kind: 'state', vi: 'Luống cuống, cuống quýt không biết làm gì.', ex: '迷子の子がオロオロしている。', exVi: 'Đứa bé lạc đường đang luống cuống.' },
  { w: 'バタバタ', alt: ['ばたばた'], kind: 'state', vi: 'Tất bật, rối rít; tiếng chân chạy huỳnh huỵch, vỗ cánh phành phạch.', ex: '朝はいつもバタバタしている。', exVi: 'Buổi sáng lúc nào cũng tất bật.' },
  { w: 'コソコソ', alt: ['こそこそ'], kind: 'state', vi: 'Lén lút, thì thầm sau lưng.', ex: '何をコソコソ話してるの？', exVi: 'Thì thầm lén lút gì thế?' },
  { w: 'ウロウロ', alt: ['うろうろ'], kind: 'state', vi: 'Đi tới đi lui, lảng vảng.', ex: '店の前をウロウロしている男がいる。', exVi: 'Có gã cứ lảng vảng trước cửa tiệm.' },
  { w: 'ヨロヨロ', alt: ['よろよろ', 'ヨロッ'], kind: 'state', vi: 'Loạng choạng, đi không vững.', ex: 'おじいさんがヨロヨロ歩いている。', exVi: 'Ông cụ đi loạng choạng.' },
  { w: 'ゆっくり', kind: 'state', vi: 'Thong thả, chậm rãi. (Cũng là từ tượng hình, rất hay gặp.)', ex: 'ゆっくり休んでね。', exVi: 'Nghỉ ngơi thong thả nhé.' },
  { w: 'ぐっすり', kind: 'state', vi: 'Ngủ say, ngủ ngon lành.', ex: '昨日はぐっすり眠れた。', exVi: 'Hôm qua ngủ say ngon lành.' },
  { w: 'すっきり', alt: ['スッキリ'], kind: 'state', vi: 'Sảng khoái, nhẹ nhõm, gọn gàng.', ex: '泣いたらすっきりした。', exVi: 'Khóc xong thấy nhẹ cả người.' },
  { w: 'ぺらぺら', alt: ['ペラペラ'], kind: 'state', vi: 'Nói (ngoại ngữ) trôi chảy; hoặc nói luyên thuyên; mỏng tang.', ex: '彼は英語がぺらぺらだ。', exVi: 'Anh ấy nói tiếng Anh như gió.' },
  { w: 'ぶつぶつ', alt: ['ブツブツ'], kind: 'state', vi: 'Lẩm bẩm, càu nhàu; nổi mụn lấm tấm.', ex: '何をぶつぶつ言ってるんだ？', exVi: 'Lẩm bẩm cái gì đấy?' },
  { w: 'ふわふわ', alt: ['フワフワ', 'ふわっ', 'フワッ'], kind: 'state', vi: 'Mềm xốp, bồng bềnh; lơ lửng.', ex: 'このパンはふわふわだ。', exVi: 'Bánh mì này mềm xốp.' },
  { w: 'もちもち', alt: ['モチモチ'], kind: 'state', vi: 'Dẻo dai, mềm dẻo (như bánh mochi).', ex: 'ほっぺがもちもちしている。', exVi: 'Má mềm dẻo như bánh mochi.' },
  { w: 'ベタベタ', alt: ['べたべた'], kind: 'state', vi: 'Dính nhớp nháp; hoặc bám dính, quấn quýt (cặp đôi).', ex: '手がベタベタする。', exVi: 'Tay dính nhớp nháp.' },
  { w: 'ツルツル', alt: ['つるつる'], kind: 'state', vi: 'Trơn bóng, trơn trượt; húp mì sột soạt.', ex: '道がツルツルで危ない。', exVi: 'Đường trơn trượt nguy hiểm.' },
  { w: 'ザワザワ', alt: ['ざわざわ'], kind: 'state', vi: 'Xôn xao, ồn ào bàn tán (đám đông); gió lay cây xào xạc.', ex: '会場がザワザワし始めた。', exVi: 'Hội trường bắt đầu xôn xao.' },
  { w: 'ジロジロ', alt: ['じろじろ', 'ジロッ'], kind: 'state', vi: 'Nhìn soi mói, nhìn chòng chọc (thiếu lịch sự).', ex: '人をジロジロ見るな。', exVi: 'Đừng nhìn người ta chòng chọc thế.' },
  { w: 'プイッ', alt: ['ぷいっ', 'プイ'], kind: 'state', vi: 'Quay mặt đi (dỗi, tsundere).', ex: '彼女はプイッと横を向いた。', exVi: 'Cô ấy quay phắt mặt đi.' },
  { w: 'サッ', alt: ['さっ', 'サッと'], kind: 'state', vi: 'Nhanh gọn, vụt qua.', ex: '彼はサッと身をかわした。', exVi: 'Anh ta né vụt sang bên.' },
  { w: 'ササッ', alt: ['ささっ'], kind: 'state', vi: 'Thoăn thoắt, lẹ làng (di chuyển nhanh, lẩn đi).', ex: 'ササッと隠れた。', exVi: 'Lẩn trốn thoăn thoắt.' },
  { w: 'ジタバタ', alt: ['じたばた'], kind: 'state', vi: 'Giãy giụa, vùng vẫy; cuống cuồng.', ex: '今さらジタバタしても遅い。', exVi: 'Giờ mới cuống cuồng thì đã muộn.' },
  { w: 'ポカーン', alt: ['ぽかーん', 'ポカン', 'ぽかん'], kind: 'state', vi: 'Ngẩn tò te, há hốc mồm.', ex: 'みんなポカーンとしている。', exVi: 'Ai cũng ngẩn tò te.' },
  { w: 'ぎゅっ', alt: ['ギュッ', 'ぎゅー', 'ギュー'], kind: 'state', vi: 'Ôm chặt, siết chặt, nắm chặt.', ex: '子どもをぎゅっと抱きしめた。', exVi: 'Ôm chặt đứa con vào lòng.' },
  { w: 'ドヤ', alt: ['ドヤァ', 'ドヤッ'], kind: 'state', vi: 'Vẻ mặt vênh váo, tự đắc "thấy tao giỏi chưa" (ドヤ顔).', ex: '（ドヤァ）', exVi: '(Vênh mặt tự đắc)' },
  { w: 'テヘ', alt: ['てへ', 'テヘッ', 'てへぺろ'], kind: 'state', vi: 'Cười trừ cho qua lỗi nhỏ, kiểu dễ thương.', ex: '忘れちゃった、テヘ。', exVi: 'Quên mất rồi, hì hì.' },
  { w: 'ジャーン', alt: ['じゃーん', 'ジャジャーン'], kind: 'state', vi: '"Tèn ten!" khoe ra điều bất ngờ.', ex: 'ジャーン！新しい服！', exVi: 'Tèn ten! Áo mới nè!' },

  // ----- Âm thanh -----
  { w: 'ドン', alt: ['どん', 'ドーン', 'どーん'], kind: 'sound', vi: 'Bùm, rầm: tiếng nổ, va đập mạnh; nhấn mạnh xuất hiện hoành tráng.', ex: 'ドーン！と大きな音がした。', exVi: 'Có tiếng nổ lớn ầm một cái.' },
  { w: 'バン', alt: ['ばん', 'バーン', 'ばーん'], kind: 'sound', vi: 'Đoàng, sầm: tiếng súng, đập bàn, đóng cửa mạnh.', ex: '机をバンと叩いた。', exVi: 'Đập bàn cái rầm.' },
  { w: 'ガシャーン', alt: ['がしゃーん', 'ガシャン', 'ガチャン'], kind: 'sound', vi: 'Xoảng: tiếng đồ thủy tinh, kim loại vỡ, rơi.', ex: 'ガシャーン！皿が割れた。', exVi: 'Xoảng! Đĩa vỡ rồi.' },
  { w: 'ガチャ', alt: ['がちゃ', 'ガチャッ'], kind: 'sound', vi: 'Cạch: tiếng mở khóa, mở cửa, đặt ống nghe.', ex: 'ガチャッとドアが開いた。', exVi: 'Cạch, cánh cửa mở ra.' },
  { w: 'バタン', alt: ['ばたん'], kind: 'sound', vi: 'Rầm: đóng sập cửa; ngã lăn ra.', ex: 'ドアをバタンと閉めた。', exVi: 'Đóng sập cửa lại.' },
  { w: 'トントン', alt: ['とんとん'], kind: 'sound', vi: 'Cốc cốc: gõ cửa, gõ nhẹ; tiếng thái rau.', ex: 'トントン、と誰かがドアを叩いた。', exVi: 'Cốc cốc, có ai gõ cửa.' },
  { w: 'ピンポーン', alt: ['ぴんぽーん', 'ピンポン'], kind: 'sound', vi: 'Kính coong: chuông cửa; câu trả lời đúng.', ex: 'ピンポーン、正解です！', exVi: 'Kính coong, chính xác!' },
  { w: 'ブブー', alt: ['ぶぶー', 'ブー'], kind: 'sound', vi: 'Bíp bíp: tiếng còi báo sai, còi xe.', ex: 'ブブー、不正解！', exVi: 'Bíp, sai rồi!' },
  { w: 'ザーザー', alt: ['ざーざー', 'ザー'], kind: 'sound', vi: 'Ào ào: mưa to, nước chảy mạnh.', ex: '雨がザーザー降っている。', exVi: 'Mưa đổ ào ào.' },
  { w: 'シトシト', alt: ['しとしと'], kind: 'sound', vi: 'Lất phất, rả rích: mưa nhỏ êm.', ex: '雨がしとしと降っている。', exVi: 'Mưa rả rích.' },
  { w: 'ゴロゴロ (sấm)', alt: [], kind: 'sound', vi: 'Ì ầm: tiếng sấm; bụng sôi ùng ục; mèo gừ gừ.', ex: '空がゴロゴロ鳴っている。', exVi: 'Trời sấm ì ầm.' },
  { w: 'ビュー', alt: ['びゅー', 'ビュッ', 'ヒュー', 'ひゅー'], kind: 'sound', vi: 'Vù vù, vút: gió thổi mạnh, vật bay vèo qua.', ex: '風がビューッと吹いた。', exVi: 'Gió thổi vù vù.' },
  { w: 'ドカーン', alt: ['どかーん', 'ドカン'], kind: 'sound', vi: 'Bùm: tiếng nổ lớn.', ex: '爆弾がドカーンと爆発した。', exVi: 'Quả bom nổ bùm.' },
  { w: 'バキッ', alt: ['ばきっ', 'バキ', 'ボキッ'], kind: 'sound', vi: 'Rắc, bốp: gãy xương, gãy cành; tiếng đấm mạnh.', ex: 'バキッ！と枝が折れた。', exVi: 'Rắc! Cành cây gãy.' },
  { w: 'ドカッ', alt: ['どかっ', 'ボコッ', 'ボカッ'], kind: 'sound', vi: 'Bốp, huỵch: đấm đá, va mạnh.', ex: 'ドカッと殴られた。', exVi: 'Bị đấm cái bốp.' },
  { w: 'ズドーン', alt: ['ずどーん', 'ズドン'], kind: 'sound', vi: 'Uỳnh: va chạm cực mạnh, đạn pháo, vật nặng rơi.', ex: 'ズドーンと岩が落ちた。', exVi: 'Tảng đá rơi uỳnh xuống.' },
  { w: 'シュッ', alt: ['しゅっ', 'シュン'], kind: 'sound', vi: 'Vút, xẹt: chuyển động rất nhanh (ném, lướt, biến mất).', ex: 'シュッと消えた。', exVi: 'Biến mất vèo một cái.' },
  { w: 'ザシュ', alt: ['ざしゅ', 'ズバッ', 'ザンッ'], kind: 'sound', vi: 'Phập, xoẹt: tiếng chém kiếm.', ex: '（ズバッ）', exVi: '(Xoẹt một nhát chém)' },
  { w: 'カキーン', alt: ['かきーん', 'キーン', 'ガキン'], kind: 'sound', vi: 'Keng: kim loại chạm nhau, kiếm đỡ kiếm; gậy bóng chày đánh trúng.', ex: 'カキーン！ホームランだ！', exVi: 'Keng! Home run rồi!' },
  { w: 'パチパチ', alt: ['ぱちぱち'], kind: 'sound', vi: 'Lách tách: vỗ tay, lửa nổ lách tách; chớp mắt liên tục.', ex: 'みんながパチパチと拍手した。', exVi: 'Mọi người vỗ tay lốp bốp.' },
  { w: 'ゴクッ', alt: ['ごくっ', 'ゴクリ', 'ごくり', 'ゴクゴク'], kind: 'sound', vi: 'Ực: nuốt nước bọt (căng thẳng); ゴクゴク = uống ừng ực.', ex: 'ゴクリと唾を飲んだ。', exVi: 'Nuốt nước bọt cái ực.' },
  { w: 'モグモグ', alt: ['もぐもぐ'], kind: 'sound', vi: 'Nhồm nhoàm, nhai nhóp nhép.', ex: 'ハムスターがモグモグ食べている。', exVi: 'Con hamster nhai nhóp nhép.' },
  { w: 'グー', alt: ['ぐー', 'グゥ', 'ぐぅ'], kind: 'sound', vi: 'Ọt ọt: bụng đói kêu; cũng là ngáy khò khò.', ex: 'お腹がグーッと鳴った。', exVi: 'Bụng kêu ọt ọt.' },
  { w: 'Zzz', alt: ['ぐーぐー', 'グーグー', 'スヤスヤ', 'すやすや'], kind: 'sound', vi: 'Khò khò (グーグー); ngủ ngon lành, thở đều (スヤスヤ).', ex: '赤ちゃんがスヤスヤ寝ている。', exVi: 'Em bé đang ngủ ngon lành.' },
  { w: 'コツコツ', alt: ['こつこつ'], kind: 'sound', vi: 'Cộp cộp: tiếng giày gõ xuống sàn; (nghĩa bóng) chăm chỉ từng chút.', ex: '毎日コツコツ勉強する。', exVi: 'Ngày nào cũng chăm chỉ học từng chút.' },
  { w: 'ガタガタ', alt: ['がたがた', 'ガタッ'], kind: 'sound', vi: 'Lạch cạch, rung lắc; run cầm cập. ガタッ = đứng bật dậy (ghế kêu).', ex: '寒くてガタガタ震えた。', exVi: 'Lạnh run cầm cập.' },
  { w: 'ドタドタ', alt: ['どたどた', 'ドタバタ'], kind: 'sound', vi: 'Huỳnh huỵch: tiếng chân chạy nặng nề; ồn ào hỗn loạn.', ex: '廊下をドタドタ走るな！', exVi: 'Đừng chạy huỳnh huỵch ngoài hành lang!' },
  { w: 'カチッ', alt: ['かちっ', 'カチカチ'], kind: 'sound', vi: 'Tách, cạch: bấm công tắc, đồng hồ tích tắc.', ex: 'スイッチをカチッと押した。', exVi: 'Bấm công tắc cái tách.' },
  { w: 'チーン', alt: ['ちーん'], kind: 'sound', vi: 'Ting: lò vi sóng xong; (đùa) "xong phim", tan nát.', ex: 'チーン…終わった。', exVi: 'Ting… xong đời rồi.' },
  { w: 'ワンワン', alt: ['わんわん'], kind: 'sound', vi: 'Gâu gâu: chó sủa. (Mèo: ニャー, gà: コケコッコー)', ex: '犬がワンワン吠えている。', exVi: 'Con chó sủa gâu gâu.' },
  { w: 'ニャー', alt: ['にゃー', 'ニャン', 'にゃん'], kind: 'sound', vi: 'Meo meo: mèo kêu. Nhân vật dễ thương hay thêm ～にゃ cuối câu.', ex: '猫がニャーと鳴いた。', exVi: 'Con mèo kêu meo.' },
  { w: 'ブルブル', alt: ['ぶるぶる'], kind: 'sound', vi: 'Run lẩy bẩy; điện thoại rung bần bật.', ex: '怖くてブルブル震えた。', exVi: 'Sợ run lẩy bẩy.' },
  { w: 'ピキッ', alt: ['ぴきっ', 'ピキピキ'], kind: 'sound', vi: 'Nổi gân xanh vì tức (ký hiệu 💢); băng nứt răng rắc.', ex: '（ピキッ）', exVi: '(Gân trán giật lên vì tức)' },
  { w: 'ハァハァ', alt: ['はぁはぁ', 'ゼェゼェ', 'ぜえぜえ'], kind: 'sound', vi: 'Hổn hển, thở dốc.', ex: '走ってきてハァハァしている。', exVi: 'Chạy tới nên thở hổn hển.' },
  { w: 'ギャー', alt: ['ぎゃー', 'ぎゃあ', 'ギャア'], kind: 'sound', vi: 'Áaa!: hét thất thanh (sợ, đau).', ex: 'ギャー！虫だ！', exVi: 'Áaa! Có sâu!' },
  { w: 'ヒソヒソ', alt: ['ひそひそ'], kind: 'sound', vi: 'Thì thầm, xì xào.', ex: 'みんながヒソヒソ話している。', exVi: 'Mọi người xì xào to nhỏ.' },
  { w: 'ペラッ', alt: ['ぺらっ', 'パラパラ', 'ぱらぱら'], kind: 'sound', vi: 'Soạt: lật trang giấy; パラパラ = lật lướt, mưa lác đác.', ex: '本をパラパラめくった。', exVi: 'Lật lướt qua cuốn sách.' },
]

export interface Slang {
  /** Cách nói thân mật / rút gọn (nhãn hiển thị). */
  w: string
  re: RegExp
  vi: string
  /** Cách nói lịch sự / chuẩn tương đương. */
  polite: string
  ex: string
  exVi: string
}

/** Khẩu ngữ, rút gọn, tiếng lóng hay gặp trong lời thoại manga. */
export const SLANG: Slang[] = [
  { w: '～ちゃう / ～じゃう', re: /[ちじ]ゃ[うったお]/, vi: 'Rút gọn của ～てしまう / ～でしまう: lỡ làm, làm mất rồi.', polite: '～てしまいます', ex: '全部食べちゃった。', exVi: 'Lỡ ăn hết rồi.' },
  { w: '～ちゃ / ～じゃ (～ては)', re: /[ちじ]ゃ(だめ|ダメ|いけ|いや)/, vi: 'Rút gọn của ～ては / ～では. ～ちゃダメ = không được làm.', polite: '～てはいけません', ex: '見ちゃダメ！', exVi: 'Không được nhìn!' },
  { w: '～てる (～ている)', re: /[てで]る[!！。よねのなぞわ]|[てで]る$|[てで]た[!！。よね]|[てで]ない/, vi: 'Rút gọn của ～ている: đang làm / trạng thái.', polite: '～ています', ex: '何してる？', exVi: 'Đang làm gì đấy?' },
  { w: '～とく (～ておく)', re: /[とど]く[!！。よね]|[とど]いた|[とど]いて/, vi: 'Rút gọn của ～ておく: làm sẵn.', polite: '～ておきます', ex: '冷蔵庫に入れとくね。', exVi: 'Để sẵn trong tủ lạnh nhé.' },
  { w: '～なきゃ / ～なくちゃ', re: /なきゃ|なくちゃ/, vi: 'Rút gọn của ～なければ(ならない) / ～なくては: phải làm.', polite: '～なければなりません', ex: 'もう行かなきゃ。', exVi: 'Phải đi rồi.' },
  { w: '～ってば / ～って', re: /って[ば!！。]|ってば|っつ/, vi: '～って = "nghe nói / bảo là" (trích dẫn ～と); ～ってば = "đã bảo là mà!" (sốt ruột).', polite: '～と言っています / ～と言いましたよ', ex: 'だから違うってば！', exVi: 'Đã bảo là không phải mà!' },
  { w: 'じゃん', re: /じゃん/, vi: '"Còn gì!", "đấy thôi" = ～じゃないか. Giọng trẻ, khu vực Kanto.', polite: '～ではありませんか', ex: 'いいじゃん！', exVi: 'Được đấy còn gì!' },
  { w: '～っす', re: /っす|ッス/, vi: 'Dạng rút của です, đàn em nói với đàn anh, giọng thể thao, thân mà vẫn có chút kính.', polite: '～です', ex: 'お疲れっす！', exVi: 'Anh vất vả rồi ạ!' },
  { w: '～ねえ / ～ねー (～ない)', re: /[らかさたなまわがばえけせてねめれげべ]ねえ|[らかさたなまわがばえけせてねめれげべ]ねぇ|[^ん]ねー[!！。よ]/, vi: 'Phủ định ～ない biến âm kiểu nam, thô: 知らねえ = 知らない.', polite: '～ません', ex: 'そんなの知らねえよ。', exVi: 'Tao không biết chuyện đó.' },
  { w: '～ぇ / ～えー (biến âm thô)', re: /すげえ|すげぇ|すげー|うめえ|うめぇ|うるせえ|うるせぇ|いてえ|いてぇ|やべえ|やべぇ|やべー|でけえ|でけぇ|つえー|つええ/, vi: 'Biến âm ai/oi → ee kiểu nam, thô: すげえ = すごい, うるせえ = うるさい, いてえ = いたい.', polite: 'すごい / うるさい / いたい (dạng chuẩn)', ex: 'すげえ！', exVi: 'Đỉnh vãi!' },
  { w: 'マジ', re: /マジ|まじ/, vi: '"Thật á?", "nghiêm túc đấy" = 本当 / 本気.', polite: '本当に / 本気で', ex: 'マジで？', exVi: 'Thật á?' },
  { w: 'ヤバい', re: /ヤバ|やば/, vi: 'Toang, nguy; giới trẻ còn dùng nghĩa "đỉnh quá", "ngon xỉu".', polite: '危ない / すごい', ex: 'このラーメン、ヤバい！', exVi: 'Mì này ngon xỉu!' },
  { w: 'うざい', re: /うざ|ウザ/, vi: 'Phiền phức, khó ưa (rút từ うざったい).', polite: 'うるさい / 迷惑だ', ex: 'マジうざい。', exVi: 'Phiền thật sự.' },
  { w: 'ムカつく', re: /ムカつ|むかつ/, vi: 'Tức điên, khó chịu.', polite: '腹が立ちます', ex: 'あいつムカつく！', exVi: 'Thằng đó làm tao tức điên!' },
  { w: 'キモい', re: /キモ|きも[いっ]/, vi: 'Ghê, kinh tởm (rút từ 気持ち悪い).', polite: '気持ち悪いです', ex: 'キモっ！', exVi: 'Ghê quá!' },
  { w: 'ウケる', re: /ウケ|うけるん|うける[!！]/, vi: 'Buồn cười quá, hài vãi.', polite: '面白いです', ex: 'それウケる！', exVi: 'Cái đó hài vãi!' },
  { w: 'ガチ', re: /ガチ/, vi: 'Thật sự, nghiêm túc, hết mình (ガチで = 本気で).', polite: '本気で / 本当に', ex: 'ガチで勝ちに行く。', exVi: 'Đi để thắng thật sự.' },
  { w: 'めっちゃ / めちゃくちゃ', re: /めっちゃ|めちゃ|メチャ|むっちゃ/, vi: 'Cực kỳ, siêu (gốc Kansai, giờ dùng khắp nơi).', polite: 'とても', ex: 'めっちゃ眠い。', exVi: 'Buồn ngủ cực.' },
  { w: 'すっごい / すんごい', re: /すっご|すんご|すっげ/, vi: 'Nhấn mạnh của すごい: siêu, cực.', polite: 'とてもすごい', ex: 'すっごい楽しかった！', exVi: 'Vui cực luôn!' },
  { w: 'やっぱ', re: /やっぱ(?!り)/, vi: 'Rút gọn của やっぱり: quả nhiên, rốt cuộc thì.', polite: 'やはり', ex: 'やっぱ無理だ。', exVi: 'Rốt cuộc vẫn không được.' },
  { w: 'ってか / てか', re: /ってか|^てか|。てか/, vi: '"Mà nói đúng hơn là", "mà này" (đổi chủ đề, giọng trẻ).', polite: 'というか', ex: 'てか、お前誰？', exVi: 'Mà này, mày là ai?' },
  { w: 'なんか', re: /なんか/, vi: '"Kiểu như", "hình như"; cũng là "cái thứ như" (coi thường).', polite: '何か / など', ex: 'なんか変だな。', exVi: 'Kiểu gì đó lạ lạ.' },
  { w: 'こんな/そんな → こんな', re: /こんなん|そんなん|あんなん/, vi: 'Rút gọn của こんなもの / そんなもの: "cái thứ này/đó".', polite: 'このようなもの', ex: 'そんなん知らん。', exVi: 'Cái đó ai biết.' },
  { w: '～ん (phủ định Kansai)', re: /知らん|分からん|わからん|いらん|できん|せん[!！。よ]/, vi: 'Phủ định rút gọn: 知らん = 知らない. Hay gặp ở nhân vật nam, ông già, giọng Kansai.', polite: '～ません', ex: 'わからん。', exVi: 'Chịu, không biết.' },
  { w: '～の？ (hỏi thân mật)', re: /の[?？]/, vi: 'Câu hỏi thân mật bằng ～の？ thay cho ～のですか.', polite: '～のですか', ex: 'どこ行くの？', exVi: 'Đi đâu đấy?' },
  { w: 'お前 / てめえ / 貴様', re: /お前|おまえ|オマエ|てめえ|てめぇ|テメェ|貴様|きさま/, vi: '"Mày": お前 thân mật kiểu nam (hoặc xấc); てめえ, 貴様 rất xấc, gây sự.', polite: 'あなた / ～さん', ex: 'お前、何者だ！', exVi: 'Mày là ai!' },
  { w: '俺 / オレ', re: /俺|オレ|おれ(?!い)/, vi: '"Tao, tôi" của nam, thân mật hoặc mạnh mẽ. 俺様 = "bổn đại gia" (ngạo mạn).', polite: '私（わたし）/ 僕', ex: '俺が守る！', exVi: 'Tao sẽ bảo vệ!' },
  { w: 'あたし / うち', re: /あたし|アタシ|うちは|うちが/, vi: '"Tôi" của nữ, thân mật; うち = "tôi" giọng Kansai/miền Tây.', polite: '私（わたし）', ex: 'あたし、知らないよ。', exVi: 'Tớ không biết đâu.' },
  { w: 'うるさい / うっせ', re: /うるさい|うっせ|うるせ/, vi: '"Im đi!", "ồn ào quá"; うっせ / うるせえ thô hơn.', polite: '静かにしてください', ex: 'うるせえ！', exVi: 'Im mồm!' },
  { w: 'ふざけるな', re: /ふざけ(んな|るな)/, vi: '"Đừng có giỡn mặt!", "Đùa à!"', polite: '冗談はやめてください', ex: 'ふざけんな！', exVi: 'Đừng có giỡn mặt!' },
  { w: '～な (cấm, thô)', re: /[るくすつぬむぶぐう]な[!！]/, vi: 'Động từ thể từ điển + な = cấm làm (rất mạnh): 来るな! = Đừng tới!', polite: '～ないでください', ex: '動くな！', exVi: 'Đứng yên!' },
  { w: '～ろ / ～え (mệnh lệnh)', re: /[べめれせけてね]ろ[!！。よ]|[えけせてねめれげべ]よ[!！]/, vi: 'Thể mệnh lệnh: 見ろ! = Nhìn đi!, 待て! = Đứng lại! Rất mạnh, hay gặp ở nhân vật nam, cảnh chiến đấu.', polite: '～てください', ex: '逃げろ！', exVi: 'Chạy mau!' },
  { w: 'おっす / ちーす', re: /おっす|オッス|ちーす|ちわっす|うっす|ウッス/, vi: 'Chào kiểu con trai, câu lạc bộ thể thao (= おはようございます / こんにちは rút gọn).', polite: 'こんにちは / おはようございます', ex: 'おっす！元気か？', exVi: 'Ê! Khỏe không?' },
  { w: 'サンキュー / あざす', re: /サンキュ|あざっす|あざす|あざーす/, vi: 'Cảm ơn kiểu suồng sã (あざす = ありがとうございます rút gọn).', polite: 'ありがとうございます', ex: 'あざっす！', exVi: 'Cảm ơn nha!' },
  { w: 'ごめん / わりい', re: /ごめん|わりい|わりぃ|悪い悪い/, vi: 'Xin lỗi thân mật; わりい = 悪い (lỗi tao), giọng nam.', polite: '申し訳ありません / すみません', ex: 'わりい、遅れた。', exVi: 'Xin lỗi, tao tới trễ.' },
  { w: 'ちょっ / ちょ', re: /ちょっ[、!！待]|ちょ[、!！]/, vi: '"Khoan!", "Này!" (rút của ちょっと), hốt hoảng ngăn lại.', polite: 'ちょっと待ってください', ex: 'ちょっ、待って！', exVi: 'Khoan, chờ đã!' },
  { w: 'ええと / あのさ', re: /あのさ|ええと|えっと|あのね/, vi: 'Từ đệm khi nói: "ờ...", "này nhé" (あのさ là kiểu thân mật).', polite: 'あの、すみません', ex: 'あのさ、ちょっといい？', exVi: 'Này, rảnh chút không?' },
]

export const sfxForms = (s: Sfx) => [s.w.replace(/\s*\(.*\)$/, ''), ...(s.alt ?? [])].filter((x) => x && !/^[A-Za-z]+$/.test(x))

/** Từ tượng thanh có trong câu. Ưu tiên cách viết dài hơn (ドキドキ trước ドキッ). */
export function findSfx(text: string): { sfx: Sfx; form: string; index: number }[] {
  const out: { sfx: Sfx; form: string; index: number }[] = []
  const used: [number, number][] = []
  const all = SFX.flatMap((sfx) => sfxForms(sfx).map((form) => ({ sfx, form }))).sort((a, b) => b.form.length - a.form.length)
  for (const { sfx, form } of all) {
    const i = text.indexOf(form)
    if (i < 0 || used.some(([a, b]) => i < b && i + form.length > a) || out.some((o) => o.sfx === sfx)) continue
    used.push([i, i + form.length])
    out.push({ sfx, form, index: i })
  }
  return out.sort((a, b) => a.index - b.index)
}

/** Khẩu ngữ / tiếng lóng có trong câu. */
export function findSlang(text: string): { slang: Slang; match: string; index: number }[] {
  return SLANG.flatMap((slang) => {
    const m = slang.re.exec(text)
    return m ? [{ slang, match: m[0], index: m.index }] : []
  }).sort((a, b) => a.index - b.index)
}

export const SFX_TAG = 'manga-tuong-thanh'
export const SLANG_TAG = 'manga-khau-ngu'
