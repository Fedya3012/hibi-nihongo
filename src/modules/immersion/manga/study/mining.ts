/**
 * HỌC TỪ BONG BÓNG THOẠI: tách từ + nghĩa, lưu câu/từ vào Ôn tập, lịch sử tra cứu, xuất CSV.
 * Dùng API công khai của module Từ điển và Ôn tập.
 */
import { kvGet, kvSet } from '@/core/db'
import { addReviewCards, tagReviewCards } from '@/modules/review/api'
import { tokenize, lookupAt, headword, type WordData } from '@/modules/dictionary'
import { findNotes } from './notes-data'
import { findSfx, findSlang, SFX_TAG, SLANG_TAG, SFX_KIND_LABEL, type Sfx, type Slang } from './sfx-data'
import type { MangaBubble, MangaChapter, MangaSeries, Box } from '../types'
import { chapterLabel } from '../naming'
import { getChapter } from '../store'
import { openPageSource } from '../pages'

export interface WordInfo {
  surface: string
  base: string
  reading: string
  meaning: string
  jlpt?: number
  id?: string
  data?: WordData
}

/** Từ loại không cần học riêng (trợ từ, dấu câu...). */
const SKIP_POS = ['助詞', '記号', '助動詞']

/** Tách câu thành các từ có nghĩa (bỏ trợ từ, dấu câu). Cần đã tải từ điển. */
export async function wordsOf(text: string): Promise<WordInfo[]> {
  const segs = await tokenize(text)
  const out: WordInfo[] = []
  const seen = new Set<string>()
  for (const s of segs) {
    if (SKIP_POS.includes(s.pos) || !/[぀-ヿ一-鿿]/.test(s.surface)) continue
    const res = await lookupAt(text, s.start).catch(() => [])
    // Ưu tiên mục từ điển có đúng chữ viết/cách đọc như trong câu (tránh 本 → 元)
    const same = (t: string) => t === s.surface || t === s.base
    // Ưu tiên mục mà chữ viết chính đúng bằng chữ trong câu (本 → ほん, không phải もと 元/本)
    const r = res.find((x) => same(headword(x.data).word))
      ?? res.find((x) => x.data.k?.some((k) => same(k.t)) || x.data.r.some((rr) => same(rr.t))) ?? res[0]
    const key = r?.id ?? s.base
    if (seen.has(key)) continue
    seen.add(key)
    if (r) {
      const hw = headword(r.data)
      out.push({
        surface: s.surface, base: hw.word, reading: hw.reading, id: r.id, data: r.data, jlpt: r.data.j,
        meaning: r.data.s.slice(0, 2).map((x) => x.g.slice(0, 2).join(', ')).join('; '),
      })
    } else {
      out.push({ surface: s.surface, base: s.base, reading: s.reading, meaning: '' })
    }
  }
  return out
}

export const sourceLabel = (series?: MangaSeries, chapter?: MangaChapter, page?: number) =>
  [series?.title, chapter && chapterLabel(chapter), page != null ? `trang ${page + 1}` : ''].filter(Boolean).join(' · ')

/**
 * Nhãn thẻ của một bộ manga, dùng để ôn riêng bộ đó: /review?tags=manga:One-Piece
 * (không có dấu phẩy, vì danh sách nhãn trên đường dẫn ngăn cách bằng dấu phẩy).
 */
export const seriesTag = (title: string) => `manga:${title.normalize('NFKC').trim().replace(/[\s,]+/g, '-')}`

/** Mọi nhãn để tìm thẻ của một bộ (cả nhãn cũ = tên bộ, của các thẻ lưu trước khi có nhãn manga:...). */
export const seriesTags = (title: string) => [seriesTag(title), ...(title.includes(',') ? [] : [title])]

/** Đường dẫn ôn tập chỉ các thẻ của những bộ đã chọn (hoặc một nhóm nhãn). */
export const reviewPathForTags = (tags: string[]) => `/review?tags=${encodeURIComponent([...new Set(tags)].join(','))}`

/** Nhãn chung cho thẻ lưu từ một câu: manga, bộ truyện, JLPT, từ tượng thanh / khẩu ngữ nếu có. */
function cardTags(text: string, series?: MangaSeries, jlpt?: number): string[] {
  return [
    'manga',
    ...(series ? [seriesTag(series.title)] : []),
    ...(jlpt ? [`N${jlpt}`] : []),
    ...(findSfx(text).length ? [SFX_TAG] : []),
    ...(findSlang(text).length ? [SLANG_TAG] : []),
  ]
}

