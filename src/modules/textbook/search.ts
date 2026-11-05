/**
 * Nguồn tìm kiếm Ctrl+K của Giáo trình (xem src/modules/search/README.md). Chỉ đọc, không sửa gì.
 * Tìm trong: tên sách, bài (tên bài, ghi chú của bài), từ vựng của bài, hội thoại / bài đọc, bài tập,
 * và ghi chú / chỗ tô sáng trên file sách gốc. Bấm vào là mở đúng bài, đúng mục (hoặc đúng trang sách).
 */
import { getAll } from '@/core/db'
import type { SearchHit, SearchSource } from '@/modules/search/api'
import { cached } from '@/modules/search/cache'
import { matchFields, snippet } from '@/modules/search/normalize'
import type { BookNote, Lesson, Textbook } from './types'

const data = () => cached('textbook', ['textbooks', 'textbookLessons', 'textbookNotes'], async () => {
  const [books, lessons, notes] = await Promise.all([
    getAll<Textbook>('textbooks'), getAll<Lesson>('textbookLessons'), getAll<BookNote>('textbookNotes'),
  ])
  return { books: new Map(books.map((b) => [b.id, b])), lessons, notes }
})

const lessonUrl = (bookId: string, n: number, s?: string) =>
  `/learn/textbook?b=${encodeURIComponent(bookId)}&l=${n}${s ? `&s=${s}` : ''}`

const KIND = {
  vi: { book: 'Sách', lesson: 'Bài', word: 'Từ', track: 'Hội thoại', ex: 'Bài tập', note: 'Ghi chú', page: 'Trang' },
  en: { book: 'Book', lesson: 'Lesson', word: 'Word', track: 'Dialogue', ex: 'Exercise', note: 'Note', page: 'Page' },
  ja: { book: '教科書', lesson: '課', word: '語彙', track: '会話', ex: '練習', note: 'メモ', page: 'ページ' },
}

const source: SearchSource = {
  id: 'textbook',
  label: { vi: 'Giáo trình', en: 'Textbooks', ja: '教科書' },
  order: 38,
  async search(q, { limit, lang }) {
    const k = KIND[lang] ?? KIND.vi
    const { books, lessons, notes } = await data()
    const hits: SearchHit[] = []
    const where = (b: Textbook, n: number) => `${b.short} · ${lang === 'ja' ? `第${n}課` : `${k.lesson} ${n}`}`

    for (const b of books.values()) {
      const s = matchFields(q, b.title, b.short, b.edition)
      if (s) hits.push({ id: `b:${b.id}`, title: b.title, subtitle: b.edition, badge: k.book, to: `/learn/textbook?b=${encodeURIComponent(b.id)}`, score: s + 10 })
    }

    for (const l of lessons) {
      const b = books.get(l.bookId)
      if (!b) continue
      // "bài 5", "lesson 5", "第5課" hoặc tên bài
      const s = matchFields(q, l.title, `${k.lesson} ${l.number}`, `bai ${l.number}`, `第${l.number}課`)
      const ns = s ? 0 : matchFields(q, l.notes)
      if (s || ns) {
        hits.push({
          id: `l:${l.id}`, title: `${where(b, l.number)}${l.title ? `: ${l.title}` : ''}`,
          subtitle: ns ? snippet(l.notes ?? '', q) : undefined, badge: k.lesson, to: lessonUrl(b.id, l.number), score: s || ns / 2,
        })
      }
      for (const w of l.words) {
        const ws = matchFields(q, w.word, w.reading, w.meaning, w.en)
        if (ws) {
          hits.push({
            id: `w:${l.id}:${w.id}`, title: w.word, jp: true, reading: w.reading !== w.word ? w.reading : undefined,
            subtitle: `${w.meaning || w.en || ''} · ${where(b, l.number)}`, badge: k.word, to: lessonUrl(b.id, l.number), score: ws,
          })
        }
      }
      for (const tr of l.tracks ?? []) {
        for (const line of tr.lines) {
          const ts = matchFields(q, line.jp, line.vi)
          if (ts) {
            hits.push({
              id: `t:${tr.id}:${line.id}`, title: line.jp, jp: true, subtitle: `${line.vi ? `${line.vi} · ` : ''}${where(b, l.number)}`,
              badge: k.track, to: lessonUrl(b.id, l.number, tr.section), score: ts * 0.6,
            })
          }
        }
      }
      for (const set of l.exercises ?? []) {
        for (const it of set.items) {
          const es = matchFields(q, it.q, it.answer.join(' '), it.explain)
          if (es) {
            hits.push({
              id: `e:${it.id}`, title: it.q || it.answer.join(' '), jp: true, subtitle: `${set.title ? `${set.title} · ` : ''}${where(b, l.number)}`,
              badge: k.ex, to: lessonUrl(b.id, l.number, 'exercise'), score: es * 0.5,
            })
          }
        }
      }
    }

    // Ghi chú / tô sáng / đánh dấu trên file sách gốc → mở đúng trang
    for (const n of notes) {
      const b = books.get(n.bookId)
      if (!b) continue
      const s = matchFields(q, n.text, n.quote)
      if (s) {
        hits.push({
          id: `n:${n.id}`, title: snippet(n.text || n.quote || '', q), jp: !n.text,
          subtitle: `${b.short} · ${k.page} ${n.page + 1}${n.text && n.quote ? ` · 「${snippet(n.quote, q, 30)}」` : ''}`,
          badge: k.note, to: `/learn/textbook?b=${encodeURIComponent(b.id)}&read=${encodeURIComponent(n.fileId)}&p=${n.page}`, score: s * 0.7,
        })
      }
    }

    return hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit)
  },
}

export default source
