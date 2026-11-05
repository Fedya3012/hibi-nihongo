/**
 * ĐỌC VĂN BẢN TỪ CÁC NGUỒN: chữ dán vào, trang web (link), file TXT, file EPUB.
 * Mọi nguồn đều đưa về cùng một dạng: các chương, mỗi chương là danh sách đoạn văn.
 */
import { unzipSync, strFromU8 } from 'fflate'
import { hasJapanese } from '@/modules/dictionary'
import { decodeText } from '../anime/subtitles'
import type { DocChapter, ParsedDoc } from './types'

// ---------- Chữ thường ----------

/**
 * Bỏ ký hiệu của Aozora Bunko (thư viện sách miễn phí của Nhật) nếu có:
 *   ｜漢字《かんじ》 → 漢字   (furigana kiểu Aozora; app tự tạo furigana riêng)
 *   ［＃ここから２字下げ］   → bỏ (ghi chú dàn trang)
 */
export function cleanAozora(t: string): string {
  return t
    .replace(/《[^》\n]*》/g, '')
    .replace(/｜/g, '')
    .replace(/［＃[^］\n]*］/g, '')
}

/** Tách chữ thành đoạn văn: mỗi dòng không trống là một đoạn. */
export function textToParas(text: string): string[] {
  return cleanAozora(text.replace(/\r\n?/g, '\n'))
    .split('\n')
    .map((l) => l.replace(/[ \t　]+$/g, '').replace(/^[ \t]+/, ''))
    .filter((l) => l.trim().length > 0)
}

/** Dòng đầu tiên (ngắn gọn) làm tiêu đề khi người dùng không đặt tên. */
export function guessTitle(paras: string[], fallback = 'Văn bản không tên'): string {
  const first = paras.find((p) => p.trim())?.trim() ?? ''
  if (!first) return fallback
  return [...first].length > 30 ? [...first].slice(0, 30).join('') + '…' : first
}

export function fromPlainText(text: string, title: string, source: ParsedDoc['source'] = 'paste'): ParsedDoc {
  const paras = textToParas(text)
  if (!paras.length) throw new Error('Không có chữ nào để đọc.')
  return { title: title.trim() || guessTitle(paras), source, chapters: [{ title: '', paras }] }
}

// ---------- HTML (trang web, chương EPUB) ----------

const SKIP_TAGS = new Set(['rt', 'rp', 'script', 'style', 'noscript', 'template', 'svg', 'head', 'button', 'form', 'select', 'iframe'])
const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'main', 'header', 'footer', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'tr', 'td', 'th', 'figure', 'figcaption', 'hr', 'aside', 'nav', 'body',
])

/** Lấy chữ trong một khối HTML, giữ ranh giới đoạn văn. Bỏ furigana có sẵn (<rt>). */
export function htmlToParas(root: Node): string[] {
  const out: string[] = []
  let cur = ''
  const flush = () => { const t = cur.replace(/\s+/g, ' ').trim(); if (t) out.push(t); cur = '' }
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { cur += n.nodeValue ?? ''; return }
    if (n.nodeType !== Node.ELEMENT_NODE) return
    const tag = (n as Element).localName.toLowerCase()
    if (SKIP_TAGS.has(tag)) return
    if (tag === 'br') { flush(); return }
    const block = BLOCK_TAGS.has(tag)
    if (block) flush()
    for (const c of Array.from(n.childNodes)) walk(c)
    if (block) flush()
  }
  walk(root)
  flush()
  return out
}

/**
 * Tìm phần bài viết chính trong một trang web (bỏ menu, quảng cáo, chân trang).
 * Cách đơn giản: ưu tiên <article>/<main>; không có thì chọn khối có nhiều chữ tiếng Nhật trong <p> nhất.
 */
export function extractArticle(doc: Document): { title: string; paras: string[] } {
  doc.querySelectorAll('script,style,noscript,nav,footer,aside,form,iframe,[role="navigation"],[aria-hidden="true"]').forEach((e) => e.remove())
  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title.trim()

  const jpLen = (el: Element) => (el.textContent ?? '').replace(/[^぀-ヿ㐀-鿿]/g, '').length
  let best: Element | null = null
  const candidates = Array.from(doc.querySelectorAll('article, main, [itemprop="articleBody"], .article, .content, #content'))
  for (const c of candidates) if (!best || jpLen(c) > jpLen(best)) best = c
  if (!best || jpLen(best) < 50) {
    // Gom điểm theo khối cha của các thẻ <p>
    const score = new Map<Element, number>()
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      const parent = p.parentElement
      if (parent) score.set(parent, (score.get(parent) ?? 0) + jpLen(p))
    }
    for (const [el, s] of score) if (!best || s > jpLen(best)) best = el
  }
  const paras = htmlToParas(best ?? doc.body).filter((p) => hasJapanese(p) || p.length > 40)
  return { title, paras }
}

