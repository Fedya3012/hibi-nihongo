/**
 * TIỆN ÍCH CHỮ KANA
 * - Đổi Hiragana ↔ Katakana
 * - Đổi Romaji (gõ chữ Latinh) → Hiragana, để tìm "taberu" ra 食べる
 * - Nhận biết ký tự Kanji / Kana
 */

export const isKanji = (ch: string) => /[㐀-鿿豈-﫿々〆ヵヶ]/.test(ch)
export const isKana = (ch: string) => /[ぁ-ゟ゠-ヿｦ-ﾟ]/.test(ch)
export const hasJapanese = (s: string) => /[぀-ヿ㐀-鿿豈-﫿々]/.test(s)

export const kataToHira = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
export const hiraToKata = (s: string) =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))

/** Bảng romaji → hiragana (kiểu Hepburn và kiểu gõ bàn phím). Chuỗi dài đặt trước. */
const ROMAJI: Record<string, string> = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ', dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',
  shi: 'し', chi: 'ち', tsu: 'つ', tsa: 'つぁ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', ti: 'てぃ', di: 'でぃ',
  dhi: 'でぃ', thi: 'てぃ', tu: 'つ', du: 'づ', dzu: 'づ', xtu: 'っ', ltu: 'っ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ',
  lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',
  wi: 'うぃ', we: 'うぇ', wo: 'を', va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', te: 'て', to: 'と', na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ', ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ', ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', wa: 'わ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご', za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', de: 'で', do: 'ど', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ', pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', '-': 'ー', "n'": 'ん',
}
const ROMAJI_KEYS = Object.keys(ROMAJI).sort((a, b) => b.length - a.length)

/**
 * "taberu" → "たべる", "kitte" → "きって", "konnichiha" → "こんにちは".
 * Trả về null nếu còn chữ không đổi được (khi đó có thể là tiếng Anh).
 */
export function romajiToHiragana(input: string): string | null {
  const s = input.toLowerCase().replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'ou')
  let out = ''
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    // phụ âm đôi → っ (kitte, zasshi), trừ "nn"
    if (ch === s[i + 1] && /[bcdfghjkmpqrstvwxyz]/.test(ch)) { out += 'っ'; i++; continue }
    if (ch === 't' && s[i + 1] === 'c' && s[i + 2] === 'h') { out += 'っ'; i++; continue } // matcha
    // "nn": ん; nếu sau đó là nguyên âm thì chữ n thứ hai thuộc âm tiếp theo (konnichiha → こんにちは)
    if (ch === 'n' && s[i + 1] === 'n') { out += 'ん'; i += /[aiueoy]/.test(s[i + 2] ?? '') ? 1 : 2; continue }
    const key = ROMAJI_KEYS.find((k) => s.startsWith(k, i))
    if (key) { out += ROMAJI[key]; i += key.length; continue }
    // "n" đứng trước phụ âm hoặc cuối chữ → ん
    if (ch === 'n' && (i === s.length - 1 || !/[aiueoy]/.test(s[i + 1]))) { out += 'ん'; i++; continue }
    if (ch === 'm' && /[bmp]/.test(s[i + 1] ?? '')) { out += 'ん'; i++; continue } // shimbun
    if (ch === ' ') { i++; continue }
    return null
  }
  return out
}

/** Tách cách đọc thành các âm tiết (mora): きょう → [きょ, う]. ゃゅょ... đi cùng chữ trước. */
export function splitMora(reading: string): string[] {
  const out: string[] = []
  for (const ch of reading) {
    if (/[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/.test(ch) && out.length) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}

/**
 * Chia chữ thành phần có furigana: (食べる, たべる) → [{text:'食', rt:'た'}, {text:'べる'}].
 * Dò theo phần kana có sẵn trong chữ viết; không khớp được thì đặt cả cách đọc lên cả cụm.
 */
export function furiganaParts(surface: string, reading: string): { text: string; rt?: string }[] {
  if (!reading || ![...surface].some(isKanji)) return [{ text: surface }]
  const hira = kataToHira(reading)
  // Chia surface thành cụm Kanji và cụm kana xen kẽ
  const chunks: { text: string; kanji: boolean }[] = []
  for (const ch of surface) {
    const k = isKanji(ch)
    const last = chunks[chunks.length - 1]
    if (last && last.kanji === k) last.text += ch
    else chunks.push({ text: ch, kanji: k })
  }
  // Dựng biểu thức: cụm kanji = (.+), cụm kana = chính nó
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('^' + chunks.map((c) => (c.kanji ? '(.+?)' : esc(kataToHira(c.text)))).join('') + '$')
  const m = hira.match(re)
  if (!m) return [{ text: surface, rt: hira }]
  let g = 1
  return chunks.map((c) => (c.kanji ? { text: c.text, rt: m[g++] } : { text: c.text }))
}
