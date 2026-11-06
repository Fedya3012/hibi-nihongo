/**
 * TRẠNG THÁI HỌC THEO CẤP: đọc thẻ Ôn tập để biết mục nào đã mở khóa / đang học / đã thuộc.
 *
 * Không lưu bảng riêng: trạng thái suy ra từ thẻ Ôn tập (nguồn `source` của thẻ), nên ôn ở đâu cũng được tính.
 *   - Bộ thủ:  thẻ nguồn { module: 'kanji', ref: 'rad:<chữ>' }   (do mục này tạo)
 *   - Kanji:   thẻ nguồn { module: 'kanji', ref: '<chữ>' }        (giống nút "+ Ôn tập" của module Kanji)
 *              hoặc { module: 'dictionary', ref: 'kanji:<chữ>' } (thêm từ Từ điển)
 *   - Từ vựng: thẻ nguồn { module: 'dictionary', ref: '<mã JMdict>' } (trùng với Từ điển nên không bị thêm 2 lần)
 *
 * "Đã thuộc" (giống mức Guru của WaniKani): thẻ đã qua giai đoạn học (trạng thái Review)
 * và độ bền trí nhớ (stability) ≥ PASS_DAYS ngày, tức là đã ôn đúng thêm ít nhất một lần vào ngày khác.
 *
 * Luật mở khóa:
 *   - Cấp 1 luôn mở. Cấp sau mở khi ≥ 90% Kanji của cấp trước đã thuộc (hoặc tự mở bằng nút "Tôi đã biết cấp này").
 *   - Trong cấp đã mở: bộ thủ mở ngay; Kanji mở khi mọi bộ thủ + Kanji thành phần của nó đã thuộc;
 *     từ vựng mở khi mọi Kanji trong từ đã thuộc.
 *   - Mục đã có thẻ Ôn tập (vd thêm từ danh sách JLPT) thì luôn tính theo thẻ, dù cấp chưa mở.
 *
 * kv `kanji:levels` → { unlocked: số cấp cao nhất được tự mở } (có trong file sao lưu).
 */
import { getPack, kvGet, kvSet, listItems, useDbQuery } from '@/core/db'
import { getKanji, getWord, headword, shortMeaning as wordMeaning, type KanjiData } from '@/modules/dictionary'
import { addReviewCards, getReviewCardsBySource, type ReviewCardInput, type SrsCard } from '@/modules/review/api'
import { CardState } from '@/modules/review/types'
import { RADICALS } from '../data/radicals'
import { getStudyIndex, shortMeaning, STUDY_PACK, type StudyData } from '../lib/data'
import { addKanjiCards } from '../lib/progress'
import { buildPlan, type KanjiItem, type KanjiLevel, type LevelPlan, type RadicalItem, type VocabItem } from './plan'

/** Số ngày "độ bền trí nhớ" để coi là đã thuộc. */
export const PASS_DAYS = 6
/** Tỉ lệ Kanji đã thuộc để mở cấp sau. */
export const LEVEL_UP_RATIO = 0.9
/** Số mục mỗi lượt học bài mới. */
export const LESSON_BATCH = 5

const LEVELS_KEY = 'kanji:levels'

// ---------------------------------------------------------------------------
// Đọc kế hoạch (tính lại khi gói kanji-study đổi phiên bản)
// ---------------------------------------------------------------------------

let cached: { version: number; plan: Promise<LevelPlan | undefined> } | undefined

export async function getLevelPlan(): Promise<LevelPlan | undefined> {
  const pack = await getPack(STUDY_PACK)
  if (!pack || pack.status !== 'ready') return undefined
  if (cached?.version !== pack.version) {
    const plan = (async () => {
      const ix = await getStudyIndex()
      if (!ix) return undefined
      const items = await listItems<StudyData>(STUDY_PACK)
      const study = new Map(items.filter((it) => it.id !== '_index').map((it) => [it.id, it.data]))
      return buildPlan([
        ...['5', '4', '3', '2', '1'].map((lv) => ({ jlpt: Number(lv), chars: [...(ix.jlpt[lv] ?? '')] })),
        { chars: [...ix.joyo] },
      ], study)
    })()
    cached = { version: pack.version, plan }
    plan.then((p) => { if (!p) cached = undefined }, () => { cached = undefined })
  }
  return cached.plan
}

