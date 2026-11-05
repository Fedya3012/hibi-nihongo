/**
 * TÌM TỪ TRONG TỪ ĐIỂN cho từ người dùng nhập, để điền cách đọc, gợi ý nghĩa tiếng Anh và lấy mã từ.
 * Chỉ nhận khi khớp đúng chữ viết (và đúng cách đọc nếu người dùng đã ghi), để không gán nhầm từ.
 * Từ trong sách hay ở thể lịch sự (食べます): app thử đưa về thể từ điển (食べる) như ô tra từ.
 */
import { kataToHira, searchWords, type WordData } from '@/modules/dictionary'
import type { WordClass } from '../types'

export interface DictMatch {
  jmId: string
  reading?: string
  en: string
  wordClass?: WordClass
}

/** Loại từ theo mã từ loại JMdict của nghĩa đầu tiên (v5k → động từ, adj-i → tính từ い…). */
export function classOf(d: WordData): WordClass | undefined {
  const p = d.s[0]?.p ?? []
  if (p.some((x) => x.startsWith('v') && x !== 'vs')) return 'verb'
  if (p.includes('adj-i') || p.includes('adj-ix')) return 'i-adj'
  if (p.includes('adj-na')) return 'na-adj'
  if (p.some((x) => x === 'n' || x.startsWith('n-') || x === 'pn' || x === 'vs')) return 'noun'
  if (p.some((x) => x.startsWith('adv'))) return 'adverb'
  if (p.includes('prt')) return 'particle'
  if (p.some((x) => x === 'exp' || x === 'int')) return 'expression'
  return p.length ? 'other' : undefined
}

const norm = (s: string) => kataToHira(s.replace(/[～〜~]/g, '').trim())

/** Cách đọc của từ ứng với chữ viết `form` (bỏ qua cách đọc chỉ dùng cho chữ viết khác). */
function readingFor(d: WordData, form: string): string | undefined {
  if (d.r.some((r) => r.t === form)) return undefined // đã là kana
  return (d.r.find((r) => !r.n && (!r.o || r.o.includes(form))) ?? d.r[0])?.t
}

/**
 * Cách đọc cho từ đã chia (食べます) dựa trên thể từ điển (食べる / たべる):
 * phần Kanji giống nhau → lấy cách đọc của phần đó, rồi ghép phần kana của từ trong sách.
 * Không chắc chắn (động từ bất quy tắc 来る, chữ không khớp) thì trả về undefined.
 */
function inflectedReading(d: WordData, w: string): string | undefined {
  for (const k of d.k ?? []) {
    if (/^[来來]/.test(k.t)) return undefined
    let p = 0
    while (p < k.t.length && p < w.length && k.t[p] === w[p]) p++
    if (!p || !isKanaOnlyLoose(w.slice(p)) || !isKanaOnlyLoose(k.t.slice(p))) continue
    const tail = k.t.slice(p)
    const kr = readingFor(d, k.t)
    if (!kr || !kr.endsWith(tail)) continue
    return kr.slice(0, kr.length - tail.length) + w.slice(p)
  }
  return undefined
}
const isKanaOnlyLoose = (s: string) => /^[\u3040-\u30FFー]*$/.test(s)

const gloss = (d: WordData) => d.s.slice(0, 2).map((s) => s.g.slice(0, 3).join(', ')).join('; ')

export async function matchWord(word: string, reading?: string): Promise<DictMatch | undefined> {
  const w = word.replace(/[～〜~]/g, '').trim()
  if (!w) return undefined
  let results
  try {
    results = await searchWords(w, 15)
  } catch {
    return undefined // chưa tải Từ điển
  }
  const want = reading ? norm(reading) : undefined
  for (const r of results) {
    const d = r.data
    // Khớp chữ viết: đúng nguyên dạng, hoặc dạng đã chia (searchWords đã đưa về thể từ điển, r.length = cả từ)
    const exactForm = d.k?.some((k) => k.t === w) || d.r.some((x) => x.t === w)
    const inflected = r.length === w.length && r.reasons.length > 0
    if (!exactForm && !inflected) continue
    if (want) {
      // Có cách đọc: phải khớp (với từ đã chia, so phần đầu của cách đọc)
      const readings = d.r.map((x) => norm(x.t))
      const ok = exactForm ? readings.includes(want) : readings.some((x) => want.startsWith(x.slice(0, Math.max(1, x.length - 2))))
      if (!ok) continue
    }
    return {
      jmId: r.id,
      reading: exactForm ? readingFor(d, w) : inflectedReading(d, w),
      en: gloss(d),
      wordClass: classOf(d),
    }
  }
  return undefined
}