export function fromHtml(html: string, url?: string): ParsedDoc {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const { title, paras } = extractArticle(doc)
  if (!paras.length) throw new Error('Không tìm thấy chữ tiếng Nhật trong trang này.')
  return { title: title || guessTitle(paras), source: 'url', url, chapters: [{ title: '', paras }] }
}

/**
 * Tải bài viết từ một link. Nhiều trang web không cho app khác đọc trực tiếp (chính sách CORS của
 * trình duyệt), khi đó báo lỗi dễ hiểu để người dùng sao chép chữ rồi dán vào.
 */
export async function fromUrl(url: string): Promise<ParsedDoc> {
  let u: URL
  try { u = new URL(url.trim()) } catch { throw new Error('Link không hợp lệ. Link cần bắt đầu bằng https://') }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Chỉ mở được link http:// hoặc https://')
  let res: Response
  try {
    res = await fetch(u.href, { credentials: 'omit' })
  } catch {
    throw new Error(
      'Trang này không cho app tải trực tiếp (trình duyệt chặn vì lý do bảo mật). ' +
      'Cách làm: mở trang, chọn hết bài (Ctrl+A), sao chép (Ctrl+C), rồi dùng "Dán chữ" hoặc "Từ clipboard".',
    )
  }
  if (!res.ok) throw new Error(`Trang trả về lỗi ${res.status}.`)
  const buf = await res.arrayBuffer()
  const type = res.headers.get('content-type') ?? ''
  const charset = /charset=([\w-]+)/i.exec(type)?.[1]
  let text: string
  try { text = charset ? new TextDecoder(charset).decode(buf) : decodeText(buf) } catch { text = decodeText(buf) }
  // Trang khai báo bảng mã trong thẻ <meta> (trang Nhật cũ hay dùng Shift_JIS)
  const metaCharset = !charset && /<meta[^>]+charset=["']?([\w-]+)/i.exec(text)?.[1]
  if (metaCharset && !/utf-?8/i.test(metaCharset)) {
    try { text = new TextDecoder(metaCharset).decode(buf) } catch { /* giữ bản đã giải */ }
  }
  if (!/html/i.test(type) && !/<html|<body|<p[\s>]/i.test(text)) return { ...fromPlainText(text, u.hostname, 'url'), url: u.href }
  return fromHtml(text, u.href)
}

// ---------- File TXT ----------

export async function fromTxtFile(file: File): Promise<ParsedDoc> {
  const text = decodeText(await file.arrayBuffer())
  const paras = textToParas(text)
  if (!paras.length) throw new Error('File trống.')
  const title = file.name.replace(/\.[^.]+$/, '')
  return { title, source: 'txt', fileName: file.name, chapters: splitTxtChapters(paras) }
}

/** Sách TXT dài: tách chương theo dòng kiểu "第一章 …", "第3話", "Chapter 2". Không thấy thì để một chương. */
function splitTxtChapters(paras: string[]): DocChapter[] {
  const isHeading = (p: string) => p.length <= 40 && /^\s*(第[0-9０-９一二三四五六七八九十百千]+[章話回部節]|chapter\s*\d+|プロローグ|エピローグ)/i.test(p)
  const heads = paras.filter(isHeading).length
  if (heads < 2) return [{ title: '', paras }]
  const out: DocChapter[] = []
  let cur: DocChapter = { title: '', paras: [] }
  for (const p of paras) {
    if (isHeading(p)) {
      if (cur.paras.length || cur.title) out.push(cur)
      cur = { title: p.trim(), paras: [] }
    } else cur.paras.push(p)
  }
  out.push(cur)
  return out.filter((c) => c.paras.length)
}

// ---------- File EPUB ----------

/** Đường dẫn tương đối trong file EPUB → đường dẫn đầy đủ trong file zip. */
function resolvePath(base: string, href: string): string {
  const parts = (base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '').concat(decodeURIComponent(href.split('#')[0])).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p && p !== '.') out.push(p)
  }
  return out.join('/')
}

/**
 * EPUB là file zip chứa các trang XHTML. Thứ tự đọc nằm ở "spine" trong file .opf.
 * Sách Nhật dọc (縦書き) cũng đọc được: app lấy chữ, cách hiện (dọc/ngang) chọn trong trình đọc.
 */
