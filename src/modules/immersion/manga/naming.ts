/**
 * ĐOÁN TÊN VÀ SỐ CHƯƠNG TỪ TÊN FILE
 * Ví dụ "One Piece - Vol.01 Ch.005 [Nhóm dịch].cbz" → series "One Piece", tập 1, chương 5.
 * Đoán sai thì người dùng sửa lại được trong màn hình nhập.
 */

/** So sánh "tự nhiên": trang2 đứng trước trang10 (không như sắp xếp chữ thông thường). */
export const naturalCompare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp']
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp',
}

export const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase()
export const baseName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path
/** Bỏ đuôi file (.cbz, .jpg...). Chỉ bỏ đuôi ngắn có chữ cái, để "Ch.001" hay "D.Gray-man" không bị cắt nhầm. */
export const stripExt = (name: string) => name.replace(/\.(?=[a-z0-9]*[a-z])[a-z0-9]{2,5}$/i, '')
export const dirOf = (path: string) => path.split(/[\\/]/).slice(0, -1).join('/')

/** File ảnh hợp lệ (bỏ file ẩn và rác của macOS như __MACOSX/._abc.jpg). */
export function isImageName(path: string): boolean {
  const name = baseName(path)
  if (name.startsWith('.') || path.includes('__MACOSX')) return false
  return IMAGE_EXT.includes(extOf(name))
}

export const imageMime = (name: string) => MIME[extOf(name)] ?? 'application/octet-stream'

export interface ChapterGuess {
  number: number | null
  volume: number | null
}

const num = (s: string | undefined) => (s === undefined ? null : Number(s.replace(',', '.')))

/** Đoán số chương và số tập từ tên. */
export function guessChapter(name: string): ChapterGuess {
  const s = stripExt(baseName(name))
  // Bỏ phần trong ngoặc như [Nhóm dịch] hay (2004) để không nhầm thành số chương
  const clean = s.replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ')

  const volume =
    num(clean.match(/第\s*(\d+)\s*巻/)?.[1]) ??
    num(clean.match(/(?:^|[^a-z])(?:vol(?:ume)?|t[aậ]p|v)[\s._-]*(\d+)/i)?.[1])

  const chapter =
    num(clean.match(/第\s*(\d+(?:[.,]\d+)?)\s*[話话回章]/)?.[1]) ??
    num(clean.match(/(?:^|[^a-z])(?:ch(?:apter|ap)?|ch[uư][oơ]ng|ep(?:isode)?|c|#)[\s._-]*(\d+(?:[.,]\d+)?)/i)?.[1]) ??
    // Không có chữ đánh dấu: lấy con số cuối cùng không thuộc phần "tập"
    num(clean.replace(/第\s*\d+\s*巻|(?:vol(?:ume)?|t[aậ]p|v)[\s._-]*\d+/gi, ' ').match(/(\d+(?:\.\d+)?)(?!.*\d)/)?.[1])

  return { number: chapter, volume }
}

/** Tên chương dễ đọc, ví dụ "Chương 5" hoặc "Tập 2 · Chương 12". */
export function chapterLabel(c: { number: number | null; volume?: number | null; title: string }): string {
  const parts: string[] = []
  if (c.volume != null) parts.push(`Tập ${c.volume}`)
  if (c.number != null) parts.push(`Chương ${c.number}`)
  return parts.length ? parts.join(' · ') : c.title
}

/** Đoán tên series từ tên các file: bỏ phần số chương/tập, nhóm dịch, rồi lấy tên gặp nhiều nhất. */
export function guessSeriesTitle(names: string[]): string {
  const counts = new Map<string, number>()
  for (const n of names) {
    const t = stripExt(baseName(n))
      .replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ')
      .replace(/第\s*\d+\s*[巻話话回章]/g, ' ')
      .replace(/(?:^|[\s._-])(?:vol(?:ume)?|t[aậ]p|ch(?:apter|ap)?|ch[uư][oơ]ng|ep(?:isode)?|v|c|#)[\s._-]*\d+(?:\.\d+)?/gi, ' ')
      .replace(/\d+(?:\.\d+)?\s*$/, ' ')
      .replace(/[_]+/g, ' ')
      .replace(/[\s.\-–—]+$/g, '')
      .replace(/^[\s.\-–—]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [t, c] of counts) if (c > bestCount) { best = t; bestCount = c }
  return best
}
