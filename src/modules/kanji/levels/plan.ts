/**
 * KANJI THEO CẤP (kiểu WaniKani): chia toàn bộ Kanji thành nhiều "cấp" nhỏ.
 * Mỗi cấp có 3 loại mục, học theo thứ tự:
 *   1. Bộ thủ / thành phần (亻, 木, ⻌...) mà các chữ của cấp này cần
 *   2. Kanji của cấp (≈ 20 chữ)
 *   3. Từ vựng chỉ dùng các chữ đã có tới cấp này
 *
 * Cách chia cấp:
 *   - Đi theo JLPT: N5 → N4 → N3 → N2 → N1 → Jōyō còn lại. Một cấp không trộn hai cấp JLPT.
 *   - Mỗi nhóm JLPT được chia đều thành các cấp khoảng 20 chữ, giữ thứ tự sẵn có của gói dữ liệu.
 *   - Thành phần của chữ lấy từ KanjiVG (trường `c` trong gói kanji-study).
 *     + Thành phần là một trong 214 bộ thủ (hoặc dạng biến thể như 亻, 氵, ⻌) → mục "bộ thủ".
 *     + Thành phần là một Kanji đã học ở cấp trước (hoặc cùng cấp) → chữ đó là điều kiện, không tạo bộ thủ mới.
 *     + Thành phần là chữ Hán khác (vd 吾 trong 語) → cũng thành mục "bộ thủ", tên lấy từ KANJIDIC.
 *     + Nét lẻ không có tên (𠂊, 乂...) thì bỏ qua.
 *   - Chữ chỉ có một khối mà bản thân là bộ thủ (日, 木, 口...) → học bộ thủ đó trước, như WaniKani.
 *   - Từ vựng: lấy tối đa 3 từ ví dụ mỗi chữ (không khó hơn cấp JLPT của chữ quá 1 bậc),
 *     xếp vào cấp có chữ "muộn" nhất của từ. Từ có chữ ngoài danh sách thì bỏ.
 *
 * File này chỉ có phép tính (không đọc kho dữ liệu). Phần đọc dữ liệu + trạng thái học: progress.ts.
 */
import { radicalNumberOf } from '../data/radicals'
import type { ExampleWord, StudyData } from '../lib/data'

/** Chữ Hán (giống isKanji của module Từ điển; viết lại ở đây để file này không phụ thuộc gì, dễ kiểm tra). */
const isKanji = (ch: string) => /[㐀-鿿豈-﫿𠀀-𪛟]/u.test(ch)

/** Số chữ mong muốn mỗi cấp. */
export const LEVEL_SIZE = 20
/** Số từ vựng tối đa lấy cho mỗi chữ. */
const WORDS_PER_KANJI = 3

export interface RadicalItem {
  /** Chữ của thành phần, như nó xuất hiện trong chữ khác (亻 khác 人). */
  char: string
  /** Số bộ thủ Khang Hy (1–214) nếu là bộ thủ. Không có = chữ Hán dùng làm thành phần. */
  n?: number
}

export interface KanjiItem {
  char: string
  /** Bộ thủ / thành phần phải thuộc trước (theo char của RadicalItem). */
  radicals: string[]
  /** Kanji ở cấp trước hoặc cùng cấp dùng làm thành phần, phải thuộc trước. */
  kanji: string[]
}

export interface VocabItem {
  id: string // mã JMdict
  word: string
  reading: string
  gloss: string // nghĩa tiếng Anh ngắn (gói kanji-study), chỉ để hiện khi chưa có từ điển
  /** Các Kanji trong từ, phải thuộc hết thì từ mới mở. */
  kanji: string[]
}

export interface KanjiLevel {
  n: number // 1, 2, 3...
  jlpt?: number // 5..1, không có = Jōyō ngoài JLPT
  radicals: RadicalItem[]
  kanji: KanjiItem[]
  vocab: VocabItem[]
}

export interface LevelPlan {
  levels: KanjiLevel[]
  /** Chữ → số cấp. */
  levelOf: Map<string, number>
}

// ---------------------------------------------------------------------------
// Bộ thủ: chữ (kể cả dạng biến thể) → số bộ
// ---------------------------------------------------------------------------

