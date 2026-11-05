/**
 * LƯU VĂN BẢN TRÊN MÁY
 * Dùng bảng kv chung (không thêm bảng mới vào schema, để không đụng PR khác):
 *   reader:docs        → danh sách DocMeta (thư viện)
 *   reader:doc:<id>    → DocBody (nội dung đầy đủ)
 * Bảng kv có trong file sao lưu, nên văn bản cũng được sao lưu.
 */
import { kvDelete, kvGet, kvSet } from '@/core/db'
import type { DocBody, DocChapter, DocMeta, DocPage, ParsedDoc } from './types'

const LIST_KEY = 'reader:docs'
const bodyKey = (id: string) => `reader:doc:${id}`

/** Mỗi trang tối đa khoảng chừng này ký tự (đủ một màn hình đọc, tách từ nhanh). */
export const PAGE_CHARS = 2500

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Chia các chương thành trang. Đoạn văn không bao giờ bị cắt đôi. */
export function paginate(chapters: DocChapter[]): DocPage[] {
  const pages: DocPage[] = []
  chapters.forEach((ch, ci) => {
    let cur: string[] = []
    let size = 0
    const flush = () => {
      pages.push({ chapter: ci, title: ch.title, firstOfChapter: !pages.some((p) => p.chapter === ci), paras: cur })
      cur = []
      size = 0
    }
    for (const p of ch.paras) {
      if (size > 0 && size + p.length > PAGE_CHARS) flush()
      cur.push(p)
      size += p.length
    }
    if (cur.length || !ch.paras.length) flush()
  })
  return pages.length ? pages : [{ chapter: 0, title: '', firstOfChapter: true, paras: [] }]
}

const countChars = (chs: DocChapter[]) => chs.reduce((n, c) => n + c.paras.reduce((m, p) => m + p.length, 0), 0)

export async function listDocs(): Promise<DocMeta[]> {
  const list = await kvGet<DocMeta[]>(LIST_KEY, [])
  return list.sort((a, b) => (b.openedAt ?? b.createdAt) - (a.openedAt ?? a.createdAt))
}

export async function getDocMeta(id: string): Promise<DocMeta | undefined> {
  return (await kvGet<DocMeta[]>(LIST_KEY, [])).find((d) => d.id === id)
}

export const getDocBody = (id: string) => kvGet<DocBody | undefined>(bodyKey(id), undefined)

export async function saveNewDoc(doc: ParsedDoc): Promise<DocMeta> {
  const id = newId()
  const meta: DocMeta = {
    id, title: doc.title.trim() || 'Văn bản không tên', source: doc.source, url: doc.url, fileName: doc.fileName,
    createdAt: Date.now(), chars: countChars(doc.chapters), pages: paginate(doc.chapters).length, page: 0,
  }
  await kvSet(bodyKey(id), { id, chapters: doc.chapters } satisfies DocBody)
  await kvSet(LIST_KEY, [...(await kvGet<DocMeta[]>(LIST_KEY, [])), meta])
  return meta
}

export async function updateDocMeta(id: string, patch: Partial<Omit<DocMeta, 'id'>>): Promise<void> {
  const list = await kvGet<DocMeta[]>(LIST_KEY, [])
  await kvSet(LIST_KEY, list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
}

/** Thay nội dung (ví dụ chế độ clipboard thêm dòng mới). Tự cập nhật số ký tự, số trang. */
export async function saveDocBody(body: DocBody): Promise<void> {
  await kvSet(bodyKey(body.id), body)
  await updateDocMeta(body.id, { chars: countChars(body.chapters), pages: paginate(body.chapters).length })
}

export async function deleteDoc(id: string): Promise<void> {
  await kvDelete(bodyKey(id))
  await kvSet(LIST_KEY, (await kvGet<DocMeta[]>(LIST_KEY, [])).filter((d) => d.id !== id))
}