export async function fromEpubFile(file: File): Promise<ParsedDoc> {
  let zip: Record<string, Uint8Array>
  try { zip = unzipSync(new Uint8Array(await file.arrayBuffer())) } catch { throw new Error('File EPUB bị hỏng hoặc không phải EPUB.') }
  const read = (p: string) => (zip[p] ? strFromU8(zip[p]) : undefined)
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')

  const container = read('META-INF/container.xml')
  const opfPath = container && xml(container).querySelector('rootfile')?.getAttribute('full-path')
  const opfText = opfPath && read(opfPath)
  if (!opfPath || !opfText) throw new Error('Không đọc được mục lục của file EPUB.')
  const opf = xml(opfText)

  const manifest = new Map<string, { href: string; type: string; props: string }>()
  opf.querySelectorAll('manifest > item').forEach((it) => {
    manifest.set(it.getAttribute('id') ?? '', {
      href: resolvePath(opfPath, it.getAttribute('href') ?? ''),
      type: it.getAttribute('media-type') ?? '',
      props: it.getAttribute('properties') ?? '',
    })
  })
  const title = opf.getElementsByTagName('dc:title')[0]?.textContent?.trim() || file.name.replace(/\.[^.]+$/, '')

  // Tên chương lấy từ mục lục (nav.xhtml của EPUB 3, hoặc toc.ncx của EPUB 2)
  const tocTitles = new Map<string, string>()
  const nav = [...manifest.values()].find((m) => m.props.split(' ').includes('nav'))
  const navText = nav && read(nav.href)
  if (navText && nav) {
    new DOMParser().parseFromString(navText, 'text/html').querySelectorAll('nav a[href]').forEach((a) => {
      const p = resolvePath(nav.href, a.getAttribute('href') ?? '')
      if (!tocTitles.has(p)) tocTitles.set(p, (a.textContent ?? '').trim())
    })
  }
  const ncx = [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml')
  const ncxText = ncx && read(ncx.href)
  if (ncxText && ncx) {
    xml(ncxText).querySelectorAll('navPoint').forEach((np) => {
      const src = np.querySelector('content')?.getAttribute('src')
      const label = np.querySelector('navLabel > text')?.textContent?.trim()
      if (src && label) { const p = resolvePath(ncx.href, src); if (!tocTitles.has(p)) tocTitles.set(p, label) }
    })
  }

  const chapters: DocChapter[] = []
  for (const ref of Array.from(opf.querySelectorAll('spine > itemref'))) {
    const item = manifest.get(ref.getAttribute('idref') ?? '')
    if (!item || !/html/.test(item.type)) continue
    const src = read(item.href)
    if (!src) continue
    let doc = new DOMParser().parseFromString(src, 'application/xhtml+xml')
    if (doc.querySelector('parsererror')) doc = new DOMParser().parseFromString(src, 'text/html')
    const body = doc.querySelector('body') ?? doc.documentElement
    const paras = htmlToParas(body).map(cleanAozora).filter((p) => p.trim())
    if (!paras.length) continue
    const heading = body.querySelector('h1,h2,h3')?.textContent?.trim()
    chapters.push({ title: tocTitles.get(item.href) || heading || '', paras })
  }
  if (!chapters.length) throw new Error('Không tìm thấy chữ trong EPUB (sách có thể chỉ có ảnh, ví dụ manga: hãy mở bằng Đọc manga).')
  // Chương không có tên thì đánh số
  chapters.forEach((c, i) => { if (!c.title) c.title = chapters.length > 1 ? `Phần ${i + 1}` : '' })
  return { title, source: 'epub', fileName: file.name, chapters }
}

export async function fromFile(file: File): Promise<ParsedDoc> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'epub') return fromEpubFile(file)
  if (ext === 'html' || ext === 'htm' || ext === 'xhtml') {
    const d = fromHtml(decodeText(await file.arrayBuffer()))
    return { ...d, source: 'txt', fileName: file.name, title: d.title || file.name }
  }
  return fromTxtFile(file)
}

export const FILE_ACCEPT = '.txt,.epub,.html,.htm,.md,.srt,text/plain,application/epub+zip'

// ---------- Clipboard ----------

/** Đọc chữ trong clipboard. Trình duyệt có thể hỏi quyền một lần. */
export async function readClipboard(): Promise<string> {
  if (!navigator.clipboard?.readText) throw new Error('Trình duyệt này không cho đọc clipboard. Hãy bấm vào ô chữ và nhấn Ctrl+V.')
  try {
    return await navigator.clipboard.readText()
  } catch {
    throw new Error('Chưa được phép đọc clipboard. Hãy cho phép khi trình duyệt hỏi, hoặc bấm vào ô chữ và nhấn Ctrl+V.')
  }
}
