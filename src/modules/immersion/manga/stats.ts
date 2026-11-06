/**
 * THỐNG KÊ & GỢI Ý cho thư viện manga: trang đã đọc, câu/từ đã học qua manga, trạng thái bộ truyện,
 * và gợi ý bộ nào vừa sức với vốn từ hiện tại.
 */
import { getAll, kvGet } from '@/core/db'
import type { SrsCard } from '@/modules/review/api'
import { textCoverage } from '@/modules/vocab/api'
import { listAllNotes } from './notes'
import { seriesTag } from './study/mining'
import { listAllChapters, listSeries } from './store'
import type { MangaBubble, MangaChapter, MangaSeries, SeriesLevel, SeriesStatus } from './types'

/** Số trang đã đọc của một chương: đọc xong = đủ trang, đang đọc = tới trang hiện tại. */
export const pagesRead = (c: MangaChapter) => (c.finishedAt ? c.pageCount : c.lastReadAt ? c.lastPage + 1 : 0)

/** Trạng thái hiện tại: đặt tay thì theo đặt tay, không thì tự tính từ tiến độ đọc. */
export function seriesStatus(s: MangaSeries, chapters: MangaChapter[]): SeriesStatus | undefined {
  if (s.status) return s.status
  if (chapters.length && chapters.every((c) => c.finishedAt)) return 'done'
  if (chapters.some((c) => c.lastReadAt)) return 'reading'
  return undefined
}

const isMangaCard = (c: SrsCard) => c.deck.startsWith('Manga') || !!c.tags?.includes('manga') || c.source?.module.startsWith('manga') === true

export interface MangaStats {
  pages: number
  chaptersDone: number
  bubbles: number
  sentencesSaved: number
  /** Thẻ Ôn tập tạo từ manga: tổng, và số thẻ đã thuộc (đã qua giai đoạn học). */
  cards: number
  cardsLearned: number
  /** Thẻ từ vựng (từ lẻ) từ manga. */
  words: number
}

export async function loadMangaStats(seriesId?: string): Promise<MangaStats> {
  const [chapters, notes, cards] = await Promise.all([listAllChapters(), listAllNotes(), getAll<SrsCard>('srsCards')])
  const chs = seriesId ? chapters.filter((c) => c.seriesId === seriesId) : chapters
  const bubbles = notes.filter((n): n is MangaBubble => n.kind === 'bubble' && (!seriesId || n.seriesId === seriesId))
  const series = seriesId ? (await listSeries()).find((s) => s.id === seriesId) : undefined
  const tag = series ? seriesTag(series.title) : undefined
  const mine = cards.filter((c) => isMangaCard(c) && (!series || c.deck === `Manga: ${series.title}` || !!c.tags?.some((t) => t === tag || t === series.title)))
  return {
    pages: chs.reduce((n, c) => n + pagesRead(c), 0),
    chaptersDone: chs.filter((c) => c.finishedAt).length,
    bubbles: bubbles.length,
    sentencesSaved: bubbles.filter((b) => b.minedAt).length,
    cards: mine.length,
    cardsLearned: mine.filter((c) => c.state === 2).length,
    words: mine.filter((c) => c.source?.module === 'dictionary').length,
  }
}

/** Cấp hiện tại của người học (theo bài kiểm tra xếp lớp ở Lộ trình), 5 = N5. */
async function learnerLevel(): Promise<SeriesLevel | undefined> {
  const st = await kvGet<{ start?: string; placement?: { start?: string } } | null>('roadmap:state', null).catch(() => null)
  const id = st?.placement?.start ?? st?.start
  const m = id?.match(/^n([1-5])$/)
  return m ? (Number(m[1]) as SeriesLevel) : id === 'kana' ? 5 : undefined
}

export interface Suggestion {
  series: MangaSeries
  /** Tỉ lệ từ đã biết + đang học trong lời thoại đã có (0–1), nếu đủ dữ liệu. */
  coverage?: number
  reason: string
  score: number
}

/**
 * Gợi ý bộ nên đọc: ưu tiên bộ có lời thoại bạn hiểu 80–97% (vừa sức: có từ mới nhưng không ngợp),
 * rồi bộ có độ khó gần cấp của bạn, bộ "Muốn đọc", bộ đang đọc dở.
 */
export async function suggestSeries(): Promise<Suggestion[]> {
  const [series, chapters, notes, level] = await Promise.all([listSeries(), listAllChapters(), listAllNotes(), learnerLevel()])
  const out: Suggestion[] = []
  for (const s of series) {
    const chs = chapters.filter((c) => c.seriesId === s.id)
    const status = seriesStatus(s, chs)
    if (status === 'done' || !chs.length) continue
    const text = notes.filter((n): n is MangaBubble => n.kind === 'bubble' && n.seriesId === s.id && !!n.text.trim()).map((b) => b.text).join('\n')
    let coverage: number | undefined
    if (text.length >= 40) {
      const cov = await textCoverage(text).catch(() => null)
      if (cov && cov.tokens >= 10) coverage = cov.known + cov.learning
    }
    let score = 0
    const reasons: string[] = []
    if (coverage != null) {
      const pct = Math.round(coverage * 100)
      if (coverage >= 0.8 && coverage <= 0.97) { score += 50; reasons.push(`bạn hiểu khoảng ${pct}% từ trong lời thoại: vừa sức`) }
      else if (coverage > 0.97) { score += 20; reasons.push(`bạn đã biết ${pct}% từ: đọc thoải mái`) }
      else { score += 5; reasons.push(`mới hiểu ${pct}% từ: hơi khó, nên học trước từ`) }
    }
    if (s.level && level) {
      const d = Math.abs(s.level - level)
      if (d === 0) { score += 30; reasons.push(`đúng cấp N${level} của bạn`) }
      else if (s.level === level - 1) { score += 15; reasons.push('khó hơn cấp bạn một chút: tốt để tiến bộ') }
      else if (s.level > level) { score += 18; reasons.push('dễ hơn cấp của bạn') }
      else score -= 10 * d
    } else if (s.level && !level) {
      score += s.level * 2 // chưa biết cấp của bạn: ưu tiên bộ dễ hơn
      reasons.push(`độ khó N${s.level}`)
    }
    if (status === 'want') { score += 12; reasons.push('bạn đã đánh dấu Muốn đọc') }
    if (status === 'reading') { score += 8; reasons.push('đang đọc dở') }
    if (s.favorite) score += 4
    out.push({ series: s, coverage, score, reason: reasons.join(' · ') || 'chưa có dữ liệu: đặt độ khó hoặc thêm lời thoại để gợi ý chính xác hơn' })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3)
}

export { isMangaCard }