/** Lưu cả câu (kèm ảnh panel nếu có) vào Ôn tập (sentence mining). Trả về true nếu thêm mới (câu trùng bị bỏ qua). */
export async function mineSentence(b: MangaBubble, series?: MangaSeries, chapter?: MangaChapter, panel?: Blob | null): Promise<boolean> {
  const words = await wordsOf(b.text).catch(() => [] as WordInfo[])
  const gloss = words.filter((w) => w.meaning).slice(0, 6).map((w) => `${w.base}（${w.reading}）: ${w.meaning}`).join('\n')
  const grammar = findNotes(b.text).filter((n) => n.group === 'grammar').map((n) => `${n.label}: ${n.vi}`).join('\n')
  const levels = words.map((w) => w.jlpt).filter((j): j is number => !!j)
  const hardest = levels.length ? Math.min(...levels) : undefined
  const n = await addReviewCards([{
    deck: `Manga: ${series?.title ?? 'Câu hay'}`,
    kind: 'vocab',
    front: b.text,
    meaning: b.translation?.trim() || gloss || '(chưa có nghĩa — mở lại manga để xem)',
    example: b.translation?.trim() ? gloss || undefined : undefined,
    notes: [sourceLabel(series, chapter, b.page), b.speaker ? `Nhân vật: ${b.speaker}` : '', grammar, b.note ?? ''].filter(Boolean).join('\n'),
    tags: cardTags(b.text, series, hardest),
    source: { module: 'manga', ref: b.id },
    // Ảnh khung tranh hiện ở mặt sau thẻ (Ôn tập tự nén JPEG ≤ 900px, có trong sao lưu)
    image: panel ?? undefined,
  }])
  return n > 0
}

/**
 * THẺ "CHE CHỮ" (image occlusion): mặt hỏi là ảnh panel với bong bóng bị che, mặt đáp án là câu + ảnh gốc.
 * Trả về true nếu thêm mới.
 */
export async function mineOcclusion(b: MangaBubble, page: Blob, series?: MangaSeries, chapter?: MangaChapter): Promise<boolean> {
  const [masked, panel] = await Promise.all([maskedPanel(page, b.box), cropPanel(page, b.box)])
  if (!masked) return false
  const n = await addReviewCards([{
    // Bộ riêng: khác bộ của thẻ câu thường (cùng chữ mặt trước) để không bị coi là thẻ trùng
    deck: `Manga: ${series?.title ?? 'Câu hay'} · Che chữ`,
    kind: 'vocab',
    front: b.text,
    meaning: b.translation?.trim() || '(đoán câu trong ô bị che)',
    notes: [sourceLabel(series, chapter, b.page), b.speaker ? `Nhân vật: ${b.speaker}` : ''].filter(Boolean).join('\n'),
    tags: [...cardTags(b.text, series), 'che-chu'],
    frontImage: masked,
    image: panel ?? undefined,
    source: { module: 'manga-occlusion', ref: b.id },
  }])
  return n > 0
}

/**
 * Lưu nhiều từ cùng lúc, mỗi thẻ có câu gốc (từ được che để thành câu điền chỗ trống) và ảnh panel.
 * Từ đã có thẻ (vd lưu từ Từ điển trước đó) thì chỉ gắn thêm nhãn của bộ manga. Trả về số thẻ mới.
 */
export async function mineWords(words: WordInfo[], ctx: { sentence?: string; series?: MangaSeries; panel?: Blob | null } = {}): Promise<number> {
  let n = 0
  const tags = ['manga', ...(ctx.series ? [seriesTag(ctx.series.title)] : [])]
  for (const w of words) {
    if (!w.id || !w.data) continue
    const meaning = w.data.s.slice(0, 3).map((s) => s.g.slice(0, 3).join(', ')).join('; ')
    const example = ctx.sentence && ctx.sentence.includes(w.surface) ? ctx.sentence.replace(w.surface, `{{${w.surface}}}`) : ctx.sentence
    const added = await addReviewCards([{
      deck: `Manga: ${ctx.series?.title ?? 'Từ vựng'}`, kind: 'vocab', front: w.base, reading: w.reading !== w.base ? w.reading : undefined,
      meaning, example, tags: [...tags, ...(w.jlpt ? [`N${w.jlpt}`] : [])], image: ctx.panel ?? undefined,
      source: { module: 'dictionary', ref: w.id },
    }])
    if (added) n++
    else await tagReviewCards([{ module: 'dictionary', ref: w.id }], tags[tags.length - 1])
  }
  return n
}

/** Lưu một từ tượng thanh trong thư viện vào Ôn tập (bộ "Manga: Từ tượng thanh"). */
export async function mineSfx(s: Sfx, panel?: Blob | null): Promise<boolean> {
  const form = s.w.replace(/\s*\(.*\)$/, '')
  const n = await addReviewCards([{
    deck: 'Manga: Từ tượng thanh', kind: 'vocab', front: form, meaning: s.vi,
    example: s.ex.includes(form) ? s.ex.replace(form, `{{${form}}}`) : s.ex, exampleMeaning: s.exVi,
    notes: [SFX_KIND_LABEL[s.kind], s.alt?.length ? `Cách viết khác: ${s.alt.join('、')}` : ''].filter(Boolean).join('\n'),
    tags: ['manga', SFX_TAG], image: panel ?? undefined, source: { module: 'manga-sfx', ref: s.w },
  }])
  return n > 0
}

