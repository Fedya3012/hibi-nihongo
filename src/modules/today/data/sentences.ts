/**
 * CÂU CỦA NGÀY: mỗi ngày một câu ngắn, xoay vòng theo ngày.
 * Mỗi câu là danh sách phần [chữ, cách đọc?]; phần có cách đọc sẽ hiện furigana.
 * Câu tự soạn, không lấy từ sách có bản quyền. Thêm câu mới: thêm một dòng.
 */
export interface DailySentence { parts: [string, string?][]; vi: string }

export const SENTENCES: DailySentence[] = [
  { parts: [['毎日', 'まいにち'], ['少', 'すこ'], ['しずつ。']], vi: 'Mỗi ngày một chút.' },
  { parts: [['継続', 'けいぞく'], ['は'], ['力', 'ちから'], ['なり。']], vi: 'Kiên trì là sức mạnh.' },
  { parts: [['今日', 'きょう'], ['も'], ['頑張', 'がんば'], ['ろう！']], vi: 'Hôm nay cũng cố lên nào!' },
  { parts: [['ゆっくり'], ['で'], ['大丈夫', 'だいじょうぶ'], ['です。']], vi: 'Chậm thôi cũng không sao.' },
  { parts: [['千里', 'せんり'], ['の'], ['道', 'みち'], ['も'], ['一歩', 'いっぽ'], ['から。']], vi: 'Đường nghìn dặm bắt đầu từ một bước chân.' },
  { parts: [['失敗', 'しっぱい'], ['は'], ['成功', 'せいこう'], ['の'], ['もと。']], vi: 'Thất bại là mẹ thành công.' },
  { parts: [['好', 'す'], ['きこそ'], ['物', 'もの'], ['の'], ['上手', 'じょうず'], ['なれ。']], vi: 'Có thích thì mới giỏi.' },
  { parts: [['一緒', 'いっしょ'], ['に'], ['勉強', 'べんきょう'], ['しましょう。']], vi: 'Cùng học nhé.' },
  { parts: [['分', 'わ'], ['からない'], ['ことは'], ['聞', 'き'], ['いて'], ['ください。']], vi: 'Chỗ nào không hiểu thì cứ hỏi nhé.' },
  { parts: [['本', 'ほん'], ['を'], ['読', 'よ'], ['むのが'], ['好', 'す'], ['きです。']], vi: 'Tôi thích đọc sách.' },
  { parts: [['日本語', 'にほんご'], ['が'], ['少', 'すこ'], ['し'], ['話', 'はな'], ['せます。']], vi: 'Tôi nói được một chút tiếng Nhật.' },
  { parts: [['明日', 'あした'], ['は'], ['明日', 'あした'], ['の'], ['風', 'かぜ'], ['が'], ['吹', 'ふ'], ['く。']], vi: 'Ngày mai sẽ có gió của ngày mai (chuyện mai để mai tính).' },
  { parts: [['石', 'いし'], ['の'], ['上', 'うえ'], ['にも'], ['三年', 'さんねん'], ['。']], vi: 'Ngồi trên đá ba năm cũng ấm (kiên nhẫn sẽ thành).' },
  { parts: [['習', 'なら'], ['うより'], ['慣', 'な'], ['れろ。']], vi: 'Học không bằng quen tay.' },
  { parts: [['今', 'いま'], ['、'], ['何時', 'なんじ'], ['ですか。']], vi: 'Bây giờ là mấy giờ?' },
  { parts: [['お'], ['疲', 'つか'], ['れ'], ['様', 'さま'], ['でした。']], vi: 'Bạn vất vả rồi (cảm ơn sau khi làm xong việc).' },
  { parts: [['いただきます。']], vi: 'Mời cả nhà (nói trước khi ăn).' },
  { parts: [['よろしく'], ['お'], ['願', 'ねが'], ['いします。']], vi: 'Rất mong được giúp đỡ.' },
  { parts: [['七', 'なな'], ['転', 'ころ'], ['び'], ['八', 'や'], ['起', 'お'], ['き。']], vi: 'Ngã bảy lần, đứng dậy tám lần.' },
  { parts: [['急', 'いそ'], ['がば'], ['回', 'まわ'], ['れ。']], vi: 'Dục tốc bất đạt.' },
  { parts: [['楽', 'たの'], ['しく'], ['学', 'まな'], ['ぼう。']], vi: 'Học thật vui nhé.' },
]
