/**
 * NGUỒN TRANG cho trình đọc: đưa ra đường dẫn ảnh (blob URL) của từng trang,
 * dù chương là ảnh rời hay một file PDF. Trình đọc không cần biết bên trong là gì.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getBlob } from './store'
import { openPdf, renderPdfPage } from './pdf'
import type { MangaChapter } from './types'

export interface PageSource {
  count: number
  /** Đường dẫn ảnh để đặt vào <img src>. */
  url(index: number): Promise<string>
  /** Ảnh gốc của trang (dùng cho OCR). */
  blob(index: number): Promise<Blob>
  /** Giải phóng bộ nhớ khi đóng trình đọc. */
  dispose(): void
}

/** Giữ tối đa bấy nhiêu trang PDF đã vẽ trong bộ nhớ (ảnh rời thì nhẹ, giữ hết). */
const PDF_CACHE = 16

export async function openPageSource(chapter: MangaChapter): Promise<PageSource> {
  const urls = new Map<number, Promise<string>>()
  const created: string[] = []
  const track = (u: string) => (created.push(u), u)

  if (chapter.source === 'images') {
    const blob = async (i: number) => {
      const b = await getBlob(chapter.id, i)
      if (!b) throw new Error('Thiếu ảnh trang. Hãy nhập lại file của chương này.')
      return b
    }
    return {
      count: chapter.pageCount,
      blob,
      url(i) {
        let p = urls.get(i)
        if (!p) {
          p = blob(i).then((b) => track(URL.createObjectURL(b)))
          p.catch(() => urls.delete(i))
          urls.set(i, p)
        }
        return p
      },
      dispose() { created.forEach((u) => URL.revokeObjectURL(u)) },
    }
  }

  // PDF: vẽ trang khi cần, theo độ rộng màn hình × mật độ điểm ảnh (nét trên màn hình 2K/4K)
  const file = await getBlob(chapter.id, 0)
  if (!file) throw new Error('Thiếu file PDF. Hãy nhập lại file của chương này.')
  const doc: PDFDocumentProxy = await openPdf(file)
  const width = Math.min(2400, Math.max(1200, Math.round(window.innerHeight * 0.75 * (window.devicePixelRatio || 1))))
  const order: number[] = []
  const rendered = new Map<number, Blob>()
  const blob = async (i: number) => {
    const hit = rendered.get(i)
    if (hit) return hit
    const b = await renderPdfPage(doc, i, width)
    rendered.set(i, b)
    return b
  }
  return {
    count: chapter.pageCount,
    blob,
    url(i) {
      let p = urls.get(i)
      if (!p) {
        p = blob(i).then((b) => URL.createObjectURL(b))
        p.catch(() => urls.delete(i))
        urls.set(i, p)
        order.push(i)
        // Quá nhiều trang trong bộ nhớ: bỏ trang cũ nhất
        while (order.length > PDF_CACHE) {
          const old = order.shift()!
          const op = urls.get(old)
          urls.delete(old)
          rendered.delete(old)
          void op?.then((u) => setTimeout(() => URL.revokeObjectURL(u), 5000))
        }
      }
      return p
    },
    dispose() {
      for (const p of urls.values()) void p.then((u) => URL.revokeObjectURL(u), () => {})
      void doc.loadingTask.destroy()
    },
  }
}
