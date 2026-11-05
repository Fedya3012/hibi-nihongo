/**
 * TRA TỪ: tìm trong gói từ điển đã cài trên máy (IndexedDB, chạy offline).
 *   searchWords('taberu')      → tìm theo ô tìm kiếm (romaji, kana, kanji, tiếng Anh, dạng đã chia)
 *   lookupAt(câu, vị trí)      → tìm từ dài nhất bắt đầu ở vị trí đó (dùng cho popup tra từ trong câu)
 *   getKanji('食')              → thông tin Kanji
 */
import { findByKey, findByKeyPrefix, getItem, type PackItem } from '@/core/db'
import { KANJI_PACK, VI_PACK, WORD_PACK, type KanjiData, type ViData, type WordData, type WordResult } from '../types'
import { deinflect, posMatches, T } from './deinflect'
import { hasJapanese, hiraToKata, isKanji, kataToHira, romajiToHiragana } from './kana'

type WordItem = PackItem<WordData>

// Bộ nhớ đệm nhỏ: cùng một chữ tra nhiều lần (di chuột qua lại) thì không đọc lại kho
const cache = new Map<string, Promise<WordItem[]>>()
function exact(key: string): Promise<WordItem[]> {
  let p = cache.get(key)
  if (!p) {
    p = findByKey<WordData>(key, { pack: WORD_PACK, limit: 30 })
    cache.set(key, p)
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string)
    p.catch(() => cache.delete(key))
  }
  return p
}
/** Xóa bộ đệm (gọi sau khi cài/cập nhật gói). */
export const clearSearchCache = () => cache.clear()

/** Điểm xếp hạng: từ thông dụng, có JLPT, tần suất cao lên trước. */
function score(d: WordData): number {
  let s = 0
  if (d.c) s += 1000
  if (d.j) s += 300 + d.j * 40
  if (d.q) s += Math.max(0, 400 - Math.log2(d.q) * 25)
  if (d.nf) s += 100 - d.nf
  if (d.k?.[0]?.c || d.r[0]?.c) s += 50
  return s
}
const byScore = (a: { data: WordData }, b: { data: WordData }) => score(b.data) - score(a.data)

/**
 * Chữ khớp có phải "cách viết bình thường" của từ không? Ví dụ tra と: trợ từ と (chỉ viết kana) phải
 * đứng trước 外 (đọc là と nhưng bình thường viết Kanji). Từ có ghi chú "thường viết kana" (uk) cũng tính.
 */
function formScore(matched: string, d: WordData): number {
  if (d.k?.some((k) => k.t === matched)) return 2000
  if (!d.k?.length) return 2000
  if (d.s.some((s) => s.m?.includes('uk'))) return 1500
  return 0
}

/** Đưa các từ có thể từ điển trùng `base` (do bộ tách từ đoán) lên đầu. Ví dụ 行って: 行く trước 行う. */
export function preferBase(results: WordResult[], base: string): WordResult[] {
  const hit = (r: WordResult) => (r.data.k ?? []).some((k) => k.t === base) || r.data.r.some((x) => x.t === base)
  return [...results.filter(hit), ...results.filter((r) => !hit(r))]
}

/** Tra một chữ đúng nguyên dạng hoặc dạng đã chia; trả về các từ khớp. */
async function lookupWord(text: string, length: number): Promise<WordResult[]> {
  const results: WordResult[] = []
  const seen = new Set<string>()
  for (const cand of deinflect(text)) {
    const tries: [string, number][] = [[cand.word, cand.type]]
    // 勉強します → 勉強する → danh từ 勉強 (loại "danh từ + する")
    if (cand.type & T.VS && cand.word.endsWith('する') && cand.word.length > 2) tries.push([cand.word.slice(0, -2), T.VS])
    for (const [word, type] of tries) {
      for (const it of await exact(word)) {
        if (seen.has(it.id)) continue
        const pos = it.data.s.flatMap((s) => s.p ?? [])
        if (cand.reasons.length && !posMatches(type, pos)) continue
        if (word !== cand.word && !pos.includes('vs')) continue
        seen.add(it.id)
        results.push({ id: it.id, data: it.data, matched: word, length, reasons: cand.reasons })
      }
    }
  }
  // Khớp nguyên dạng lên trước, sau đó theo độ thông dụng
  const rank = (r: WordResult) => (r.reasons.length ? 0 : 5000) + formScore(r.matched, r.data) + score(r.data)
  return results.sort((a, b) => rank(b) - rank(a))
}

/**
 * Tìm từ dài nhất bắt đầu tại vị trí `start` trong `text` (kiểu Yomichan).
 * Ví dụ text = '昨日ケーキを食べさせられた', start = 6 → 食べる (độ dài 7: 食べさせられた).
 * Thử từ đoạn dài nhất (maxLength ký tự) rồi ngắn dần, dừng ở dấu câu.
 */
