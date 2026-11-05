/**
 * CHIA ĐỘNG TỪ NGƯỢC (deinflection)
 * ---------------------------------
 * Đưa một dạng đã chia về thể từ điển để tra được: 食べさせられた → 食べる (sai khiến → bị động → quá khứ).
 *
 * Cách làm: có một danh sách luật "đuôi A → đuôi B". Áp luật lặp lại nhiều lần, mỗi lần bỏ một lớp chia.
 * Mỗi dạng có một "loại" (động từ nhóm 1, nhóm 2, tính từ -i, thể て...) để chỉ áp luật hợp lý:
 *   食べさせられた (dạng cuối) --た→る--> 食べさせられる (nhóm 2) --られる→る--> 食べさせる (nhóm 2)
 *   --させる→る--> 食べる (nhóm 2) → tra từ điển, thấy 食べる đúng là động từ nhóm 2 → nhận.
 * Bộ luật này tự viết cho Hibi Nihongo, đặt tên lý do bằng tiếng Việt.
 */

// Loại của một dạng từ (bit để gộp nhiều loại)
export const T = {
  V1: 1, // động từ nhóm 2 (ichidan): 食べる
  V5: 2, // động từ nhóm 1 (godan): 書く
  VK: 4, // 来る
  VS: 8, // する
  ADJ: 16, // tính từ -i (và các đuôi chia như tính từ: ない, たい)
  MASU: 32, // dạng ます
  TE: 64, // dạng て/で
  END: 128, // dạng cuối, không chia tiếp (た, ば, よう...)
} as const
const ALL = 255

interface Rule { from: string; to: string; inT: number; outT: number; reason: string }
const rules: Rule[] = []
const add = (from: string, to: string, inT: number, outT: number, reason: string) =>
  rules.push({ from, to, inT, outT, reason })

// ----- Động từ nhóm 1: hàng âm theo đuôi u -----
//   đuôi:  a     i     e     o    て     た
const GODAN: Record<string, [string, string, string, string, string, string]> = {
  う: ['わ', 'い', 'え', 'お', 'って', 'った'],
  く: ['か', 'き', 'け', 'こ', 'いて', 'いた'],
  ぐ: ['が', 'ぎ', 'げ', 'ご', 'いで', 'いだ'],
  す: ['さ', 'し', 'せ', 'そ', 'して', 'した'],
  つ: ['た', 'ち', 'て', 'と', 'って', 'った'],
  ぬ: ['な', 'に', 'ね', 'の', 'んで', 'んだ'],
  ぶ: ['ば', 'び', 'べ', 'ぼ', 'んで', 'んだ'],
  む: ['ま', 'み', 'め', 'も', 'んで', 'んだ'],
  る: ['ら', 'り', 'れ', 'ろ', 'って', 'った'],
}

/**
 * Các dạng chia, viết theo "gốc" của từng nhóm:
 *   A = thân + hàng a (nhóm 1) / thân (nhóm 2) / さ・し (する) / こ (来る)...
 * Mỗi dạng: [đuôi thêm vào, gốc dùng, loại của dạng mới, lý do]
 */
type Base = 'a' | 'i' | 'e' | 'o' | 'te' | 'ta'
const FORMS: [string, Base, number, string][] = [
  ['ない', 'a', T.ADJ, 'phủ định (~ない)'],
  ['ず', 'a', T.END, 'phủ định (~ず)'],
  ['ずに', 'a', T.END, 'không làm… mà (~ずに)'],
  ['ます', 'i', T.MASU, 'lịch sự (~ます)'],
  ['たい', 'i', T.ADJ, 'muốn (~たい)'],
  ['ながら', 'i', T.END, 'vừa… vừa (~ながら)'],
  ['なさい', 'i', T.END, 'mệnh lệnh nhẹ (~なさい)'],
  ['そう', 'i', T.END, 'có vẻ (~そう)'],
  ['すぎる', 'i', T.V1, 'quá mức (~すぎる)'],
  ['やすい', 'i', T.ADJ, 'dễ (~やすい)'],
  ['にくい', 'i', T.ADJ, 'khó (~にくい)'],
  ['', 'i', T.END, 'thể liên dụng (thân ます)'],
  ['', 'te', T.TE, 'thể て'],
  ['', 'ta', T.END, 'quá khứ (~た)'],
  ['ら', 'ta', T.END, 'điều kiện (~たら)'],
  ['り', 'ta', T.END, 'liệt kê (~たり)'],
  ['ば', 'e', T.END, 'điều kiện (~ば)'],
]

