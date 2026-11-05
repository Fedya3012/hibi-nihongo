/**
 * BÀI TẬP CỦA BÀI
 * Bạn chép bài tập trong sách (mỗi dòng một câu), app tự nhận dạng câu:
 *
 *   Chọn đáp án:  わたしは がくせい（　）。 [*です | ます | か] // です đứng cuối câu khẳng định
 *                 (lựa chọn đặt trong [ ], ngăn bằng |, dấu * trước đáp án đúng)
 *   Điền:         たべます → て形 = たべて // nhóm 2: bỏ ます thêm て
 *                 (sau dấu = là đáp án; nhiều đáp án đúng thì ngăn bằng ; )
 *   Sắp xếp:      {わたし / は / がくせい / です}       (các mảnh theo ĐÚNG thứ tự, app tự xáo)
 *                 Có thể thêm đề trước dấu {: "Sắp xếp: {…}"
 *
 * "// …" ở cuối dòng là giải thích (hiện sau khi chấm). Dòng bắt đầu bằng "#" là tiêu đề phần.
 */
import { kataToHira } from '@/modules/dictionary'
import { makeId, updateLesson } from '../store'
import type { ExerciseSet, ExItem, ExStat, Lesson, LessonWord } from '../types'

export interface ParsedLine { item?: ExItem; heading?: string; error?: string; raw: string }

export function parseExerciseText(text: string): ParsedLine[] {
  const out: ParsedLine[] = []
  for (const raw of text.split(/\r?\n/)) {
    let s = raw.trim()
    if (!s) continue
    if (s.startsWith('#')) { out.push({ raw, heading: s.replace(/^#+\s*/, '') }); continue }
    s = s.replace(/^\d+[.)．、]\s*/, '') // bỏ số thứ tự 1. 2)
    let explain: string | undefined
    const ex = s.indexOf('//')
    if (ex >= 0) { explain = s.slice(ex + 2).trim() || undefined; s = s.slice(0, ex).trim() }

    const order = s.match(/\{([^}]*)\}/)
    if (order) {
      const parts = order[1].split(/\s*[/／]\s*/).map((x) => x.trim()).filter(Boolean)
      if (parts.length < 2) { out.push({ raw, error: 'order' }); continue }
      out.push({ raw, item: { id: makeId(), kind: 'order', q: s.replace(order[0], '').replace(/[:：]\s*$/, '').trim(), answer: parts, explain } })
      continue
    }
    const choice = s.match(/\[([^\]]*)\]/)
    if (choice) {
      const opts = choice[1].split(/\s*[|｜]\s*/).map((x) => x.trim()).filter(Boolean)
      const correct = opts.find((o) => o.startsWith('*'))
      const options = opts.map((o) => o.replace(/^\*/, '').trim())
      if (options.length < 2 || !correct) { out.push({ raw, error: 'choice' }); continue }
      out.push({ raw, item: { id: makeId(), kind: 'choice', q: s.replace(choice[0], '').trim(), options, answer: [correct.slice(1).trim()], explain } })
      continue
    }
    const eq = s.lastIndexOf(' = ') >= 0 ? s.lastIndexOf(' = ') : s.lastIndexOf('＝')
    if (eq > 0) {
      const sep = s[eq] === '＝' ? 1 : 3
      const answer = s.slice(eq + sep).split(/\s*[;；]\s*/).map((x) => x.trim()).filter(Boolean)
      if (!answer.length) { out.push({ raw, error: 'fill' }); continue }
      out.push({ raw, item: { id: makeId(), kind: 'fill', q: s.slice(0, eq).trim(), answer, explain } })
      continue
    }
    out.push({ raw, error: 'unknown' })
  }
  return out
}

/** Ngược lại parseExerciseText (để sửa). */
export function exerciseToText(items: ExItem[]): string {
  return items.map((it) => {
    const tail = it.explain ? ` // ${it.explain}` : ''
    if (it.kind === 'order') return `${it.q ? it.q + ' ' : ''}{${it.answer.join(' / ')}}${tail}`
    if (it.kind === 'choice') return `${it.q} [${(it.options ?? []).map((o) => (o === it.answer[0] ? '*' : '') + o).join(' | ')}]${tail}`
    return `${it.q} = ${it.answer.join('; ')}${tail}`
  }).join('\n')
}

/** So sánh nhẹ tay: bỏ dấu cách, dấu câu, không phân biệt hiragana / katakana / hoa thường / chữ rộng. */
export function normalize(s: string): string {
  return kataToHira(s.normalize('NFKC').toLowerCase())
    .replace(/[\s。、，,.!！?？「」『』()（）・〜~]/g, '')
}

/** Chấm một câu. `given`: chữ đã nhập / lựa chọn / các mảnh theo thứ tự đã xếp. */
export function check(it: ExItem, given: string | string[]): boolean {
  if (it.kind === 'order') return Array.isArray(given) && normalize(given.join('')) === normalize(it.answer.join(''))
  const g = normalize(Array.isArray(given) ? given.join('') : given)
  return !!g && it.answer.some((a) => normalize(a) === g)
}

/** Xáo trộn (không bao giờ trả về đúng thứ tự cũ nếu có thể). */
export function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let k = 0; k < 5; k++) {
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
    if (r.some((x, i) => x !== a[i])) break
  }
  return r
}

