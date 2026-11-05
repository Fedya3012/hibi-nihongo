/**
 * NGỮ PHÁP, SẮC THÁI GIỌNG NÓI VÀ CHÚ THÍCH VĂN HÓA hay gặp trong manga.
 * Hibi Nihongo tự soạn (giải thích tiếng Việt ngắn gọn). Muốn thêm mẫu: thêm một dòng vào mảng.
 *
 * Nhận diện bằng mẫu chữ đơn giản nên có thể sót hoặc nhầm; đây là gợi ý, không phải phân tích chắc chắn.
 */

export interface StudyNote {
  /** Nhãn hiển thị, ví dụ "～てしまう". */
  label: string
  /** Giải thích tiếng Việt. */
  vi: string
  /** Cấp JLPT gần đúng (5 = N5). */
  jlpt?: number
  re: RegExp
}

/** Mẫu ngữ pháp. */
export const GRAMMAR: StudyNote[] = [
  { label: '～てしまう / ～ちゃう', jlpt: 4, re: /(て|で)しま[うったい]|(ちゃ|じゃ)[うったっ]/, vi: 'Làm xong hẳn; hoặc lỡ làm (tiếc nuối). ～ちゃう là dạng nói.' },
  { label: '～ている / ～てる', jlpt: 5, re: /(て|で)(い|)[るたま]/, vi: 'Đang làm; hoặc trạng thái kéo dài (đã kết hôn, đang biết...). ～てる là dạng nói.' },
  { label: '～たい', jlpt: 5, re: /たい[!！。、?？よなねのか]|たい$|たかった|たくな/, vi: 'Muốn làm gì đó.' },
  { label: '～そう', jlpt: 4, re: /そう[だです!！。、ねなに]|そう$/, vi: 'Trông có vẻ (sau gốc tính từ/động từ), hoặc nghe nói (sau thể thường).' },
  { label: '～らしい', jlpt: 4, re: /らしい/, vi: 'Hình như, nghe nói; hoặc "đúng chất" (男らしい = đàn ông đúng nghĩa).' },
  { label: '～みたい', jlpt: 4, re: /みたい/, vi: 'Giống như, có vẻ như (văn nói của ～ようだ).' },
  { label: '～ようだ / ～ように', jlpt: 4, re: /よう(だ|です|に|な)/, vi: 'Có vẻ như; hoặc "để mà", "như là".' },
  { label: '～なければならない / ～なきゃ', jlpt: 4, re: /なければ|なきゃ|なくちゃ|ないと/, vi: 'Phải làm. ～なきゃ / ～なくちゃ / ～ないと là dạng nói.' },
  { label: '～てもいい', jlpt: 5, re: /(て|で)も(いい|いい|大丈夫|かまわ)/, vi: 'Làm ... cũng được (xin phép / cho phép).' },
  { label: '～てはいけない / ～ちゃダメ', jlpt: 5, re: /(ては|では)いけな|(ちゃ|じゃ)(だめ|ダメ|いけな)/, vi: 'Không được làm.' },
  { label: '～ても', jlpt: 4, re: /(て|で)も[、,]/, vi: 'Dù cho ... đi nữa.' },
  { label: '～のに', jlpt: 4, re: /のに/, vi: 'Vậy mà, thế mà (bất mãn, tiếc); hoặc "để" (dùng cho mục đích).' },
  { label: '～から / ～ので', jlpt: 5, re: /から[!！。、]|から$|ので/, vi: 'Vì ... nên. ～から mang tính chủ quan hơn ～ので.' },
  { label: '～けど / ～が', jlpt: 5, re: /けど|けれど/, vi: 'Nhưng; hoặc để mở đầu câu nhẹ nhàng ("Tôi muốn hỏi chút, ...").' },
  { label: '～たら', jlpt: 4, re: /[たっ]ら[、,]|たら$/, vi: 'Nếu / khi ... thì.' },
  { label: '～ば', jlpt: 4, re: /[えけせてねべめれげ]ば[、,]/, vi: 'Nếu (điều kiện).' },
  { label: '～う / ～よう (ý chí)', jlpt: 4, re: /[おこそとのもろごぼ]う[!！。よぜか]|よう[!！。よぜか]/, vi: 'Hãy cùng ...! / định làm ... (thể ý chí).' },
  { label: '～られる (bị động / khả năng)', jlpt: 4, re: /られ[るたなま]|[わかさたなまらがば]れ[るたな]/, vi: 'Bị ... (bị động), được ..., hoặc có thể ... (khả năng).' },
  { label: '～させる (sai khiến)', jlpt: 3, re: /させ[るたてらな]/, vi: 'Bắt / cho phép ai làm gì.' },
  { label: '～はず', jlpt: 3, re: /はず/, vi: 'Chắc chắn là, lẽ ra là (dự đoán có cơ sở).' },
  { label: '～わけ', jlpt: 3, re: /わけ/, vi: 'Lý do, nghĩa là; ～わけがない = không lẽ nào.' },
  { label: '～かもしれない / ～かも', jlpt: 4, re: /かも/, vi: 'Có lẽ, không chừng.' },
  { label: '～でしょう / ～だろう', jlpt: 5, re: /でしょ|だろ/, vi: 'Chắc là ...; cuối câu lên giọng = "đúng không?".' },
  { label: '～んだ / ～のです', jlpt: 4, re: /んだ|んです|のです|のだ/, vi: 'Giải thích, nhấn mạnh lý do hay cảm xúc.' },
  { label: '～ないで', jlpt: 5, re: /ないで/, vi: 'Đừng ... (yêu cầu), hoặc "mà không ...".' },
  { label: '～ておく / ～とく', jlpt: 4, re: /(て|で)お[くいき]|[とど]く[!！。よね]/, vi: 'Làm sẵn, làm trước để chuẩn bị.' },
  { label: '～てみる', jlpt: 4, re: /(て|で)み[るたよて]/, vi: 'Thử làm.' },
  { label: '～ばかり', jlpt: 3, re: /ばかり|ばっか/, vi: 'Toàn là, chỉ toàn; ～たばかり = vừa mới.' },
  { label: '～すぎる', jlpt: 4, re: /すぎ/, vi: 'Quá ... (quá nhiều, quá mức).' },
  { label: '～ながら', jlpt: 4, re: /ながら/, vi: 'Vừa ... vừa ...' },
]

