/**
 * TÍNH TIẾN ĐỘ LỘ TRÌNH TỪ DỮ LIỆU CỦA CÁC MODULE KHÁC
 * ------------------------------------------------------
 * Lộ trình không lưu tiến độ riêng: mọi con số đều đọc lại từ module gốc, nên học ở đâu
 * (trang Kana, Kanji, Ngữ pháp, Giáo trình, Ôn tập, popup tra từ…) lộ trình cũng tự cập nhật.
 *
 *   Kana     → kv "kana:progress": chữ "đã thuộc" (đúng ≥ 3 lần, ≥ 80%)
 *   Kanji    → thẻ Ôn tập loại kanji đã qua giai đoạn học (Kho từ: kanjiStatus = 'known')
 *   Ngữ pháp → mẫu bấm "Đã hiểu" hoặc đã có trong Ôn tập (giống trang Ngữ pháp)
 *   Từ vựng  → số từ "đã biết" trong Kho từ (tự đánh dấu + thẻ Ôn tập đã thuộc), cộng dồn
 *   Giáo trình → bài đã xong hoặc đủ % để mở bài sau (giống trang Giáo trình)
 */
import { ALL_KANA } from '@/modules/kana/data'
import { getProgress as getKanaProgress, levelOf } from '@/modules/kana/progress'
import { getStudyIndex } from '@/modules/kanji/lib/data'
import { getGrammarProgress, grammarInReview, grammarLevelPath, listGrammarPoints } from '@/modules/grammar/api'
import { loadKnowledge, type Knowledge } from '@/modules/vocab/api'
import { listBooks, listLessons, addBookFromTemplate } from '@/modules/textbook/store'
import { TEMPLATES } from '@/modules/textbook/templates'
import { bookProgress, unlockRatio } from '@/modules/textbook/lib/progress'
import type { Lesson, Textbook } from '@/modules/textbook/types'
import { BOOK_FOR, DONE_AT, JLPT_NUM, VOCAB_TARGET } from '../data/levels'
import { LEVELS, type LevelId, type LevelPlan, type RoadmapState, type Step } from '../types'
import { levelIndex } from './state'
import type { Tr } from '../strings'


/** Mọi dữ liệu thô cần cho lộ trình, đọc một lần. */
export interface RawData {
  kanaKnown: { hiragana: number; katakana: number }
  kanaTotal: { hiragana: number; katakana: number }
  /** Chữ kanji theo cấp ('5' → '日一…'); undefined = chưa tải gói Kanji. */
  kanjiByLevel?: Record<string, string>
  knowledge?: Knowledge
  grammar: Record<number, { total: number; learned: number }>
  vocabKnown: number
  books: Map<string, { book: Textbook; passed: number }>
}

export async function loadRaw(): Promise<RawData> {
  const [kana, index, knowledge, gProgress, gReview, gList, books] = await Promise.all([
    getKanaProgress(),
    getStudyIndex().catch(() => undefined),
    loadKnowledge().catch(() => undefined),
    getGrammarProgress(),
    grammarInReview(),
    listGrammarPoints().catch(() => []),
    listBooks(),
  ])

  const kanaKnown = { hiragana: 0, katakana: 0 }
  const kanaTotal = { hiragana: 0, katakana: 0 }
  for (const k of ALL_KANA) {
    kanaTotal[k.script]++
    if (levelOf(kana[k.char]) === 'known') kanaKnown[k.script]++
  }

  const grammar: RawData['grammar'] = {}
  for (const p of gList) {
    const g = (grammar[p.level] ??= { total: 0, learned: 0 })
    g.total++
    if (gProgress[p.id]?.learned || gReview.has(p.id)) g.learned++
  }

  // Từ đã biết: gộp từ tự đánh dấu "Đã biết" và từ có thẻ Ôn tập đã thuộc (không đếm trùng)
  const known = new Set<string>()
  if (knowledge) {
    for (const [w, st] of knowledge.manualWords) if (st === 'known') known.add(w)
    for (const [w, st] of knowledge.srsWords) if (st === 'known') known.add(w)
  }

  // Giáo trình: số bài đã qua của các sách có trên kệ
  const bookMap = new Map<string, { book: Textbook; passed: number }>()
  const wanted = books.filter((b) => b.template)
  if (wanted.length) {
    const lessons: Lesson[] = (await Promise.all(wanted.map((b) => listLessons(b.id)))).flat()
    const { byLesson } = await bookProgress(wanted, lessons).catch(() => ({ byLesson: new Map() }))
    for (const b of wanted) {
      const passed = lessons.filter((l) => {
        if (l.bookId !== b.id) return false
        const p = byLesson.get(l.id)
        return l.status === 'done' || (!!p && p.total + p.grammarTotal > 0 && p.ratio >= unlockRatio(b))
      }).length
      bookMap.set(b.template!, { book: b, passed })
    }
  }

  return { kanaKnown, kanaTotal, kanjiByLevel: index?.jlpt, knowledge, grammar, vocabKnown: known.size, books: bookMap }
}

