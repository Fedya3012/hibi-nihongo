/**
 * NHẬP MANGA TỪ FILE CỦA NGƯỜI DÙNG
 *
 * 1. planImport(): nhìn danh sách file được chọn/kéo thả và chia thành các chương:
 *      - mỗi file .cbz/.zip/.cbr/.rar/.pdf  → một chương
 *      - ảnh rời: mỗi thư mục chứa ảnh       → một chương
 * 2. Người dùng xem lại, sửa tên/số chương, chọn series.
 * 3. importChapter(): giải nén, đo kích thước trang, tạo ảnh bìa nhỏ, rồi lưu vào kho.
 *
 * File chỉ được chép vào kho dữ liệu trên máy này, không gửi đi đâu cả.
 */
import { detectKind, extractRar, extractZip, type ExtractedPage } from './archive'
import { openPdf, pdfPageSizes, renderPdfPage } from './pdf'
import {
  baseName, dirOf, extOf, guessChapter, guessSeriesTitle, isImageName, naturalCompare, stripExt,
} from './naming'
import { listChapters, newId, saveChapterWithBlobs } from './store'
import { THUMB_INDEX, type MangaBlob, type MangaChapter, type PageMeta } from './types'

/** Một file kèm đường dẫn tương đối (khi chọn/kéo cả thư mục). */
export interface InputFile {
  file: File
  path: string
}

export interface ChapterDraft {
  key: string
  title: string
  number: number | null
  volume: number | null
  /** Tên dùng để nhận ra chương khi nhập lại (tên file, hoặc đường dẫn thư mục). */
  fileName: string
  kind: 'archive' | 'images'
  files: File[]
  size: number
}

export interface ImportPlan {
  seriesGuess: string
  chapters: ChapterDraft[]
  skipped: string[]
}

const ARCHIVE_EXT = ['cbz', 'zip', 'cbr', 'rar', 'pdf']
export const ACCEPT = '.cbz,.zip,.cbr,.rar,.pdf,image/*'

export function planImport(inputs: InputFile[]): ImportPlan {
  const chapters: ChapterDraft[] = []
  const skipped: string[] = []
  const imageDirs = new Map<string, File[]>()

  for (const { file, path } of inputs) {
    const ext = extOf(file.name)
    if (ARCHIVE_EXT.includes(ext)) {
      const g = guessChapter(file.name)
      chapters.push({
        key: path, title: stripExt(file.name), ...g, fileName: file.name,
        kind: 'archive', files: [file], size: file.size,
      })
    } else if (isImageName(path)) {
      const dir = dirOf(path)
      const list = imageDirs.get(dir) ?? []
      list.push(file)
      imageDirs.set(dir, list)
    } else if (!baseName(path).startsWith('.')) {
      skipped.push(path)
    }
  }

  for (const [dir, files] of imageDirs) {
    files.sort((a, b) => naturalCompare(a.name, b.name))
    const name = baseName(dir) || 'Ảnh đã chọn'
    const g = guessChapter(name)
    chapters.push({
      key: dir || '(ảnh)', title: name, ...g, fileName: dir || name,
      kind: 'images', files, size: files.reduce((n, f) => n + f.size, 0),
    })
  }

  chapters.sort((a, b) =>
    (a.volume ?? -1) - (b.volume ?? -1) ||
    (a.number ?? Infinity) - (b.number ?? Infinity) ||
    naturalCompare(a.fileName, b.fileName))

  // Tên series: nếu chọn cả thư mục có nhiều chương con → lấy tên thư mục gốc
  const roots = new Set(inputs.filter((i) => i.path.includes('/')).map((i) => i.path.split('/')[0]))
  const fromFolder = roots.size === 1 && chapters.length > 1 ? [...roots][0] : ''
  const seriesGuess = fromFolder || guessSeriesTitle(chapters.map((c) => c.title)) || (chapters.length === 1 ? chapters[0].title : '')

  return { seriesGuess, chapters, skipped }
}

