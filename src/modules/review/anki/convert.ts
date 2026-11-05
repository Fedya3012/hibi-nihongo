/**
 * CHUYỂN GHI CHÚ ANKI THÀNH THẺ CỦA APP
 * -------------------------------------
 * Ghi chú Anki có trường tự đặt tên tùy ý (Front, Expression, Reading, Meaning, Sentence…).
 * Thẻ của app có các ô cố định (chữ Nhật, cách đọc, nghĩa, câu ví dụ…).
 * File này: đoán trường nào ứng với ô nào (người dùng sửa lại được), làm sạch HTML,
 * và đổi lịch ôn của Anki sang FSRS của app.
 */
import { DAY } from '../fsrs'
import { CardState, type CardKind, type Schedule } from '../types'
import type { AnkiCard, AnkiNote, AnkiNoteType } from './read'

/** Ô của thẻ app mà một trường Anki được đổ vào. */
export type Target = 'front' | 'reading' | 'meaning' | 'example' | 'exampleMeaning' | 'notes' | 'image' | 'cloze' | 'kind' | 'skip'

export const TARGET_LABEL: Record<Target, string> = {
  front: 'Chữ Nhật',
  reading: 'Cách đọc',
  meaning: 'Nghĩa',
  example: 'Câu ví dụ',
  exampleMeaning: 'Nghĩa câu ví dụ',
  notes: 'Ghi chú',
  image: 'Ảnh',
  cloze: 'Câu đục lỗ (cloze)',
  kind: 'Loại thẻ',
  skip: '— Bỏ qua —',
}

/** Tên loại ghi chú khi xuất từ app, để nhập lại vào app thì khớp đúng 100%. */
export const HIBI_NOTE_TYPE = 'Hibi Nihongo'
export const HIBI_FIELDS = ['Front', 'Reading', 'Meaning', 'Example', 'ExampleMeaning', 'Notes', 'Image', 'Kind'] as const
const HIBI_TARGETS: Target[] = ['front', 'reading', 'meaning', 'example', 'exampleMeaning', 'notes', 'image', 'kind']

// Thứ tự kiểm tra quan trọng: "Sentence Meaning" phải bắt trước "Meaning" và "Sentence".
const RULES: [Target, RegExp][] = [
  ['skip', /audio|sound|âm thanh|音声|voice|pitch|frequency|freq|tần suất|sort|^id$|index|stroke/],
  ['exampleMeaning', /(sentence|example|câu|例文|ví dụ|sent).*(meaning|translat|english|nghĩa|dịch|eng|訳)|(meaning|translat|nghĩa|dịch|訳).*(sentence|example|câu|例文|ví dụ)/],
  ['example', /sentence|example|câu|例文|ví dụ|^sent/],
  ['image', /image|picture|^pic|ảnh|hình|画像|写真|screenshot/],
  ['reading', /reading|kana|furigana|読み|よみ|cách đọc|hiragana|pronunc|phiên âm|on.?yomi|kun.?yomi|音読み|訓読み|âm on|âm kun/],
  ['meaning', /meaning|back|english|definition|gloss|nghĩa|意味|translat|answer|mặt sau|vietnam|tiếng việt|keyword/],
  ['front', /front|expression|word|vocab|kanji|japanese|term|^từ|mặt trước|単語|漢字|表現|question|grammar|文法|ngữ pháp|^text$/],
  ['notes', /note|ghi chú|mnemonic|mẹo|hint|extra|comment|memo|story|radical|bộ thủ|usage|cách dùng/],
]

