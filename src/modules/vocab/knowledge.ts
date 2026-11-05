/**
 * BẢNG TRA "TỪ → ĐÃ BIẾT / ĐANG HỌC / MỚI" DÙNG CHUNG CHO CẢ APP
 *
 * Gộp hai nguồn:
 *   1. Từ bạn tự đánh dấu (bảng knownWords): luôn được ưu tiên.
 *   2. Thẻ Ôn tập (SRS): thẻ đã qua giai đoạn học (trạng thái Review) = đã biết, còn lại = đang học.
 *      Nhờ vậy ôn thẻ xong là màu chữ trong manga/anime tự đổi, không phải đánh dấu lại.
 *
 * Bảng được đọc MỘT lần rồi giữ trong bộ nhớ (một trang có thể có hàng trăm câu cần tô màu),
 * tự đọc lại khi bảng knownWords hoặc thẻ Ôn tập thay đổi (kể cả ở tab khác).
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import { getAll, onDbChange } from '@/core/db'
import { isKanji, kataToHira } from '@/modules/dictionary/lib/kana'
import type { Segment } from '@/modules/dictionary/types'
import { CardState, type SrsCard } from '@/modules/review/types'
import { migrateLegacy } from './store'
import type { KnownWord, ManualStatus, WordInput, WordStatus } from './types'

export interface Knowledge {
  /** Từ tự đánh dấu, theo chữ viết (đã đổi katakana → hiragana nếu từ chỉ có kana). */
  manualWords: Map<string, ManualStatus>
  /** Từ tự đánh dấu, theo mã Từ điển (JMdict). */
  manualIds: Map<string, ManualStatus>
  /** Theo thẻ Ôn tập: chữ viết mặt trước → trạng thái. */
  srsWords: Map<string, WordStatus>
  /** Theo thẻ Ôn tập tạo từ Từ điển: mã JMdict → trạng thái. */
  srsIds: Map<string, WordStatus>
  /** Kanji theo thẻ Ôn tập loại kanji. */
  kanji: Map<string, WordStatus>
}

const onlyKana = (s: string) => /^[぀-ヿー]+$/.test(s)
/** Khóa so khớp: từ chỉ có kana thì đưa về hiragana (ケーキ khớp けーき). */
export const normKey = (s: string) => { const t = s.trim(); return onlyKana(t) ? kataToHira(t) : t }

const better = (a: WordStatus | undefined, b: WordStatus): WordStatus => (a === 'known' || b === 'known' ? 'known' : 'learning')
const effective = (m: ManualStatus): WordStatus => (m === 'learning' ? 'learning' : 'known')

async function build(): Promise<Knowledge> {
  await migrateLegacy().catch(() => {})
  const [cards, manual] = await Promise.all([getAll<SrsCard>('srsCards'), getAll<KnownWord>('knownWords')])
  const k: Knowledge = { manualWords: new Map(), manualIds: new Map(), srsWords: new Map(), srsIds: new Map(), kanji: new Map() }
  for (const c of cards) {
    const st: WordStatus = c.state === CardState.Review && !c.suspended ? 'known' : 'learning'
    if (c.kind === 'kanji') {
      for (const ch of c.front) if (isKanji(ch)) k.kanji.set(ch, better(k.kanji.get(ch), st))
      continue
    }
    if (c.kind !== 'vocab') continue
    const key = normKey(c.front)
    k.srsWords.set(key, better(k.srsWords.get(key), st))
    if (c.source?.module === 'dictionary') k.srsIds.set(c.source.ref, better(k.srsIds.get(c.source.ref), st))
  }
  for (const m of manual) {
    for (const w of [m.w, ...(m.alt ?? [])]) k.manualWords.set(normKey(w), m.status)
    if (m.id) k.manualIds.set(m.id, m.status)
  }
  return k
}

// ---------- Bộ nhớ đệm dùng chung ----------

const useStore = create<{ k?: Knowledge }>(() => ({}))
let loading: Promise<Knowledge> | null = null
let subscribed = false
let timer: ReturnType<typeof setTimeout> | undefined

function subscribe() {
  if (subscribed) return
  subscribed = true
  onDbChange(['knownWords', 'srsCards'], () => {
    loading = null
    // Một buổi ôn tập ghi thẻ liên tục → gom lại, đọc lại sau 150 ms
    clearTimeout(timer)
    timer = setTimeout(() => { void loadKnowledge().catch(() => {}) }, 150)
  })
}

/** Đọc bảng tra (dùng bản trong bộ nhớ nếu có). */
export function loadKnowledge(): Promise<Knowledge> {
  subscribe()
  if (!loading) {
    const p = build()
    loading = p
    p.then((k) => { if (loading === p) useStore.setState({ k }) }, () => { if (loading === p) loading = null })
  }
  return loading
}

/** Bỏ bản trong bộ nhớ (gọi ngay sau khi ghi, để lần đọc kế tiếp thấy dữ liệu mới). */
export function invalidateKnowledge() { loading = null }