/** Sắc thái giọng nói: lịch sự, thân mật, nam/nữ, cổ trang... */
export const STYLE: StudyNote[] = [
  { label: 'Lịch sự (です/ます)', re: /です|ます|ました|ません|でした/, vi: 'Cách nói lịch sự thông thường, dùng với người lạ, người trên.' },
  { label: 'Kính ngữ (keigo)', re: /ございま|いらっしゃ|おっしゃ|召し上が|申し|参り|おります|いただ|くださ/, vi: 'Kính ngữ/khiêm nhường ngữ: nói với khách, cấp trên, người cần tôn trọng.' },
  { label: 'Giọng nam, mạnh (ぜ/ぞ/俺)', re: /[ぜぞ][!！。]|[ぜぞ]$|俺|オレ|おれ|てめえ|てめぇ|貴様/, vi: 'Kiểu nói nam tính, thân mật hoặc thô. 貴様/てめえ là gọi người khác rất xấc.' },
  { label: 'Giọng nữ, mềm (わ/かしら)', re: /わ[よね!！。]|かしら|のよ|あたし/, vi: 'Cuối câu わ, かしら, のよ thường gắn với giọng nữ (nhất là nhân vật cũ hoặc tiểu thư).' },
  { label: 'Thân mật (だ/よ/ね)', re: /だ[よね!！。]|じゃん|っす|だよ/, vi: 'Nói với bạn bè, người thân. っす là dạng nói tắt của です (đàn em với đàn anh).' },
  { label: 'Cổ trang / samurai', re: /拙者|ござる|でござ|それがし|殿[、!！。]|じゃ[!！。]|のじゃ/, vi: 'Cách nói cổ (拙者 = tại hạ, ござる). Nhân vật ông già hoặc cổ trang hay dùng ～じゃ.' },
  { label: 'Giọng Kansai', re: /やん|へん[!！。]|ねん|あかん|ほんま|おおきに|せや/, vi: 'Phương ngữ Kansai (Osaka): あかん = không được, ほんま = thật, ～へん = phủ định.' },
  { label: 'Trẻ con / dễ thương', re: /でちゅ|だもん|もん[!！。]|なのだ|ですぅ/, vi: 'Kiểu nói trẻ con hoặc "nhân vật dễ thương", ～もん = vì ... mà (nũng nịu).' },
  { label: 'Dân anh chị (yakuza)', re: /おどれ|ワレ[!！]|じゃけえ|しばくぞ|兄貴|親分|組長|オヤジ/, vi: 'Từ ngữ giới giang hồ: 兄貴 = đại ca, 組長 = trùm, しばくぞ = tao đập mày.' },
]