/** Đoán ô cho từng trường của một loại ghi chú. */
export function guessMapping(nt: AnkiNoteType): Target[] {
  if (nt.name.startsWith(HIBI_NOTE_TYPE) && HIBI_FIELDS.every((f, i) => nt.fields[i] === f)) return [...HIBI_TARGETS]
  const out: Target[] = nt.fields.map(() => 'skip')
  const used = new Set<Target>()
  const single: Target[] = ['front', 'reading', 'meaning', 'example', 'exampleMeaning', 'image', 'cloze']
  if (nt.cloze) {
    const i = Math.max(0, nt.fields.findIndex((f) => /^text$|văn bản/i.test(f)))
    out[i] = 'cloze'
    used.add('cloze')
  }
  nt.fields.forEach((name, i) => {
    if (out[i] !== 'skip') return
    const n = name.toLowerCase().trim()
    for (const [t, re] of RULES) {
      if (!re.test(n)) continue
      if (t === 'skip') return
      if (single.includes(t) && used.has(t)) {
        // Trường trùng loại (vd vừa On-yomi vừa Kun-yomi): gộp vào ghi chú
        if (t === 'reading' || t === 'meaning') { out[i] = 'notes'; return }
        continue
      }
      if (t === 'meaning' && nt.cloze) { out[i] = 'notes'; return } // "Back Extra" của thẻ cloze
      out[i] = t
      used.add(t)
      return
    }
  })
  // Không đoán được thì: trường đầu là mặt trước, trường kế tiếp chưa dùng là nghĩa
  const free = () => out.findIndex((t, i) => t === 'skip' && !RULES[0][1].test(nt.fields[i].toLowerCase()))
  if (!used.has('front') && !used.has('cloze')) { const i = free(); if (i >= 0) out[i] = 'front' }
  if (!used.has('meaning') && !nt.cloze) { const i = free(); if (i >= 0) out[i] = 'meaning' }
  return out
}

/** Đoán loại thẻ (từ vựng / Kanji / ngữ pháp) từ tên loại ghi chú và tên bộ. */
export function guessKind(noteTypeName: string, deckName = ''): CardKind {
  const s = `${noteTypeName} ${deckName}`.toLowerCase()
  if (/grammar|文法|ngữ pháp|bunpro|bunpou/.test(s)) return 'grammar'
  if (/kanji|漢字|hán tự|hanzi|heisig|rtk/.test(s) && !/vocab|từ vựng|単語|word|core/.test(s)) return 'kanji'
  return 'vocab'
}