// ---------------------------------------------------------------------------
// Trạng thái
// ---------------------------------------------------------------------------

/** locked: chưa mở · lesson: mở rồi, chờ học bài mới · learning: đang ôn · passed: đã thuộc */
export type ItemState = 'locked' | 'lesson' | 'learning' | 'passed'

export type LevelEntry =
  | { type: 'radical'; key: string; item: RadicalItem; level: number }
  | { type: 'kanji'; key: string; item: KanjiItem; level: number }
  | { type: 'vocab'; key: string; item: VocabItem; level: number }

export const radicalKey = (c: string) => 'r:' + c
export const kanjiKey = (c: string) => 'k:' + c
export const vocabKey = (id: string) => 'v:' + id

export interface LevelStat {
  unlocked: boolean
  kanjiPassed: number
  /** Số Kanji cần thuộc để mở cấp sau. */
  kanjiNeeded: number
}

export interface LevelStatus {
  plan: LevelPlan
  state: Map<string, ItemState>
  stats: LevelStat[] // theo thứ tự cấp (index 0 = cấp 1)
  /** Cấp cao nhất đã mở. */
  current: number
  /** Mục chờ học bài mới, theo thứ tự nên học (cấp thấp trước; bộ thủ → Kanji → từ). */
  lessons: LevelEntry[]
  /** Số cấp đã tự mở bằng tay. */
  manual: number
}

const passed = (c: SrsCard | undefined) =>
  !!c && c.state === CardState.Review && c.stability >= PASS_DAYS

function cardState(...cards: (SrsCard | undefined)[]): ItemState | undefined {
  const have = cards.filter(Boolean) as SrsCard[]
  if (!have.length) return undefined
  return have.some(passed) ? 'passed' : 'learning'
}

export function entriesOf(lv: KanjiLevel): LevelEntry[] {
  return [
    ...lv.radicals.map((item) => ({ type: 'radical' as const, key: radicalKey(item.char), item, level: lv.n })),
    ...lv.kanji.map((item) => ({ type: 'kanji' as const, key: kanjiKey(item.char), item, level: lv.n })),
    ...lv.vocab.map((item) => ({ type: 'vocab' as const, key: vocabKey(item.id), item, level: lv.n })),
  ]
}

/** Tính trạng thái mọi mục từ kế hoạch + thẻ Ôn tập. Hàm thuần. */
export function computeStatus(plan: LevelPlan, cards: Map<string, SrsCard>, manual: number): LevelStatus {
  const state = new Map<string, ItemState>()
  const stats: LevelStat[] = []
  const lessons: LevelEntry[] = []
  const isPassed = (key: string) => state.get(key) === 'passed'
  let prevOk = true
  let current = 1

  for (const lv of plan.levels) {
    const unlocked: boolean = lv.n === 1 || manual >= lv.n || prevOk
    if (unlocked) current = lv.n

    for (const r of lv.radicals) {
      state.set(radicalKey(r.char), cardState(cards.get('kanji:rad:' + r.char)) ?? (unlocked ? 'lesson' : 'locked'))
    }
    // Kanji trong cùng cấp có thể dùng nhau làm thành phần: tính chữ không phụ thuộc trước
    for (const k of lv.kanji) {
      state.set(kanjiKey(k.char), cardState(cards.get('kanji:' + k.char), cards.get('dictionary:kanji:' + k.char)) ?? 'locked')
    }
    for (let round = 0; round < 3; round++) {
      for (const k of lv.kanji) {
        const key = kanjiKey(k.char)
        if (state.get(key) !== 'locked' || !unlocked) continue
        if (k.radicals.every((r) => isPassed(radicalKey(r))) && k.kanji.every((c) => isPassed(kanjiKey(c)))) state.set(key, 'lesson')
      }
    }
    for (const v of lv.vocab) {
      const s = cardState(cards.get('dictionary:' + v.id))
      state.set(vocabKey(v.id), s ?? (unlocked && v.kanji.every((c) => isPassed(kanjiKey(c))) ? 'lesson' : 'locked'))
    }

    const kanjiPassed = lv.kanji.filter((k) => isPassed(kanjiKey(k.char))).length
    const kanjiNeeded = Math.ceil(lv.kanji.length * LEVEL_UP_RATIO)
    stats.push({ unlocked, kanjiPassed, kanjiNeeded })
    prevOk = unlocked && kanjiPassed >= kanjiNeeded
    for (const e of entriesOf(lv)) if (state.get(e.key) === 'lesson') lessons.push(e)
  }

  return { plan, state, stats, current, lessons, manual }
}

