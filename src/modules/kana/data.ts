/**
 * DỮ LIỆU BẢNG CHỮ KANA
 * ---------------------
 * Chỉ khai báo Hiragana. Katakana được suy ra tự động: trong Unicode, mỗi chữ Katakana
 * nằm cách chữ Hiragana tương ứng đúng 0x60 (ví dụ あ U+3042 → ア U+30A2).
 *
 * Mỗi chữ có:
 * - romaji: cách viết Latin chính (Hepburn), dùng để hiển thị và chấm
 * - alt: các cách gõ khác cũng được chấp nhận (si cho し, tu cho つ...)
 * - sound: "âm nghe được" nếu khác romaji (を đọc là "o", ぢ đọc như じ). Dùng để
 *   tránh đưa hai chữ đọc giống hệt nhau vào cùng một câu hỏi nghe.
 */

export type Script = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'dakuten' | 'yoon'

export interface Kana {
  /** Chữ (một hoặc hai ký tự, ví dụ きゃ). */
  char: string
  script: Script
  group: KanaGroup
  /** Tên hàng, ví dụ "あ", "か"... (luôn viết bằng Hiragana để hai bảng dùng chung). */
  row: string
  romaji: string
  alt: string[]
  sound: string
}

/** Một ô trong bảng. null = ô trống (ví dụ hàng や chỉ có や ゆ よ). */
type Cell = [string, string, ...string[]] | null

