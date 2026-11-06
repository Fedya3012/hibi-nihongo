/**
 * NỘI DUNG TRUYỆN ĐỌC THEO CẤP ĐỘ
 * --------------------------------
 * Tất cả truyện ở đây do Hibi Nihongo tự viết (không chép từ sách hay trang web nào),
 * nên được phép dùng tự do trong app.
 *
 * Thêm truyện mới: thêm một mục vào STORIES. Mỗi phần tử của `paras` là một đoạn văn,
 * mỗi câu là [chữ Nhật, bản dịch]. Giữ id cố định (tiến độ đọc lưu theo id).
 * Cấp độ: N5 dùng ngữ pháp/từ N5 là chính, N4 thêm thể て/た, ～ながら, ～ので…, N3 văn thường (だ/である).
 */
import type { Line, Story } from './types'

const p = (...lines: [string, string][]): Line[] => lines.map(([ja, vi]) => ({ ja, vi }))

export const STORIES: Story[] = [
  // ───────────────────────────── N5 ─────────────────────────────
  {
    id: 'n5-ichinichi',
    level: 5,
    title: 'わたしの一日',
    titleVi: 'Một ngày của tôi',
    blurb: 'Lan, du học sinh ở Tokyo, kể về một ngày bình thường.',
    paras: [
      p(
        ['わたしはランです。', 'Tôi là Lan.'],
        ['ベトナムから来ました。', 'Tôi đến từ Việt Nam.'],
        ['今、東京の日本語学校で勉強しています。', 'Bây giờ tôi đang học ở một trường tiếng Nhật tại Tokyo.'],
      ),
      p(
        ['毎朝、六時半に起きます。', 'Mỗi sáng tôi dậy lúc sáu giờ rưỡi.'],
        ['朝ごはんはパンと卵です。', 'Bữa sáng là bánh mì và trứng.'],
        ['それから、電車で学校へ行きます。', 'Sau đó tôi đi tàu điện đến trường.'],
        ['学校は九時から十二時までです。', 'Trường học từ chín giờ đến mười hai giờ.'],
      ),
      p(
        ['午後はスーパーでアルバイトをします。', 'Buổi chiều tôi làm thêm ở siêu thị.'],
        ['仕事は少し大変ですが、楽しいです。', 'Công việc hơi vất vả nhưng vui.'],
      ),
      p(
        ['夜は家で晩ごはんを作ります。', 'Buổi tối tôi nấu cơm tối ở nhà.'],
        ['晩ごはんの後で、一時間ぐらい日本語を勉強します。', 'Sau bữa tối, tôi học tiếng Nhật khoảng một tiếng.'],
        ['そして、十一時に寝ます。', 'Rồi tôi đi ngủ lúc mười một giờ.'],
      ),
    ],
    quiz: [
      { q: 'Lan đến trường bằng gì?', options: ['Xe buýt', 'Tàu điện', 'Xe đạp', 'Đi bộ'], answer: 1 },
      { q: 'Buổi chiều Lan làm gì?', options: ['Học ở trường', 'Nấu cơm', 'Làm thêm ở siêu thị', 'Ngủ trưa'], answer: 2 },
      { q: 'Sau bữa tối, Lan học tiếng Nhật khoảng bao lâu?', options: ['Một tiếng', '30 phút', 'Hai tiếng', 'Ba tiếng'], answer: 0 },
    ],
  },
  {
    id: 'n5-konbini',
    level: 5,
    title: 'コンビニで',
    titleVi: 'Ở cửa hàng tiện lợi',
    blurb: 'Chín giờ tối, đói bụng, ghé cửa hàng tiện lợi gần nhà.',
    paras: [
      p(
        ['夜の九時です。', 'Chín giờ tối.'],
        ['おなかがすきました。', 'Tôi đói bụng.'],
        ['家の近くのコンビニへ行きました。', 'Tôi đi đến cửa hàng tiện lợi gần nhà.'],
      ),
      p(
        ['コンビニには、おにぎりやお弁当がたくさんあります。', 'Ở cửa hàng tiện lợi có nhiều cơm nắm, cơm hộp...'],
        ['わたしはツナのおにぎりを二つと、お茶を一本買いました。', 'Tôi mua hai cơm nắm cá ngừ và một chai trà.'],
      ),
      p(
        ['店員さん：「いらっしゃいませ。」', 'Nhân viên: "Xin mời quý khách."'],
        ['店員さん：「袋はいりますか。」', 'Nhân viên: "Quý khách có cần túi không ạ?"'],
        ['わたし：「いいえ、けっこうです。」', 'Tôi: "Không, không cần ạ."'],
        ['店員さん：「四百二十円です。」', 'Nhân viên: "Của quý khách là 420 yên."'],
        ['わたしは五百円玉を出しました。', 'Tôi đưa đồng xu 500 yên.'],
        ['店員さん：「八十円のおつりです。ありがとうございました。」', 'Nhân viên: "Tiền thừa 80 yên ạ. Cảm ơn quý khách."'],
      ),
      p(
        ['家に帰って、おにぎりを食べました。', 'Về nhà, tôi ăn cơm nắm.'],
        ['とてもおいしかったです。', 'Rất ngon.'],
      ),
    ],
    quiz: [
      { q: 'Nhân viên hỏi gì?', options: ['Có hâm nóng không', 'Có cần túi không', 'Có thẻ tích điểm không', 'Ăn ở đây không'], answer: 1 },
      { q: 'Tất cả hết bao nhiêu tiền?', options: ['80 yên', '500 yên', '580 yên', '420 yên'], answer: 3 },
      { q: '"Tôi" đã mua gì?', options: ['Hai cơm nắm và một chai trà', 'Một cơm hộp', 'Bánh mì và sữa', 'Ba cơm nắm'], answer: 0 },
    ],
  },
  {
    id: 'n5-ame',
    level: 5,
    title: '雨の日曜日',
    titleVi: 'Chủ nhật mưa',
    blurb: 'Trời mưa nên không đi chơi được. Một ngày Chủ nhật yên tĩnh ở nhà.',
    paras: [
      p(
        ['日曜日の朝、外は雨でした。', 'Sáng Chủ nhật, bên ngoài trời mưa.'],
        ['友だちと公園でテニスをする約束がありましたが、行きませんでした。', 'Tôi có hẹn chơi tennis với bạn ở công viên nhưng đã không đi.'],
      ),
      p(
        ['それで、家で映画を見ました。', 'Vì vậy tôi xem phim ở nhà.'],
        ['古い日本の映画でした。', 'Đó là một bộ phim Nhật cũ.'],
        ['少し難しかったですが、おもしろかったです。', 'Hơi khó nhưng thú vị.'],
      ),
      p(
        ['昼ごろ、母から電話がありました。', 'Khoảng trưa, mẹ gọi điện cho tôi.'],
        ['「元気？ごはん、ちゃんと食べてる？」', '"Con khỏe không? Có ăn uống đầy đủ không đấy?"'],
        ['母の声を聞いて、うれしくなりました。', 'Nghe giọng mẹ, tôi thấy vui hẳn lên.'],
      ),
      p(
        ['夕方、雨がやみました。', 'Chiều tối, mưa tạnh.'],
        ['窓から虹が見えました。', 'Từ cửa sổ, tôi nhìn thấy cầu vồng.'],
        ['静かで、いい日曜日でした。', 'Một ngày Chủ nhật yên tĩnh và dễ chịu.'],
      ),
    ],
    quiz: [
      { q: 'Vì sao "tôi" không đi chơi tennis?', options: ['Vì bạn bị ốm', 'Vì phải làm thêm', 'Vì trời mưa', 'Vì quên hẹn'], answer: 2 },
      { q: 'Ai gọi điện cho "tôi"?', options: ['Mẹ', 'Bạn', 'Bố', 'Thầy giáo'], answer: 0 },
      { q: 'Chiều tối, "tôi" nhìn thấy gì?', options: ['Tuyết', 'Cầu vồng', 'Mặt trăng', 'Người bạn'], answer: 1 },
    ],
  },
  {
    id: 'n5-tomodachi',
    level: 5,
    title: '新しい友だち',
    titleVi: 'Người bạn mới',
    blurb: 'Lớp có học sinh mới, cũng là người Việt. Hai người rủ nhau đi karaoke.',
    paras: [
      p(
        ['先週、クラスに新しい学生が来ました。', 'Tuần trước, lớp tôi có một học sinh mới.'],
        ['名前はミンさんです。', 'Tên bạn ấy là Minh.'],
        ['ミンさんもベトナム人で、ハノイから来ました。', 'Minh cũng là người Việt Nam, đến từ Hà Nội.'],
      ),
      p(
        ['ミンさんは背が高くて、よく笑います。', 'Minh cao và hay cười.'],
        ['歌がとても上手です。', 'Bạn ấy hát rất hay.'],
      ),
      p(
        ['昼休みに、わたしたちはいっしょに食堂へ行きました。', 'Giờ nghỉ trưa, chúng tôi cùng nhau đi đến nhà ăn.'],
        ['ミンさんはカレーを、わたしはラーメンを食べました。', 'Minh ăn cà ri, còn tôi ăn mì ramen.'],
        ['「週末、カラオケに行きませんか。」とミンさんが言いました。', 'Minh nói: "Cuối tuần đi karaoke không?"'],
        ['「いいですね。行きましょう。」', '"Hay đấy. Đi thôi."'],
      ),
      p(
        ['土曜日、わたしたちは三時間も歌いました。', 'Thứ Bảy, chúng tôi hát những ba tiếng liền.'],
        ['新しい友だちができて、うれしいです。', 'Có được người bạn mới, tôi rất vui.'],
      ),
    ],
    quiz: [
      { q: 'Minh đến từ đâu?', options: ['TP. Hồ Chí Minh', 'Đà Nẵng', 'Tokyo', 'Hà Nội'], answer: 3 },
      { q: 'Minh ăn gì ở nhà ăn?', options: ['Cà ri', 'Mì ramen', 'Sushi', 'Cơm hộp'], answer: 0 },
      { q: 'Hai người hát karaoke bao lâu?', options: ['Một tiếng', 'Hai tiếng', 'Ba tiếng', 'Bốn tiếng'], answer: 2 },
    ],
  },
  {
    id: 'n5-neko',
    level: 5,
    title: 'ねこのミケ',
    titleVi: 'Con mèo Mike',
    blurb: 'Con mèo hay ngủ của nhà tôi bỗng biến mất…',
    paras: [
      p(
        ['わたしの家にはねこが一匹います。', 'Nhà tôi có một con mèo.'],
        ['名前はミケです。', 'Tên nó là Mike.'],
        ['白と黒と茶色のねこです。', 'Đó là con mèo ba màu trắng, đen và nâu.'],
      ),
      p(
        ['ミケは毎日よく寝ます。', 'Ngày nào Mike cũng ngủ rất nhiều.'],
        ['朝は窓の近くで、昼はソファの上で寝ます。', 'Buổi sáng nó ngủ gần cửa sổ, buổi trưa ngủ trên ghế sofa.'],
        ['夜になると、元気になります。', 'Đến tối thì nó lại tỉnh như sáo.'],
      ),
      p(
        ['きのう、ミケがいませんでした。', 'Hôm qua, không thấy Mike đâu.'],
        ['家の中も庭も探しましたが、どこにもいません。', 'Tôi tìm cả trong nhà lẫn ngoài vườn nhưng chẳng thấy đâu.'],
        ['とても心配でした。', 'Tôi rất lo.'],
      ),
      p(
        ['夜、クローゼットを開けると、ミケが服の上で寝ていました。', 'Buổi tối, khi mở tủ quần áo, tôi thấy Mike đang ngủ trên đống quần áo.'],
        ['「ミケ、ここにいたの！」', '"Mike, hóa ra mày ở đây!"'],
        ['ミケは「ニャー」と言って、また寝ました。', 'Mike kêu "meo" một tiếng rồi lại ngủ tiếp.'],
      ),
    ],
    quiz: [
      { q: 'Mike là con mèo màu gì?', options: ['Toàn màu đen', 'Trắng, đen và nâu', 'Toàn màu trắng', 'Màu xám'], answer: 1 },
      { q: 'Cuối cùng tìm thấy Mike ở đâu?', options: ['Ngoài vườn', 'Trên ghế sofa', 'Nhà hàng xóm', 'Trong tủ quần áo'], answer: 3 },
      { q: 'Khi nào Mike tỉnh táo, hoạt bát nhất?', options: ['Buổi tối', 'Buổi sáng', 'Buổi trưa', 'Không bao giờ'], answer: 0 },
    ],
  },

  // ───────────────────────────── N4 ─────────────────────────────
  {
    id: 'n4-fujisan',
    level: 4,
    title: '初めての富士山',
    titleVi: 'Lần đầu leo núi Phú Sĩ',
    blurb: 'Leo núi xuyên đêm để ngắm mặt trời mọc trên đỉnh Phú Sĩ.',
    paras: [
      p(
        ['去年の夏、大学の友だちと三人で富士山に登りました。', 'Mùa hè năm ngoái, tôi cùng hai người bạn đại học leo núi Phú Sĩ.'],
        ['富士山に登るのは初めてだったので、とても楽しみにしていました。', 'Vì là lần đầu leo núi Phú Sĩ nên tôi đã rất háo hức.'],
      ),
      p(
        ['夜十時に五合目を出発しました。', 'Chúng tôi xuất phát từ trạm số 5 lúc mười giờ tối.'],
        ['山の上で日の出を見るために、夜のうちに登るのです。', 'Phải leo trong đêm là để ngắm mặt trời mọc trên đỉnh núi.'],
        ['道は暗くて、思ったより寒かったです。', 'Đường thì tối, lại lạnh hơn tôi tưởng.'],
        ['途中で何度も休みながら、ゆっくり歩きました。', 'Chúng tôi vừa đi chầm chậm vừa nghỉ nhiều lần dọc đường.'],
      ),
      p(
        ['朝四時ごろ、やっと頂上に着きました。', 'Khoảng bốn giờ sáng, cuối cùng chúng tôi cũng lên tới đỉnh.'],
        ['しばらくすると、雲の向こうから太陽が出てきました。', 'Một lúc sau, mặt trời ló ra từ phía bên kia biển mây.'],
        ['空がオレンジ色に変わって、みんな声も出ませんでした。', 'Bầu trời chuyển sang màu cam, ai nấy đều không thốt nên lời.'],
      ),
      p(
        ['足は痛かったけれど、登ってよかったと思います。', 'Chân thì đau nhưng tôi thấy leo thật đáng.'],
        ['日本には「一度も登らないばか、二度登るばか」という言葉があるそうです。', 'Nghe nói ở Nhật có câu: "Không leo lần nào là ngốc, leo hai lần cũng là ngốc."'],
        ['でも、わたしはまた登りたいです。', 'Nhưng tôi vẫn muốn leo thêm lần nữa.'],
      ),
    ],
    quiz: [
      { q: 'Vì sao nhóm leo núi vào ban đêm?', options: ['Vì ban ngày nóng', 'Để ngắm mặt trời mọc trên đỉnh', 'Vì ban ngày đông người', 'Vì xe buýt chỉ chạy đêm'], answer: 1 },
      { q: 'Mấy giờ thì lên tới đỉnh?', options: ['Mười giờ tối', 'Mười hai giờ đêm', 'Bảy giờ sáng', 'Khoảng bốn giờ sáng'], answer: 3 },
      { q: 'Có bao nhiêu người đi leo núi (kể cả "tôi")?', options: ['Ba người', 'Hai người', 'Bốn người', 'Năm người'], answer: 0 },
    ],
  },
  {
    id: 'n4-michi',
    level: 4,
    title: '道に迷った日',
    titleVi: 'Ngày bị lạc đường',
    blurb: 'Điện thoại hết pin giữa Osaka, và một bà cụ tốt bụng.',
    paras: [
      p(
        ['先月、大阪に住んでいるいとこの家へ一人で遊びに行きました。', 'Tháng trước, tôi đi một mình đến chơi nhà người anh họ sống ở Osaka.'],
        ['駅に着いたとき、スマホの電池が切れてしまいました。', 'Vừa tới ga thì điện thoại hết pin mất.'],
        ['地図が見られないので、どちらへ行けばいいか分かりませんでした。', 'Không xem được bản đồ nên tôi chẳng biết phải đi hướng nào.'],
      ),
      p(
        ['困っていると、おばあさんが「どうしましたか」と声をかけてくれました。', 'Đang bối rối thì có một bà cụ hỏi: "Cháu sao thế?"'],
        ['住所を見せると、「ああ、この近くですよ。いっしょに行きましょう」と言ってくれました。', 'Tôi đưa địa chỉ, bà nói: "À, gần đây thôi. Đi cùng bà nhé."'],
      ),
      p(
        ['歩きながら、おばあさんは町のおいしい店や古いお寺の話をしてくれました。', 'Vừa đi, bà vừa kể cho tôi nghe về các quán ngon và ngôi chùa cổ trong khu phố.'],
        ['十分ぐらいで、いとこのマンションに着きました。', 'Khoảng mười phút sau thì tới chung cư của anh họ.'],
        ['お礼を言うと、おばあさんは「気をつけてね」と笑って帰っていきました。', 'Tôi cảm ơn, bà cười nói "Cẩn thận nhé" rồi quay về.'],
      ),
      p(
        ['道に迷ったのは大変でしたが、親切な人に会えて、大阪がもっと好きになりました。', 'Lạc đường thì vất vả thật, nhưng nhờ gặp người tốt bụng mà tôi càng thích Osaka hơn.'],
        ['次に行くときは、必ず充電器を持っていこうと思います。', 'Lần sau đi, tôi nhất định sẽ mang theo cục sạc.'],
      ),
    ],
    quiz: [
      { q: 'Vì sao "tôi" bị lạc đường?', options: ['Quên địa chỉ', 'Xuống nhầm ga', 'Điện thoại hết pin, không xem được bản đồ', 'Trời tối'], answer: 2 },
      { q: 'Đi bộ bao lâu thì tới chung cư?', options: ['Khoảng mười phút', 'Năm phút', 'Ba mươi phút', 'Một tiếng'], answer: 0 },
      { q: 'Lần sau "tôi" định làm gì?', options: ['Đi taxi', 'Mang theo cục sạc', 'Đi cùng bạn', 'Không đến Osaka nữa'], answer: 1 },
    ],
  },
  {
    id: 'n4-mensetsu',
    level: 4,
    title: 'アルバイトの面接',
    titleVi: 'Phỏng vấn làm thêm',
    blurb: 'Hồi hộp trước buổi phỏng vấn ở quán cà phê gần ga.',
    paras: [
      p(
        ['来月から、駅の近くのカフェでアルバイトをしたいと思っています。', 'Từ tháng sau, tôi muốn làm thêm ở một quán cà phê gần ga.'],
        ['きのう、その面接がありました。', 'Hôm qua là buổi phỏng vấn ở đó.'],
      ),
      p(
        ['面接の前の日は、緊張してあまり寝られませんでした。', 'Hôm trước buổi phỏng vấn, tôi hồi hộp nên không ngủ được mấy.'],
        ['自己紹介を何回も練習しました。', 'Tôi đã tập tự giới thiệu đi tập lại nhiều lần.'],
      ),
      p(
        ['店長：「どうしてこの店で働きたいんですか。」', 'Quản lý: "Vì sao em muốn làm ở quán này?"'],
        ['わたし：「コーヒーが好きですし、お客さんと日本語で話したいからです。」', 'Tôi: "Vì em thích cà phê, và em muốn được nói chuyện bằng tiếng Nhật với khách."'],
        ['店長：「週に何日ぐらい来られますか。」', 'Quản lý: "Một tuần em đi làm được khoảng mấy ngày?"'],
        ['わたし：「火曜日と木曜日と土曜日なら、来られます。」', 'Tôi: "Nếu là thứ Ba, thứ Năm và thứ Bảy thì em đi được ạ."'],
        ['店長：「分かりました。では、来週の火曜日から来てください。」', 'Quản lý: "Được rồi. Vậy từ thứ Ba tuần sau em bắt đầu nhé."'],
      ),
      p(
        ['面接に合格して、本当にうれしかったです。', 'Đỗ phỏng vấn, tôi thật sự rất vui.'],
        ['早く仕事を覚えて、おいしいコーヒーをいれられるようになりたいです。', 'Tôi muốn nhanh chóng quen việc để pha được cà phê thật ngon.'],
      ),
    ],
    quiz: [
      { q: 'Vì sao "tôi" muốn làm ở quán?', options: ['Vì gần nhà', 'Vì lương cao', 'Vì bạn giới thiệu', 'Vì thích cà phê và muốn nói tiếng Nhật'], answer: 3 },
      { q: '"Tôi" đi làm được những ngày nào?', options: ['Thứ Ba, thứ Năm, thứ Bảy', 'Thứ Hai, thứ Tư, thứ Sáu', 'Chỉ cuối tuần', 'Mỗi ngày'], answer: 0 },
      { q: 'Khi nào "tôi" bắt đầu đi làm?', options: ['Ngày mai', 'Tháng sau', 'Thứ Ba tuần sau', 'Chưa biết'], answer: 2 },
    ],
  },
  {
    id: 'n4-tegami',
    level: 4,
    title: 'おばあちゃんの手紙',
    titleVi: 'Lá thư của bà',
    blurb: 'Dọn đồ chuyển nhà, tìm thấy lá thư người bà để lại.',
    paras: [
      p(
        ['引っ越しの準備をしていたら、古い箱の中から一通の手紙が出てきました。', 'Đang chuẩn bị chuyển nhà thì tôi tìm thấy một lá thư trong chiếc hộp cũ.'],
        ['十年前に亡くなった祖母が、わたしに書いた手紙でした。', 'Đó là lá thư người bà đã mất mười năm trước viết cho tôi.'],
      ),
      p(
        ['「大きくなったら、いろいろな国へ行って、いろいろな人に会いなさい。」', '"Khi lớn lên, cháu hãy đi nhiều nước và gặp gỡ thật nhiều người."'],
        ['「言葉が分からなくても、笑顔があれば大丈夫。」', '"Dù không hiểu tiếng, chỉ cần có nụ cười là ổn cả."'],
        ['手紙にはそう書いてありました。', 'Trong thư viết như thế.'],
      ),
      p(
        ['祖母は若いころ、日本で働いていたことがあるそうです。', 'Nghe nói hồi trẻ bà từng làm việc ở Nhật.'],
        ['子どものころ、祖母はよく日本の歌を歌ってくれました。', 'Hồi tôi còn nhỏ, bà hay hát cho tôi nghe những bài hát Nhật.'],
        ['わたしが日本語を勉強しているのは、そのせいかもしれません。', 'Có lẽ vì thế mà bây giờ tôi học tiếng Nhật.'],
      ),
      p(
        ['来月、わたしは日本へ留学します。', 'Tháng sau, tôi sẽ sang Nhật du học.'],
        ['手紙はスーツケースに入れて、いっしょに持っていくつもりです。', 'Tôi định cất lá thư vào vali và mang theo bên mình.'],
      ),
    ],
    quiz: [
      { q: 'Lá thư được tìm thấy ở đâu?', options: ['Trong một cuốn sách', 'Trong chiếc hộp cũ', 'Trong hộp thư', 'Bà đưa tận tay'], answer: 1 },
      { q: 'Theo bà, không hiểu tiếng thì cần gì?', options: ['Từ điển', 'Học thật chăm', 'Nụ cười', 'Một người bạn'], answer: 2 },
      { q: '"Tôi" định làm gì với lá thư?', options: ['Mang theo sang Nhật', 'Gửi cho mẹ', 'Cất lại vào hộp', 'Treo lên tường'], answer: 0 },
    ],
  },

  // ───────────────────────────── N3 ─────────────────────────────
  {
    id: 'n3-kasa',
    level: 3,
    title: '忘れ物の傘',
    titleVi: 'Chiếc ô bỏ quên',
    blurb: 'Một chiếc ô rẻ tiền, nhưng là món quà không thể bỏ lại.',
    paras: [
      p(
        ['朝から降っていた雨は、会社を出るころにはすっかりやんでいた。', 'Cơn mưa rơi từ sáng đã tạnh hẳn vào lúc tôi rời công ty.'],
        ['電車の中で、ふと手元を見ると、傘がない。', 'Trên tàu, chợt nhìn xuống tay thì không thấy chiếc ô đâu.'],
        ['会社に置いてきてしまったらしい。', 'Hình như tôi để quên ở công ty rồi.'],
      ),
      p(
        ['別に高い傘ではない。', 'Cũng chẳng phải chiếc ô đắt tiền gì.'],
        ['けれども、それは五年前、日本に来たばかりのわたしに、大家さんがくれたものだった。', 'Nhưng đó là chiếc ô bà chủ nhà đã tặng tôi năm năm trước, khi tôi vừa mới sang Nhật.'],
        ['「日本の雨は急に降るから、いつも持っていなさいね」と言って。', 'Bà dặn: "Mưa ở Nhật hay đổ bất chợt, nên lúc nào cũng mang theo nhé."'],
      ),
      p(
        ['次の駅で降りて、来た道を戻ることにした。', 'Tôi quyết định xuống ở ga kế tiếp và quay lại đường cũ.'],
        ['会社に着くと、警備員さんがわたしの傘を持って立っていた。', 'Về đến công ty, tôi thấy bác bảo vệ đang đứng cầm chiếc ô của tôi.'],
        ['「これ、あなたのでしょう。いつも大事そうに持っているから、覚えていましたよ。」', '"Cái này của cháu phải không? Thấy lúc nào cũng cầm nâng niu nên bác nhớ."'],
      ),
      p(
        ['傘一本のために、一時間も遠回りをしたことになる。', 'Thành ra vì một chiếc ô mà tôi đi vòng mất cả tiếng đồng hồ.'],
        ['それでも、帰り道の足取りは不思議と軽かった。', 'Vậy mà trên đường về, bước chân tôi lại nhẹ nhàng đến lạ.'],
      ),
    ],
    quiz: [
      { q: 'Ai đã tặng chiếc ô?', options: ['Mẹ', 'Đồng nghiệp', 'Bác bảo vệ', 'Bà chủ nhà'], answer: 3 },
      { q: 'Vì sao bác bảo vệ nhận ra chiếc ô?', options: ['Vì "tôi" luôn cầm nó rất nâng niu', 'Vì trên ô có ghi tên', 'Vì ô có màu lạ', 'Vì ô rất đắt'], answer: 0 },
      { q: 'Trên đường về, "tôi" cảm thấy thế nào?', options: ['Mệt và bực', 'Nhẹ nhõm, vui', 'Buồn', 'Lo lắng'], answer: 1 },
    ],
  },
  {
    id: 'n3-honya',
    level: 3,
    title: '駅前の小さな本屋',
    titleVi: 'Hiệu sách nhỏ trước ga',
    blurb: 'Thời mua gì cũng có trên mạng, vì sao vẫn nên ghé hiệu sách?',
    paras: [
      p(
        ['駅前に、小さな本屋がある。', 'Trước ga có một hiệu sách nhỏ.'],
        ['店主は七十歳を過ぎたおじいさんで、店の奥でいつも本を読んでいる。', 'Chủ tiệm là một ông cụ ngoài bảy mươi, lúc nào cũng ngồi đọc sách ở góc trong cùng.'],
      ),
      p(
        ['最近はネットで何でも買えるので、この店に来る客は多くない。', 'Dạo này cái gì cũng mua được trên mạng nên khách đến tiệm không nhiều.'],
        ['ある日、わたしは思い切って聞いてみた。', 'Một hôm, tôi mạnh dạn hỏi thử.'],
        ['「お店を続けるのは、大変じゃないですか。」', '"Giữ cửa hàng như vậy có vất vả không ạ?"'],
      ),
      p(
        ['おじいさんは少し考えてから、こう答えた。', 'Ông cụ nghĩ một chút rồi trả lời thế này.'],
        ['「ネットでは、探している本しか見つからないでしょう。」', '"Trên mạng thì chỉ tìm thấy đúng cuốn mình đang tìm thôi, phải không?"'],
        ['「ここでは、探していなかった本に出会えるんですよ。」', '"Còn ở đây, cháu sẽ gặp được những cuốn sách mình chưa từng định tìm."'],
      ),
      p(
        ['その日、わたしは料理の本を買いに来たのに、気がつくと星の写真集を手に持っていた。', 'Hôm đó tôi đến để mua sách nấu ăn, vậy mà lúc nhận ra thì trên tay đã là cuốn sách ảnh về các vì sao.'],
        ['今、その写真集はわたしの部屋のいちばんいい場所に置いてある。', 'Giờ cuốn sách ảnh ấy được đặt ở chỗ đẹp nhất trong phòng tôi.'],
      ),
    ],
    quiz: [
      { q: 'Vì sao tiệm ít khách?', options: ['Tiệm xa ga', 'Sách đắt', 'Bây giờ mua gì cũng được trên mạng', 'Ông cụ khó tính'], answer: 2 },
      { q: 'Theo ông cụ, hiệu sách có điểm gì hay?', options: ['Rẻ hơn trên mạng', 'Gặp được sách mình không định tìm', 'Nhiều sách hơn', 'Có chỗ ngồi đọc'], answer: 1 },
      { q: 'Cuối cùng "tôi" mua cuốn gì?', options: ['Sách ảnh về các vì sao', 'Sách nấu ăn', 'Một cuốn tiểu thuyết', 'Không mua gì'], answer: 0 },
    ],
  },
  {
    id: 'n3-jibun',
    level: 3,
    title: '十年後の自分へ',
    titleVi: 'Gửi tôi của mười năm sau',
    blurb: 'Lá thư của một người học tiếng Nhật được một năm, có lúc muốn bỏ cuộc.',
    paras: [
      p(
        ['十年後のわたしへ。', 'Gửi tôi của mười năm sau.'],
        ['元気ですか。今、何をしていますか。', 'Bạn có khỏe không? Bây giờ bạn đang làm gì?'],
      ),
      p(
        ['今のわたしは二十歳で、日本語の勉強を始めてまだ一年だ。', 'Tôi bây giờ hai mươi tuổi, mới bắt đầu học tiếng Nhật được một năm.'],
        ['漢字はなかなか覚えられないし、アニメのせりふも半分ぐらいしか聞き取れない。', 'Kanji thì mãi chẳng nhớ nổi, lời thoại anime cũng chỉ nghe được khoảng một nửa.'],
        ['正直に言うと、やめたくなる日もある。', 'Nói thật thì cũng có những ngày muốn bỏ cuộc.'],
      ),
      p(
        ['それでも続けているのは、好きな作家の小説を日本語で読んでみたいからだ。', 'Dù vậy tôi vẫn tiếp tục, vì muốn được đọc tiểu thuyết của nhà văn mình yêu thích bằng tiếng Nhật.'],
        ['翻訳ではなく、作家が選んだ言葉のままで。', 'Không phải qua bản dịch, mà bằng chính những con chữ nhà văn đã chọn.'],
      ),
      p(
        ['十年後のわたしは、もうその夢をかなえただろうか。', 'Tôi của mười năm sau đã thực hiện được ước mơ ấy chưa nhỉ?'],
        ['もしまだなら、あきらめないでほしい。', 'Nếu vẫn chưa, mong bạn đừng bỏ cuộc.'],
        ['毎日少しずつでも進んでいれば、きっとたどり着けるはずだから。', 'Vì chỉ cần mỗi ngày tiến lên một chút thôi, chắc chắn rồi sẽ đến nơi.'],
      ),
    ],
    quiz: [
      { q: 'Người viết đã học tiếng Nhật được bao lâu?', options: ['Nửa năm', 'Một năm', 'Hai năm', 'Mười năm'], answer: 1 },
      { q: 'Ước mơ của người viết là gì?', options: ['Làm phiên dịch', 'Sống ở Nhật', 'Xem anime không cần phụ đề', 'Đọc tiểu thuyết của nhà văn yêu thích bằng tiếng Nhật'], answer: 3 },
      { q: 'Người viết nhắn gì cho mình của mười năm sau?', options: ['Đừng bỏ cuộc', 'Hãy học thêm tiếng Anh', 'Hãy về Việt Nam', 'Hãy nghỉ ngơi'], answer: 0 },
    ],
  },
]

export const LEVELS = [5, 4, 3] as const

export const getStory = (id: string) => STORIES.find((s) => s.id === id)

/** Mọi câu của truyện, theo thứ tự. */
export const storyLines = (s: Story): Line[] => s.paras.flat()

/** Ước lượng số phút đọc: khoảng 150 ký tự/phút cho người học. */
export const readMinutes = (s: Story) =>
  Math.max(1, Math.round(storyLines(s).reduce((n, l) => n + [...l.ja].length, 0) / 150))