/** Chú thích văn hóa: hậu tố gọi tên, từ tượng thanh, tiếng lóng. */
export const CULTURE: StudyNote[] = [
  { label: '～さん', re: /さん/, vi: 'Hậu tố gọi tên lịch sự phổ biến nhất (anh/chị/ông/bà).' },
  { label: '～くん', re: /くん|君[!！。、]/, vi: 'Gọi con trai, đàn em, hoặc cấp dưới; thân thiện.' },
  { label: '～ちゃん', re: /ちゃん/, vi: 'Gọi thân mật trẻ con, con gái, bạn thân, thú cưng.' },
  { label: '～様', re: /様|さま/, vi: 'Rất kính trọng (khách hàng, thần, chủ nhân). Tự gọi mình là 俺様 = ngạo mạn.' },
  { label: '先輩 / 後輩', re: /先輩|せんぱい|センパイ|後輩/, vi: 'Đàn anh/chị và đàn em (ở trường, công ty). Quan hệ trên dưới rất quan trọng ở Nhật.' },
  { label: '先生', re: /先生/, vi: 'Thầy cô, bác sĩ, tác giả manga... gọi người có chuyên môn.' },
  { label: '～殿', re: /殿/, vi: 'Hậu tố trang trọng kiểu cổ (ngài), hay gặp trong truyện cổ trang hoặc văn bản.' },
  { label: 'いただきます / ごちそうさま', re: /いただきます|ごちそう/, vi: 'Câu nói trước và sau bữa ăn, cảm ơn người nấu và thức ăn.' },
  { label: 'ただいま / おかえり', re: /ただいま|おかえり/, vi: 'Con về rồi / Mừng về nhà: chào khi về đến nhà.' },
  { label: 'よろしく', re: /よろしく/, vi: 'Mong được giúp đỡ / nhờ cậy: câu xã giao rất Nhật, khó dịch sát.' },
  { label: 'Từ tượng thanh ドキドキ', re: /ドキドキ|どきどき/, vi: 'Tim đập thình thịch (hồi hộp, rung động).' },
  { label: 'Từ tượng thanh ゴゴゴ', re: /ゴゴゴ/, vi: 'Âm thanh "không khí đe dọa", nhân vật tỏa sát khí.' },
  { label: 'Từ tượng thanh シーン', re: /シーン|しーん/, vi: 'Im phăng phắc (không khí lặng ngắt).' },
  { label: 'Từ tượng thanh ニコニコ', re: /ニコニコ|にこにこ|ニコッ/, vi: 'Mỉm cười tươi.' },
  { label: 'Từ tượng thanh ワクワク', re: /ワクワク|わくわく/, vi: 'Háo hức, phấn khích.' },
  { label: 'Từ tượng thanh イライラ', re: /イライラ|いらいら/, vi: 'Bực bội, sốt ruột.' },
  { label: 'Từ tượng thanh ペコペコ', re: /ペコペコ|ぺこぺこ/, vi: 'Đói meo; hoặc cúi đầu lia lịa.' },
  { label: 'Từ tượng thanh ジー', re: /ジー[ッっ]|じーっ/, vi: 'Nhìn chằm chằm.' },
  { label: 'Tiếng lóng マジ', re: /マジ|まじ/, vi: 'Thật á? / Nghiêm túc đấy. (= 本当, 本気)' },
  { label: 'Tiếng lóng ヤバい', re: /ヤバ|やば/, vi: 'Toang rồi / nguy; giới trẻ còn dùng nghĩa "đỉnh quá".' },
  { label: 'Tiếng lóng うざい', re: /うざ|ウザ/, vi: 'Phiền phức, khó chịu.' },
  { label: 'Tiếng lóng ムカつく', re: /ムカつ|むかつ/, vi: 'Tức điên, bực mình.' },
  { label: 'バカ / アホ', re: /バカ|ばか|馬鹿|アホ|あほ/, vi: 'Đồ ngốc. バカ phổ biến ở Kanto; アホ ở Kansai (nghe nhẹ hơn ở đó).' },
  { label: 'くそ', re: /くそ|クソ|糞/, vi: 'Chết tiệt! (chửi thề nhẹ, rất hay gặp trong manga hành động).' },
]

export interface FoundNote extends Omit<StudyNote, 're'> {
  group: 'grammar' | 'style' | 'culture'
}

/** Tìm mọi mẫu xuất hiện trong một câu. */
export function findNotes(text: string): FoundNote[] {
  const pick = (list: StudyNote[], group: FoundNote['group']) =>
    list.filter((n) => n.re.test(text)).map(({ re: _re, ...rest }) => ({ ...rest, group }))
  return [...pick(GRAMMAR, 'grammar'), ...pick(STYLE, 'style'), ...pick(CULTURE, 'culture')]
}
