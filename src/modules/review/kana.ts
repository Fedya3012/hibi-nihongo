/**
 * CHUYỂN ROMAJI → HIRAGANA và SO SÁNH CÁCH ĐỌC
 * Dùng cho câu hỏi "Gõ cách đọc": máy chưa cài bộ gõ tiếng Nhật vẫn gõ được "taberu" → たべる.
 */

const TABLE: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ', sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ', ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と', cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど', dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の', nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も', mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  la: 'ら', li: 'り', lu: 'る', le: 'れ', lo: 'ろ',
  wa: 'わ', wo: 'を', we: 'うぇ', wi: 'うぃ', nn: 'ん', "n'": 'ん',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtu: 'っ', xtsu: 'っ',
  '-': 'ー',
}

const VOWELS = 'aiueo'

/**
 * Đổi romaji sang hiragana. Chữ đã là kana thì giữ nguyên.
 * Quy tắc: phụ âm đôi (kk, tt...) → っ; "n" đứng trước phụ âm hoặc ở cuối → ん.
 */
export function romajiToHiragana(input: string): string {
  const s = input.toLowerCase()
  let out = ''
  let i = 0
  while (i < s.length) {
    const c = s[i]
    // phụ âm đôi → っ (trừ nn)
    if (c === s[i + 1] && /[bcdfghjklmpqrstvwxyz]/.test(c) && c !== 'n') {
      out += 'っ'
      i++
      continue
    }
    let matched = false
    for (const len of [4, 3, 2, 1]) {
      const chunk = s.slice(i, i + len)
      if (TABLE[chunk]) {
        out += TABLE[chunk]
        i += len
        matched = true
        break
      }
    }
    if (matched) continue
    // "n" trước phụ âm (không phải y) hoặc ở cuối chuỗi → ん
    if (c === 'n' && (i + 1 >= s.length || (!VOWELS.includes(s[i + 1]) && s[i + 1] !== 'y'))) {
      out += 'ん'
      i++
      continue
    }
    out += c // chữ không đổi được (đang gõ dở, hoặc đã là kana/kanji)
    i++
  }
  return out
}

/** Katakana → hiragana, để "タベル" và "たべる" được coi là giống nhau. */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

/** Chuẩn hóa để so đáp án: bỏ khoảng trắng, dấu chấm, chuyển hết về hiragana. */
export function normalizeReading(s: string): string {
  return toHiragana(romajiToHiragana(s.trim()))
    .replace(/[\s.・。、,，\-]/g, '')
}

/**
 * Kiểm tra câu trả lời gõ vào. `answer` có thể chứa nhiều cách đọc cách nhau bởi "、" hoặc ";" hoặc ",",
 * gõ đúng một cách là được.
 */
export function readingMatches(typed: string, answer: string): boolean {
  // "konnichiha": có bộ gõ hiểu "nn" là ん, có bộ gõ hiểu là ん + n…; chấp nhận cả hai cách
  const tries = new Set([normalizeReading(typed), normalizeReading(typed.replace(/nn(?=[aiueoy])/gi, "n'n"))])
  tries.delete('')
  if (!tries.size) return false
  return answer
    .split(/[、;,／/]/)
    .map((a) => normalizeReading(a.replace(/[（(].*?[)）]/g, '')))
    .some((a) => tries.has(a))
}