/** Lấy mọi file (kể cả trong thư mục con) từ thao tác kéo-thả. */
export async function filesFromDrop(dt: DataTransfer): Promise<InputFile[]> {
  const entries = [...dt.items]
    .map((it) => (it.kind === 'file' ? it.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => !!e)
  if (!entries.length) return [...dt.files].map((file) => ({ file, path: file.name }))

  const out: InputFile[] = []
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej))
      out.push({ file, path: prefix + file.name })
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      // readEntries chỉ trả về từng đợt (~100 mục), phải gọi tới khi rỗng
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
        if (!batch.length) break
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`)
      }
    }
  }
  for (const e of entries) await walk(e, '')
  return out
}

export const filesFromInput = (list: FileList | null): InputFile[] =>
  [...(list ?? [])].map((file) => ({ file, path: file.webkitRelativePath || file.name }))

// ----- Xử lý ảnh -----

/** Chạy các việc với tối đa `limit` việc cùng lúc. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }))
  return out
}

async function measure(blob: Blob): Promise<PageMeta> {
  try {
    const bmp = await createImageBitmap(blob)
    const meta = { w: bmp.width, h: bmp.height }
    bmp.close()
    return meta
  } catch {
    return { w: 0, h: 0 } // ảnh hỏng: vẫn giữ trang, coi như trang dọc
  }
}

/** Ảnh bìa nhỏ (rộng 320px) để hiện trong thư viện mà không phải tải ảnh lớn. */
async function makeThumb(blob: Blob): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(blob)
    const w = 320
    const h = Math.round((bmp.height / bmp.width) * w)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.8))
  } catch {
    return null
  }
}

export interface ImportProgress {
  stage: 'read' | 'measure' | 'save'
  done: number
  total: number
}

/**
 * Nhập một chương vào series. Nếu series đã có chương cùng tên file, chương đó được THAY ảnh
 * nhưng giữ nguyên trang đang đọc (tiện khi khôi phục sao lưu ở máy mới rồi nhập lại file).
 */
export async function importChapter(
  seriesId: string,
  draft: ChapterDraft,
  onProgress?: (p: ImportProgress) => void,
): Promise<MangaChapter> {
  onProgress?.({ stage: 'read', done: 0, total: 1 })
  const existing = (await listChapters(seriesId)).find((c) => c.fileName === draft.fileName)
  const id = existing?.id ?? newId()

  let source: MangaChapter['source'] = 'images'
  let pages: PageMeta[]
  const blobs: MangaBlob[] = []
  let thumb: Blob | null = null

  const kind = draft.kind === 'archive' ? await detectKind(draft.files[0]) : 'images'
  if (kind === 'pdf') {
    source = 'pdf'
    const file = draft.files[0]
    const doc = await openPdf(file)
    try {
      onProgress?.({ stage: 'measure', done: 0, total: doc.numPages })
      pages = await pdfPageSizes(doc)
      thumb = await renderPdfPage(doc, 0, 320).catch(() => null)
    } finally {
      void doc.loadingTask.destroy()
    }
    blobs.push({ chapterId: id, index: 0, kind: 'pdf', blob: file })
  } else {
    let extracted: ExtractedPage[]
    if (kind === 'zip') extracted = await extractZip(draft.files[0])
    else if (kind === 'rar') extracted = await extractRar(draft.files[0])
    else if (kind === 'images') extracted = draft.files.map((f) => ({ name: f.name, blob: f }))
    else if (kind === '7z') throw new Error('File .cb7/.7z chưa được hỗ trợ. Hãy giải nén ra thư mục ảnh rồi nhập thư mục.')
    else throw new Error('Không nhận ra định dạng file này.')

    extracted = extracted.filter((p) => p.blob.size > 0) // bỏ file rỗng/hỏng
    if (!extracted.length) throw new Error('Không tìm thấy ảnh nào bên trong.')
    let done = 0
    pages = await mapLimit(extracted, 4, async (p) => {
      const m = await measure(p.blob)
      onProgress?.({ stage: 'measure', done: ++done, total: extracted.length })
      return m
    })
    extracted.forEach((p, i) => blobs.push({ chapterId: id, index: i, kind: 'page', blob: p.blob }))
    thumb = await makeThumb(extracted[0].blob)
  }
  if (thumb) blobs.push({ chapterId: id, index: THUMB_INDEX, kind: 'thumb', blob: thumb })

  const chapter: MangaChapter = {
    id,
    seriesId,
    title: draft.title,
    number: draft.number,
    volume: draft.volume,
    source,
    fileName: draft.fileName,
    size: draft.size,
    pageCount: pages.length,
    pages,
    addedAt: existing?.addedAt ?? Date.now(),
    lastPage: Math.min(existing?.lastPage ?? 0, Math.max(0, pages.length - 1)),
    lastReadAt: existing?.lastReadAt,
    finishedAt: existing?.finishedAt,
  }
  onProgress?.({ stage: 'save', done: 0, total: 1 })
  await saveChapterWithBlobs(chapter, blobs)
  return chapter
}