/* ---------- Lưu ---------- */

export const saveSet = (bookId: string, n: number, set: ExerciseSet) => updateLesson(bookId, n, (l) => {
  const list = l.exercises ?? []
  const i = list.findIndex((x) => x.id === set.id)
  return { ...l, exercises: i < 0 ? [...list, set] : list.map((x) => (x.id === set.id ? set : x)) }
})

export const deleteSet = (bookId: string, n: number, id: string) => updateLesson(bookId, n, (l) => {
  const set = l.exercises?.find((x) => x.id === id)
  const stats = { ...(l.exStats ?? {}) }
  for (const it of set?.items ?? []) delete stats[it.id]
  return { ...l, exercises: (l.exercises ?? []).filter((x) => x.id !== id), exStats: stats }
})

/** Ghi kết quả một lần chấm: { mã câu: [đúng?, câu trả lời] }. */
export const recordResults = (bookId: string, n: number, results: Record<string, [boolean, string]>) =>
  updateLesson(bookId, n, (l) => {
    const stats = { ...(l.exStats ?? {}) }
    const now = Date.now()
    for (const [id, [ok, ans]] of Object.entries(results)) {
      const s: ExStat = stats[id] ?? { right: 0, wrong: 0, last: now }
      stats[id] = ok ? { ...s, right: s.right + 1, last: now } : { ...s, wrong: s.wrong + 1, last: now, lastWrong: ans }
    }
    return { ...l, exStats: stats }
  })

export const clearStats = (bookId: string, n: number) => updateLesson(bookId, n, (l) => ({ ...l, exStats: {} }))

/** Câu đang "hay sai": sai ít nhất một lần và lần làm gần nhất (hoặc tổng) sai nhiều hơn đúng. */
export const isWeakItem = (s?: ExStat) => !!s && s.wrong > 0 && s.wrong >= s.right

/* ---------- Bài tập tự tạo từ từ vựng của bài ---------- */

export const VOCAB_SET_ID = 'auto:vocab'

/** Tạo bộ câu chọn nghĩa / chọn từ từ chính từ vựng của bài (cần ≥ 4 từ có nghĩa). */
export function vocabQuiz(l: Lesson, max = 10): ExItem[] {
  const words = l.words.filter((w) => (w.meaning || w.en)?.trim())
  if (words.length < 4) return []
  const mean = (w: LessonWord) => (w.meaning || w.en || '').trim()
  return shuffle(words).slice(0, max).map((w, i) => {
    const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3)
    // Xen kẽ hai chiều: nhìn chữ chọn nghĩa / nhìn nghĩa chọn chữ
    const toMeaning = i % 2 === 0
    const right = toMeaning ? mean(w) : w.word
    return {
      id: `${VOCAB_SET_ID}:${w.id}:${toMeaning ? 'm' : 'w'}`,
      kind: 'choice' as const,
      q: toMeaning ? w.word + (w.reading && w.reading !== w.word ? `（${w.reading}）` : '') : mean(w),
      options: shuffle([right, ...others.map((o) => (toMeaning ? mean(o) : o.word))]),
      answer: [right],
    }
  })
}

/* ---------- In / xuất PDF ---------- */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Mở hộp thoại In của trình duyệt với đề + đáp án (chọn "Lưu thành PDF" để có file PDF). */
export function printSet(title: string, items: ExItem[]) {
  const q = items.map((it, i) => {
    let body = `<p class="q"><b>${i + 1}.</b> ${esc(it.q)}</p>`
    if (it.kind === 'choice') body += `<p class="opts">${(it.options ?? []).map((o, k) => `${'abcdefgh'[k]}) ${esc(o)}`).join('　　')}</p>`
    if (it.kind === 'order') body += `<p class="opts">${shuffle(it.answer).map(esc).join('　/　')}</p><p class="line"></p>`
    if (it.kind === 'fill') body += '<p class="line"></p>'
    return `<li>${body}</li>`
  }).join('')
  const a = items.map((it, i) => `<li><b>${i + 1}.</b> ${esc(it.kind === 'order' ? it.answer.join(' ') : it.answer.join(' / '))}${it.explain ? ` <i>(${esc(it.explain)})</i>` : ''}</li>`).join('')
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:'Noto Sans JP','Be Vietnam Pro',sans-serif;margin:2cm;line-height:1.7;color:#000}
    h1{font-size:20px}h2{font-size:16px;margin-top:28px;page-break-before:always}
    ol{list-style:none;padding:0}li{margin-bottom:14px;break-inside:avoid}.q{margin:0}.opts{margin:2px 0 0 1.5em}
    .line{border-bottom:1px solid #999;height:1.6em;margin:4px 0 0 1.5em}.name{float:right;font-size:13px}
  </style></head><body><span class="name">Tên: ____________　Ngày: ________</span><h1>${esc(title)}</h1>
  <ol>${q}</ol><h2>Đáp án</h2><ol>${a}</ol></body></html>`
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open(); doc.write(html); doc.close()
  setTimeout(() => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1000)
  }, 300)
}