// Nhóm 1
for (const [u, [a, i, e, o, te, ta]] of Object.entries(GODAN)) {
  const base: Record<Base, string> = { a, i, e, o, te, ta }
  for (const [suffix, b, outType, reason] of FORMS) add(base[b] + suffix, u, outType === T.END ? T.END : outType, T.V5, reason)
  add(o + 'う', u, T.END, T.V5, 'ý chí (~おう)')
  add(e, u, T.END, T.V5, 'mệnh lệnh')
  add(e + 'る', u, T.V1, T.V5, 'khả năng')
  add(a + 'れる', u, T.V1, T.V5, 'bị động / tôn kính')
  add(a + 'せる', u, T.V1, T.V5, 'sai khiến')
  add(a + 'す', u, T.V5, T.V5, 'sai khiến (rút gọn)')
  add(a + 'せられる', u, T.V1, T.V5, 'sai khiến bị động')
  add(a + 'される', u, T.V1, T.V5, 'sai khiến bị động')
  add(a + 'なければ', u, T.END, T.V5, 'phải (~なければ)')
}
add('わず', 'う', T.END, T.V5, 'phủ định (~ず)')
// 行く là ngoại lệ: 行って / 行った
add('って', 'く', T.TE, T.V5, 'thể て')
add('った', 'く', T.END, T.V5, 'quá khứ (~た)')
add('ったら', 'く', T.END, T.V5, 'điều kiện (~たら)')
add('ったり', 'く', T.END, T.V5, 'liệt kê (~たり)')

// Nhóm 2: thân = bỏ る
for (const [suffix, b, outType, reason] of FORMS) {
  const stem = b === 'te' ? 'て' : b === 'ta' ? 'た' : b === 'e' ? 'れ' : ''
  if (b === 'o') continue
  add(stem + suffix, 'る', outType, T.V1, reason)
}
add('よう', 'る', T.END, T.V1, 'ý chí (~よう)')
add('ろ', 'る', T.END, T.V1, 'mệnh lệnh')
add('よ', 'る', T.END, T.V1, 'mệnh lệnh')
add('られる', 'る', T.V1, T.V1, 'bị động / khả năng')
add('れる', 'る', T.V1, T.V1, 'khả năng (rút gọn)')
add('させる', 'る', T.V1, T.V1, 'sai khiến')
add('さす', 'る', T.V5, T.V1, 'sai khiến (rút gọn)')
add('させられる', 'る', T.V1, T.V1, 'sai khiến bị động')
add('なければ', 'る', T.END, T.V1, 'phải (~なければ)')

