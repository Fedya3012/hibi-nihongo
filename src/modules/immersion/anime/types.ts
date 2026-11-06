/**
 * KIỂU DỮ LIỆU CỦA MODULE XEM ANIME
 *
 * Cách tổ chức (giống module manga):
 *   Series (bộ anime, ví dụ "Frieren")
 *     └─ Episode (tập phim: một file video + phụ đề tiếng Nhật, có thể thêm phụ đề dịch)
 *
 * Bảng animeSeries, animeEpisodes, animeSubs chỉ chứa chữ và số → được sao lưu.
 * Video nằm trong animeMedia, KHÔNG sao lưu: thường chỉ là "đường dẫn" tới file trên máy
 * (Chrome/Edge/bản Windows), hoặc bản chép file nếu bạn chọn chép vào app.
 */

export interface AnimeSeries {
  id: string
  title: string
  /** Tên tiếng Nhật, ví dụ 葬送のフリーレン (không bắt buộc). */
  titleJp?: string
  createdAt: number
  updatedAt: number
  /** Lần xem gần nhất và tập đang xem dở: dùng cho "Xem tiếp" (Smart Resume). */
  lastWatchedAt?: number
  lastEpisodeId?: string
  /** Đang xem / đã xem xong / muốn xem (tự đặt "đang xem" khi bắt đầu xem). */
  status?: SeriesStatus
  /** Ghi chú về nhân vật: cách nói, cách xưng hô... */
  characters?: CharacterNote[]
  note?: string
}

export type SeriesStatus = 'watching' | 'completed' | 'planned'

export interface CharacterNote {
  name: string
  note: string
}

export interface AnimeEpisode {
  id: string
  seriesId: string
  title: string
  /** Số tập để sắp xếp (có thể lẻ như 12.5). null = không đoán được. */
  number: number | null
  season?: number | null
  /** Tên file video gốc. Chọn lại file cùng tên sẽ gắn lại video mà vẫn giữ chỗ đang xem. */
  fileName: string
  size: number
  addedAt: number
  /** Thời lượng (giây), biết sau lần mở đầu tiên. */
  duration?: number
  /** Chỗ đang xem (giây). */
  position: number
  lastWatchedAt?: number
  finishedAt?: number
  /** Lệch phụ đề (mili giây). Dương = phụ đề hiện muộn hơn. Chỉnh bằng phím Z / X. */
  subOffset: number
  /** Tên file phụ đề tiếng Nhật và phụ đề dịch (nếu có), chỉ để hiển thị. */
  subFile?: string
  trFile?: string
  /** Đánh dấu "đã học" (đã học từ vựng / ôn lại tập này). */
  studiedAt?: number
  /** Tổng thời gian đã xem tập này (giây), để thống kê. */
  watchSeconds?: number
  /** Kết quả tự kiểm tra nghe (chế độ Kiểm tra nghe): số câu hiểu / một phần / không hiểu. */
  listening?: { yes: number; partly: number; no: number }
  /** Điểm chép chính tả (0..1) trung bình và số câu đã làm. */
  dictation?: { score: number; count: number }
  note?: string
  /** Tóm tắt phân tích phụ đề (để hiện nhanh trong danh sách, không cần đọc cả phụ đề). */
  stats?: { tokens: number; unique: number; lines: number; cpm?: number }
}

/** Một dòng phụ đề. Thời gian bằng mili giây. Tên trường ngắn cho gọn dữ liệu. */
export interface Cue {
  s: number // bắt đầu
  e: number // kết thúc
  t: string // nội dung (có thể nhiều dòng, nối bằng \n)
  n?: string // tên nhân vật nói (phụ đề ASS hay có)
}

/** 'jp' = phụ đề tiếng Nhật (bấm tra từ được), 'tr' = phụ đề dịch (tiếng Việt/Anh) để đối chiếu. */
export type SubTrack = 'jp' | 'tr'

/** Phân tích phụ đề: các từ và Kanji xuất hiện trong tập, đếm số lần. */
export interface SubAnalysis {
  /** Đổi số này khi đổi cách phân tích, để app tự phân tích lại. */
  v: number
  /** Tổng số "từ có nghĩa" (đã bỏ trợ từ, dấu câu, tên riêng, số). */
  tokens: number
  /** Tốc độ nói: số chữ tiếng Nhật mỗi phút thoại. */
  cpm?: number
  words: WordStat[]
  kanji: { k: string; n: number }[]
}

export interface WordStat {
  w: string // thể từ điển, ví dụ 食べる
  r?: string // cách đọc hiragana (nếu biết)
  s: string // dạng gặp đầu tiên trong phụ đề, ví dụ 食べた
  n: number // số lần xuất hiện
  c: number // số thứ tự dòng phụ đề gặp đầu tiên (để lấy câu ví dụ)
  p: string // từ loại (Kuromoji)
}

