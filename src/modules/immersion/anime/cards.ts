/**
 * TẠO THẺ ÔN TẬP TỪ ANIME
 * - Thẻ câu: mặt trước là câu thoại, kèm ảnh cảnh phim (hiện ở mặt đáp án trong Ôn tập),
 *   nghĩa = phụ đề dịch (hoặc nghĩa các từ mới nếu chưa có phụ đề dịch).
 * - Thẻ từ: câu thoại làm câu ví dụ dạng điền chỗ trống, kèm ảnh cảnh phim nếu có.
 * Thẻ có cả âm thanh gốc (trường `audio`): trang Ôn tập tự phát khi lật thẻ.
 * Mỗi thẻ được ghi liên kết (animeLinks) với tập phim để ôn theo tập / mùa / bộ.
 */
import { addReviewCards, type ReviewCardInput } from '@/modules/review/api'
import { isKanji, tokenize } from '@/modules/dictionary'
import { isStudyWord } from './analysis'
import { isCasual } from './colloquial'
import { glossOf, guessWordCategory, lookupWord } from './dict'
import { episodeLabel } from './importer'
import { addLinks, getClip, linkKey, newId, saveSentence, updateSentence } from './store'
import { formatClock } from './subtitles'
import {
  CATEGORY_LABEL, type AnimeEpisode, type AnimeSeries, type CardLink, type ClipCategory, type Cue, type SavedSentence,
} from './types'


export const animeDeck = (series: Pick<AnimeSeries, 'title'>) => `Anime · ${series.title}`

/** Tạo bản ghi câu đã lưu (chưa ghi vào kho). */
export function makeSentence(series: AnimeSeries, ep: AnimeEpisode, cue: Cue, offset: number, translation?: string): SavedSentence {
  const text = cue.t.replace(/\n/g, ' ')
  return {
    id: newId(), seriesId: series.id, episodeId: ep.id,
    s: cue.s + offset, e: cue.e + offset, text, translation, speaker: cue.n,
    category: isCasual(text) ? 'casual' : 'normal', savedAt: Date.now(),
  }
}

/** Các từ đáng học trong câu (thể từ điển + dạng gặp trong câu), theo thứ tự xuất hiện. */
export async function wordsInSentence(text: string): Promise<{ w: string; s: string; pos: string }[]> {
  const segs = await tokenize(text).catch(() => [])
  const seen = new Set<string>()
  const out: { w: string; s: string; pos: string }[] = []
  for (const seg of segs) {
    const w = seg.base || seg.surface
    if (!isStudyWord(seg) && seg.pos !== '感動詞') continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push({ w, s: seg.surface, pos: seg.pos })
  }
  return out
}

const contextNote = (series: AnimeSeries, ep: AnimeEpisode, x: SavedSentence) =>
  [`${series.title} · ${episodeLabel(ep)} · ${formatClock(x.s / 1000)}`, x.speaker && `Nhân vật: ${x.speaker}`, x.note]
    .filter(Boolean).join('\n')

/** Thẻ cho cả câu. Trả về true nếu thẻ mới được tạo. */
export async function addSentenceCard(series: AnimeSeries, ep: AnimeEpisode, x: SavedSentence): Promise<boolean> {
  let meaning = x.translation?.trim() ?? ''
  if (!meaning) {
    // Chưa có phụ đề dịch: ghi nghĩa từng từ để mặt sau không trống
    const words = await wordsInSentence(x.text)
    const parts: string[] = []
    for (const w of words.slice(0, 6)) {
      const r = await lookupWord(w.w)
      if (r) parts.push(`${w.w}: ${glossOf(r)}`)
    }
    meaning = parts.join(' · ') || '(tự ghi nghĩa trong tab Thẻ)'
  }
  const clip = x.hasImage || x.hasAudio ? await getClip(x.id) : undefined
  const source = { module: 'anime', ref: 's:' + x.id }
  const input: ReviewCardInput = {
    deck: animeDeck(series), kind: 'vocab', front: x.text, meaning,
    notes: contextNote(series, ep, x), image: clip?.image, audio: clip?.audio,
    tags: ['anime', 'câu', CATEGORY_LABEL[x.category]],
    source,
  }
  const added = await addReviewCards([input])
  await addLinks([{ key: linkKey(source), seriesId: series.id, episodeId: ep.id, sentenceId: x.id, category: x.category, addedAt: Date.now() }])
  await updateSentence(x.id, { carded: true })
  return added > 0
}

/** Thẻ từ vựng cho các từ được chọn trong câu (câu làm ví dụ, kèm ảnh). Trả về số thẻ mới. */
export async function addWordCards(
  series: AnimeSeries, ep: AnimeEpisode, x: SavedSentence | undefined, words: { w: string; s: string; pos?: string; example?: string }[],
): Promise<{ added: number; missing: number; dup: number }> {
  const clip = x && (x.hasImage || x.hasAudio) ? await getClip(x.id) : undefined
  const inputs: ReviewCardInput[] = []
  const links: CardLink[] = []
  let missing = 0
  for (const w of words) {
    const r = await lookupWord(w.w)
    if (!r) { missing++; continue }
    const reading = r.data.r[0]?.t
    const cat: ClipCategory = guessWordCategory(r, w.pos)
    const line = x?.text ?? w.example
    const source = { module: 'dictionary', ref: r.id }
    inputs.push({
      deck: animeDeck(series), kind: 'vocab', front: w.w, reading: reading && reading !== w.w ? reading : undefined,
      meaning: glossOf(r),
      example: line ? (line.includes(w.s) ? line.replace(w.s, `{{${w.s}}}`) : line) : undefined,
      exampleMeaning: x?.translation,
      notes: x ? contextNote(series, ep, x) : `${series.title} · ${episodeLabel(ep)}`,
      image: clip?.image,
      audio: clip?.audio,
      tags: ['anime', ...(cat !== 'normal' ? [CATEGORY_LABEL[cat]] : [])],
      // Cùng nguồn với nút "Thêm vào ôn tập" của Từ điển → không tạo trùng giữa các nơi
      source,
    })
    links.push({ key: linkKey(source), seriesId: series.id, episodeId: ep.id, sentenceId: x?.id, category: cat, addedAt: Date.now() })
  }
  const added = await addReviewCards(inputs)
  await addLinks(links)
  return { added, missing, dup: inputs.length - added }
}

/** Lưu câu + ảnh ngay; âm thanh ghi sau (mất vài giây) rồi gắn vào. */
export async function storeSentence(x: SavedSentence, image?: Blob): Promise<void> {
  await saveSentence(x, image ? { id: x.id, image } : undefined)
}

/** Các chữ Kanji trong câu. */
export const kanjiIn = (text: string) => [...new Set([...text].filter(isKanji))]