// する và 来る (cả dạng kana và Kanji 来)
const irregular = (dict: string, outT: number, forms: [string, number, string][]) => {
  for (const [form, inT, reason] of forms) add(form, dict, inT, outT, reason)
}
irregular('する', T.VS, [
  ['しない', T.ADJ, 'phủ định (~ない)'], ['せず', T.END, 'phủ định (~ず)'], ['せずに', T.END, 'không làm… mà (~ずに)'],
  ['します', T.MASU, 'lịch sự (~ます)'], ['したい', T.ADJ, 'muốn (~たい)'], ['しながら', T.END, 'vừa… vừa (~ながら)'],
  ['しなさい', T.END, 'mệnh lệnh nhẹ (~なさい)'], ['しそう', T.END, 'có vẻ (~そう)'], ['しすぎる', T.V1, 'quá mức (~すぎる)'],
  ['して', T.TE, 'thể て'], ['した', T.END, 'quá khứ (~た)'], ['したら', T.END, 'điều kiện (~たら)'],
  ['したり', T.END, 'liệt kê (~たり)'], ['すれば', T.END, 'điều kiện (~ば)'], ['しよう', T.END, 'ý chí (~よう)'],
  ['しろ', T.END, 'mệnh lệnh'], ['せよ', T.END, 'mệnh lệnh'], ['される', T.V1, 'bị động / tôn kính'],
  ['させる', T.V1, 'sai khiến'], ['させられる', T.V1, 'sai khiến bị động'], ['し', T.END, 'thể liên dụng (thân ます)'],
  ['しなければ', T.END, 'phải (~なければ)'], ['できる', T.V1, 'khả năng'],
])
for (const k of ['く', '来']) {
  const ko = k === '来' ? '来' : 'こ', ki = k === '来' ? '来' : 'き', ku = k === '来' ? '来' : 'く'
  irregular(ku + 'る', T.VK, [
    [ko + 'ない', T.ADJ, 'phủ định (~ない)'], [ko + 'ず', T.END, 'phủ định (~ず)'], [ki + 'ます', T.MASU, 'lịch sự (~ます)'],
    [ki + 'たい', T.ADJ, 'muốn (~たい)'], [ki + 'て', T.TE, 'thể て'], [ki + 'た', T.END, 'quá khứ (~た)'],
    [ki + 'たら', T.END, 'điều kiện (~たら)'], [ki + 'たり', T.END, 'liệt kê (~たり)'], [ku + 'れば', T.END, 'điều kiện (~ば)'],
    [ko + 'よう', T.END, 'ý chí (~よう)'], [ko + 'い', T.END, 'mệnh lệnh'], [ko + 'られる', T.V1, 'bị động / khả năng'],
    [ko + 'れる', T.V1, 'khả năng (rút gọn)'], [ko + 'させる', T.V1, 'sai khiến'], [ki + 'ながら', T.END, 'vừa… vừa (~ながら)'],
    [ki + 'そう', T.END, 'có vẻ (~そう)'], [ki, T.END, 'thể liên dụng (thân ます)'],
  ])
}

// Tính từ -i (cả các đuôi chia như tính từ: 食べない, 食べたい)
add('く', 'い', T.END, T.ADJ, 'trạng từ (~く)')
add('くて', 'い', T.TE, T.ADJ, 'thể て (~くて)')
add('かった', 'い', T.END, T.ADJ, 'quá khứ (~かった)')
add('かったら', 'い', T.END, T.ADJ, 'điều kiện (~かったら)')
add('かったり', 'い', T.END, T.ADJ, 'liệt kê (~かったり)')
add('くない', 'い', T.ADJ, T.ADJ, 'phủ định (~くない)')
add('ければ', 'い', T.END, T.ADJ, 'điều kiện (~ければ)')
add('さ', 'い', T.END, T.ADJ, 'danh từ hóa (~さ)')
add('そう', 'い', T.END, T.ADJ, 'có vẻ (~そう)')
add('すぎる', 'い', T.V1, T.ADJ, 'quá mức (~すぎる)')
add('きゃ', 'い', T.END, T.ADJ, 'nếu không… (~なきゃ)')
add('くちゃ', 'い', T.END, T.ADJ, 'nếu không… (~なくちゃ)')
add('かろう', 'い', T.END, T.ADJ, 'phỏng đoán (~かろう)')

// Dạng ます chia tiếp
add('ません', 'ます', T.END, T.MASU, 'phủ định lịch sự (~ません)')
add('ました', 'ます', T.END, T.MASU, 'quá khứ lịch sự (~ました)')
add('ませんでした', 'ます', T.END, T.MASU, 'quá khứ phủ định lịch sự')
add('ましょう', 'ます', T.END, T.MASU, 'rủ rê (~ましょう)')
add('ましょうか', 'ます', T.END, T.MASU, 'đề nghị (~ましょうか)')
add('まして', 'ます', T.TE, T.MASU, 'thể て lịch sự')
add('ますか', 'ます', T.END, T.MASU, 'câu hỏi lịch sự')

