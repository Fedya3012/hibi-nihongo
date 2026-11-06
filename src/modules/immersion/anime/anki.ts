/**
 * XUẤT SANG ANKI (kèm âm thanh gốc + ảnh cảnh phim)
 * Tạo một file .zip gồm:
 *   - anime-cards.txt : file văn bản tách bằng Tab, Anki nhập trực tiếp (File → Import)
 *   - media/…         : ảnh .jpg và âm thanh .webm của từng câu
 *   - HUONG-DAN.txt   : cách nhập vào Anki bằng tiếng Việt
 * Trường: Mặt trước · Cách đọc · Nghĩa · Câu thoại · Dịch câu · Âm thanh · Ảnh · Nguồn · Tags
 * (Anki không có cách nhập file media qua file văn bản: phải chép thư mục media vào collection.media, xem hướng dẫn.)
 */
import { zipSync, strToU8 } from 'fflate'
import { episodeLabel } from './importer'
import type { AnimeCardItem, AnimeData } from './progress'
import { getClip } from './store'
import { formatClock } from './subtitles'

const esc = (s = '') => s.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')
const html = (s = '') => esc(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
const extOf = (type: string) => (type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm')

async function blobBytes(b: Blob) { return new Uint8Array(await b.arrayBuffer()) }
function dataUrlBytes(u: string): Uint8Array | undefined {
  const m = u.match(/^data:[^;]+;base64,(.*)$/)
  if (!m) return undefined
  const bin = atob(m[1])
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const GUIDE = `CÁCH NHẬP VÀO ANKI
1. Giải nén file .zip này.
2. Chép toàn bộ file trong thư mục "media" vào thư mục collection.media của Anki:
   - Trong Anki: Tools (Công cụ) → Check Media → bấm "View Files" để mở đúng thư mục đó.
   - Windows: %APPDATA%\\Anki2\\<Tên hồ sơ>\\collection.media
   - macOS:   ~/Library/Application Support/Anki2/<Tên hồ sơ>/collection.media
3. Anki → File → Import → chọn anime-cards.txt.
   - Note type: chọn "Basic" (hoặc tự tạo note type có 9 trường như dưới).
   - Ghép trường (Field mapping): cột 1 → Front, các cột còn lại gộp vào Back,
     hoặc tạo note type riêng với các trường:
     Front · Reading · Meaning · Sentence · SentenceMeaning · Audio · Image · Source · Tags
   - Bật "Allow HTML in fields".
4. Bấm Import. Âm thanh dạng [sound:...] và ảnh <img> sẽ tự hiện trong thẻ.
`

/** Tạo file zip để tải về. Trả về số thẻ đã xuất. */
export async function exportAnki(items: AnimeCardItem[], data: AnimeData, deckName: string): Promise<{ blob: Blob; count: number }> {
  const files: Record<string, Uint8Array> = {}
  const seriesById = new Map(data.series.map((s) => [s.id, s]))
  const rows: string[] = [
    '#separator:tab', '#html:true', `#deck:${deckName}`, '#tags column:9',
    '#columns:Front\tReading\tMeaning\tSentence\tSentenceMeaning\tAudio\tImage\tSource\tTags',
  ]
  const seen = new Set<string>()
  let count = 0
  for (const x of items) {
    if (seen.has(x.card.id)) continue
    seen.add(x.card.id)
    const c = x.card
    // Cùng một câu → dùng chung một file ảnh / âm thanh cho mọi thẻ của câu đó
    const base = `hibi-anime-${(x.link.sentenceId ?? c.id).replace(/[^a-z0-9]/gi, '').slice(0, 16)}`
    let audio = '', image = ''
    const clip = x.link.sentenceId ? await getClip(x.link.sentenceId) : undefined
    if (clip?.audio) {
      const name = `${base}.${extOf(clip.audio.type)}`
      files[`media/${name}`] ??= await blobBytes(clip.audio)
      audio = `[sound:${name}]`
    }
    const img = c.image ? dataUrlBytes(c.image) : clip?.image ? await blobBytes(clip.image) : undefined
    if (img) {
      const name = `${base}.jpg`
      files[`media/${name}`] ??= img
      image = `<img src="${name}">`
    }
    const s = seriesById.get(x.link.seriesId)
    const source = [s?.title, x.episode && episodeLabel(x.episode), x.sentence && formatClock(x.sentence.s / 1000)].filter(Boolean).join(' · ')
    const sentence = x.sentence?.text ?? c.example?.replace(/\{\{(.+?)\}\}/g, '<b>$1</b>') ?? ''
    rows.push([
      html(c.front), html(c.reading), html(c.meaning), x.sentence ? html(sentence) : esc(sentence),
      html(c.exampleMeaning ?? x.sentence?.translation), audio, image, html(source),
      (c.tags ?? []).map((t) => t.replace(/\s+/g, '_')).join(' '),
    ].join('\t'))
    count++
  }
  files['anime-cards.txt'] = strToU8(rows.join('\n') + '\n')
  files['HUONG-DAN.txt'] = strToU8(GUIDE)
  const zip = zipSync(files, { level: 0 }) // ảnh/âm thanh đã nén sẵn
  return { blob: new Blob([zip], { type: 'application/zip' }), count }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
