/**
 * KIỂU DỮ LIỆU CỦA MODULE TỪ ĐIỂN
 * Tên trường được rút gọn (1–2 chữ) để gói dữ liệu nhỏ hơn. Ý nghĩa ghi ngay bên cạnh.
 * Gói được tạo bởi tools/build-packs.mjs.
 */

/** id các gói nội dung của module này (xem public/content/manifest.json). */
export const WORD_PACK = 'jmdict-en'
export const KANJI_PACK = 'kanjidic'

/** Một cách viết bằng Kanji của từ. */
export interface KanjiForm {
  t: string // chữ viết, ví dụ 食べる
  c?: 1 // 1 = cách viết thông dụng
  i?: string[] // ghi chú: iK (kanji bất thường), ateji, oK (kanji cũ)...
}

/** Một cách đọc (kana) của từ. */
export interface ReadingForm {
  t: string // cách đọc, ví dụ たべる
  c?: 1 // thông dụng
  i?: string[] // ghi chú: ok (kana cũ), gikun...
  o?: string[] // chỉ dùng cho các cách viết này
  n?: 1 // 1 = đọc này không đi với Kanji nào
  a?: number[] // pitch accent: vị trí hạ giọng (0 = bằng/heiban), có thể nhiều cách
}

/** Một nghĩa của từ. */
export interface Sense {
  p?: string[] // từ loại (mã JMdict: v1, v5k, n, adj-i...)
  g: string[] // nghĩa tiếng Anh
  m?: string[] // ghi chú cách dùng: uk (thường viết kana), hon (tôn kính)...
  f?: string[] // lĩnh vực: med, comp...
  d?: string[] // phương ngữ: ksb (Kansai)...
  x?: string[] // xem thêm từ khác
  n?: string // giải thích thêm
  k?: string[] // nghĩa này chỉ dùng với các cách viết này
  r?: string[] // nghĩa này chỉ dùng với các cách đọc này
}

/** Dữ liệu một từ trong gói jmdict-en. */
export interface WordData {
  k?: KanjiForm[]
  r: ReadingForm[]
  s: Sense[]
  c?: 1 // từ thông dụng (theo các danh sách ưu tiên của JMdict)
  nf?: number // nhóm tần suất trên báo chí (1 = phổ biến nhất … 48)
  q?: number // thứ hạng tần suất (Wikipedia tiếng Nhật), càng nhỏ càng phổ biến
  j?: number // cấp JLPT: 5 = N5 … 1 = N1
}

/** Dữ liệu một chữ Kanji trong gói kanjidic. */
export interface KanjiData {
  s?: number // số nét
  g?: number // lớp học ở Nhật (1–6 tiểu học, 8 = trung học, 9–10 = tên người)
  f?: number // thứ hạng tần suất trên báo (1–2500)
  j?: number // cấp JLPT mới (5 = N5 … 1 = N1)
  jo?: number // cấp JLPT cũ (4 … 1)
  on?: string[] // âm On (katakana)
  kun?: string[] // âm Kun (hiragana, dấu "." tách phần okurigana)
  na?: string[] // cách đọc dùng trong tên người
  m?: string[] // nghĩa tiếng Anh
  hv?: string[] // âm Hán Việt, ví dụ "Thực"
  rad?: number // số bộ thủ (theo 214 bộ Khang Hy)
}

/** Một từ tìm được, kèm thông tin vì sao tìm ra. */
export interface WordResult {
  id: string
  data: WordData
  /** Chuỗi khớp với từ điển (sau khi đưa về thể từ điển). */
  matched: string
  /** Độ dài đoạn văn bản gốc đã khớp (dùng khi tra trong câu). */
  length: number
  /** Các bước chia ngược, ví dụ ['bị động', 'quá khứ'] khi tra 食べられた. */
  reasons: string[]
}

/** Một "từ" sau khi tách câu (đã gộp động từ với đuôi chia của nó). */
export interface Segment {
  surface: string // chữ đúng như trong câu: 食べさせられた
  base: string // thể từ điển: 食べる
  reading: string // cách đọc hiragana (có thể rỗng nếu không biết)
  pos: string // từ loại gốc của Kuromoji (名詞, 動詞...)
  posDetail: string // chi tiết từ loại (固有名詞, 形容動詞語幹...)
  start: number // vị trí bắt đầu trong câu
  end: number
  /** Các mảnh nhỏ Kuromoji tách ra, ví dụ 食べ + させ + られ + た */
  parts: { surface: string; pos: string; base: string }[]
}