export interface AnimeSubs {
  episodeId: string
  track: SubTrack
  fileName: string
  cues: Cue[]
  analysis?: SubAnalysis
}

/** Video của một tập: "tay cầm" file trên máy (không tốn dung lượng) hoặc bản chép trong app. */
export interface AnimeMedia {
  episodeId: string
  kind: 'handle' | 'blob'
  handle?: FileSystemFileHandle
  blob?: Blob
  name: string
  size: number
}

/** Phân loại câu / từ lưu từ anime. */
export type ClipCategory = 'normal' | 'slang' | 'casual' | 'character' | 'interjection' | 'onomatopoeia'

export const CATEGORY_LABEL: Record<ClipCategory, string> = {
  normal: 'Thông thường',
  slang: 'Tiếng lóng',
  casual: 'Khẩu ngữ / rút gọn',
  character: 'Cách nói nhân vật',
  interjection: 'Cảm thán',
  onomatopoeia: 'Tượng thanh / tượng hình',
}

/**
 * Một câu thoại bạn đã lưu (kèm thời điểm trong video). Ảnh và âm thanh nằm riêng trong animeClips
 * (không sao lưu vì nặng; mất thì câu chữ và thời điểm vẫn còn).
 */
export interface SavedSentence {
  id: string
  seriesId: string
  episodeId: string
  /** Thời điểm trong video (mili giây, đã cộng lệch phụ đề). */
  s: number
  e: number
  text: string
  translation?: string
  speaker?: string
  category: ClipCategory
  note?: string
  savedAt: number
  /** Có ảnh / âm thanh trong animeClips không. */
  hasImage?: boolean
  hasAudio?: boolean
  /** Đã tạo thẻ ôn tập cho câu này chưa. */
  carded?: boolean
}

export interface AnimeClip {
  id: string // = id câu
  image?: Blob
  audio?: Blob
}

/**
 * Liên kết thẻ ôn tập ↔ anime: thẻ nào đến từ tập nào, câu nào (để ôn theo tập/mùa và phát lại âm thanh).
 * key = "<module>:<ref>" giống trường source của thẻ.
 */
export interface CardLink {
  key: string
  seriesId: string
  episodeId: string
  sentenceId?: string
  category?: ClipCategory
  addedAt: number
}

/** Chế độ xem. */
export type WatchMode =
  | 'assisted' // phụ đề Nhật + tra từ (mặc định)
  | 'bilingual' // Nhật + dịch
  | 'translation' // chỉ phụ đề dịch
  | 'immersion' // Full Immersion: không phụ đề
  | 'audio' // Chỉ nghe: ẩn hình và phụ đề
  | 'listen-check' // Kiểm tra nghe: dừng sau mỗi câu, tự đánh giá rồi xem đáp án
  | 'dictation' // Chép chính tả: nghe, gõ lại, so sánh
  | 'shadowing' // phát câu → khoảng lặng để nhắc lại → phát lại bản gốc
  | 'study' // Học theo đoạn: xem xong một đoạn → ôn từ vừa nghe

/** Cách hiện phụ đề tiếng Nhật: hiện, làm mờ (di chuột mới rõ, để luyện nghe), ẩn. */
export type SubMode = 'show' | 'blur' | 'hide'

export interface PlayerPrefs {
  subMode: SubMode
  /** Hiện phụ đề dịch dưới phụ đề tiếng Nhật. */
  showTranslation: boolean
  /** Hiện furigana trên phụ đề. */
  furigana: boolean
  /** Di chuột vào phụ đề thì tạm dừng video, rời chuột thì chạy tiếp. */
  hoverPause: boolean
  /** Shadowing: tự dừng ở cuối mỗi câu để bạn nhắc lại. */
  autoPause: boolean
  rate: number
  /** Cỡ chữ phụ đề (rem). */
  subSize: number
  showTranscript: boolean
  /** Tô màu từ: đã biết (mờ), đang học (vàng), mới (gạch chân). */
  highlight: boolean
  mode: WatchMode
  /** Học theo đoạn: số câu mỗi đoạn. */
  studyChunk: number
  /** Shadowing: ghi âm giọng bạn trong khoảng lặng. */
  shadowRecord: boolean
  /** Shadowing: khoảng lặng = thời lượng câu × hệ số này. */
  shadowGap: number
}

export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
  subMode: 'show',
  showTranslation: false,
  furigana: false,
  hoverPause: true,
  autoPause: false,
  rate: 1,
  subSize: 1.6,
  showTranscript: true,
  highlight: true,
  mode: 'assisted',
  studyChunk: 20,
  shadowRecord: false,
  shadowGap: 1.3,
}
