/** KIỂU DỮ LIỆU CỦA TRÌNH ĐỌC VĂN BẢN */

/** Văn bản đến từ đâu. */
export type DocSource = 'paste' | 'url' | 'txt' | 'epub' | 'clipboard'

/** Một chương: tiêu đề + các đoạn văn (mỗi đoạn là một dòng chữ). */
export interface DocChapter {
  title: string
  paras: string[]
}

/** Thông tin ngắn của một văn bản (hiện trong thư viện). Lưu chung một khóa kv. */
export interface DocMeta {
  id: string
  title: string
  source: DocSource
  url?: string
  fileName?: string
  createdAt: number
  /** Lần mở gần nhất (để xếp "đọc gần đây" lên đầu). */
  openedAt?: number
  /** Tổng số ký tự (để hiện độ dài). */
  chars: number
  /** Số trang sau khi chia (trang = vài nghìn ký tự). */
  pages: number
  /** Trang đang đọc (0 = trang đầu). */
  page: number
  finishedAt?: number
}

/** Nội dung đầy đủ. Lưu riêng từng văn bản để thư viện mở nhanh. */
export interface DocBody {
  id: string
  chapters: DocChapter[]
}

/** Một trang khi đọc: một phần của một chương. */
export interface DocPage {
  chapter: number
  title: string
  /** Trang đầu của chương thì hiện tiêu đề chương. */
  firstOfChapter: boolean
  paras: string[]
}

/** Văn bản vừa đọc xong từ nguồn, chưa lưu. */
export interface ParsedDoc {
  title: string
  source: DocSource
  url?: string
  fileName?: string
  chapters: DocChapter[]
}