/** Hook React: bảng tra, tự cập nhật. undefined trong lúc đọc lần đầu. */
export function useKnowledge(): Knowledge | undefined {
  const k = useStore((s) => s.k)
  useEffect(() => { void loadKnowledge().catch(() => {}) }, [])
  return k
}

// ---------- Tra trạng thái ----------

/** Trạng thái tự đánh dấu (undefined nếu chưa đánh dấu). */
export function manualStatus(k: Knowledge, word: string | WordInput): ManualStatus | undefined {
  const x = typeof word === 'string' ? { w: word } : word
  return (x.id ? k.manualIds.get(x.id) : undefined)
    ?? k.manualWords.get(normKey(x.w))
    ?? x.alt?.map((a) => k.manualWords.get(normKey(a))).find(Boolean)
}

/** Trạng thái theo thẻ Ôn tập (undefined nếu chưa có thẻ). */
export function srsStatus(k: Knowledge, word: string | WordInput): WordStatus | undefined {
  const x = typeof word === 'string' ? { w: word } : word
  return (x.id ? k.srsIds.get(x.id) : undefined)
    ?? k.srsWords.get(normKey(x.w))
    ?? x.alt?.map((a) => k.srsWords.get(normKey(a))).find(Boolean)
}

/** Trạng thái cuối cùng của một từ: tự đánh dấu → thẻ Ôn tập → mới. */
export function wordStatus(k: Knowledge, word: string | WordInput): WordStatus {
  const m = manualStatus(k, word)
  if (m) return effective(m)
  return srsStatus(k, word) ?? 'new'
}

/**
 * Trạng thái của một "từ" do bộ tách từ đưa ra: thử thể từ điển trước, rồi chữ đúng như trong câu,
 * rồi mảnh đầu (勉強しています có gốc 勉強する, nhưng bạn có thể đã đánh dấu 勉強).
 */
export function segmentStatus(k: Knowledge, seg: Pick<Segment, 'base' | 'surface'> & { parts?: Segment['parts'] }): WordStatus {
  const base = seg.base && seg.base !== '*' ? seg.base : seg.surface
  const alt = new Set([seg.surface])
  const head = seg.parts?.[0]?.base
  if (seg.parts && seg.parts.length > 1 && head && head !== '*') alt.add(head)
  alt.delete(base)
  return wordStatus(k, { w: base, alt: alt.size ? [...alt] : undefined })
}

export const kanjiStatus = (k: Knowledge, ch: string): WordStatus => k.kanji.get(ch) ?? 'new'

// ---------- Từ nào cần tính ----------

/** Từ loại không tính là "từ vựng cần học". */
const SKIP_POS = new Set(['助詞', '助動詞', '記号', '補助記号', 'フィラー', '感動詞', 'その他', '接頭詞'])
const SKIP_NOUN = new Set(['数', '固有名詞', '接尾'])
const hasJp = (s: string) => /[぀-ヿ㐀-鿿豈-﫿々]/.test(s)

/**
 * Có phải "từ vựng" không. Bỏ qua trợ từ (は, が...), đuôi câu, dấu câu, số, tên riêng:
 * những thứ này không cần học như từ vựng nên không tô màu và không tính vào tỉ lệ hiểu.
 */
export function isStudyWord(seg: Segment): boolean {
  if (!seg.pos || !hasJp(seg.surface) || SKIP_POS.has(seg.pos)) return false
  if (seg.pos === '名詞' && SKIP_NOUN.has(seg.posDetail)) return false
  // の, ん, こ... (danh từ phụ thuộc chỉ một chữ kana) là ngữ pháp, không phải từ vựng
  if (seg.posDetail === '非自立' && /^[぀-ゟ]$/.test(seg.surface)) return false
  // Chỉ có ー, っ, ッ (tiếng kêu kéo dài)
  if (/^[ーっッ〜]+$/.test(seg.surface)) return false
  return true
}

// ---------- Tỉ lệ hiểu của một đoạn văn ----------

export interface Coverage {
  /** Số lượt từ vựng trong đoạn (không tính trợ từ, dấu câu...). */
  tokens: number
  /** Tỉ lệ (0..1) lượt từ đã biết / đang học / mới. */
  known: number
  learning: number
  new: number
  /** Các từ mới khác nhau (thể từ điển), theo thứ tự gặp. */
  newWords: string[]
}

/** Tính tỉ lệ hiểu từ danh sách "từ" đã tách (kết quả của tokenize). */
export function coverageOf(segments: Segment[], k: Knowledge): Coverage {
  let known = 0, learning = 0, fresh = 0
  const newWords = new Set<string>()
  for (const seg of segments) {
    if (!isStudyWord(seg)) continue
    const st = segmentStatus(k, seg)
    if (st === 'known') known++
    else if (st === 'learning') learning++
    else { fresh++; newWords.add(seg.base && seg.base !== '*' ? seg.base : seg.surface) }
  }
  const t = known + learning + fresh
  const d = t || 1
  return { tokens: t, known: known / d, learning: learning / d, new: fresh / d, newWords: [...newWords] }
}