export const getManualUnlock = async () => (await kvGet<{ unlocked?: number }>(LEVELS_KEY, {})).unlocked ?? 0

export async function getLevelStatus(): Promise<LevelStatus | undefined> {
  const [plan, cards, manual] = await Promise.all([getLevelPlan(), getReviewCardsBySource(), getManualUnlock()])
  return plan && computeStatus(plan, cards, manual)
}

/** Hook: trạng thái học theo cấp, tự cập nhật khi ôn thẻ / thêm thẻ / cài gói. */
export function useLevelStatus() {
  return useDbQuery(getLevelStatus, [], ['srsCards', 'kv', 'packs'])
}

/** Tự mở tới cấp `n` (người đã biết các cấp trước). n = 0 để bỏ. */
export async function setManualUnlock(n: number) {
  await kvSet(LEVELS_KEY, { unlocked: n })
}

// ---------------------------------------------------------------------------
// Tên / nghĩa để hiện và để tạo thẻ
// ---------------------------------------------------------------------------

/** Tên bộ thủ: "Nhân · người". Thành phần không phải bộ thủ: âm Hán Việt + nghĩa trong KANJIDIC. */
export function radicalLabel(r: RadicalItem, dic?: KanjiData): { name: string; meaning: string } {
  if (r.n) return { name: RADICALS[r.n][1], meaning: RADICALS[r.n][2] }
  const hv = dic?.hv?.[0]
  return { name: hv ? hv[0].toUpperCase() + hv.slice(1) : '', meaning: shortMeaning(r.char, dic) }
}

/** Các chữ trong kế hoạch có dùng thành phần này (để gợi nhớ). */
export function usedIn(plan: LevelPlan, char: string, max = 8): string[] {
  const out: string[] = []
  for (const lv of plan.levels) for (const k of lv.kanji) {
    if (k.radicals.includes(char) && out.length < max) out.push(k.char)
  }
  return out
}

async function radicalCard(plan: LevelPlan, r: RadicalItem, level: number): Promise<ReviewCardInput> {
  const { name, meaning } = radicalLabel(r, r.n ? undefined : await getKanji(r.char))
  const uses = usedIn(plan, r.char, 6)
  return {
    deck: 'Kanji theo cấp · Bộ thủ',
    kind: 'kanji',
    front: r.char,
    meaning: [name.toUpperCase(), meaning].filter(Boolean).join(' · ') || r.char,
    notes: [r.n ? `Bộ thủ số ${r.n}.` : 'Thành phần (chữ Hán dùng làm bộ phận của chữ khác).',
      uses.length ? `Gặp trong: ${uses.join(' ')}` : ''].filter(Boolean).join(' '),
    tags: ['bộ thủ', `cấp ${level}`],
    source: { module: 'kanji', ref: 'rad:' + r.char },
  }
}

async function vocabCard(v: VocabItem, level: number): Promise<ReviewCardInput> {
  const d = await getWord(v.id)
  const hw = d ? headword(d) : { word: v.word, reading: v.reading }
  const front = d ? hw.word : v.word
  return {
    deck: 'Kanji theo cấp · Từ vựng',
    kind: 'vocab',
    front,
    reading: front === hw.reading ? undefined : hw.reading,
    meaning: d ? await wordMeaning(v.id, d) : v.gloss,
    tags: [...(d?.j ? [`N${d.j}`] : []), `cấp ${level}`],
    source: { module: 'dictionary', ref: v.id },
  }
}

/** Học xong bài mới → đưa các mục vào Ôn tập. Trả về số thẻ được thêm. */
export async function addLessonCards(plan: LevelPlan, entries: LevelEntry[]): Promise<number> {
  const cards: ReviewCardInput[] = []
  for (const e of entries) {
    if (e.type === 'radical') cards.push(await radicalCard(plan, e.item, e.level))
    else if (e.type === 'vocab') cards.push(await vocabCard(e.item, e.level))
  }
  let n = cards.length ? await addReviewCards(cards) : 0
  const kanji = entries.filter((e) => e.type === 'kanji').map((e) => e.item.char as string)
  if (kanji.length) n += await addKanjiCards(kanji)
  return n
}
