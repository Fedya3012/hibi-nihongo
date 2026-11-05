/**
 * KIỂU DỮ LIỆU CỦA TÌM KIẾM TOÀN CỤC (Ctrl+K)
 * Mỗi "nguồn" (SearchSource) tìm trong một loại dữ liệu (từ điển, Kanji, thẻ ôn tập, manga...)
 * và trả về các "kết quả" (SearchHit).
 */
import type { Lang } from '@/core/i18n'

/** Câu tìm kiếm đã chuẩn hóa sẵn, nguồn nào cũng dùng được ngay. */
export interface SearchQuery {
  /** Chữ người dùng gõ (đã bỏ khoảng trắng thừa). */
  raw: string
  /** Chữ thường, bỏ dấu tiếng Việt, katakana → hiragana. Ví dụ "Thực" → "thuc", "カタ" → "かた". */
  norm: string
  /** Bản kana: gõ romaji "taberu" → "たべる". Rỗng nếu không đổi được. */
  kana: string
  /** Câu có chữ Nhật không. */
  hasJp: boolean
}

export interface SearchHit {
  /** Duy nhất trong nguồn. */
  id: string
  title: string
  /** Đặt font tiếng Nhật cho tiêu đề. */
  jp?: boolean
  /** Cách đọc (kana), hiện nhỏ cạnh tiêu đề. */
  reading?: string
  subtitle?: string
  /** Nhãn nhỏ bên phải, ví dụ "N5". */
  badge?: string
  /** Bấm vào thì mở đường dẫn trong app này (dạng '/learn/kanji?k=食')... */
  to?: string
  /** ...hoặc chạy hàm này (ví dụ mở popup tra từ). */
  run?: () => void
  /** Điểm xếp hạng trong nguồn (cao lên trước). */
  score?: number
}

export interface SearchSource {
  id: string
  /** Tên nhóm hiện trên đầu danh sách kết quả, theo ngôn ngữ (thiếu thì dùng tiếng Việt). */
  label: { vi: string; en?: string; ja?: string }
  /** Thứ tự nhóm (nhỏ lên trước). */
  order: number
  /** Số ký tự tối thiểu mới tìm (mặc định 1). */
  minLength?: number
  search(q: SearchQuery, ctx: { limit: number; lang: Lang }): Promise<SearchHit[]>
}