export async function lookupAt(text: string, start: number, maxLength = 16): Promise<WordResult[]> {
  const chars: string[] = []
  for (const ch of text.slice(start)) {
    if (/[\s、。，．！？!?「」『』（）()【】・…‥〜~"'“”]/.test(ch)) break
    chars.push(ch)
  }
  for (let len = Math.min(chars.length, maxLength); len >= 1; len--) {
    const piece = chars.slice(0, len).join('')
    if (!hasJapanese(piece[0])) break
    const found = await lookupWord(piece, len)
    if (found.length) return found.slice(0, 8)
  }
  return []
}

/** Tra cho ô tìm kiếm: chấp nhận Kanji, kana, romaji, tiếng Anh và dạng đã chia. */
export async function searchWords(query: string, limit = 40): Promise<WordResult[]> {
  const q = query.trim().replace(/\s+/g, ' ')
  if (!q) return []
  const out: WordResult[] = []
  const seen = new Set<string>()
  const push = (list: WordResult[]) => {
    for (const r of list) if (!seen.has(r.id)) { seen.add(r.id); out.push(r) }
  }

  const jp = hasJapanese(q) ? q : romajiToHiragana(q)
  if (jp) {
    // 1. Khớp chính xác (kể cả dạng đã chia) với chữ gõ vào, bản hiragana và katakana
    const variants = [...new Set([jp, kataToHira(jp), hiraToKata(jp)])]
    for (const v of variants) push(await lookupWord(v, v.length))
    // 2. Bắt đầu bằng chữ gõ vào (gợi ý khi đang gõ)
    const prefix: WordResult[] = []
    for (const v of variants) {
      for (const it of await findByKeyPrefix<WordData>(v, { pack: WORD_PACK, limit: 60 })) {
        prefix.push({ id: it.id, data: it.data, matched: v, length: v.length, reasons: [] })
      }
    }
    push(prefix.sort((a, b) => {
      const la = Math.min(...[...(a.data.k ?? []), ...a.data.r].map((f) => f.t.length))
      const lb = Math.min(...[...(b.data.k ?? []), ...b.data.r].map((f) => f.t.length))
      return byScore(a, b) + (la - lb) * 150
    }))
  }
  // 3. Tiếng Anh (chỉ có cho từ thông dụng và từ JLPT)
  if (!hasJapanese(q) && /[a-z]/i.test(q)) {
    const en = q.toLowerCase().replace(/^to /, '')
    const exactEn = await findByKey<WordData>('en:' + en, { pack: WORD_PACK, limit: 60 })
    push(exactEn.sort(byScore).map((it) => ({ id: it.id, data: it.data, matched: q, length: q.length, reasons: [] })))
    if (out.length < limit) {
      const pre = await findByKeyPrefix<WordData>('en:' + en, { pack: WORD_PACK, limit: 60 })
      push(pre.sort(byScore).map((it) => ({ id: it.id, data: it.data, matched: q, length: q.length, reasons: [] })))
    }
  }
  // 4. Tiếng Việt (gói jmdict-vi): "ăn" khớp đúng dấu; gõ không dấu "an" thì khớp mọi nghĩa có cùng chữ khi bỏ dấu
  if (!hasJapanese(q) && out.length < limit && /\p{L}/u.test(q)) {
    const v = viKey(q)
    const key = v === unaccent(v) ? 'va:' + v : 'vi:' + v
    const norm = key.startsWith('va:') ? (g: string) => unaccent(viKey(g)) : viKey
    // Nghĩa khớp nằm ở nghĩa thứ mấy của từ: "ăn" là nghĩa 1 của 食べる nhưng là nghĩa 7 của 取る
    const senseRank = (vi: ViData) => {
      const i = (vi.s ?? []).findIndex((gs) => gs.some((g) => norm(g) === v))
      return i < 0 ? 99 : i
    }
    const toResults = async (items: PackItem<ViData>[]) => {
      const words = await Promise.all(items.map((it) => getItem<WordData>(WORD_PACK, it.id)))
      return items
        .flatMap((it, i) => {
          const w = words[i]
          return w ? [{ r: { id: w.id, data: w.data, matched: q, length: q.length, reasons: [] }, rank: senseRank(it.data) }] : []
        })
        .sort((a, b) => Math.min(a.rank, 3) - Math.min(b.rank, 3) || byScore(a.r, b.r))
        .map((x) => x.r)
    }
    push(await toResults(await findByKey<ViData>(key, { pack: VI_PACK, limit: 60 })))
    // Cụm bắt đầu bằng đúng từ đó: "nghe" → "nghe nói" (không lấy "nghệ thuật" khi gõ không dấu)
    if (out.length < 10) push(await toResults(await findByKeyPrefix<ViData>(key + ' ', { pack: VI_PACK, limit: 40 })))
  }
  return out.slice(0, limit)
}

/** Chuẩn hóa nghĩa tiếng Việt thành khóa tra cứu (phải giống tools/build-vi-pack.mjs). */
export function viKey(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[“”"'.,;:!?…]/g, ' ').replace(/\s+/g, ' ').trim()
}
/** Bỏ dấu tiếng Việt: "ăn" → "an", "đẹp" → "dep". */
export function unaccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC')
}

/** Đọc một từ theo id (ví dụ id lưu trong thẻ ôn tập). */
export async function getWord(id: string): Promise<WordData | undefined> {
  return (await getItem<WordData>(WORD_PACK, id))?.data
}

/** Thông tin các chữ Kanji có trong một chuỗi, theo thứ tự xuất hiện. */
export async function getKanjiList(text: string): Promise<{ char: string; data: KanjiData }[]> {
  const chars = [...new Set([...text].filter(isKanji))]
  const items = await Promise.all(chars.map((c) => getItem<KanjiData>(KANJI_PACK, c)))
  return items.flatMap((it, i) => (it ? [{ char: chars[i], data: it.data }] : []))
}

export async function getKanji(char: string): Promise<KanjiData | undefined> {
  return (await getItem<KanjiData>(KANJI_PACK, char))?.data
}
