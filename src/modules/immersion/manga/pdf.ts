/**
 * ĐỌC FILE PDF bằng pdf.js (thư viện của Mozilla, chạy hoàn toàn trên máy, không cần mạng).
 * Thư viện khá nặng nên chỉ được tải khi thật sự mở/nhập một file PDF.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PageMeta } from './types'

let libPromise: Promise<typeof import('pdfjs-dist')> | null = null

function pdfjs() {
  libPromise ??= (async () => {
    const lib = await import('pdfjs-dist')
    // "?worker": Vite đóng gói phần xử lý nặng thành một luồng riêng → giao diện không bị đơ
    const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')
    lib.GlobalWorkerOptions.workerPort = new PdfWorker()
    return lib
  })()
  return libPromise
}

export async function openPdf(data: Blob | ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await pdfjs()
  const bytes = new Uint8Array(data instanceof Blob ? await data.arrayBuffer() : data)
  return lib.getDocument({ data: bytes }).promise
}

/** Kích thước từng trang (đơn vị điểm PDF, chỉ cần tỉ lệ ngang/dọc). */
export async function pdfPageSizes(doc: PDFDocumentProxy): Promise<PageMeta[]> {
  const out: PageMeta[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    out.push({ w: Math.round(vp.width), h: Math.round(vp.height) })
  }
  return out
}

/** Vẽ một trang (index đếm từ 0) thành ảnh, rộng `width` pixel. */
export async function renderPdfPage(doc: PDFDocumentProxy, index: number, width: number): Promise<Blob> {
  const page = await doc.getPage(index + 1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: width / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9))
  page.cleanup()
  if (!blob) throw new Error('Không vẽ được trang PDF')
  return blob
}