const ratioOf = (have: number, total: number) => (total > 0 ? Math.min(1, have / total) : 0)

/** Các bước của một chặng. */
export function stepsFor(level: LevelId, raw: RawData, state: RoadmapState, t: Tr): Step[] {
  if (level === 'kana') {
    return (['hiragana', 'katakana'] as const).map((script) => ({
      id: script,
      kind: 'kana' as const,
      title: script === 'hiragana' ? 'Hiragana' : 'Katakana',
      detail: t('knownOf', { n: raw.kanaKnown[script], total: raw.kanaTotal[script] }),
      ratio: ratioOf(raw.kanaKnown[script], raw.kanaTotal[script]),
      link: '/learn/kana',
    }))
  }

  const lv = JLPT_NUM[level]!
  const steps: Step[] = []

  // 1. Giáo trình (chỉ N5, N4 và khi có chọn sách)
  const tplId = state.series !== 'none' ? BOOK_FOR[state.series][level] : undefined
  const tpl = tplId ? TEMPLATES.find((x) => x.id === tplId) : undefined
  if (tpl) {
    const b = raw.books.get(tpl.id)
    steps.push({
      id: 'textbook',
      kind: 'textbook',
      title: tpl.short,
      detail: b ? t('lessonsOf', { n: b.passed, total: tpl.lessonCount }) : t('bookMissing'),
      ratio: b ? ratioOf(b.passed, tpl.lessonCount) : 0,
      link: b ? `/learn/textbook?b=${encodeURIComponent(b.book.id)}` : '/learn/textbook',
      action: b ? undefined : { label: t('addBook'), run: () => addBookFromTemplate(tpl) },
    })
  }

  // 2. Ngữ pháp
  const g = raw.grammar[lv]
  steps.push(g && g.total
    ? { id: 'grammar', kind: 'grammar', title: t('stepGrammar'), detail: t('learnedOf', { n: g.learned, total: g.total }),
        ratio: ratioOf(g.learned, g.total), link: grammarLevelPath(lv) }
    : { id: 'grammar', kind: 'grammar', title: t('stepGrammar'), detail: t('soonContent'), soon: true, link: '/learn/grammar' })

  // 3. Từ vựng (cộng dồn)
  const target = VOCAB_TARGET[level] ?? 0
  steps.push({
    id: 'vocab', kind: 'vocab', title: t('stepVocab'),
    detail: t('wordsOf', { n: Math.min(raw.vocabKnown, target), total: target }),
    ratio: ratioOf(raw.vocabKnown, target), link: '/learn/words',
  })

  // 4. Kanji của cấp
  const chars = raw.kanjiByLevel?.[String(lv)]
  if (chars) {
    const list = [...chars]
    const known = raw.knowledge ? list.filter((c) => raw.knowledge!.kanji.get(c) === 'known').length : 0
    const learning = raw.knowledge ? list.filter((c) => raw.knowledge!.kanji.get(c) === 'learning').length : 0
    steps.push({
      id: 'kanji', kind: 'kanji', title: t('stepKanji'),
      detail: t('knownOf', { n: known, total: list.length }) + (learning ? ` · ${t('learningN', { n: learning })}` : ''),
      ratio: ratioOf(known, list.length), link: `/learn/kanji?lv=${lv}`,
    })
  } else {
    steps.push({ id: 'kanji', kind: 'kanji', title: t('stepKanji'), detail: t('kanjiPack'), ratio: 0, link: `/learn/kanji?lv=${lv}` })
  }

  // 5. Từ N4 trở lên: gợi ý đọc/xem thật (không tính tiến độ)
  if (lv <= 4) steps.push({ id: 'immersion', kind: 'immersion', title: t('stepImmersion'), detail: t('immersionHint'), link: '/immersion' })

  return steps
}

/** Cả lộ trình từ chặng đầu tới mục tiêu. */
export function buildPlan(raw: RawData, state: RoadmapState, t: Tr): LevelPlan[] {
  const startIx = levelIndex(state.start)
  const goalIx = Math.max(levelIndex(state.goal), startIx)
  return LEVELS.slice(0, goalIx + 1).map((id, i) => {
    const steps = stepsFor(id, raw, state, t)
    const counted = steps.filter((s) => s.ratio !== undefined && !s.soon)
    const ratio = counted.length ? counted.reduce((a, s) => a + s.ratio!, 0) / counted.length : 0
    return { id, steps, ratio, done: counted.length > 0 && counted.every((s) => s.ratio! >= DONE_AT), skipped: i < startIx }
  })
}

/** Chặng đang học = chặng đầu tiên (từ chặng bắt đầu) chưa xong. */
export function currentLevel(plan: LevelPlan[]): LevelPlan | undefined {
  return plan.find((l) => !l.skipped && !l.done)
}

/** Việc nên làm tiếp: bước đầu tiên chưa xong của chặng đang học. */
export function nextStep(plan: LevelPlan[]): Step | undefined {
  return currentLevel(plan)?.steps.find((s) => s.ratio !== undefined && !s.soon && s.ratio < DONE_AT)
}