// Bảng cơ bản (gojūon), xếp theo cột a i u e o
const BASIC: { row: string; cells: Cell[] }[] = [
  { row: 'あ', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { row: 'か', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { row: 'さ', cells: [['さ', 'sa'], ['し', 'shi', 'si'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { row: 'た', cells: [['た', 'ta'], ['ち', 'chi', 'ti'], ['つ', 'tsu', 'tu'], ['て', 'te'], ['と', 'to']] },
  { row: 'な', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { row: 'は', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu', 'hu'], ['へ', 'he'], ['ほ', 'ho']] },
  { row: 'ま', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { row: 'や', cells: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']] },
  { row: 'ら', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { row: 'わ', cells: [['わ', 'wa'], null, null, null, ['を', 'wo', 'o']] },
  { row: 'ん', cells: [['ん', 'n', 'nn'], null, null, null, null] },
]

// Âm đục (dakuten ゛) và bán đục (handakuten ゜)
const DAKUTEN: { row: string; cells: Cell[] }[] = [
  { row: 'が', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { row: 'ざ', cells: [['ざ', 'za'], ['じ', 'ji', 'zi'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { row: 'だ', cells: [['だ', 'da'], ['ぢ', 'ji', 'di'], ['づ', 'zu', 'du'], ['で', 'de'], ['ど', 'do']] },
  { row: 'ば', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { row: 'ぱ', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
]

// Âm ghép (yōon): chữ cột i + ゃ ゅ ょ nhỏ. Bảng này có 3 cột: ya yu yo
const YOON_BASES: [string, string, string?][] = [
  // [chữ gốc, phụ âm Latin, phụ âm cách gõ khác]
  ['き', 'k'], ['し', 'sh', 'sy'], ['ち', 'ch', 'ty'], ['に', 'n'], ['ひ', 'h'], ['み', 'm'], ['り', 'r'],
  ['ぎ', 'g'], ['じ', 'j', 'zy'], ['び', 'b'], ['ぴ', 'p'],
]

/** Âm nghe được, nếu khác romaji chính. */
const SOUND: Record<string, string> = { 'を': 'o', 'ぢ': 'ji', 'づ': 'zu' }

const toKatakana = (s: string) =>
  [...s].map((c) => (c >= 'ぁ' && c <= 'ゖ' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c)).join('')

function build(script: Script): { kana: Kana[]; tables: Record<KanaGroup, { row: string; cells: (Kana | null)[] }[]> } {
  const conv = script === 'hiragana' ? (s: string) => s : toKatakana
  const kana: Kana[] = []
  const make = (group: KanaGroup, row: string, cell: Cell): Kana | null => {
    if (!cell) return null
    const [c, romaji, ...alt] = cell
    const k: Kana = { char: conv(c), script, group, row, romaji, alt, sound: SOUND[c] ?? romaji }
    kana.push(k)
    return k
  }
  const toRows = (group: KanaGroup, src: { row: string; cells: Cell[] }[]) =>
    src.map(({ row, cells }) => ({ row, cells: cells.map((cell) => make(group, row, cell)) }))

  const yoonSrc = YOON_BASES.map(([base, cons, alt]) => ({
    row: base,
    cells: (['ゃ', 'ゅ', 'ょ'] as const).map((small, i): Cell => {
      const vowel = ['a', 'u', 'o'][i]
      // "j" và "ch", "sh" không cần thêm y: ja, cha, sha. Còn lại: kya, nya...
      const y = cons.length > 1 || cons === 'j' ? '' : 'y'
      return [base + small, cons + y + vowel, ...(alt ? [alt + vowel] : [])]
    }),
  }))

  return {
    kana,
    tables: { basic: toRows('basic', BASIC), dakuten: toRows('dakuten', DAKUTEN), yoon: toRows('yoon', yoonSrc) },
  }
}

const HIRA = build('hiragana')
const KATA = build('katakana')

export const TABLES = { hiragana: HIRA.tables, katakana: KATA.tables }
export const ALL_KANA: Kana[] = [...HIRA.kana, ...KATA.kana]
export const KANA_BY_CHAR = new Map(ALL_KANA.map((k) => [k.char, k]))

export const SCRIPT_LABEL: Record<Script, string> = { hiragana: 'Hiragana', katakana: 'Katakana' }
export const GROUP_LABEL: Record<KanaGroup, string> = {
  basic: 'Cơ bản',
  dakuten: 'Âm đục',
  yoon: 'Âm ghép',
}
export const COLUMN_LABEL: Record<KanaGroup, string[]> = {
  basic: ['a', 'i', 'u', 'e', 'o'],
  dakuten: ['a', 'i', 'u', 'e', 'o'],
  yoon: ['ya', 'yu', 'yo'],
}

/** Chuẩn hóa câu trả lời gõ: bỏ khoảng trắng, chữ thường. */
export const normalizeRomaji = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')

/** Câu trả lời romaji có đúng với chữ này không. */
export const romajiMatches = (k: Kana, answer: string) => {
  const a = normalizeRomaji(answer)
  return a === k.romaji || k.alt.includes(a)
}

/**
 * Các cặp chữ hay nhầm. Khi làm trắc nghiệm, ưu tiên đưa chữ "anh em" vào đáp án nhiễu
 * để luyện mắt phân biệt (ví dụ シ/ツ, ソ/ン, さ/ち).
 */
const CONFUSABLE_GROUPS = [
  'さちき', 'ぬめ', 'ねれわ', 'はほ', 'るろ', 'いり', 'こに', 'あお', 'たな', 'うら', 'ぬね', 'まも', 'くへ',
  'シツ', 'ソン', 'ノメ', 'クタ', 'ワウフ', 'コユ', 'チテ', 'ヌス', 'ナメ', 'セヤ', 'マム', 'ラヲ', 'エユ', 'カヤ',
]
const CONFUSABLE = new Map<string, Set<string>>()
for (const g of CONFUSABLE_GROUPS) {
  for (const c of g) {
    const set = CONFUSABLE.get(c) ?? new Set()
    for (const o of g) if (o !== c) set.add(o)
    CONFUSABLE.set(c, set)
  }
}

/** Chữ hay bị nhầm với `char` (dùng làm đáp án nhiễu). */
export const confusablesOf = (char: string) => [...(CONFUSABLE.get(char) ?? [])]