// Sau thể て: いる, しまう, おく...
const afterTe: [string, string, number, string][] = [
  ['いる', 'る', T.V1, 'đang / trạng thái (~ている)'], ['る', 'る', T.V1, 'đang (~てる, nói tắt)'],
  ['ある', 'う', T.V5, 'đã được làm sẵn (~てある)'], ['しまう', 'う', T.V5, 'lỡ / xong hẳn (~てしまう)'],
  ['おく', 'く', T.V5, 'làm sẵn (~ておく)'], ['いく', 'く', T.V5, 'dần dần / đi (~ていく)'],
  ['くる', 'る', T.VK, 'dần dần / đến (~てくる)'], ['みる', 'る', T.V1, 'thử (~てみる)'],
  ['あげる', 'る', T.V1, 'làm cho người khác (~てあげる)'], ['くれる', 'る', T.V1, 'ai đó làm cho mình (~てくれる)'],
  ['もらう', 'う', T.V5, 'nhờ / được làm cho (~てもらう)'], ['ください', '', T.END, 'xin hãy (~てください)'],
  ['も', '', T.END, 'dù (~ても)'], ['は', '', T.END, '~ては'],
]
for (const te of ['て', 'で']) {
  for (const [aux, , outLike, reason] of afterTe) add(te + aux, te, outLike === T.END ? T.END : outLike, T.TE, reason)
}
// Nói tắt: ちゃう = てしまう, とく = ておく
add('ちゃう', 'て', T.V5, T.TE, 'lỡ / xong hẳn (~ちゃう)')
add('じゃう', 'で', T.V5, T.TE, 'lỡ / xong hẳn (~じゃう)')
add('とく', 'て', T.V5, T.TE, 'làm sẵn (~とく)')
add('どく', 'で', T.V5, T.TE, 'làm sẵn (~どく)')

// Luật dài thử trước (ít nhầm hơn)
rules.sort((a, b) => b.from.length - a.from.length)

export interface Candidate {
  word: string
  type: number // loại của dạng này (để kiểm tra với từ loại trong từ điển)
  reasons: string[] // lý do theo thứ tự từ thể từ điển đi ra, ví dụ ['sai khiến', 'quá khứ (~た)']
}

/** Liệt kê mọi thể từ điển có thể có của một chữ. Phần tử đầu là chính chữ đó. */
export function deinflect(text: string): Candidate[] {
  const out: Candidate[] = [{ word: text, type: ALL, reasons: [] }]
  const seen = new Map<string, number>([[text, ALL]])
  for (let i = 0; i < out.length && out.length < 300; i++) {
    const cur = out[i]
    if (cur.reasons.length >= 6) continue
    for (const r of rules) {
      if (!(cur.type & r.inT) || !cur.word.endsWith(r.from)) continue
      const word = cur.word.slice(0, cur.word.length - r.from.length) + r.to
      if (!word || word === cur.word) continue
      const prev = seen.get(word) ?? 0
      if ((prev & r.outT) === r.outT) continue
      seen.set(word, prev | r.outT)
      out.push({ word, type: r.outT, reasons: [r.reason, ...cur.reasons] })
    }
  }
  return out
}

/** Kiểm tra từ loại trong từ điển có khớp với loại của dạng chia ngược không. */
export function posMatches(type: number, pos: string[]): boolean {
  if (type === ALL) return true
  return pos.some((p) =>
    ((type & T.V1) && (p === 'v1' || p === 'v1-s' || p === 'vz')) ||
    ((type & T.V5) && p.startsWith('v5')) ||
    ((type & T.VK) && p === 'vk') ||
    ((type & T.VS) && (p === 'vs-i' || p === 'vs-s' || p === 'vs')) ||
    ((type & T.ADJ) && (p === 'adj-i' || p === 'adj-ix')),
  )
}
