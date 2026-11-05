/**
 * TIẾN ĐỘ GIÁO TRÌNH: từ nào đã thuộc, % mỗi bài, bài nào bị khóa (học tuần tự).
 *
 * Một từ "đã thuộc" khi:
 *   - bạn tự đánh dấu đã thuộc (trong bài, hoặc "Đã biết"/"Bỏ qua" ở Kho từ của tôi, vd từ popup tra từ), hoặc
 *   - thẻ Ôn tập của nó đã qua giai đoạn học và nhớ được ít nhất 7 ngày (độ bền FSRS ≥ 7).
 * Bạn tự đánh dấu "chưa thuộc" thì luôn tính là chưa thuộc.
 * Một mẫu ngữ pháp "đã học" khi bạn bấm "Đã hiểu" hoặc mẫu đã có trong Ôn tập (giống trang Ngữ pháp).
 * % của bài = (từ đã thuộc + mẫu đã học) / (số từ + số mẫu).
 */
import { getReviewCardsBySource, type SrsCard } from '@/modules/review/api'
import { loadKnowledge, manualStatus, type Knowledge, type ManualStatus } from '@/modules/vocab/api'
import { getGrammarProgress, grammarInReview, type GrammarProgress } from '@/modules/grammar/api'
import type { Lesson, LessonWord, Textbook } from '../types'
import { lessonGrammarIds, loadAllGrammar } from './grammar'

/** Độ bền trí nhớ (ngày) tối thiểu để coi một từ là đã thuộc. */
export const KNOWN_STABILITY = 7
const REVIEW_STATE = 2 // CardState.Review

export type WordState = 'known' | 'learning' | 'unseen'

export function sourceKey(l: Lesson, w: LessonWord): string {
  return w.jmId ? `dictionary:${w.jmId}` : `textbook:${l.id}:${w.word}:${w.reading ?? ''}`
}

/** Trạng thái tự đánh dấu của từ trong Kho từ dùng chung (khớp theo mã Từ điển nếu có). */
export function sharedStatus(w: LessonWord, k: Knowledge | undefined): ManualStatus | undefined {
  return k ? manualStatus(k, { w: w.word, id: w.jmId, alt: w.reading ? [w.reading] : undefined }) : undefined
}

export function wordState(w: LessonWord, card: SrsCard | undefined, shared?: ManualStatus): WordState {
  if (w.known === true) return 'known'
  if (w.known === false) return card ? 'learning' : 'unseen'
  // Đánh dấu ở Kho từ (popup tra từ, anime...) cũng tính
  if (shared === 'known' || shared === 'ignored') return 'known'
  if (!card) return shared === 'learning' ? 'learning' : 'unseen'
  return card.state === REVIEW_STATE && card.stability >= KNOWN_STABILITY ? 'known' : 'learning'
}

export interface LessonProgress {
  total: number
  known: number
  learning: number
  /** Số từ đã có thẻ Ôn tập (đã bấm "Học bài này"). */
  inReview: number
  /** Số lần quên (lapses) cộng dồn của các thẻ trong bài: cao = bài yếu. */
  lapses: number
  grammarTotal: number
  grammarLearned: number
  /** 0–1. Bài đánh dấu xong = 1. */
  ratio: number
}

export interface GrammarInfo { ids: string[]; progress: GrammarProgress; inReview: Set<string> }

export function lessonProgress(l: Lesson, cards: Map<string, SrsCard>, g?: GrammarInfo, k?: Knowledge): LessonProgress {
  let known = 0, learning = 0, inReview = 0, lapses = 0
  for (const w of l.words) {
    const c = cards.get(sourceKey(l, w))
    if (c) { inReview++; lapses += c.lapses }
    const s = wordState(w, c, sharedStatus(w, k))
    if (s === 'known') known++
    else if (s === 'learning') learning++
  }
  const total = l.words.length
  const grammarTotal = g?.ids.length ?? 0
  const grammarLearned = g ? g.ids.filter((id) => g.progress[id]?.learned || g.inReview.has(id)).length : 0
  const all = total + grammarTotal
  const ratio = l.status === 'done' ? 1 : all ? (known + grammarLearned) / all : 0
  return { total, known, learning, inReview, lapses, ratio, grammarTotal, grammarLearned }
}

export const unlockRatio = (b: Textbook) => b.unlockAt ?? 0.8

/**
 * Bài có bị khóa không (chỉ khi bật học tuần tự). Bài đầu luôn mở.
 * Bài N mở khi bài N-1 đã đánh dấu xong, hoặc thuộc ≥ ngưỡng (mặc định 80%) số từ của bài N-1.
 * Bài đã mở hoặc đã học rồi thì không khóa lại.
 */
export function lockedSet(b: Textbook, lessons: Lesson[], prog: Map<string, LessonProgress>): Set<number> {
  const locked = new Set<number>()
  if (!b.sequential) return locked
  let open = true
  for (const l of lessons) {
    if (!open && l.status === 'new') locked.add(l.number)
    const p = prog.get(l.id)
    const passed = l.status === 'done' || (!!p && p.total + p.grammarTotal > 0 && p.ratio >= unlockRatio(b))
    open = (open || l.status !== 'new') && passed
  }
  return locked
}

/** Đọc mọi thứ cần cho tiến độ một sách trong một lần (thẻ ôn đọc một lần, dùng chung). */
export async function bookProgress(books: Textbook[], lessons: Lesson[]): Promise<{
  cards: Map<string, SrsCard>; byLesson: Map<string, LessonProgress>; grammarIds: Map<string, string[]>
}> {
  const [cards, all, progress, inReview, knowledge] = await Promise.all([
    getReviewCardsBySource(), loadAllGrammar().catch(() => []), getGrammarProgress(), grammarInReview(),
    loadKnowledge().catch(() => undefined),
  ])
  const bookById = new Map(books.map((b) => [b.id, b]))
  const grammarIds = new Map<string, string[]>()
  const byLesson = new Map<string, LessonProgress>()
  for (const l of lessons) {
    const b = bookById.get(l.bookId)
    const ids = b ? lessonGrammarIds(b, l, all) : []
    grammarIds.set(l.id, ids)
    byLesson.set(l.id, lessonProgress(l, cards, { ids, progress, inReview }, knowledge))
  }
  return { cards, byLesson, grammarIds }
}

/** Bài nên học tiếp: bài sau bài đang học gần nhất, hoặc bài đầu tiên chưa xong. */
export function nextLesson(_b: Textbook, lessons: Lesson[], locked: Set<number>): Lesson | undefined {
  const open = lessons.filter((l) => !locked.has(l.number))
  return open.find((l) => l.status === 'learning') ?? open.find((l) => l.status === 'new')
}
