/**
 * NHÃN TIẾNG VIỆT cho các mã trong JMdict và từ loại của Kuromoji.
 * Mã nào chưa có ở đây thì app hiện nguyên mã (không lỗi). Muốn sửa cách gọi: sửa thẳng chữ bên phải.
 */

const POS: Record<string, string> = {
  n: 'danh từ', 'n-adv': 'danh từ làm trạng từ', 'n-t': 'danh từ chỉ thời gian', 'n-pr': 'danh từ riêng',
  'n-pref': 'danh từ (tiền tố)', 'n-suf': 'danh từ (hậu tố)', pn: 'đại từ', num: 'số từ', ctr: 'lượng từ',
  'adj-i': 'tính từ -i', 'adj-ix': 'tính từ -i (いい/よい)', 'adj-na': 'tính từ -na', 'adj-no': 'danh từ đi với の',
  'adj-pn': 'liên thể từ', 'adj-t': 'tính từ -taru', 'adj-f': 'bổ nghĩa cho danh từ', 'adj-nari': 'tính từ -na (cổ)',
  'adj-ku': 'tính từ -ku (cổ)', 'adj-shiku': 'tính từ -shiku (cổ)', 'adj-kari': 'tính từ -kari (cổ)',
  adv: 'phó từ', 'adv-to': 'phó từ đi với と', aux: 'trợ từ phụ', 'aux-v': 'trợ động từ', 'aux-adj': 'tính từ phụ trợ',
  conj: 'liên từ', cop: 'hệ từ (だ/です)', exp: 'cụm từ', int: 'thán từ', pref: 'tiền tố', suf: 'hậu tố', prt: 'trợ từ',
  unc: 'chưa phân loại',
  v1: 'động từ nhóm 2 (ichidan)', 'v1-s': 'động từ nhóm 2 (くれる)', vz: 'động từ nhóm 2 (-ずる)',
  v5u: 'động từ nhóm 1, đuôi う', 'v5u-s': 'động từ nhóm 1, đuôi う (đặc biệt)', v5k: 'động từ nhóm 1, đuôi く',
  'v5k-s': 'động từ nhóm 1 (行く)', v5g: 'động từ nhóm 1, đuôi ぐ', v5s: 'động từ nhóm 1, đuôi す',
  v5t: 'động từ nhóm 1, đuôi つ', v5n: 'động từ nhóm 1, đuôi ぬ', v5b: 'động từ nhóm 1, đuôi ぶ',
  v5m: 'động từ nhóm 1, đuôi む', v5r: 'động từ nhóm 1, đuôi る', 'v5r-i': 'động từ nhóm 1, đuôi る (bất quy tắc)',
  v5aru: 'động từ nhóm 1 (-ある, kính ngữ)', vk: 'động từ nhóm 3 (来る)', vs: 'danh từ + する',
  'vs-i': 'động từ nhóm 3 (する)', 'vs-s': 'động từ する (đặc biệt)', 'vs-c': 'động từ -す (cổ)',
  vn: 'động từ bất quy tắc -ぬ', vr: 'động từ bất quy tắc -り', v2: 'động từ nidan (cổ)', v4: 'động từ yodan (cổ)',
  'v-unspec': 'động từ', vt: 'tha động từ', vi: 'tự động từ',
}

const MISC: Record<string, string> = {
  uk: 'thường viết bằng kana', abbr: 'viết tắt', arch: 'từ cổ', chn: 'ngôn ngữ trẻ em', col: 'khẩu ngữ',
  dated: 'hơi cũ', derog: 'miệt thị', fam: 'thân mật', fem: 'nữ hay dùng', male: 'nam hay dùng',
  form: 'trang trọng / văn viết', hist: 'từ lịch sử', hon: 'tôn kính ngữ (sonkeigo)', hum: 'khiêm nhường ngữ (kenjougo)',
  pol: 'lịch sự (teineigo)', id: 'thành ngữ', joc: 'đùa vui', 'm-sl': 'tiếng lóng manga', 'net-sl': 'tiếng lóng mạng',
  sl: 'tiếng lóng', obs: 'không còn dùng', obsc: 'ít gặp', 'on-mim': 'từ tượng thanh / tượng hình', poet: 'thơ ca',
  proverb: 'tục ngữ', quote: 'trích dẫn', rare: 'hiếm', sens: 'nhạy cảm', vulg: 'thô tục', yoji: 'thành ngữ 4 chữ',
  person: 'tên người', place: 'địa danh', work: 'tên tác phẩm',
  // ghi chú chữ viết / cách đọc
  ateji: 'ateji (mượn chữ)', io: 'okurigana bất thường', ik: 'kana bất thường', iK: 'kanji bất thường',
  oK: 'kanji cũ', ok: 'kana cũ', gikun: 'đọc theo nghĩa (jukujikun)', rK: 'cách viết hiếm', sK: 'cách viết tìm kiếm',
  // lĩnh vực hay gặp
  med: 'y học', comp: 'tin học', math: 'toán', law: 'luật', bus: 'kinh doanh', food: 'ẩm thực', sports: 'thể thao',
  music: 'âm nhạc', mil: 'quân sự', Buddh: 'Phật giáo', biol: 'sinh học', bot: 'thực vật', zool: 'động vật',
  chem: 'hóa học', physics: 'vật lý', ling: 'ngôn ngữ học', gramm: 'ngữ pháp', econ: 'kinh tế', finc: 'tài chính',
  anat: 'giải phẫu', sumo: 'sumo', shogi: 'shogi', baseb: 'bóng chày', MA: 'võ thuật', vidg: 'trò chơi điện tử',
  // phương ngữ
  ksb: 'giọng Kansai', osb: 'giọng Osaka', kyb: 'giọng Kyoto', ktb: 'giọng Kantou', thb: 'giọng Touhoku',
  kyu: 'giọng Kyuushuu', rkb: 'giọng Ryuukyuu', hob: 'giọng Hokkaido', nab: 'giọng Nagano', tsb: 'giọng Tosa',
  tsug: 'giọng Tsugaru',
}

export const posLabel = (code: string) => POS[code] ?? code
export const miscLabel = (code: string) => MISC[code] ?? code

/** Từ loại của Kuromoji (IPADIC) → tiếng Việt, dùng trong phần phân tích câu. */
export function kuromojiPosLabel(pos: string, detail = ''): string {
  if (pos === '名詞') {
    if (detail === '固有名詞') return 'danh từ riêng'
    if (detail === '代名詞') return 'đại từ'
    if (detail === '数') return 'số'
    if (detail === '形容動詞語幹') return 'tính từ -na'
    if (detail === 'サ変接続') return 'danh từ (+する)'
    if (detail === '接尾') return 'hậu tố'
    if (detail === '副詞可能') return 'danh từ / phó từ'
    return 'danh từ'
  }
  const map: Record<string, string> = {
    動詞: 'động từ', 形容詞: 'tính từ -i', 副詞: 'phó từ', 助詞: 'trợ từ', 助動詞: 'trợ động từ',
    連体詞: 'liên thể từ', 接続詞: 'liên từ', 感動詞: 'thán từ', 記号: 'ký hiệu', 接頭詞: 'tiền tố',
    フィラー: 'từ đệm', その他: 'khác',
  }
  return map[pos] ?? pos
}

export const jlptLabel = (n?: number) => (n ? `N${n}` : '')
