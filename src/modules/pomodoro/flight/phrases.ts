/**
 * CÂU TIẾNG NHẬT Ở SÂN BAY: nhân viên an ninh, quầy nhập cảnh (入国審査), hải quan (税関).
 * Mỗi câu hỏi: nhân viên nói (ja + cách đọc + nghĩa), người học chọn câu trả lời đúng.
 */

export interface Choice { ja: string; vi: string }
export interface Question {
  /** Câu nhân viên nói. */
  ja: string
  kana: string
  vi: string
  /** Câu trả lời để chọn; `ok` là vị trí câu đúng. */
  choices: Choice[]
  ok: number
}

/** Cửa an ninh (保安検査場): làm theo hướng dẫn của nhân viên. */
export const SECURITY: Question[] = [
  {
    ja: 'ポケットの中の物をトレーに入れてください。', kana: 'ぽけっとのなかのものをとれーにいれてください。',
    vi: 'Xin hãy bỏ đồ trong túi áo/quần vào khay.',
    choices: [{ ja: 'はい、分かりました。', vi: 'Vâng, tôi hiểu rồi.' }, { ja: 'いいえ、結構です。', vi: 'Không, thôi khỏi.' }, { ja: '窓側をお願いします。', vi: 'Cho tôi ghế cạnh cửa sổ.' }],
    ok: 0,
  },
  {
    ja: '液体は持っていますか。', kana: 'えきたいはもっていますか。',
    vi: 'Anh/chị có mang chất lỏng không?',
    choices: [{ ja: '三日間です。', vi: 'Ba ngày.' }, { ja: 'いいえ、持っていません。', vi: 'Không, tôi không mang.' }, { ja: '観光です。', vi: 'Đi du lịch.' }],
    ok: 1,
  },
  {
    ja: 'パソコンをかばんから出してください。', kana: 'ぱそこんをかばんからだしてください。',
    vi: 'Xin hãy lấy máy tính ra khỏi túi.',
    choices: [{ ja: 'ホテルに泊まります。', vi: 'Tôi ở khách sạn.' }, { ja: 'すみません、トイレはどこですか。', vi: 'Xin lỗi, nhà vệ sinh ở đâu?' }, { ja: 'はい、どうぞ。', vi: 'Vâng, đây ạ.' }],
    ok: 2,
  },
  {
    ja: 'もう一度ゲートを通ってください。', kana: 'もういちどげーとをとおってください。',
    vi: 'Xin hãy đi qua cổng (máy dò) một lần nữa.',
    choices: [{ ja: 'はい、すみません。', vi: 'Vâng, xin lỗi.' }, { ja: '申告するものはありません。', vi: 'Tôi không có gì phải khai báo.' }, { ja: '一週間です。', vi: 'Một tuần.' }],
    ok: 0,
  },
  {
    ja: '搭乗券を見せてください。', kana: 'とうじょうけんをみせてください。',
    vi: 'Xin cho xem thẻ lên máy bay.',
    choices: [{ ja: '仕事です。', vi: 'Đi công tác.' }, { ja: 'はい、これです。', vi: 'Vâng, đây ạ.' }, { ja: '通路側がいいです。', vi: 'Tôi muốn ghế cạnh lối đi.' }],
    ok: 1,
  },
]

/** Quầy nhập cảnh (入国審査): khi bay từ nước ngoài tới Nhật. */
export const IMMIGRATION: Question[] = [
  {
    ja: 'パスポートを見せてください。', kana: 'ぱすぽーとをみせてください。',
    vi: 'Xin cho xem hộ chiếu.',
    choices: [{ ja: 'はい、どうぞ。', vi: 'Vâng, mời anh/chị.' }, { ja: 'いいえ、ありません。', vi: 'Không, không có.' }, { ja: '東京です。', vi: 'Tokyo ạ.' }],
    ok: 0,
  },
  {
    ja: '入国の目的は何ですか。', kana: 'にゅうこくのもくてきはなんですか。',
    vi: 'Mục đích nhập cảnh là gì?',
    choices: [{ ja: '一週間です。', vi: 'Một tuần.' }, { ja: '観光です。', vi: 'Đi du lịch.' }, { ja: 'はい、そうです。', vi: 'Vâng, đúng vậy.' }],
    ok: 1,
  },
  {
    ja: 'どのくらい滞在しますか。', kana: 'どのくらいたいざいしますか。',
    vi: 'Anh/chị lưu lại bao lâu?',
    choices: [{ ja: '友達の家です。', vi: 'Nhà bạn tôi.' }, { ja: '日本語を勉強します。', vi: 'Tôi học tiếng Nhật.' }, { ja: '十日間です。', vi: 'Mười ngày.' }],
    ok: 2,
  },
  {
    ja: 'どこに泊まりますか。', kana: 'どこにとまりますか。',
    vi: 'Anh/chị ở đâu?',
    choices: [{ ja: '新宿のホテルです。', vi: 'Khách sạn ở Shinjuku.' }, { ja: '飛行機で来ました。', vi: 'Tôi đến bằng máy bay.' }, { ja: '三回目です。', vi: 'Lần thứ ba.' }],
    ok: 0,
  },
  {
    ja: '日本は初めてですか。', kana: 'にほんははじめてですか。',
    vi: 'Đây là lần đầu anh/chị đến Nhật à?',
    choices: [{ ja: 'ホテルに泊まります。', vi: 'Tôi ở khách sạn.' }, { ja: 'はい、初めてです。', vi: 'Vâng, lần đầu.' }, { ja: '液体です。', vi: 'Chất lỏng.' }],
    ok: 1,
  },
  {
    ja: '指をここに置いてください。', kana: 'ゆびをここにおいてください。',
    vi: 'Xin đặt ngón tay vào đây (lấy vân tay).',
    choices: [{ ja: 'いいえ、結構です。', vi: 'Không, thôi khỏi.' }, { ja: '五日間です。', vi: 'Năm ngày.' }, { ja: 'はい、分かりました。', vi: 'Vâng, tôi hiểu rồi.' }],
    ok: 2,
  },
]

/** Hải quan (税関): sau khi lấy hành lý. */
export const CUSTOMS: Question[] = [
  {
    ja: '申告するものはありますか。', kana: 'しんこくするものはありますか。',
    vi: 'Anh/chị có gì cần khai báo không?',
    choices: [{ ja: 'いいえ、ありません。', vi: 'Không, không có.' }, { ja: '観光です。', vi: 'Đi du lịch.' }, { ja: '窓側です。', vi: 'Ghế cạnh cửa sổ.' }],
    ok: 0,
  },
  {
    ja: 'スーツケースを開けてもいいですか。', kana: 'すーつけーすをあけてもいいですか。',
    vi: 'Tôi mở vali được không?',
    choices: [{ ja: '一週間です。', vi: 'Một tuần.' }, { ja: 'はい、どうぞ。', vi: 'Vâng, mời anh/chị.' }, { ja: '東京に行きます。', vi: 'Tôi đi Tokyo.' }],
    ok: 1,
  },
  {
    ja: 'これは何ですか。', kana: 'これはなんですか。',
    vi: 'Cái này là gì?',
    choices: [{ ja: 'はじめまして。', vi: 'Rất vui được gặp.' }, { ja: '十日間です。', vi: 'Mười ngày.' }, { ja: 'お土産のお菓子です。', vi: 'Bánh kẹo làm quà.' }],
    ok: 2,
  },
]

/** Lấy ngẫu nhiên n câu (không trùng). */
export function pick<T>(list: T[], n: number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, n)
}