/** Lưu một cách nói khẩu ngữ vào Ôn tập (bộ "Manga: Khẩu ngữ"). */
export async function mineSlang(s: Slang): Promise<boolean> {
  const n = await addReviewCards([{
    deck: 'Manga: Khẩu ngữ', kind: 'vocab', front: s.w, meaning: s.vi, example: s.ex, exampleMeaning: s.exVi,
    notes: `Cách nói lịch sự / chuẩn: ${s.polite}`, tags: ['manga', SLANG_TAG], source: { module: 'manga-slang', ref: s.w },
  }])
  return n > 0
}

// ----- Lịch sử tra cứu -----

export interface LookupEntry { word: string; reading: string; meaning: string; chapterId: string; page: number; at: number }
const HISTORY = 'manga:lookups'

export async function recordLookup(e: LookupEntry): Promise<void> {
  const list = await kvGet<LookupEntry[]>(HISTORY, [])
  const next = [e, ...list.filter((x) => !(x.word === e.word && x.chapterId === e.chapterId))].slice(0, 500)
  await kvSet(HISTORY, next)
}

export const getLookupHistory = () => kvGet<LookupEntry[]>(HISTORY, [])

// ----- Ảnh panel -----

/** Cắt vùng bong bóng (nới rộng thêm để thấy cả khung tranh) từ ảnh trang. */
export async function cropPanel(page: Blob, box: Box, pad = 0.12): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(page)
    const x = Math.max(0, box.x - pad) * bmp.width
    const y = Math.max(0, box.y - pad) * bmp.height
    const w = Math.min(1, box.x + box.w + pad) * bmp.width - x
    const h = Math.min(1, box.y + box.h + pad) * bmp.height - y
    const scale = Math.min(1, 900 / w)
    const c = document.createElement('canvas')
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)
    c.getContext('2d')!.drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height)
    bmp.close()
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
  } catch {
    return null
  }
}

/** Ảnh panel như cropPanel nhưng bong bóng bị che (nền trắng + dấu ？) để làm câu hỏi đoán chữ. */
export async function maskedPanel(page: Blob, box: Box, pad = 0.12): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(page)
    const x = Math.max(0, box.x - pad) * bmp.width
    const y = Math.max(0, box.y - pad) * bmp.height
    const w = Math.min(1, box.x + box.w + pad) * bmp.width - x
    const h = Math.min(1, box.y + box.h + pad) * bmp.height - y
    const scale = Math.min(1, 900 / w)
    const c = document.createElement('canvas')
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)
    const g = c.getContext('2d')!
    g.drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height)
    // Ô che: đúng vùng bong bóng
    const bx = (box.x * bmp.width - x) * scale
    const by = (box.y * bmp.height - y) * scale
    const bw = box.w * bmp.width * scale
    const bh = box.h * bmp.height * scale
    bmp.close()
    g.fillStyle = '#fff3c4'
    g.strokeStyle = '#d97706'
    g.lineWidth = Math.max(2, c.width / 200)
    g.beginPath()
    g.roundRect(bx, by, bw, bh, Math.min(bw, bh) * 0.15)
    g.fill()
    g.stroke()
    g.fillStyle = '#b45309'
    g.font = `bold ${Math.round(Math.min(bw, bh) * 0.45)}px sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('?', bx + bw / 2, by + bh / 2)
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
  } catch {
    return null
  }
}

/** Chia sẻ câu kèm ảnh panel (điện thoại/Windows có bảng chia sẻ), không có thì tải ảnh về. */
export async function shareBubble(text: string, image: Blob | null, source: string): Promise<'shared' | 'copied' | 'downloaded'> {
  const body = `${text}\n— ${source}`
  const file = image ? new File([image], 'hibi-manga.jpg', { type: 'image/jpeg' }) : null
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ text: body, files: [file] }); return 'shared' } catch { /* người dùng hủy */ }
  }
  if (file) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = 'hibi-manga.jpg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  await navigator.clipboard?.writeText(body).catch(() => {})
  return file ? 'downloaded' : 'copied'
}

// ----- Xuất CSV (mở được bằng Excel, nhập được vào Anki) -----

export function downloadCsv(name: string, rows: string[][]): void {
  const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Ảnh panel của một bong bóng bất kỳ (mở trang từ kho ảnh, kể cả PDF). null nếu máy này không có file. */
export async function panelOfBubble(b: MangaBubble): Promise<Blob | null> {
  const chapter = await getChapter(b.chapterId)
  if (!chapter) return null
  const src = await openPageSource(chapter).catch(() => null)
  if (!src) return null
  try {
    return await cropPanel(await src.blob(b.page), b.box)
  } catch {
    return null
  } finally {
    src.dispose()
  }
}
