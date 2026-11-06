/**
 * NGUỒN CÂU CHO BÀI CHÉP CHÍNH TẢ
 *  - Câu mẫu: câu ví dụ của module Ngữ pháp (N5 → N1, có furigana và nghĩa tiếng Việt). Có sẵn, không cần tải gì.
 *  - Phụ đề anime: các câu phụ đề tiếng Nhật của những tập bạn đã nhập vào Xem anime.
 *    Nếu mở được file video thì nghe tiếng nhân vật thật; không thì giọng máy đọc.
 */
import { listGrammarPoints, type JlptLevel } from '@/modules/grammar/api'
import { getSeries, getSubs, listAllEpisodes } from '@/modules/immersion/anime/store'
import { cleanSubtitle, readingFromFurigana } from './compare'

export interface Sentence {
  key: string
  /** Chữ thường của câu (đưa cho giọng máy, và hiện sau khi chấm). */
  text: string
  /** Câu viết theo quy ước của Ngữ pháp (có furigana, {{ }}), để hiện đẹp. Chỉ có ở câu mẫu. */
  src?: string
  /** Cách đọc hiragana nếu đã biết trước (câu mẫu). Phụ đề thì tính sau bằng bộ tách từ. */
  reading?: string
  /** Nghĩa (tiếng Việt với câu mẫu, phụ đề dịch nếu có với anime). */
  meaning?: string
  /** Chỉ có ở phụ đề: thời gian câu trong video (giây, đã tính lệch phụ đề). */
  clip?: { episodeId: string; start: number; end: number }
  /** Ghi chú nguồn: "N4 · 〜てもいい", "Frieren · tập 5 · 12:30". */
  from: string
  /** Mã mẫu ngữ pháp (để mở bài). */
  grammarId?: string
}

const plain = (src: string) => src.replace(/\[[^\]]*\]/g, '').replace(/\{\{|\}\}/g, '').replace(/ /g, '')

export async function grammarSentences(levels: JlptLevel[]): Promise<Sentence[]> {
  const out: Sentence[] = []
  for (const lv of levels) {
    for (const p of await listGrammarPoints(lv)) {
      p.examples.forEach(([jp, vi], i) => {
        const text = plain(jp)
        if ([...text].length < 4) return
        out.push({ key: `g:${p.id}:${i}`, text, src: jp, reading: readingFromFurigana(jp), meaning: vi, from: `N${lv} · ${p.pattern}`, grammarId: p.id })
      })
    }
  }
  return out
}

export interface EpisodeChoice { id: string; label: string; lines: number }

/** Các tập anime có phụ đề tiếng Nhật, mới xem gần đây trước. */
export async function animeEpisodes(): Promise<EpisodeChoice[]> {
  const eps = (await listAllEpisodes()).filter((e) => e.subFile || e.stats)
  const titles = new Map<string, string>()
  const out: (EpisodeChoice & { at: number })[] = []
  for (const e of eps) {
    if (!titles.has(e.seriesId)) titles.set(e.seriesId, (await getSeries(e.seriesId))?.title ?? '')
    out.push({
      id: e.id,
      label: `${titles.get(e.seriesId)} · ${e.number != null ? `#${e.number}` : e.title}`,
      lines: e.stats?.lines ?? 0,
      at: e.lastWatchedAt ?? e.addedAt,
    })
  }
  return out.sort((a, b) => b.at - a.at)
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** Câu phụ đề của một tập: bỏ dòng quá ngắn (あ, えっ…) hoặc quá dài để chép. */
export async function animeSentences(episodeId: string): Promise<Sentence[]> {
  const [subs, tr, eps] = await Promise.all([getSubs(episodeId, 'jp'), getSubs(episodeId, 'tr'), listAllEpisodes()])
  const ep = eps.find((e) => e.id === episodeId)
  if (!subs || !ep) return []
  const series = (await getSeries(ep.seriesId))?.title ?? ''
  const off = ep.subOffset ?? 0
  const trCues = tr?.cues ?? []
  return subs.cues.flatMap((c, i) => {
    const text = cleanSubtitle(c.t)
    const len = [...text.replace(/[\s、。！？!?…]/g, '')].length
    if (len < 4 || len > 40 || c.e - c.s > 9000) return []
    // Phụ đề dịch trùng thời gian nhiều nhất = nghĩa của câu
    const m = trCues.find((x) => x.s < c.e && x.e > c.s)
    const start = (c.s + off) / 1000, end = (c.e + off) / 1000
    return [{
      key: `a:${episodeId}:${i}`, text, meaning: m?.t.replace(/\n/g, ' '),
      clip: { episodeId, start, end },
      from: `${series} · ${ep.number != null ? `#${ep.number}` : ep.title} · ${mmss(start)}`,
    }]
  })
}