// ---------- Làm sạch nội dung trường ----------

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** HTML của trường Anki → chữ thường. Giữ xuống dòng, bỏ [sound:…], bỏ thẻ HTML. */
export function htmlToText(html: string): string {
  const s = html
    .replace(/\[sound:[^\]]*\]/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(s)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** Tên các ảnh trong trường: <img src="…">. */
export function imagesIn(html: string): string[] {
  return [...html.matchAll(/<img[^>]+src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map((m) => {
    const raw = decodeEntities(m[1] ?? m[2] ?? m[3])
    try { return decodeURIComponent(raw) } catch { return raw }
  })
}

const KANJI = '㐀-鿿豈-﫿々〆ヶ'
const FURI_RE = new RegExp(` ?([${KANJI}]+)\\[([^\\]]+)\\]`, 'g')

/**
 * Furigana kiểu Anki "日本[にほん]語[ご]": tách thành chữ "日本語" và cách đọc "にほんご".
 * Trả về reading = undefined nếu chữ không có furigana.
 */
export function splitFurigana(s: string): { text: string; reading?: string } {
  if (!new RegExp(FURI_RE.source).test(s)) return { text: s }
  const text = s.replace(FURI_RE, '$1')
  const reading = s.replace(FURI_RE, '$2').replace(/ /g, '')
  return { text, reading }
}

/**
 * Câu cloze "{{c1::食べ::động từ}}ます" → câu ví dụ của app "{{食べ}}ます" + chữ trơn + đáp án.
 */
export function convertCloze(text: string): { plain: string; example: string; answers: string[] } {
  const answers: string[] = []
  const re = /\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g
  const example = text.replace(re, (_, a: string) => { answers.push(a); return `{{${a}}}` })
  return { plain: text.replace(re, '$1'), example, answers }
}

/**
 * Câu ví dụ: nhiều bộ Anki tô đậm từ đang học trong câu (<b>食べ</b>). Đổi phần đó thành {{ }}
 * để app hỏi được dạng "Điền vào chỗ trống". Bản xuất của app dùng <u> cho đúng việc này.
 */
function exampleText(html: string, hibi: boolean): string {
  const re = hibi ? /<u>([\s\S]*?)<\/u>/gi : /<(b|strong|u)>([\s\S]*?)<\/\1>/gi
  const marked = htmlToText(html.replace(re, (...m: string[]) => `{{${hibi ? m[1] : m[2]}}}`)).replace(/\{\{\s*\}\}/g, '')
  // Tô đậm cả câu thì không phải chỗ trống
  return /^\{\{[^{}]*\}\}$/.test(marked) ? marked.slice(2, -2) : marked
}

// ---------- Ghép thành thẻ ----------

export interface ConvertedNote {
  front: string
  reading?: string
  meaning: string
  example?: string
  exampleMeaning?: string
  notes?: string
  imageName?: string
  kind?: CardKind
}

export function convertNote(note: AnkiNote, mapping: Target[], opts: { hibi: boolean }): ConvertedNote {
  const parts: Partial<Record<Target, string[]>> = {}
  // Ảnh: ưu tiên trường được chọn là "Ảnh", nếu không có thì lấy ảnh đầu tiên trong các trường còn lại
  let imageName = note.fields.map((h, i) => (mapping[i] === 'image' ? imagesIn(h)[0] : undefined)).find(Boolean)
  note.fields.forEach((html, i) => {
    const t = mapping[i] ?? 'skip'
    if (t === 'skip') return
    imageName ??= imagesIn(html)[0]
    if (t === 'image') return
    const text = t === 'example' ? exampleText(html, opts.hibi) : htmlToText(html)
    if (text) (parts[t] ??= []).push(text)
  })
  const join = (t: Target, sep = '\n') => parts[t]?.join(sep)

  let front = join('front', ' / ') ?? ''
  let reading = join('reading', '・')
  let meaning = join('meaning') ?? ''
  let example = join('example')
  let notes = join('notes')

  const cloze = join('cloze')
  if (cloze) {
    const c = convertCloze(cloze)
    if (!front) front = c.plain
    example ??= c.example
    if (!meaning) meaning = notes ?? c.answers.join('、')
    if (meaning === notes) notes = undefined
  }

  const f = splitFurigana(front)
  front = f.text
  if (!reading && f.reading) reading = f.reading
  if (reading) reading = splitFurigana(reading).reading ?? reading
  if (example) example = splitFurigana(example).text

  const kindRaw = join('kind')?.trim().toLowerCase()
  const kind = kindRaw === 'vocab' || kindRaw === 'kanji' || kindRaw === 'grammar' ? kindRaw : undefined
  return { front, reading, meaning, example, exampleMeaning: join('exampleMeaning'), notes, imageName, kind }
}

// ---------- Lịch ôn ----------

/** Thẻ đại diện của ghi chú (ghi chú có nhiều thẻ thì lấy thẻ đã ôn nhiều nhất). */
export function mainCard(note: AnkiNote): AnkiCard {
  return note.cards.reduce((best, c) => (c.reps > best.reps ? c : best), note.cards[0])
}

/**
 * Đổi lịch Anki sang FSRS của app.
 * - Nếu Anki đã bật FSRS: dùng thẳng độ bền (S) và độ khó (D) của Anki.
 * - Nếu chưa: lấy khoảng cách ôn hiện tại làm độ bền (ở mức nhớ 90%, khoảng cách ≈ S),
 *   độ khó suy ra từ "ease" (250% = trung bình; ease thấp = thẻ khó).
 */
export function convertSchedule(c: AnkiCard, createdSec: number, now = Date.now()): Schedule {
  if (c.type === 0 || c.queue === 0) return { state: CardState.New, due: now, stability: 0, difficulty: 0, reps: 0, lapses: 0 }
  const dayDue = (d: number) => createdSec * 1000 + d * DAY
  // Thẻ đang học: hạn là giây (học trong ngày) hoặc số ngày (bước học dài hơn 1 ngày)
  const due = c.type === 2 ? dayDue(c.due) : c.due > 1e9 ? c.due * 1000 : dayDue(c.due)
  const ivlDays = c.ivl > 0 ? c.ivl : Math.max(0, -c.ivl) / 86400
  const ease = c.factor > 0 ? c.factor / 1000 : 2.5
  const stability = c.fsrs?.s ?? Math.max(0.5, ivlDays)
  const difficulty = c.fsrs?.d ?? Math.min(10, Math.max(1, 5.5 + (2.5 - ease) * 5))
  const state = c.type === 2 ? CardState.Review : c.type === 3 ? CardState.Relearning : CardState.Learning
  const lastReview = state === CardState.Review ? Math.min(now, due - Math.max(1, ivlDays) * DAY) : Math.min(now, due) - 10 * 60_000
  return { state, due, stability, difficulty, reps: Math.max(1, c.reps), lapses: c.lapses, lastReview }
}

/** Đổi ngược: độ khó FSRS (1–10) → ease của Anki (‰), cùng công thức với convertSchedule. */
export const difficultyToFactor = (d: number) => Math.round(Math.min(3.5, Math.max(1.3, 2.5 - (d - 5.5) / 5)) * 1000)
