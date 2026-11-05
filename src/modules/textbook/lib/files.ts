/**
 * FILE SÁCH GỐC (PDF / ảnh scan) VÀ GHI CHÚ TRÊN SÁCH
 * - File nằm trong bảng `textbookMedia` (không sao lưu: nặng, nhập lại được từ file của bạn).
 * - Tô sáng, ghi chú, đánh dấu trang nằm trong bảng `textbookNotes` (có sao lưu).
 *   Nhập lại đúng file đó thì ghi chú cũ hiện lại (ghi chú gắn với sách + tên file).
 */
import { get, getAllByIndex, promisify, put, remove, transaction } from '@/core/db'
import { makeId, updateBook } from '../store'
import type { BookFile, BookNote, Textbook } from '../types'

const fileKey = (bookId: string) => `${bookId}:book`

export async function listFiles(bookId: string): Promise<BookFile[]> {
  const all = await getAllByIndex<BookFile>('textbookMedia', 'by_lesson', fileKey(bookId))
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export const getFile = (id: string) => get<BookFile>('textbookMedia', id)

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name)
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

/** So sánh tên file kiểu "trang 2" < "trang 10". */
const byName = (a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true })

/**
 * Nhập file: mỗi PDF thành một "file sách"; các ảnh chọn cùng lúc gộp thành một file sách (mỗi ảnh một trang).
 * Mã file tính từ sách + tên file, nên nhập lại đúng file sau khi xóa thì ghi chú cũ vẫn khớp.
 */
export async function importFiles(bookId: string, files: File[], countPdfPages: (b: Blob) => Promise<number>): Promise<BookFile[]> {
  const out: BookFile[] = []
  const now = Date.now()
  for (const f of files.filter(isPdf)) {
    out.push({
      id: `${bookId}:file:${f.name}`, bookId, lessonId: fileKey(bookId), kind: 'pdf', name: f.name, size: f.size,
      pageCount: await countPdfPages(f), blob: f, createdAt: now,
    })
  }
  const imgs = files.filter(isImage).sort(byName)
  if (imgs.length) {
    const name = imgs.length === 1 ? imgs[0].name : `${imgs[0].name} … (${imgs.length})`
    out.push({
      id: `${bookId}:file:${name}`, bookId, lessonId: fileKey(bookId), kind: 'images', name,
      size: imgs.reduce((s, f) => s + f.size, 0), pageCount: imgs.length, images: imgs, createdAt: now,
    })
  }
  for (const f of out) {
    const old = await getFile(f.id)
    await put('textbookMedia', old ? { ...f, lastPage: old.lastPage, createdAt: old.createdAt } : f)
  }
  return out
}

export function acceptsFile(f: File) { return isPdf(f) || isImage(f) }

export async function renameFile(id: string, name: string) {
  const f = await getFile(id)
  if (f && name.trim()) await put('textbookMedia', { ...f, name: name.trim() })
}

export async function setLastPage(id: string, page: number) {
  await transaction(['textbookMedia'], 'readwrite', async (tx) => {
    const st = tx.objectStore('textbookMedia')
    const f = await promisify<BookFile | undefined>(st.get(id))
    if (f && f.lastPage !== page) st.put({ ...f, lastPage: page })
  })
}

/** Xóa file (ghi chú vẫn giữ, để nhập lại file là thấy lại). */
export const deleteFile = (id: string) => remove('textbookMedia', id)

/* ---------- Ghi chú ---------- */

export const listNotes = (fileId: string) => getAllByIndex<BookNote>('textbookNotes', 'by_file', fileId)
export const listBookNotes = (bookId: string) => getAllByIndex<BookNote>('textbookNotes', 'by_book', bookId)

export async function addNote(n: Omit<BookNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookNote> {
  const now = Date.now()
  const note: BookNote = { ...n, id: makeId(), createdAt: now, updatedAt: now }
  await put('textbookNotes', note)
  return note
}

export async function saveNote(n: BookNote) {
  await put('textbookNotes', { ...n, updatedAt: Date.now() })
}

export const deleteNote = (id: string) => remove('textbookNotes', id)

/* ---------- Trang ↔ bài ---------- */

/** Gắn "bài N bắt đầu ở trang này" (page = undefined để bỏ). */
export async function setLessonPage(b: Textbook, n: number, fileId: string, page: number | undefined) {
  const map = { ...(b.lessonPages ?? {}) }
  if (page == null) delete map[n]; else map[n] = { fileId, page }
  await updateBook(b.id, { lessonPages: map })
}

/** Trang `page` của file thuộc bài nào (bài có trang bắt đầu lớn nhất mà ≤ page). */
export function lessonOfPage(b: Textbook, fileId: string, page: number): number | undefined {
  let best: { n: number; page: number } | undefined
  for (const [n, v] of Object.entries(b.lessonPages ?? {})) {
    if (v.fileId === fileId && v.page <= page && (!best || v.page > best.page)) best = { n: Number(n), page: v.page }
  }
  return best?.n
}

/* ---------- Xuất Markdown ---------- */

export function notesToMarkdown(b: Textbook, f: BookFile, notes: BookNote[]): string {
  const lines = [`# ${b.title}: ghi chú`, '', `File: ${f.name}`, '']
  let lastLesson: number | undefined | null = null
  for (const n of [...notes].sort((a, c) => a.page - c.page || a.createdAt - c.createdAt)) {
    const lesson = lessonOfPage(b, f.id, n.page)
    if (lesson !== lastLesson) {
      lines.push(lesson != null ? `## Bài ${lesson}` : '## (Chưa gắn bài)', '')
      lastLesson = lesson
    }
    const where = `Trang ${n.page + 1}`
    if (n.kind === 'bookmark') lines.push(`- 🔖 ${where}${n.text ? `: ${n.text}` : ''}`)
    else {
      lines.push(`- **${where}**${n.quote ? `: 「${n.quote.replace(/\s+/g, ' ')}」` : ''}`)
      if (n.text) lines.push(...n.text.split('\n').map((l) => `  ${l}`))
    }
  }
  return lines.join('\n') + '\n'
}
