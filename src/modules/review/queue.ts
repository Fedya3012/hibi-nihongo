/**
 * HÀNG ĐỢI MỘT BUỔI ÔN và CHỌN DẠNG CÂU HỎI
 */
import { retrievability, DAY } from './fsrs'
import { allCards, getOverview, isBuried } from './store'
import { CardState, type QuestionMode, type QuestionType, type SrsCard } from './types'

export interface QueueOptions {
  deck?: string | null // chỉ ôn một bộ; null = tất cả
  quick?: boolean // ôn nhanh 5 phút: ưu tiên thẻ sắp quên nhất
  /** Chỉ ôn thẻ có ít nhất một nhãn trong danh sách (vd ôn riêng bài giáo trình: ['minna-5', 'minna-6']). */
  tags?: string[]
}

/**
 * Lấy danh sách thẻ cho buổi ôn:
 *  1. Thẻ đến hạn. Thẻ có khả năng nhớ thấp nhất (sắp quên nhất) lên trước.
 *  2. Thẻ mới, trong giới hạn mỗi ngày, xen kẽ: cứ 4 thẻ ôn thì 1 thẻ mới, để buổi học đỡ nặng.
 */
export async function buildQueue(opts: QueueOptions = {}, now = Date.now()): Promise<SrsCard[]> {
  const [cards, overview] = await Promise.all([allCards(), getOverview(now)])
  const tags = opts.tags?.length ? new Set(opts.tags) : null
  const pool = cards.filter((c) => !c.suspended && !isBuried(c, now) && (!opts.deck || c.deck === opts.deck)
    && (!tags || !!c.tags?.some((t) => tags.has(t))))
  const recallOf = (c: SrsCard) =>
    c.state === CardState.Review ? retrievability((now - (c.lastReview ?? now)) / DAY, c.stability) : -1
  const due = pool
    .filter((c) => c.state !== CardState.New && c.due <= now)
    .sort((a, b) => recallOf(a) - recallOf(b) || a.due - b.due)
  const fresh = pool
    .filter((c) => c.state === CardState.New)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, overview.newAvailable)

  if (opts.quick) return [...due, ...fresh]
  const out: SrsCard[] = []
  let i = 0
  let j = 0
  while (i < due.length || j < fresh.length) {
    for (let k = 0; k < 4 && i < due.length; k++) out.push(due[i++])
    if (j < fresh.length) out.push(fresh[j++])
  }
  return out
}

const hasKanji = (s: string) => /[一-鿿々]/.test(s)
export const CLOZE_RE = /\{\{(.+?)\}\}/
/** Các phần cần điền trong câu ví dụ, theo thứ tự. */
export const clozeAnswers = (example: string) => [...example.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1])

/** Các dạng câu hỏi dùng được cho thẻ này. */
export function availableQuestions(card: SrsCard, pool: SrsCard[]): QuestionType[] {
  if (card.frontImage) return ['recognize'] // thẻ ảnh che chữ: chỉ hỏi kiểu nhìn ảnh → nhớ câu
  const list: QuestionType[] = ['recognize', 'recall']
  const others = new Set(pool.filter((c) => c.kind === card.kind && c.meaning !== card.meaning).map((c) => c.meaning))
  if (others.size >= 3) list.push('choice')
  if (card.kind === 'vocab' && card.reading && hasKanji(card.front)) list.push('typing')
  if (card.example && CLOZE_RE.test(card.example)) list.push('cloze')
  return list
}

/**
 * Chọn dạng câu hỏi. Chế độ "Trộn": thẻ mới luôn hỏi kiểu dễ nhất (nhìn chữ → nhớ nghĩa),
 * thẻ đã học thì chọn ngẫu nhiên, ưu tiên dạng "khó" hơn khi thẻ đã bền.
 */
export function pickQuestion(card: SrsCard, mode: QuestionMode, pool: SrsCard[]): QuestionType {
  const avail = availableQuestions(card, pool)
  if (mode !== 'mixed') return avail.includes(mode) ? mode : 'recognize'
  if (card.state === CardState.New || card.state === CardState.Learning) {
    return card.reps === 0 || !avail.includes('choice') ? 'recognize' : 'choice'
  }
  // Grammar có câu ví dụ thì hay hỏi điền chỗ trống
  if (avail.includes('cloze') && Math.random() < 0.5) return 'cloze'
  const weights: Partial<Record<QuestionType, number>> = {
    recognize: 3,
    recall: card.stability > 7 ? 3 : 1,
    choice: card.stability > 7 ? 1 : 2,
    typing: 2,
    cloze: 2,
  }
  const items = avail.map((q) => [q, weights[q] ?? 1] as const)
  let r = Math.random() * items.reduce((s, [, w]) => s + w, 0)
  for (const [q, w] of items) if ((r -= w) <= 0) return q
  return 'recognize'
}

/** 4 lựa chọn nghĩa cho câu hỏi trắc nghiệm (1 đúng + 3 sai, xáo trộn). */
export function choiceOptions(card: SrsCard, pool: SrsCard[]): string[] {
  const others = [...new Set(pool.filter((c) => c.kind === card.kind && c.meaning !== card.meaning).map((c) => c.meaning))]
  shuffle(others)
  const opts = [card.meaning, ...others.slice(0, 3)]
  return shuffle(opts)
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const QUESTION_LABEL: Record<QuestionMode, string> = {
  mixed: 'Trộn nhiều dạng',
  recognize: 'Nhìn chữ → nhớ nghĩa',
  recall: 'Nhìn nghĩa → nhớ chữ',
  choice: 'Trắc nghiệm 4 đáp án',
  typing: 'Gõ cách đọc',
  cloze: 'Điền vào chỗ trống',
}
