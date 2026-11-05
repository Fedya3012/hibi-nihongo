/**
 * GIẢI NÉN FILE TRUYỆN
 * - CBZ/ZIP: dùng fflate (nhỏ, nhanh)
 * - CBR/RAR: dùng node-unrar-js (bản unrar chính thức biên dịch sang WebAssembly), chỉ tải khi cần
 * - PDF: xem pdf.ts
 * Nhận dạng định dạng bằng vài byte đầu file, nên file đặt nhầm đuôi (.cbr mà thật ra là zip) vẫn mở được.
 */
import { isImageName, imageMime, naturalCompare } from './naming'

export interface ExtractedPage {
  name: string
  blob: Blob
}

export type ArchiveKind = 'zip' | 'rar' | 'pdf' | '7z' | 'unknown'

export async function detectKind(file: Blob): Promise<ArchiveKind> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip' // "PK"
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar' // "Rar!"
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf' // "%PDF"
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return '7z'
  return 'unknown'
}

const sortPages = (pages: ExtractedPage[]) => pages.sort((a, b) => naturalCompare(a.name, b.name))

export async function extractZip(file: Blob): Promise<ExtractedPage[]> {
  const { unzip } = await import('fflate')
  const data = new Uint8Array(await file.arrayBuffer())
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(data, { filter: (f) => isImageName(f.name) }, (err, out) => (err ? reject(err) : resolve(out)))
  })
  return sortPages(Object.entries(files).map(([name, bytes]) => ({
    name,
    blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: imageMime(name) }),
  })))
}

let wasmPromise: Promise<ArrayBuffer> | null = null

export async function extractRar(file: Blob): Promise<ExtractedPage[]> {
  const { createExtractorFromData } = await import('node-unrar-js')
  // File .wasm được nhúng thẳng vào code (dạng base64) để dùng được cả khi không có mạng
  wasmPromise ??= import('./unrar-wasm').then((m) => m.loadUnrarWasm())
  const extractor = await createExtractorFromData({ wasmBinary: await wasmPromise, data: await file.arrayBuffer() })
  const { files } = extractor.extract({ files: (h) => !h.flags.directory && isImageName(h.name) })
  const pages: ExtractedPage[] = []
  for (const f of files) {
    if (f.fileHeader.flags.encrypted) throw new Error('File RAR có mật khẩu, app chưa mở được.')
    if (f.extraction) {
      pages.push({
        name: f.fileHeader.name,
        blob: new Blob([f.extraction as Uint8Array<ArrayBuffer>], { type: imageMime(f.fileHeader.name) }),
      })
    }
  }
  return sortPages(pages)
}
