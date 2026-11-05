/**
 * HỌC TỪ BONG BÓNG THOẠI: tách từ + nghĩa, lưu câu/từ vào Ôn tập, lịch sử tra cứu, xuất CSV.
 * Dùng API công khai của module Từ điển và Ôn tập.
 */
import { kvGet, kvSet } from '@/core/db'
import { addReviewCards } from '@/modules/review/api'
import { tokenize, lookupAt, headword, addWordToReview, type WordData } from '@/modules/dictionary'
import { findNotes } from './notes-data'
import type { MangaBubble, MangaChapter, MangaSeries, Box } from '../types'
import { chapterLabel } from '../naming'

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
    const r = res.find((x) => x.data.k?.some((k) => same(k.t)) || x.data.r.some((rr) => same(rr.t))) ?? res[0]
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
    tags: ['manga', ...(series ? [series.title] : []), ...(hardest ? [`N${hardest}`] : [])],
    source: { module: 'manga', ref: b.id },
    // Ảnh khung tranh hiện ở mặt sau thẻ (Ôn tập tự nén JPEG ≤ 900px, có trong sao lưu)
    image: panel ?? undefined,
  }])
  return n > 0
}

/** Lưu nhiều từ cùng lúc. Trả về số thẻ mới. */
export async function mineWords(words: WordInfo[]): Promise<number> {
  let n = 0
  for (const w of words) if (w.id && w.data && (await addWordToReview(w.id, w.data))) n++
  return n
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
