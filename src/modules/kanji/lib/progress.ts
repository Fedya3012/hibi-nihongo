/**
 * TIẾN ĐỘ HỌC KANJI VÀ GHI CHÚ RIÊNG
 * ----------------------------------
 * Lưu trong kv (tự có trong file sao lưu), không cần bảng riêng:
 *   "kanji:progress" → { [chữ]: { w: số lần viết xong, best: điểm viết cao nhất, last, srs: đã vào Ôn tập } }
 *   "kanji:notes"    → { [chữ]: câu chuyện ghi nhớ người học tự viết }
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import { addReviewCards, type ReviewCardInput } from '@/modules/review/api'
import type { KanjiData } from '@/modules/dictionary'
import { STORIES } from '../data/stories'
import { getKanjiFull, plainSentence } from './data'

export interface KanjiStat { w?: number; best?: number; last?: number; srs?: boolean }
export type KanjiProgress = Record<string, KanjiStat>

const PROGRESS_KEY = 'kanji:progress'
const NOTES_KEY = 'kanji:notes'

export const getKanjiProgress = () => kvGet<KanjiProgress>(PROGRESS_KEY, {})
export const useKanjiProgress = () => useDbQuery(getKanjiProgress, [], ['kv']).data

export const getNotes = () => kvGet<Record<string, string>>(NOTES_KEY, {})
export const useNotes = () => useDbQuery(getNotes, [], ['kv']).data

export async function saveNote(char: string, text: string) {
  const notes = await getNotes()
  if (text.trim()) notes[char] = text.trim()
  else delete notes[char]
  await kvSet(NOTES_KEY, notes)
}

/** Ghi kết quả một lần viết xong cả chữ. score: 0–100. */
export async function recordWriting(char: string, score: number) {
  const p = await getKanjiProgress()
  const s = p[char] ?? {}
  p[char] = { ...s, w: (s.w ?? 0) + 1, best: Math.max(s.best ?? 0, score), last: Date.now() }
  await kvSet(PROGRESS_KEY, p)
}

/** Tạo nội dung thẻ Ôn tập cho một chữ. */
function cardFor(char: string, dic: KanjiData | undefined, note?: string): ReviewCardInput {
  const story = STORIES[char]
  const hv = dic?.hv?.length ? dic.hv[0].toUpperCase() : ''
  const meaning = [hv, story?.v ?? dic?.m?.slice(0, 3).join(', ')].filter(Boolean).join(' · ')
  const ex = story?.ex?.[0]
  return {
    deck: dic?.j ? `Kanji N${dic.j}` : 'Kanji khác',
    kind: 'kanji',
    front: char,
    reading: [...(dic?.on ?? []).slice(0, 3), ...(dic?.kun ?? []).slice(0, 3)].join('、') || undefined,
    meaning: meaning || char,
    example: ex ? plainSentence(ex[0]) : undefined,
    exampleMeaning: ex?.[1],
    notes: note ?? story?.s,
    tags: dic?.j ? [`N${dic.j}`, 'kanji'] : ['kanji'],
    source: { module: 'kanji', ref: char },
  }
}

/** Đưa các chữ vào Ôn tập. Trả về số thẻ mới được thêm (chữ đã có thì bỏ qua). */
export async function addKanjiCards(chars: string[]): Promise<number> {
  const notes = await getNotes()
  const fulls = await Promise.all(chars.map((c) => getKanjiFull(c)))
  const n = await addReviewCards(fulls.map((f) => cardFor(f.char, f.dic, notes[f.char])))
  const p = await getKanjiProgress()
  for (const c of chars) p[c] = { ...p[c], srs: true }
  await kvSet(PROGRESS_KEY, p)
  return n
}
