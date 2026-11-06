/**
 * CHẤM BÀI CHÉP CHÍNH TẢ
 *
 * Người nghe không biết câu gốc viết Kanji hay kana, nên app so sánh theo **cách đọc** (hiragana):
 *   câu gốc 私は学生です → わたしはがくせいです
 *   bạn gõ  わたしわがくせいです   → đúng (は đọc là "wa")
 *   bạn gõ  私は学生です           → cũng đúng (app đổi Kanji của bạn ra cách đọc bằng bộ tách từ)
 * Romaji (watashi wa...) cũng được chấp nhận.
 */
import { kataToHira, romajiToHiragana, tokenizeRaw } from '@/modules/dictionary'

const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/
/** Dấu câu, khoảng trắng, ký hiệu: bỏ khi so sánh. */
const PUNCT = /[\s、。，．,.!?！？「」『』（）()［］【】…‥・〜~♪☆★※:：;；"'“”‘’\-－―─]/g

/** Bỏ chú thích trong ngoặc của phụ đề, ví dụ （フリーレン）, (笑), và dấu câu. */
export const cleanSubtitle = (s: string) => s.replace(/[（(][^）)]*[）)]/g, '').replace(/\n/g, ' ').trim()

const strip = (s: string) => s.replace(PUNCT, '')

/** Cách đọc của câu (hiragana). Có Kanji thì nhờ bộ tách từ của Từ điển; lỗi thì giữ nguyên. */
export async function readingOf(text: string): Promise<string> {
  const s = strip(text)
  if (!s) return ''
  const ascii = /^[\x20-\x7e]+$/.test(s)
  if (ascii) return romajiToHiragana(s.toLowerCase()) ?? s
  if (!KANJI.test(s)) return kataToHira(s)
  try {
    // Bộ tách từ tải lâu hoặc lỗi mạng: sau 30 giây thì chấm theo chữ gõ vào
    const toks = await Promise.race([tokenizeRaw(s), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))])
    return kataToHira(toks.map((t) => (t.reading && t.reading !== '*' ? t.reading : t.surface_form)).join(''))
  } catch {
    return kataToHira(s)
  }
}

/** Cách đọc lấy từ furigana viết sẵn kiểu 学生[がくせい] (câu ví dụ của Ngữ pháp): không cần bộ tách từ. */
export function readingFromFurigana(src: string): string {
  let out = ''
  let buf = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '[') {
      const end = src.indexOf(']', i)
      let j = buf.length
      while (j > 0 && KANJI.test(buf[j - 1])) j--
      out += buf.slice(0, j) + src.slice(i + 1, end)
      buf = ''
      i = end
      continue
    }
    buf += c
  }
  return kataToHira(strip((out + buf).replace(/\{\{|\}\}/g, '')))
}

// Các cặp âm nghe giống nhau: chấp nhận cả hai cách viết
const SAME: Record<string, string> = { は: 'わ', へ: 'え', を: 'お', づ: 'ず', ぢ: 'じ' }
const VOWEL: Record<string, string> = {}
for (const [v, row] of Object.entries({
  あ: 'あかさたなはまやらわがざだばぱゃ', い: 'いきしちにひみりぎじぢびぴ', う: 'うくすつぬふむゆるぐずづぶぷゅ',
  え: 'えけせてねへめれげぜでべぺ', お: 'おこそとのほもよろをごぞどぼぽょ',
})) for (const ch of row) VOWEL[ch] = v

const norm = (c: string) => SAME[c] ?? c

/** Hai ký tự (đứng sau ký tự `prev`) có được coi là cùng âm không. ー = kéo dài nguyên âm trước. */
function same(a: string, b: string, prevA: string, prevB: string): boolean {
  if (norm(a) === norm(b)) return true
  // Trường âm: こーひー = こうひい, おとーさん = おとうさん, せんせー = せんせい
  if (a === 'ー') return [VOWEL[prevA], VOWEL[prevA] === 'お' ? 'う' : '', VOWEL[prevA] === 'え' ? 'い' : ''].includes(b)
  if (b === 'ー') return [VOWEL[prevB], VOWEL[prevB] === 'お' ? 'う' : '', VOWEL[prevB] === 'え' ? 'い' : ''].includes(a)
  return false
}

/** Một mảnh kết quả: ok = đúng, miss = bạn thiếu/sai chỗ này, extra = bạn gõ thừa. */
export interface DiffPart { text: string; kind: 'ok' | 'miss' | 'extra' }

export interface Score {
  parts: DiffPart[]
  /** 0–100: số âm đúng so với độ dài câu (gõ thừa cũng bị trừ). */
  percent: number
  perfect: boolean
}

/** So sánh cách đọc câu gốc với câu bạn gõ (thuật toán chuỗi con chung dài nhất). */
export function compareReadings(target: string, mine: string): Score {
  const a = [...target], b = [...mine]
  const n = a.length, m = b.length
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    L[i][j] = same(a[i], b[j], a[i - 1] ?? '', b[j - 1] ?? '') ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  }
  const parts: DiffPart[] = []
  const push = (text: string, kind: DiffPart['kind']) => {
    const last = parts[parts.length - 1]
    if (last?.kind === kind) last.text += text
    else parts.push({ text, kind })
  }
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && same(a[i], b[j], a[i - 1] ?? '', b[j - 1] ?? '')) { push(a[i], 'ok'); i++; j++ }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { push(b[j], 'extra'); j++ }
    else { push(a[i], 'miss'); i++ }
  }
  const lcs = L[0][0]
  const percent = n ? Math.round((100 * lcs) / Math.max(n, m)) : 0
  return { parts, percent, perfect: n > 0 && lcs === n && m === n }
}
