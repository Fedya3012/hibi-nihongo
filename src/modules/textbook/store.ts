/**
 * ĐỌC / GHI DỮ LIỆU GIÁO TRÌNH (bảng `textbooks`, `textbookLessons`)
 * Mỗi sách có đủ các dòng bài ngay khi tạo (Minna I: 25 dòng), nên không phải kiểm tra "bài đã có chưa".
 */
import { get, getAll, getAllByIndex, promisify, put, transaction } from '@/core/db'
import type { BookTemplate, Lesson, LessonStatus, LessonWord, Textbook } from './types'

export const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const lessonId = (bookId: string, n: number) => `${bookId}:${n}`

/** Sách gần mở nhất lên trước, rồi tới sách mới tạo. */
export async function listBooks(): Promise<Textbook[]> {
  const books = await getAll<Textbook>('textbooks')
  return books.sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt))
}

export const getBook = (id: string) => get<Textbook>('textbooks', id)

/** Mọi bài của một sách, theo thứ tự số bài. */
export async function listLessons(bookId: string): Promise<Lesson[]> {
  const ls = await getAllByIndex<Lesson>('textbookLessons', 'by_book', bookId)
  return ls.sort((a, b) => a.number - b.number)
}

export const getLesson = (bookId: string, n: number) => get<Lesson>('textbookLessons', lessonId(bookId, n))

const emptyLesson = (bookId: string, number: number, now: number): Lesson =>
  ({ id: lessonId(bookId, number), bookId, number, status: 'new', words: [], updatedAt: now })

/** Tạo sách mới cùng các bài trống trong một giao dịch. */
async function createBook(book: Textbook): Promise<Textbook> {
  await transaction(['textbooks', 'textbookLessons'], 'readwrite', (tx) => {
    tx.objectStore('textbooks').put(book)
    const ls = tx.objectStore('textbookLessons')
    for (let i = 0; i < book.lessonCount; i++) ls.put(emptyLesson(book.id, book.firstLesson + i, book.createdAt))
  })
  return book
}

/** Thêm sách từ khung có sẵn. Đã có thì trả về sách cũ (không tạo hai lần). */
export async function addBookFromTemplate(t: BookTemplate): Promise<Textbook> {
  const old = await getBook(t.id)
  if (old) return old
  return createBook({
    id: t.id, title: t.title, short: t.short, edition: t.edition, template: t.id, grammarBook: t.grammarBook,
    tagPrefix: t.tagPrefix, firstLesson: t.firstLesson, lessonCount: t.lessonCount, createdAt: Date.now(),
  })
}

/** Chữ thường, không dấu, chỉ a-z0-9 và "-": dùng làm tiền tố nhãn thẻ ôn. */
export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'sach'
}

/** Tạo sách tự đặt tên (giáo trình khác). */
export function addCustomBook(input: { title: string; firstLesson: number; lessonCount: number }): Promise<Textbook> {
  const title = input.title.trim() || 'Giáo trình của tôi'
  return createBook({
    id: makeId(), title, short: title.slice(0, 24), tagPrefix: slugify(title),
    firstLesson: Math.max(0, Math.floor(input.firstLesson)),
    lessonCount: Math.min(200, Math.max(1, Math.floor(input.lessonCount))),
    createdAt: Date.now(),
  })
}

export async function updateBook(id: string, patch: Partial<Omit<Textbook, 'id'>>): Promise<void> {
  const b = await getBook(id)
  if (b) await put('textbooks', { ...b, ...patch })
}

/** Ghi nhớ bài đang học để "Tiếp tục bài…". */
export const markOpened = (bookId: string, n: number) => updateBook(bookId, { lastLesson: n, lastOpenedAt: Date.now() })

/** Xóa sách và mọi bài, file audio của nó. Thẻ Ôn tập đã tạo vẫn giữ nguyên. */
export async function deleteBook(id: string): Promise<void> {
  await transaction(['textbooks', 'textbookLessons', 'textbookMedia'], 'readwrite', async (tx) => {
    tx.objectStore('textbooks').delete(id)
    const ls = tx.objectStore('textbookLessons')
    const lessons = await promisify<Lesson[]>(ls.index('by_book').getAll(id))
    const media = tx.objectStore('textbookMedia')
    for (const l of lessons) {
      ls.delete(l.id)
      const keys = await promisify<IDBValidKey[]>(media.index('by_lesson').getAllKeys(l.id))
      for (const k of keys) media.delete(k)
    }
  })
}

/** Sửa một bài (đọc rồi ghi trong cùng giao dịch, nên hai thao tác liền nhau không đè nhau). */
export async function updateLesson(bookId: string, n: number, fn: (l: Lesson) => Lesson): Promise<void> {
  await transaction('textbookLessons', 'readwrite', async (tx) => {
    const os = tx.objectStore('textbookLessons')
    const old = await promisify<Lesson | undefined>(os.get(lessonId(bookId, n)))
    os.put({ ...fn(old ?? emptyLesson(bookId, n, Date.now())), updatedAt: Date.now() })
  })
}

export const setLessonStatus = (bookId: string, n: number, status: LessonStatus) =>
  updateLesson(bookId, n, (l) => ({ ...l, status }))

export const setLessonTitle = (bookId: string, n: number, title: string) =>
  updateLesson(bookId, n, (l) => ({ ...l, title: title.trim() || undefined }))

export const setLessonNotes = (bookId: string, n: number, notes: string) =>
  updateLesson(bookId, n, (l) => ({ ...l, notes: notes || undefined }))

/** Thêm từ vào cuối bài. Bỏ qua từ đã có (cùng chữ viết và cách đọc). Trả về số từ thêm được. */
export async function addWords(bookId: string, n: number, words: Omit<LessonWord, 'id'>[]): Promise<number> {
  let added = 0
  await updateLesson(bookId, n, (l) => {
    const key = (w: Pick<LessonWord, 'word' | 'reading'>) => `${w.word}\u0000${w.reading ?? ''}`
    const seen = new Set(l.words.map(key))
    const fresh: LessonWord[] = []
    for (const w of words) {
      if (!w.word.trim() || seen.has(key(w))) continue
      seen.add(key(w))
      fresh.push({ ...w, id: makeId() })
    }
    added = fresh.length
    // Bài chưa học mà có từ → tự chuyển sang "đang học"
    return { ...l, words: [...l.words, ...fresh], status: l.status === 'new' && fresh.length ? 'learning' : l.status }
  })
  return added
}

export const updateWord = (bookId: string, n: number, w: LessonWord) =>
  updateLesson(bookId, n, (l) => ({ ...l, words: l.words.map((x) => (x.id === w.id ? w : x)) }))

export const removeWord = (bookId: string, n: number, id: string) =>
  updateLesson(bookId, n, (l) => ({ ...l, words: l.words.filter((x) => x.id !== id) }))

/** Đổi chỗ một từ lên/xuống một bậc. */
export const moveWord = (bookId: string, n: number, id: string, dir: -1 | 1) =>
  updateLesson(bookId, n, (l) => {
    const i = l.words.findIndex((x) => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= l.words.length) return l
    const words = [...l.words]
    ;[words[i], words[j]] = [words[j], words[i]]
    return { ...l, words }
  })
