/**
 * CHIA XUÔI: từ thể từ điển ra thể cần luyện (書く → 書いて).
 * ---------------------------------------------------------
 * Ngược lại với lib/deinflect.ts của module Từ điển (đưa dạng đã chia về thể từ điển).
 * Script tools/check.mjs chạy chia xuôi rồi chia ngược mọi từ × mọi thể, để chắc hai bên khớp nhau.
 *
 * Cách làm: mỗi thể = "cắt bao nhiêu chữ cuối, nối thêm gì". Cắt/nối giống nhau cho cách viết Kanji
 * và cách đọc (書く/かく đều cắt く), chỉ 来る khác (来ない đọc là こない) nên có `addW` riêng.
 * File này chỉ import kiểu dữ liệu, để Node chạy thẳng được trong script kiểm tra.
 */
import type { ConjResult, ConjWord, FormId } from '../types'

//   đuôi:  cột a  cột i  cột e  cột o  て      た
const ROW: Record<string, [string, string, string, string, string, string]> = {
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

/** Quy tắc thể て/た của nhóm 1 theo đuôi (để giải thích). */
const TE_RULE: Record<string, string> = {
  う: 'う・つ・る → って', つ: 'う・つ・る → って', る: 'う・つ・る → って',
  む: 'む・ぶ・ぬ → んで', ぶ: 'む・ぶ・ぬ → んで', ぬ: 'む・ぶ・ぬ → んで',
  く: 'く → いて', ぐ: 'ぐ → いで', す: 'す → して',
}

interface Step {
  cut: number // số chữ bỏ ở cuối
  add: string // phần nối thêm (kana)
  addW?: string // phần nối thêm cho cách viết Kanji, nếu khác (chỉ 来る)
  alt?: string[] // phần nối thêm khác cũng đúng
  rule: string
}

const isIku = (w: ConjWord) => w.r === 'いく' || w.r.endsWith('ていく') || w.w.endsWith('行く')
/** Động từ nhóm 1 đuôi -iru/-eru, trông như nhóm 2 (帰る, 入る, 走る...) */
export const looksIchidan = (w: ConjWord) => w.c === 'v5' && /[いきしちにひみりぎじびぴえけせてねへめれげぜべぺ]る$/.test(w.r)
/** Từ có đuôi いい chia theo よい (いい → よくない) */
const isIi = (w: ConjWord) => w.c === 'i' && w.r.endsWith('いい')

function godan(w: ConjWord, f: FormId): Step | null {
  const u = w.r.slice(-1)
  const row = ROW[u]
  if (!row) return null
  const [a, i, e, o, te, ta] = row
  const iku = isIku(w)
  const te2 = iku ? 'って' : te
  const ta2 = iku ? 'った' : ta
  const g = (add: string, rule: string, alt?: string[]): Step => ({ cut: 1, add, rule: `Nhóm 1: ${rule}`, alt })
  const colA = u === 'う' ? `${u} → ${a} (đuôi う đổi thành わ, không phải あ)` : `${u} → ${a} (cột a)`
  const teRule = iku ? '行く là ngoại lệ: 行って / 行った (không phải 行いて)' : TE_RULE[u]
  // ある: phủ định là ない (không có あらない)
  if (w.r === 'ある' && (f === 'nai' || f === 'nakatta')) {
    return { cut: 2, add: f === 'nai' ? 'ない' : 'なかった', rule: 'ある là ngoại lệ: phủ định là ない, quá khứ phủ định là なかった' }
  }
  switch (f) {
    case 'masu': return g(i + 'ます', `${u} → ${i} (cột i) + ます`)
    case 'masen': return g(i + 'ません', `${u} → ${i} (cột i) + ません`)
    case 'mashita': return g(i + 'ました', `${u} → ${i} (cột i) + ました`)
    case 'masendeshita': return g(i + 'ませんでした', `${u} → ${i} (cột i) + ませんでした`)
    case 'mashou': return g(i + 'ましょう', `${u} → ${i} (cột i) + ましょう`)
    case 'tai': return g(i + 'たい', `${u} → ${i} (cột i) + たい`)
    case 'nai': return g(a + 'ない', `${colA} + ない`)
    case 'nakatta': return g(a + 'なかった', `${colA} + なかった`)
    case 'te': return g(te2, `thể て: ${teRule}`)
    case 'ta': return g(ta2, iku ? '行く là ngoại lệ: 行った (không phải 行いた)' : `thể た giống thể て, đổi て→た: ${teRule.replace(/て/g, 'た').replace(/で/g, 'だ')}`)
    case 'tara': return g(ta2 + 'ら', 'thể た + ら')
    case 'pot': return g(e + 'る', `${u} → ${e} (cột e) + る (sau đó chia như nhóm 2)`)
    case 'vol': return g(o + 'う', `${u} → ${o} (cột o) + う`)
    case 'ba': return g(e + 'ば', `${u} → ${e} (cột e) + ば`)
    case 'imp': return g(e, `${u} → ${e} (cột e)`)
    case 'pass': return g(a + 'れる', `${colA} + れる`)
    case 'caus': return g(a + 'せる', `${colA} + せる`)
    default: return null
  }
}

function ichidan(f: FormId): Step | null {
  const g = (add: string, extra = '', alt?: string[]): Step => ({ cut: 1, add, rule: `Nhóm 2: bỏ る + ${add}${extra}`, alt })
  switch (f) {
    case 'masu': return g('ます')
    case 'masen': return g('ません')
    case 'mashita': return g('ました')
    case 'masendeshita': return g('ませんでした')
    case 'mashou': return g('ましょう')
    case 'tai': return g('たい')
    case 'nai': return g('ない')
    case 'nakatta': return g('なかった')
    case 'te': return g('て')
    case 'ta': return g('た')
    case 'tara': return g('たら')
    case 'pot': return g('られる', ' (văn nói hay bỏ ら: 〜れる)', ['れる'])
    case 'vol': return g('よう')
    case 'ba': return g('れば')
    case 'imp': return g('ろ')
    case 'pass': return g('られる', ' (giống hệt thể khả năng)')
    case 'caus': return g('させる')
    default: return null
  }
}

const SURU: Partial<Record<FormId, [string, string[]?]>> = {
  masu: ['します'], masen: ['しません'], mashita: ['しました'], masendeshita: ['しませんでした'], mashou: ['しましょう'],
  tai: ['したい'], nai: ['しない'], nakatta: ['しなかった'], te: ['して'], ta: ['した'], tara: ['したら'],
  pot: ['できる'], vol: ['しよう'], ba: ['すれば'], imp: ['しろ', ['せよ']], pass: ['される'], caus: ['させる'],
}

// 来る: [cách đọc thân, phần sau]. Viết Kanji = 来 + phần sau.
const KURU: Partial<Record<FormId, [string, string, string[]?]>> = {
  masu: ['き', 'ます'], masen: ['き', 'ません'], mashita: ['き', 'ました'], masendeshita: ['き', 'ませんでした'], mashou: ['き', 'ましょう'],
  tai: ['き', 'たい'], nai: ['こ', 'ない'], nakatta: ['こ', 'なかった'], te: ['き', 'て'], ta: ['き', 'た'], tara: ['き', 'たら'],
  pot: ['こ', 'られる', ['これる']], vol: ['こ', 'よう'], ba: ['く', 'れば'], imp: ['こ', 'い'], pass: ['こ', 'られる'], caus: ['こ', 'させる'],
}

function iAdj(w: ConjWord, f: FormId): Step | null {
  const ii = isIi(w)
  // いい: bỏ いい, thân là よ; tính từ khác: bỏ い
  const cut = ii ? 2 : 1
  const stem = ii ? 'よ' : ''
  const pre = ii ? 'いい chia từ よい: ' : 'Tính từ -い: bỏ い + '
  const g = (add: string, alt?: string[]): Step => ({ cut, add: stem + add, alt: alt?.map((x) => stem + x), rule: `${pre}${ii ? 'よ' : ''}${add}` })
  switch (f) {
    case 'nai': return g('くない')
    case 'nakatta': return g('くなかった')
    case 'ta': return g('かった')
    case 'te': return g('くて')
    case 'adv': return g('く')
    case 'masen': return g('くないです', ['くありません'])
    case 'mashita': return g('かったです')
    case 'masendeshita': return g('くなかったです', ['くありませんでした'])
    case 'ba': return g('ければ')
    case 'tara': return g('かったら')
    default: return null
  }
}

function naAdj(w: ConjWord, f: FormId): Step | null {
  const tail = w.r.endsWith('い') ? ` (${w.w} đuôi い nhưng là tính từ -な, đừng chia như tính từ -い)` : ''
  const g = (add: string, alt?: string[], note = ''): Step => ({ cut: 0, add, alt, rule: `Tính từ -な: ${w.w} + ${add}${note}${tail}` })
  switch (f) {
    case 'nai': return g('じゃない', ['ではない'], ' (trang trọng: ではない)')
    case 'nakatta': return g('じゃなかった', ['ではなかった'], ' (trang trọng: ではなかった)')
    case 'ta': return g('だった')
    case 'te': return g('で')
    case 'adv': return g('に')
    case 'masen': return g('じゃありません', ['ではありません', 'じゃないです', 'ではないです'], ' (hoặc じゃないです)')
    case 'mashita': return g('でした')
    case 'masendeshita': return g('じゃありませんでした', ['ではありませんでした', 'じゃなかったです', 'ではなかったです'], ' (hoặc じゃなかったです)')
    case 'ba': return g('なら', ['ならば'])
    case 'tara': return g('だったら')
    default: return null
  }
}

function step(w: ConjWord, f: FormId): Step | null {
  switch (w.c) {
    case 'v5': return godan(w, f)
    case 'v1': return ichidan(f)
    case 'i': return iAdj(w, f)
    case 'na': return naAdj(w, f)
    case 'vs': {
      const s = SURU[f]
      if (!s) return null
      const pre = w.r === 'する' ? '' : `${w.w.slice(0, -2)} + `
      return { cut: 2, add: s[0], alt: s[1], rule: `Nhóm 3: ${pre}する → ${s[0]}${s[1] ? ` (hoặc ${s[1].join('、')})` : ''}` }
    }
    case 'vk': {
      const k = KURU[f]
      if (!k) return null
      return {
        cut: 2, add: k[0] + k[1], addW: '来' + k[1], alt: k[2],
        rule: `Nhóm 3: 来る (くる) → 来${k[1]}, đọc là ${k[0]}${k[1]}${k[2] ? ` (văn nói: ${k[2].join('、')})` : ''}`,
      }
    }
  }
}

/** Chia một từ sang một thể. Trả về null nếu thể đó không dùng với loại từ này. */
export function conjugate(w: ConjWord, f: FormId): ConjResult | null {
  if (w.no?.includes(f)) return null
  const s = step(w, f)
  if (!s) return null
  const cutW = (x: string) => x.slice(0, x.length - s.cut)
  const note = looksIchidan(w) ? ` · Chú ý: ${w.w} đuôi -${w.r.slice(-2, -1)}る nhưng là nhóm 1` : ''
  return {
    w: cutW(w.w) + (s.addW ?? s.add),
    r: cutW(w.r) + s.add,
    // Cách khác cũng đúng: cả bản hiragana và bản viết Kanji (来る: 来 + phần sau thân こ/き/く)
    alt: [...new Set((s.alt ?? []).flatMap((a) => [cutW(w.r) + a, cutW(w.w) + (s.addW ? '来' + a.slice(1) : a)]))],
    rule: s.rule + note,
  }
}

/** Chia "sai nhóm" để làm đáp án nhiễu: chia nhóm 1 như nhóm 2 và ngược lại, tính từ -な như -い... */
export function conjugateAs(w: ConjWord, c: ConjWord['c'], f: FormId): string | null {
  if (c === w.c) return null
  // Tính từ -な chia như -い chỉ hợp lý khi từ đuôi い (きれい → きれくない)
  if (c === 'i' && !w.r.endsWith('い')) return null
  if ((c === 'v1' || c === 'v5') && !w.r.endsWith('る')) return null
  const fake: ConjWord = { ...w, c, no: undefined }
  return conjugate(fake, f)?.w ?? null
}

/** Các cách biến âm て/た sai thường gặp của nhóm 1 (書く → 書って, 書んで...). */
export function wrongTe(w: ConjWord, f: 'te' | 'ta' | 'tara'): string[] {
  if (w.c !== 'v5') return []
  const stem = w.w.slice(0, -1)
  const ends = ['って', 'んで', 'いて', 'して', 'いで']
  const right = conjugate(w, f)?.w
  const suf = f === 'te' ? '' : f === 'ta' ? '' : 'ら'
  const toTa = (x: string) => (f === 'te' ? x : x.replace(/て$/, 'た').replace(/で$/, 'だ'))
  return ends.map((e) => stem + toTa(e) + suf).filter((x) => x !== right)
}

/** Đưa chữ người dùng gõ về dạng so sánh được: bỏ khoảng trắng, katakana → hiragana. */
export function normalizeKana(s: string): string {
  return s.trim().replace(/[\s　。、.,!?！？]/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** Câu trả lời có đúng không: chấp nhận cách viết Kanji, hiragana, và các cách khác cũng đúng. */
export function isCorrect(input: string, res: ConjResult): boolean {
  const x = normalizeKana(input)
  if (!x) return false
  return x === res.w || x === res.r || res.alt.includes(x)
}
