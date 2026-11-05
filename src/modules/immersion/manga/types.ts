/**
 * KIỂU DỮ LIỆU CỦA MODULE ĐỌC MANGA
 *
 * Cách tổ chức:  Series (bộ truyện, ví dụ "One Piece")
 *                  └─ Chapter (chương, mỗi file CBZ/CBR/PDF hoặc mỗi thư mục ảnh là một chương)
 *                       └─ Trang (ảnh, lưu riêng trong bảng mangaBlobs)
 *
 * Bảng mangaSeries và mangaChapters chỉ chứa chữ và số (tên, trang đang đọc...) nên được sao lưu.
 * Ảnh trang nằm trong mangaBlobs, KHÔNG sao lưu (quá nặng, và là file của bạn, nhập lại được).
 */

/** Chiều đọc: 'rtl' = phải sang trái (manga Nhật), 'ltr' = trái sang phải. */
export type ReadDirection = 'rtl' | 'ltr'

/** Cách xếp trang: một trang, hai trang, tự chọn theo màn hình, hoặc cuộn dọc liên tục. */
export type PageLayout = 'auto' | 'single' | 'double' | 'scroll'

/** Cách co ảnh: vừa khung, vừa chiều ngang, vừa chiều cao. */
export type FitMode = 'page' | 'width' | 'height'

export interface ReaderPrefs {
  direction: ReadDirection
  layout: PageLayout
  fit: FitMode
  /** Ở chế độ hai trang: trang bìa đứng riêng (để các cặp trang ghép đúng như sách in). */
  coverAlone: boolean
  /** Chế độ đọc: 'chill' (đọc không ngắt) hoặc 'study' (hiện bong bóng, tra cứu). */
  mode: ReadMode
  /** Màu nền giấy: bình thường hoặc sepia (ngả vàng, dịu mắt khi đọc lâu). */
  tone: 'normal' | 'sepia'
  /** Độ sáng ảnh trang, 0.5–1. */
  brightness: number
}

export const DEFAULT_PREFS: ReaderPrefs = {
  direction: 'rtl',
  layout: 'auto',
  fit: 'page',
  coverAlone: true,
  mode: 'study',
  tone: 'normal',
  brightness: 1,
}

export interface MangaSeries {
  id: string
  title: string
  /** Tên tiếng Nhật, ví dụ ワンピース (không bắt buộc). */
  titleJp?: string
  createdAt: number
  updatedAt: number
  /** Lần đọc gần nhất và chương đang đọc dở: dùng cho "Tiếp tục đọc" (Smart Resume). */
  lastReadAt?: number
  lastChapterId?: string
  /** Đánh dấu yêu thích (hiện lên đầu thư viện). */
  favorite?: boolean
  /** Cài đặt đọc riêng cho series này (ghi đè cài đặt chung). */
  prefs?: Partial<ReaderPrefs>
}

/** Kích thước một trang (pixel), dùng để nhận ra trang đôi (ảnh ngang) khi xem hai trang. */
export interface PageMeta {
  w: number
  h: number
}

export type ChapterSource = 'images' | 'pdf'

export interface MangaChapter {
  id: string
  seriesId: string
  title: string
  /** Số chương để sắp xếp (có thể lẻ như 10.5). null = không đoán được. */
  number: number | null
  volume?: number | null
  source: ChapterSource
  /** Tên file/thư mục gốc. Nhập lại file cùng tên vào cùng series sẽ thay ảnh mà giữ trang đang đọc. */
  fileName: string
  size: number
  pageCount: number
  pages: PageMeta[]
  addedAt: number
  /** Trang đang đọc (đếm từ 0). */
  lastPage: number
  lastReadAt?: number
  finishedAt?: number
}

/** Một file nhị phân: ảnh trang, file PDF gốc, hoặc ảnh thu nhỏ làm bìa. */
export interface MangaBlob {
  chapterId: string
  /** Số thứ tự trang. PDF lưu nguyên file ở index 0. Ảnh bìa thu nhỏ ở index -1. */
  index: number
  kind: 'page' | 'pdf' | 'thumb'
  blob: Blob
}

export const THUMB_INDEX = -1

export const isWide = (p: PageMeta | undefined) => !!p && p.w > p.h * 1.1

// ----- Học sâu: bong bóng thoại, đánh dấu trang -----

/** Hình chữ nhật theo tỉ lệ 0–1 của trang (không phụ thuộc cỡ màn hình). */
export interface Box { x: number; y: number; w: number; h: number }

/** Một bong bóng thoại đã có chữ (người dùng gõ/dán, hoặc OCR điền). */
export interface MangaBubble {
  id: string
  kind: 'bubble'
  seriesId: string
  chapterId: string
  page: number
  box: Box
  text: string
  /** Bản dịch/ý hiểu của chính người học (không bắt buộc). */
  translation?: string
  note?: string
  /** Tên nhân vật nói câu này (để so sánh giọng nhân vật). */
  speaker?: string
  createdAt: number
  /** Đã lưu vào Ôn tập (sentence mining). */
  minedAt?: number
}

/** Đánh dấu một trang, kèm ghi chú. */
export interface MangaBookmark {
  id: string
  kind: 'bookmark'
  seriesId: string
  chapterId: string
  page: number
  note: string
  createdAt: number
}

export type MangaNote = MangaBubble | MangaBookmark

/** Chế độ đọc: chill = chỉ đọc, không hiện khung bong bóng; study = học sâu. */
export type ReadMode = 'chill' | 'study'
