/**
 * ĐỌC DANH SÁCH TỪ ĐƯỢC DÁN VÀO (mỗi dòng một từ)
 * Nhận được nhiều kiểu viết hay gặp khi chép từ sách hoặc copy từ Excel / Google Sheets:
 *   食べます	たべます	ăn                (cách nhau bằng phím Tab, như copy từ bảng tính)
 *   食べます たべます ăn                  (cách nhau bằng dấu cách)
 *   食べます（たべます）: ăn               (cách đọc trong ngoặc)
 *   1. 食べます - ăn                      (có số thứ tự, không có cách đọc)
 *   たべます = ăn                          (chỉ có kana)
 * Từ chỉ có kana thì cách đọc chính là từ đó.
 */

export interface ParsedLine {
  word: string
  reading?: string
  meaning: string
}

/** Chỉ gồm hiragana / katakana / dấu kéo dài (và dấu ～ của mẫu như ～さん). */
export const isKanaOnly = (s: string) => /^[぀-ゟ゠-ヿ～〜~・ー]+$/.test(s)

/** Có chữ tiếng Nhật (kana hoặc Kanji) không. */
const hasJp = (s: string) => /[぀-ヿ㐀-鿿々〆]/.test(s)

/** Bỏ dấu phân cách ở đầu nghĩa: "- ăn", ": ăn", "= ăn", "| ăn". */
const cleanMeaning = (s: string) => s.replace(/^[\s\-–—:：=|,，、]+/, '').trim()

export function parseLine(raw: string): ParsedLine | null {
  // Bỏ số thứ tự ở đầu dòng: "1.", "12)", "3、"
  const line = raw.trim().replace(/^\d{1,3}\s*[.)、:．]\s*/, '')
  if (!line || !hasJp(line)) return null

  // 1) Cách nhau bằng Tab (copy từ bảng tính)
  if (line.includes('\t')) {
    const cols = line.split('\t').map((c) => c.trim()).filter(Boolean)
    const [word, second, ...rest] = cols
    if (second && isKanaOnly(second) && !isKanaOnly(word)) return { word, reading: second, meaning: rest.join(' · ') }
    return { word, meaning: [second, ...rest].filter(Boolean).join(' · ') }
  }

  // 2) Cách đọc trong ngoặc: 食べます（たべます）ăn
  const paren = line.match(/^(\S+?)\s*[（(]\s*([぀-ヿー～〜]+)\s*[）)]\s*(.*)$/)
  if (paren) return { word: paren[1], reading: paren[2], meaning: cleanMeaning(paren[3]) }

  // 3) Cách nhau bằng dấu cách (hoặc dấu cách toàn góc 　)
  const parts = line.split(/[\s　]+/)
  let word = parts.shift()!
  // "食べます-ăn" (dính liền dấu gạch): tách tại dấu phân cách đầu tiên
  const glued = word.match(/^([^\-–—:：=|]+)[\-–—:：=|](.+)$/)
  if (glued && hasJp(glued[1])) {
    word = glued[1]
    parts.unshift(glued[2])
  }
  let reading: string | undefined
  if (parts.length && isKanaOnly(parts[0]) && !isKanaOnly(word)) reading = parts.shift()
  // "わたし 私 tôi": cách đọc viết trước, chữ Kanji viết sau → đổi chỗ
  else if (parts.length && isKanaOnly(word) && hasJp(parts[0]) && !isKanaOnly(parts[0]) && !/[a-zA-ZÀ-ỹ]/.test(parts[0])) {
    reading = word
    word = parts.shift()!
  }
  return { word, reading, meaning: cleanMeaning(parts.join(' ')) }
}

/** Đọc cả đoạn dán vào; bỏ dòng trống và dòng không có chữ tiếng Nhật. */
export function parseList(text: string): ParsedLine[] {
  return text.split(/\r?\n/).map(parseLine).filter((x): x is ParsedLine => !!x)
}
