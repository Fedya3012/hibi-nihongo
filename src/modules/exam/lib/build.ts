/**
 * TẠO ĐỀ THI từ nội dung có sẵn (xem pool.ts). Mỗi lần tạo là một đề mới, ngẫu nhiên.
 * Dạng nào không đủ nội dung thì có ít câu hơn (ghi lại trong `short` để báo cho người học).
 */
import { buildQuiz, plainText } from '@/modules/grammar/lib/quiz'
import { clozeText } from '@/modules/grammar/lib/parse'
import { QUESTIONS as PLACEMENT } from '@/modules/roadmap/data/placement'
import type { ExamMode, ExamQuestion, ExamSection, ExamSession, PartId } from '../types'
import { sectionsFor } from '../data/format'
import { readingVariants, writingVariants } from './distract'
import type { Pool, PoolSentence, PoolWord } from './pool'
import { byClosestLength, shuffle, withAnswer } from './random'

const BLANK = '（　　）'
let seq = 0
const qid = (p: PartId) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`
const len = (s: string) => [...s].length

/** Câu ví dụ có chứa đúng chữ viết của từ (không bị chia), để gạch chân hoặc đục lỗ. */
function sentenceWith(w: PoolWord) {
  for (const ex of shuffle(w.examples)) {
    const t = ex.data.t
    const surface = t.slice(ex.start, ex.start + ex.length)
    if (surface === w.word && len(t) <= 50) return { t, start: ex.start, end: ex.start + ex.length, ex }
  }
  return null
}

/** Từ khác cùng loại (động từ với động từ…), độ dài gần giống, để làm đáp án nhiễu. */
function sameKind(pool: Pool, w: PoolWord, key: (x: PoolWord) => string) {
  const others = pool.words.filter((o) => o.id !== w.id && key(o) !== key(w) && o.reading !== w.reading)
  const same = byClosestLength(others.filter((o) => o.pos === w.pos), len(key(w)), (o) => len(key(o)))
  const rest = byClosestLength(others.filter((o) => o.pos !== w.pos), len(key(w)), (o) => len(key(o)))
  return [...same, ...rest].map(key)
}

const wordRef = (w: PoolWord) => ({ kind: 'word' as const, id: w.id, word: w.word, reading: w.reading })
const explainWord = (w: PoolWord, ex?: { ex: { data: { v?: string; e?: string } } } | null) =>
  `${w.word}（${w.reading}）: ${w.meaning}` + (ex?.ex.data.v ?? ex?.ex.data.e ? `\n${ex!.ex.data.v ?? ex!.ex.data.e}` : '')

// ---------------------------------------------------------------------------
// Từ vựng
// ---------------------------------------------------------------------------

function kanjiQ(pool: Pool, w: PoolWord): ExamQuestion | null {
  const wrong = [...readingVariants(w.reading).slice(0, 3), ...sameKind(pool, w, (o) => o.reading)]
  const o = withAnswer(w.reading, wrong)
  if (!o) return null
  const s = sentenceWith(w)
  return {
    id: qid('kanji'), part: 'kanji', stem: s ? s.t : w.word, mark: s ? [s.start, s.end] : [0, w.word.length],
    ...o, optionsJp: true, explain: explainWord(w, s), ref: wordRef(w),
  }
}

function writingQ(pool: Pool, w: PoolWord): ExamQuestion | null {
  const wrong = [...writingVariants(w.word, pool.homophones).slice(0, 3), ...sameKind(pool, w, (o) => o.word).filter((x) => len(x) === len(w.word))]
  const o = withAnswer(w.word, wrong)
  if (!o) return null
  const s = sentenceWith(w)
  const stem = s ? s.t.slice(0, s.start) + w.reading + s.t.slice(s.end) : w.reading
  const at = s ? s.start : 0
  return {
    id: qid('writing'), part: 'writing', stem, mark: [at, at + w.reading.length],
    ...o, optionsJp: true, explain: explainWord(w, s), ref: wordRef(w),
  }
}

function contextQ(pool: Pool, w: PoolWord): ExamQuestion | null {
  const s = sentenceWith(w)
  if (!s) return null // dạng này cần câu ví dụ
  const o = withAnswer(w.word, sameKind(pool, w, (x) => x.word))
  if (!o) return null
  return {
    id: qid('context'), part: 'context', stem: s.t.slice(0, s.start) + BLANK + s.t.slice(s.end),
    ...o, optionsJp: true, explain: `${s.t}\n` + explainWord(w, s), ref: wordRef(w),
  }
}

function meaningQ(pool: Pool, w: PoolWord): ExamQuestion | null {
  const o = withAnswer(w.meaning, sameKind(pool, w, (x) => x.meaning))
  if (!o) return null
  const s = sentenceWith(w)
  return {
    id: qid('meaning'), part: 'meaning', stem: s ? s.t : w.word, mark: s ? [s.start, s.end] : [0, w.word.length],
    ...o, optionsJp: false, explain: explainWord(w, s), ref: wordRef(w),
  }
}

function listenWordQ(pool: Pool, w: PoolWord): ExamQuestion | null {
  // Đáp án nhiễu: từ có cách đọc gần giống (cùng âm đầu, độ dài gần bằng), nhưng KHÔNG đồng âm
  const first = w.reading[0]
  const others = pool.words.filter((o) => o.id !== w.id && o.reading !== w.reading && o.word !== w.word)
  const near = byClosestLength(others.filter((o) => o.reading[0] === first), len(w.reading), (o) => len(o.reading))
  const rest = byClosestLength(others, len(w.reading), (o) => len(o.reading))
  const o = withAnswer(w.word, [...near, ...rest].map((x) => x.word))
  if (!o) return null
  return { id: qid('listenWord'), part: 'listenWord', stem: '', audio: w.reading, ...o, optionsJp: true, explain: explainWord(w), ref: wordRef(w) }
}

// ---------------------------------------------------------------------------
// Ngữ pháp
// ---------------------------------------------------------------------------

function grammarQs(pool: Pool, n: number): ExamQuestion[] {
  const out: ExamQuestion[] = []
  for (const q of buildQuiz(pool.grammar, pool.allGrammar, n, ['cloze'])) {
    if (q.type !== 'cloze') continue
    const stem = clozeText(q.ex[0]).replace(/\{\{.*?\}\}/, BLANK)
    out.push({
      id: qid('grammar'), part: 'grammar', stem, options: q.options, answer: q.options.indexOf(q.answer), optionsJp: true,
      explain: `${q.point.pattern}: ${q.point.meaning}\n${plainText(q.ex[0])}\n${q.ex[1]}`,
      ref: { kind: 'grammar', id: q.point.id, pattern: q.point.pattern },
    })
  }
  // Bổ sung bằng câu ngữ pháp của bài xếp lớp (module Lộ trình) khi module Ngữ pháp chưa có cấp này
  if (out.length < n) {
    const extra = shuffle(PLACEMENT.filter((p) => p.kind === 'grammar' && p.level === `n${pool.level}`))
    for (const p of extra.slice(0, n - out.length)) {
      const options = shuffle(p.choices)
      out.push({
        id: qid('grammar'), part: 'grammar', stem: p.q.replace('＿＿', BLANK), options, answer: options.indexOf(p.choices[0]),
        optionsJp: true, explain: p.note,
      })
    }
  }
  return out
}

/** Cụm kết thúc bằng trợ từ cách (を, に, が…): hai cụm như vậy thường đổi chỗ được cho nhau. */
const CASE_END = /(を|に|が|で|へ|と|から|まで|は|も|や)$/

/**
 * 4 cụm có xếp được nhiều cách đúng không? Tiếng Nhật cho đổi chỗ các cụm "danh từ + trợ từ"
 * (弟に野菜を = 野菜を弟に), và hai cụm cùng đuôi (冬と / 夏と, …たり / …たり) cũng vậy.
 * Bỏ qua những ô như thế để đề chỉ có một đáp án đúng.
 */
function unambiguous(win: string[]): boolean {
  if (new Set(win).size < 4) return false
  if (new Set(win.map((x) => x.slice(-1))).size < 4) return false
  return win.filter((x) => CASE_END.test(x)).length < 2
}

/** Dạng ★: 4 cụm liền nhau bị xóa, chọn cụm nằm ở ô ★ (ô thứ 3), giống đề thật. */
function orderQs(pool: Pool, n: number): ExamQuestion[] {
  const out: ExamQuestion[] = []
  for (const q of buildQuiz(pool.grammar, pool.allGrammar, n * 20, ['order'])) {
    if (out.length >= n) break
    if (q.type !== 'order' || q.chunks.length < 4) continue
    const c = q.chunks
    // Không xóa cụm cuối nếu nó chỉ là dấu câu
    const last = /^[。？！、]+$/.test(c[c.length - 1]) ? c.length - 1 : c.length
    if (last < 4) continue
    // Thử mọi vị trí của 4 ô trống, lấy vị trí đầu tiên chỉ có MỘT cách xếp đúng
    const start = shuffle([...Array(last - 3).keys()]).find((st) => unambiguous(c.slice(st, st + 4)))
    if (start === undefined) continue
    const win = c.slice(start, start + 4)
    const right = win[2]
    const options = shuffle(win)
    const stem = [...c.slice(0, start), '＿＿', '＿＿', '★', '＿＿', ...c.slice(start + 4)].join(' ')
    if (out.some((x) => x.stem === stem)) continue
    out.push({
      id: qid('order'), part: 'order', stem, options, answer: options.indexOf(right), optionsJp: true,
      explain: `${c.join('')}\n${q.ex[1]}\n${q.point.pattern}: ${q.point.meaning}`,
      ref: { kind: 'grammar', id: q.point.id, pattern: q.point.pattern },
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Đọc hiểu, nghe câu
// ---------------------------------------------------------------------------

function translatedQ(part: 'reading' | 'listenSentence', s: PoolSentence, all: PoolSentence[]): ExamQuestion | null {
  const ref = s.grammarId ? { kind: 'grammar' as const, id: s.grammarId, pattern: '' } : undefined
  // Đáp án là bản dịch: tiếng Việt nếu có, không thì tiếng Anh (cả 4 đáp án cùng một thứ tiếng)
  const lang: 'vi' | 'en' | null = s.vi ? 'vi' : s.en ? 'en' : null
  if (lang) {
    const right = s[lang]!
    const others = all.filter((x) => x[lang] && x[lang] !== right && x.jp !== s.jp)
    const o = withAnswer(right, byClosestLength(others, len(right), (x) => len(x[lang]!)).slice(0, 8).map((x) => x[lang]!))
    if (!o) return null
    return { id: qid(part), part, stem: part === 'reading' ? s.jp : '', audio: part === 'listenSentence' ? s.jp : undefined, ...o, optionsJp: false, explain: `${s.jp}\n${right}`, ref }
  }
  // Câu chưa có bản dịch: bài nghe hỏi "bạn vừa nghe câu nào"
  if (part !== 'listenSentence') return null
  const others = all.filter((x) => x.jp !== s.jp)
  const o = withAnswer(s.jp, byClosestLength(others, len(s.jp), (x) => len(x.jp)).slice(0, 6).map((x) => x.jp))
  if (!o) return null
  return { id: qid(part), part, stem: '', audio: s.jp, ...o, optionsJp: true, explain: s.jp }
}

// ---------------------------------------------------------------------------
// Ghép đề
// ---------------------------------------------------------------------------

type WordMaker = (pool: Pool, w: PoolWord) => ExamQuestion | null
const WORD_PARTS: Partial<Record<PartId, WordMaker>> = { kanji: kanjiQ, writing: writingQ, context: contextQ, meaning: meaningQ, listenWord: listenWordQ }

export function buildExam(pool: Pool, mode: ExamMode): ExamSession {
  const usedWords = new Set<string>()
  const usedSentences = new Set<string>()
  const short: Partial<Record<PartId, number>> = {}
  // Đọc hiểu ưu tiên câu có bản dịch tiếng Việt, rồi mới tới câu chỉ có tiếng Anh; nghe dùng phần còn lại
  const vi = shuffle(pool.sentences.filter((s) => s.vi))
  const en = shuffle(pool.sentences.filter((s) => !s.vi && s.en))
  const none = shuffle(pool.sentences.filter((s) => !s.vi && !s.en))

  const sections: ExamSection[] = sectionsFor(pool.level, mode === 'mini').map((sf) => {
    const questions: ExamQuestion[] = []
    for (const { part, n } of sf.parts) {
      let got: ExamQuestion[] = []
      const maker = WORD_PARTS[part]
      if (maker) {
        // Mỗi từ chỉ xuất hiện một lần trong cả đề
        for (const w of shuffle(pool.words)) {
          if (got.length >= n) break
          if (usedWords.has(w.id)) continue
          const q = maker(pool, w)
          if (q) { got.push(q); usedWords.add(w.id) }
        }
      } else if (part === 'grammar') got = grammarQs(pool, n)
      else if (part === 'order') got = orderQs(pool, n)
      else if (part === 'reading' || part === 'listenSentence') {
        const src = [...vi, ...en, ...none]
        for (const s of src) {
          if (got.length >= n) break
          if (usedSentences.has(s.jp)) continue
          const q = translatedQ(part, s, pool.sentences)
          if (q) { got.push(q); usedSentences.add(s.jp) }
        }
      }
      if (got.length < n) short[part] = (short[part] ?? 0) + n - got.length
      questions.push(...got.slice(0, n))
    }
    return { id: sf.id, title: sf.title, seconds: sf.minutes * 60, questions }
  }).filter((s) => s.questions.length > 0)

  const session: ExamSession = {
    id: `exam-${Date.now().toString(36)}`,
    level: pool.level, mode, startedAt: Date.now(), sections,
    answers: sections.map((s) => s.questions.map(() => null)),
    flags: sections.map((s) => s.questions.map(() => false)),
    current: 0, left: sections[0]?.seconds ?? 0, used: sections.map(() => 0), short,
  }
  return session
}

