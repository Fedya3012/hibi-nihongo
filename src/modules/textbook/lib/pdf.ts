/**
 * ĐỌC PDF CỦA SÁCH bằng pdf.js (chạy trên máy, không cần mạng). Thư viện nặng nên chỉ tải khi mở sách.
 * Ngoài vẽ trang thành ảnh, còn đặt một lớp chữ trong suốt lên trên ("text layer") để chọn chữ,
 * tra từ, tô sáng đúng đoạn chữ. PDF chỉ là ảnh scan thì không có lớp chữ (vẫn tô sáng theo vùng được).
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'

let libPromise: Promise<typeof import('pdfjs-dist')> | null = null

function pdfjs() {
  libPromise ??= (async () => {
    const lib = await import('pdfjs-dist')
    const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')
    lib.GlobalWorkerOptions.workerPort = new PdfWorker()
    return lib
  })()
  return libPromise
}

export async function openPdf(data: Blob): Promise<PDFDocumentProxy> {
  const lib = await pdfjs()
  return lib.getDocument({ data: new Uint8Array(await data.arrayBuffer()) }).promise
}

export async function countPdfPages(data: Blob): Promise<number> {
  const doc = await openPdf(data)
  const n = doc.numPages
  void doc.loadingTask.destroy()
  return n
}

/**
 * Vẽ trang `index` (đếm từ 0) vào `canvas` cho vừa chiều rộng `width` (px CSS), và dựng lớp chữ trong `textDiv`.
 * Trả về hàm hủy (gọi khi đổi trang giữa chừng). Trả về số ký tự chữ tìm thấy qua `onText`.
 */
export async function renderPage(doc: PDFDocumentProxy, index: number, width: number,
  canvas: HTMLCanvasElement, textDiv: HTMLDivElement, onText?: (chars: number) => void): Promise<() => void> {
  const lib = await pdfjs()
  const page = await doc.getPage(index + 1)
  const base = page.getViewport({ scale: 1 })
  const scale = width / base.width
  const viewport = page.getViewport({ scale })
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`
  const task = page.render({ canvas, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
  let cancelled = false
  const cancel = () => { cancelled = true; task.cancel() }
  try { await task.promise } catch (e) { if (cancelled) return cancel; throw e }

  textDiv.replaceChildren()
  textDiv.style.setProperty('--total-scale-factor', String(scale))
  const content = await page.getTextContent()
  if (cancelled) return cancel
  const chars = content.items.reduce((s, it) => s + ('str' in it ? it.str.trim().length : 0), 0)
  onText?.(chars)
  if (chars) await new lib.TextLayer({ textContentSource: content, container: textDiv, viewport }).render()
  return cancel
}