/** Một vài dạng viết khác của bộ thủ mà KanjiVG dùng nhưng bảng 214 bộ không ghi. */
const EXTRA_VARIANTS: Record<string, number> = { '⻖': 170, '⻏': 163, '⺌': 42, '⺍': 42, '⺮': 118, '⺼': 130 }

export const radicalNumber = (ch: string): number | undefined => radicalNumberOf(ch) ?? EXTRA_VARIANTS[ch]

// ---------------------------------------------------------------------------
// Tính kế hoạch
// ---------------------------------------------------------------------------

/** Chia `n` chữ thành các nhóm gần bằng nhau, mỗi nhóm khoảng LEVEL_SIZE chữ. */
function splitEven<T>(list: T[], size: number): T[][] {
  const groups = Math.max(1, Math.round(list.length / size))
  const out: T[][] = []
  for (let g = 0; g < groups; g++) {
    out.push(list.slice(Math.round((g * list.length) / groups), Math.round(((g + 1) * list.length) / groups)))
  }
  return out.filter((x) => x.length)
}

/** Tính kế hoạch từ danh sách JLPT + dữ liệu thành phần của từng chữ. Hàm thuần, không đọc kho dữ liệu. */
export function buildPlan(groups: { jlpt?: number; chars: string[] }[], study: Map<string, StudyData>): LevelPlan {
  const levels: KanjiLevel[] = []
  const levelOf = new Map<string, number>()
  const jlptOf = new Map<string, number | undefined>()

  // Bước 1: chia cấp cho Kanji
  for (const { jlpt, chars } of groups) {
    for (const part of splitEven(chars.filter((c) => !levelOf.has(c)), LEVEL_SIZE)) {
      const n = levels.length + 1
      for (const c of part) { levelOf.set(c, n); jlptOf.set(c, jlpt) }
      levels.push({ n, jlpt, radicals: [], kanji: part.map((char) => ({ char, radicals: [], kanji: [] })), vocab: [] })
    }
  }

  // Bước 2: thành phần của từng chữ → bộ thủ mới hoặc chữ đã học
  const radicalSeen = new Set<string>()
  for (const lv of levels) {
    for (const k of lv.kanji) {
      const comps = study.get(k.char)?.c ?? []
      const elems = [...new Set(comps.map((x) => x.e))].filter((e) => e !== k.char)
      // Chữ một khối (日, 木): nếu chính nó là bộ thủ thì học bộ thủ trước
      if (!comps.length && radicalNumber(k.char)) elems.push(k.char)
      for (const e of elems) {
        const kLevel = levelOf.get(e)
        if (e !== k.char && kLevel != null && kLevel <= lv.n && !radicalNumber(e)) {
          k.kanji.push(e)
          continue
        }
        const n = radicalNumber(e)
        if (!n && !isKanji(e)) continue // nét lẻ không tên
        k.radicals.push(e)
        if (!radicalSeen.has(e)) {
          radicalSeen.add(e)
          lv.radicals.push({ char: e, n })
        }
      }
    }
  }

  // Bước 3: từ vựng
  const wordSeen = new Set<string>()
  for (const lv of levels) {
    for (const k of lv.kanji) {
      const kj = jlptOf.get(k.char)
      let taken = 0
      for (const w of (study.get(k.char)?.w ?? []) as ExampleWord[]) {
        if (taken >= WORDS_PER_KANJI) break
        const [id, word, reading, gloss, wj] = w
        // Từ khó hơn chữ quá 1 bậc JLPT (vd 購読 N1 cho chữ 読 N5) thì bỏ
        if (kj != null && (wj == null || wj < kj - 1)) continue
        const chars = [...new Set([...word].filter(isKanji))].filter((c) => c !== '々')
        if (!chars.every((c) => levelOf.has(c))) continue
        taken++
        if (wordSeen.has(id)) continue
        wordSeen.add(id)
        const at = Math.max(...chars.map((c) => levelOf.get(c)!))
        levels[at - 1].vocab.push({ id, word, reading, gloss: gloss.split(',').slice(0, 2).join(','), kanji: chars })
      }
    }
  }

  return { levels, levelOf }
}
