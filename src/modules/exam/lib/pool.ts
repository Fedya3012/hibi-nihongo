/**
 * NGUỒN NỘI DUNG CHO ĐỀ THI — đọc từ dữ liệu sẵn có của các module khác, không soạn riêng:
 *   - Từ vựng theo cấp: từ ví dụ trong gói `kanji-study` (module Kanji) có gắn cấp JLPT
 *   - Nghĩa tiếng Việt, từ loại: gói từ điển (module Từ điển)
 *   - Câu ví dụ chứa từ: gói Tatoeba (module Từ điển, không bắt buộc)
 *   - Âm On của Kanji để tạo đáp án nhiễu đồng âm: gói `kanjidic`
 *   - Mẫu ngữ pháp + câu ví dụ có bản dịch: module Ngữ pháp
 */
import { getExamples, getKanji, getWord, kataToHira, shortMeaning, type Example } from '@/modules/dictionary'
import { getStudy, getStudyIndex } from '@/modules/kanji/lib/data'
import { listGrammarPoints, grammarPlainText, type GrammarPoint } from '@/modules/grammar/api'
import type { Level } from '../types'
import { shuffle } from './random'

export interface PoolWord {
  id: string
  word: string
  reading: string
  /** Nghĩa ngắn (tiếng Việt nếu có, không thì tiếng Anh). */
  meaning: string
  /** Nhóm từ loại thô: 'v' động từ, 'adj-i', 'adj-na', 'adv', 'n' danh từ… để chọn đáp án nhiễu cùng loại. */
  pos: string
  /** Câu ví dụ Tatoeba có chứa từ (nếu đã cài gói câu ví dụ). */
  examples: Example[]
}

/** Câu dùng cho đọc hiểu / nghe. vi = bản dịch tiếng Việt; en = bản dịch tiếng Anh (dự phòng khi chưa có tiếng Việt). */
export interface PoolSentence { jp: string; vi?: string; en?: string; grammarId?: string }

export interface Pool {
  level: Level
  words: PoolWord[]
  /** Chữ Kanji → các chữ đồng âm On (chỉ trong phạm vi cấp đang thi và các cấp dễ hơn). */
  homophones: Map<string, string[]>
  grammar: GrammarPoint[]
  allGrammar: GrammarPoint[]
  sentences: PoolSentence[]
}

/** Số chữ Kanji tối đa lấy từ vựng (đủ cho cả đề N2/N1, không phải đọc hết hàng nghìn chữ). */
const MAX_CHARS = 180
const MAX_HOMOPHONE_CHARS = 600

function posGroup(p?: string[]): string {
  const t = p?.[0] ?? ''
  if (t.startsWith('v')) return 'v'
  if (t === 'adj-i' || t === 'adj-ix') return 'adj-i'
  if (t === 'adj-na') return 'adj-na'
  if (t.startsWith('adv')) return 'adv'
  return t || 'n'
}

/** Đọc toàn bộ nội dung cần cho một đề cấp `level`. Cần gói kanji-study và jmdict-en đã cài. */
export async function loadPool(level: Level, onStep?: (pct: number) => void): Promise<Pool> {
  const index = await getStudyIndex()
  if (!index) throw new Error('kanji-pack')
  const chars = shuffle([...(index.jlpt[String(level)] ?? '')]).slice(0, MAX_CHARS)

  // 1. Từ vựng đúng cấp: từ ví dụ của các chữ Kanji cấp đó, có gắn cấp JLPT bằng cấp đang thi
  const rows = new Map<string, [string, string, string]>()
  const studies = await Promise.all(chars.map((c) => getStudy(c).catch(() => undefined)))
  for (const st of studies) {
    for (const [id, word, reading, , j] of st?.w ?? []) {
      if (j === level && word !== reading && !rows.has(id)) rows.set(id, [id, word, reading])
    }
  }
  onStep?.(30)

  const list = shuffle([...rows.values()]).slice(0, 260)
  const words: PoolWord[] = []
  let done = 0
  await Promise.all(list.map(async ([id, word, reading]) => {
    const d = await getWord(id).catch(() => undefined)
    if (!d) return
    const [meaning, ex] = await Promise.all([
      shortMeaning(id, d, 2, 2).catch(() => d.s[0]?.g.slice(0, 2).join(', ') ?? ''),
      getExamples(id, 4).catch(() => [] as Example[]),
    ])
    words.push({ id, word, reading, meaning, pos: posGroup(d.s[0]?.p), examples: ex })
    done++
    if (done % 20 === 0) onStep?.(30 + Math.round((done / list.length) * 50))
  }))
  onStep?.(80)

  // 2. Chữ đồng âm: âm On của các Kanji cấp này và các cấp dễ hơn
  const easier = [5, 4, 3, 2, 1].filter((l) => l >= level).flatMap((l) => [...(index.jlpt[String(l)] ?? '')])
  const homoChars = [...new Set([...words.flatMap((w) => [...w.word]), ...shuffle(easier).slice(0, MAX_HOMOPHONE_CHARS)])]
  const byOn = new Map<string, string[]>()
  const onOf = new Map<string, string[]>()
  const kd = await Promise.all(homoChars.map((c) => getKanji(c).catch(() => undefined)))
  homoChars.forEach((c, i) => {
    const ons = (kd[i]?.on ?? []).map(kataToHira)
    if (!ons.length) return
    onOf.set(c, ons)
    for (const o of ons) { const a = byOn.get(o) ?? []; a.push(c); byOn.set(o, a) }
  })
  const homophones = new Map<string, string[]>()
  for (const [c, ons] of onOf) homophones.set(c, [...new Set(ons.flatMap((o) => byOn.get(o) ?? []))].filter((x) => x !== c))
  onStep?.(90)

  // 3. Ngữ pháp và câu có bản dịch (cho đọc hiểu, nghe)
  const allGrammar = await listGrammarPoints().catch(() => [] as GrammarPoint[])
  const grammar = allGrammar.filter((p) => p.level === level)
  const sentences: PoolSentence[] = grammar.flatMap((p) => p.examples.map((e) => ({ jp: grammarPlainText(e[0]), vi: e[1], grammarId: p.id })))
  // Câu Tatoeba của các từ trong đề (có bản dịch tiếng Việt thì dùng cho đọc hiểu)
  const seen = new Set(sentences.map((s) => s.jp))
  for (const w of words) {
    for (const ex of w.examples) {
      if (seen.has(ex.data.t) || ex.data.t.length > 60) continue
      seen.add(ex.data.t)
      sentences.push({ jp: ex.data.t, vi: ex.data.v, en: ex.data.e })
    }
  }
  onStep?.(100)
  return { level, words, homophones, grammar, allGrammar, sentences }
}
