/**
 * TRA TỪ ĐIỂN CHO MODULE ANIME (dùng API của module Từ điển, có bộ nhớ đệm).
 * Cũng đoán "loại" của từ từ ghi chú JMdict: lóng (sl), khẩu ngữ (col), tượng thanh (on-mim)...
 */
import { searchWords, type WordResult } from '@/modules/dictionary'
import type { ClipCategory } from './types'

/** Chọn kết quả từ điển khớp đúng thể từ điển (行く chứ không phải 行う). */
export function pickResult(results: WordResult[], w: string): WordResult | undefined {
  return results.find((r) => (r.data.k ?? []).some((x) => x.t === w) || r.data.r.some((x) => x.t === w)) ?? results[0]
}

const cache = new Map<string, Promise<WordResult | undefined>>()

/** Tra một từ ở thể từ điển. Kết quả được nhớ lại trong phiên làm việc. */
export function lookupWord(w: string): Promise<WordResult | undefined> {
  let p = cache.get(w)
  if (!p) {
    p = searchWords(w, 5).then((r) => pickResult(r, w), () => undefined)
    cache.set(w, p)
    if (cache.size > 3000) cache.delete(cache.keys().next().value as string)
  }
  return p
}

/** Nghĩa ngắn gọn: 2 nghĩa đầu, mỗi nghĩa tối đa 3 cách dịch. */
export const glossOf = (r: WordResult) => r.data.s.slice(0, 2).map((s) => s.g.slice(0, 3).join(', ')).join('; ')

/** Ghi chú của các nghĩa chính (mặc định chỉ nghĩa đầu tiên: nghĩa phổ biến nhất, tránh nhãn của nghĩa hiếm). */
const tagsOf = (r: WordResult, senses = 1) => new Set(r.data.s.slice(0, senses).flatMap((s) => [...(s.m ?? []), ...(s.p ?? [])]))

/** Đoán loại từ theo ghi chú của JMdict. pos = từ loại Kuromoji (感動詞 = cảm thán). */
export function guessWordCategory(r: WordResult | undefined, pos?: string): ClipCategory {
  if (pos === '感動詞') return 'interjection'
  if (!r) return 'normal'
  // Trợ từ / trợ động từ (に, を, です...) không bao giờ tính là cách nói đặc biệt
  if (pos === '助詞' || pos === '助動詞') return 'normal'
  const t = tagsOf(r)
  if (t.has('on-mim')) return 'onomatopoeia'
  if (t.has('int')) return 'interjection'
  if (t.has('sl') || t.has('net-sl') || t.has('m-sl') || t.has('vulg') || t.has('derog')) return 'slang'
  if (t.has('male') || t.has('fem') || t.has('male-sl') || t.has('fem-sl')) return 'character'
  if (t.has('col') || t.has('fam') || t.has('chn')) return 'casual'
  return 'normal'
}

/** Nhãn ngắn cho ghi chú JMdict hay gặp trong anime. */
export const STYLE_NOTES: Record<string, string> = {
  sl: 'tiếng lóng', 'net-sl': 'lóng trên mạng', col: 'khẩu ngữ', fam: 'thân mật', vulg: 'thô tục', derog: 'miệt thị',
  male: 'nam hay dùng', fem: 'nữ hay dùng', 'male-sl': 'lóng của nam', arch: 'cổ', dated: 'cũ', hon: 'tôn kính',
  hum: 'khiêm nhường', pol: 'lịch sự', chn: 'trẻ con', 'on-mim': 'tượng thanh / tượng hình', joc: 'đùa', poet: 'văn thơ',
}

export function styleNotes(r: WordResult): string[] {
  const t = tagsOf(r, 2)
  return Object.keys(STYLE_NOTES).filter((k) => t.has(k)).map((k) => STYLE_NOTES[k])
}
