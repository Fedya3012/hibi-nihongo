/**
 * TIẾN ĐỘ HỌC NGỮ PHÁP
 * --------------------
 * Lưu trong kv (tự có trong file sao lưu), không cần bảng riêng:
 *   "grammar:progress" → { [mã mẫu]: { learned: lúc bấm "Đã hiểu", right/wrong: số câu luyện đúng/sai, last } }
 * Mẫu nào đã có thẻ Ôn tập thì đọc thẳng từ bảng srsCards (source.module = 'grammar'),
 * nên xóa thẻ bên Ôn tập thì ở đây cũng tự cập nhật.
 */
import { getAll, kvGet, kvSet, useDbQuery } from '@/core/db'
import { addReviewCards, type ReviewCardInput, type SrsCard } from '@/modules/review/api'
import type { GrammarPoint } from '../types'
import { blanks, clozeText } from './parse'

export interface GrammarStat { learned?: number; right?: number; wrong?: number; last?: number }
export type GrammarProgress = Record<string, GrammarStat>

const KEY = 'grammar:progress'

export const getGrammarProgress = () => kvGet<GrammarProgress>(KEY, {})

/** Mã các mẫu đã có thẻ trong Ôn tập. */
export async function grammarInReview(): Promise<Set<string>> {
  const cards = await getAll<SrsCard>('srsCards')
  return new Set(cards.filter((c) => c.source?.module === 'grammar').map((c) => c.source!.ref))
}

export interface GrammarState { progress: GrammarProgress; inReview: Set<string> }

/** Hook React: tiến độ + mẫu nào đã vào Ôn tập, tự cập nhật. */
export function useGrammarState(): GrammarState | undefined {
  return useDbQuery(async () => ({ progress: await getGrammarProgress(), inReview: await grammarInReview() }), [], ['kv', 'srsCards']).data
}

async function update(ids: string[], fn: (s: GrammarStat) => GrammarStat) {
  const p = await getGrammarProgress()
  for (const id of ids) p[id] = fn(p[id] ?? {})
  await kvSet(KEY, p)
}

/** Đánh dấu đã hiểu / bỏ đánh dấu. */
export const setLearned = (id: string, on: boolean) =>
  update([id], (s) => ({ ...s, learned: on ? Date.now() : undefined }))

/** Ghi kết quả bài luyện: { mã mẫu: [đúng?, đúng?…] }. */
export async function recordPractice(results: Record<string, boolean[]>) {
  const p = await getGrammarProgress()
  const now = Date.now()
  for (const [id, list] of Object.entries(results)) {
    const s = p[id] ?? {}
    const right = list.filter(Boolean).length
    p[id] = { ...s, right: (s.right ?? 0) + right, wrong: (s.wrong ?? 0) + list.length - right, last: now }
  }
  await kvSet(KEY, p)
}

/** Nội dung thẻ Ôn tập cho một mẫu. Câu ví dụ có {{ }} → dùng được dạng "Điền vào chỗ trống". */
export function cardFor(p: GrammarPoint): ReviewCardInput {
  const ex = p.examples.find((e) => blanks(e[0]).length === 1) ?? p.examples[0]
  return {
    deck: `Ngữ pháp N${p.level}`,
    kind: 'grammar',
    front: p.pattern,
    meaning: p.meaning,
    example: ex ? clozeText(ex[0]) : undefined,
    exampleMeaning: ex?.[1],
    notes: p.form.join('\n'),
    tags: [`N${p.level}`, 'grammar'],
    source: { module: 'grammar', ref: p.id },
  }
}

/** Đưa các mẫu vào Ôn tập (mẫu đã có thì bỏ qua) và đánh dấu đã học. Trả về số thẻ mới. */
export async function addGrammarCards(points: GrammarPoint[]): Promise<number> {
  const n = await addReviewCards(points.map(cardFor))
  const now = Date.now()
  await update(points.map((p) => p.id), (s) => ({ ...s, learned: s.learned ?? now }))
  return n
}
