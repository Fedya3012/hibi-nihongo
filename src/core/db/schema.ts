/**
 * CẤU TRÚC KHO DỮ LIỆU (schema)
 * -----------------------------
 * Kho dữ liệu là một cơ sở dữ liệu IndexedDB tên "hibi-nihongo", có nhiều "bảng" (object store).
 * IndexedDB có sẵn trong mọi trình duyệt và trong bản Windows (WebView2), nên app chạy offline cả hai nơi.
 *
 * MUỐN THÊM BẢNG MỚI (ví dụ module Ôn tập cần bảng thẻ SRS):
 *   1. Thêm MỘT bước mới vào CUỐI mảng `migrations` bên dưới. Không bao giờ sửa hay xóa bước cũ,
 *      vì máy người dùng đã chạy các bước đó rồi.
 *   2. Khai báo tên bảng trong `STORES` (để có gợi ý tên khi gõ code) và chọn có sao lưu hay không.
 * Số phiên bản của kho = số bước trong `migrations`, tự tăng.
 */

/** Thông tin từng bảng. backup: true = dữ liệu của người dùng, được đưa vào file sao lưu. */
export const STORES = {
  /** Cặp khóa → giá trị nhỏ, dùng chung cho mọi module. Khóa nên có tiền tố module, ví dụ "today:goal". */
  kv: { backup: true },
  /** Danh sách gói nội dung đã cài (từ điển, bộ kanji...) và phiên bản của từng gói. */
  packs: { backup: false },
  /** Toàn bộ mục nội dung của các gói. Tải lại được từ mạng nên không cần sao lưu. */
  packItems: { backup: false },
  /** Thẻ ôn tập SRS (module review). */
  srsCards: { backup: true },
  /** Lịch sử từng lần ôn (module review), dùng cho thống kê và hoàn tác. */
  srsLogs: { backup: true },
  /** Series manga do người dùng tự nhập (module immersion/manga). Chỉ chữ và số, có sao lưu. */
  mangaSeries: { backup: true },
  /** Chương manga: tên, số trang, trang đang đọc (module immersion/manga). */
  mangaChapters: { backup: true },
  /** Ảnh trang / file PDF / ảnh bìa của manga. Rất nặng và nhập lại được từ file gốc nên không sao lưu. */
  mangaBlobs: { backup: false },
  /** Series anime do người dùng tự nhập (module immersion/anime). */
  animeSeries: { backup: true },
  /** Tập anime: tên, số tập, chỗ đang xem, lệch phụ đề (module immersion/anime). */
  animeEpisodes: { backup: true },
  /** Phụ đề đã đọc (chữ + thời gian) và kết quả phân tích từ vựng. Nhẹ, có sao lưu. */
  animeSubs: { backup: true },
  /** Video: "tay cầm" trỏ tới file trên máy, hoặc bản chép file. Không sao lưu. */
  animeMedia: { backup: false },
  /** Bong bóng thoại đã gõ chữ, đánh dấu trang, ghi chú trong manga (module immersion/manga). */
  mangaNotes: { backup: true },
  /** Thời gian học mỗi ngày theo nhóm + các phiên học (module Hôm nay & Tiến độ). Có sao lưu. */
  studyDays: { backup: true },
  /** Giáo trình bạn đang học (Minna, Genki, sách tự tạo): tên, số bài (module textbook). */
  textbooks: { backup: true },
  /** Từng bài của giáo trình: từ vựng bạn nhập, ghi chú, trạng thái (module textbook). */
  textbookLessons: { backup: true },
  /** File audio bạn nhập cho từng bài. Nặng và nhập lại được nên không sao lưu (module textbook). */
  textbookMedia: { backup: false },
} as const satisfies Record<string, { backup: boolean }>

export type StoreName = keyof typeof STORES

export const DB_NAME = 'hibi-nihongo'

/** Một bước nâng cấp: tạo bảng/chỉ mục mới. Chạy đúng một lần trên mỗi máy. */
export type Migration = (db: IDBDatabase, tx: IDBTransaction) => void

export const migrations: Migration[] = [
  // Phiên bản 1 (module Kho dữ liệu offline)
  (db) => {
    // kv: khóa nằm ngoài giá trị → kvSet('today:goal', 20)
    db.createObjectStore('kv')
    // packs: mỗi dòng là một InstalledPack, khóa là id của gói
    db.createObjectStore('packs', { keyPath: 'id' })
    // packItems: khóa ghép [gói, id mục], nên hai gói khác nhau có thể trùng id mục
    const items = db.createObjectStore('packItems', { keyPath: ['pack', 'id'] })
    items.createIndex('by_pack', 'pack')
    // by_key: mỗi mục có danh sách "keys" để tra cứu (chữ viết, cách đọc...). multiEntry = tra theo từng phần tử
    items.createIndex('by_key', 'keys', { multiEntry: true })
    items.createIndex('by_pack_kind', ['pack', 'kind'])
  },
  // Phiên bản 2 trở đi: module khác thêm vào đây.
  // Phiên bản tiếp theo (module Ôn tập — review)
  (db) => {
    const cards = db.createObjectStore('srsCards', { keyPath: 'id' })
    cards.createIndex('by_due', 'due')
    cards.createIndex('by_deck', 'deck')
    const logs = db.createObjectStore('srsLogs', { keyPath: 'id', autoIncrement: true })
    logs.createIndex('by_card', 'cardId')
    logs.createIndex('by_time', 'reviewedAt')
  },
  // Phiên bản tiếp theo (module Đọc manga — immersion/manga)
  (db) => {
    db.createObjectStore('mangaSeries', { keyPath: 'id' })
    const chapters = db.createObjectStore('mangaChapters', { keyPath: 'id' })
    chapters.createIndex('by_series', 'seriesId')
    // Khóa ghép [chương, số trang] → lấy cả chương bằng một khoảng khóa
    db.createObjectStore('mangaBlobs', { keyPath: ['chapterId', 'index'] })
  },
  // Phiên bản tiếp theo (module Xem anime — immersion/anime)
  (db) => {
    db.createObjectStore('animeSeries', { keyPath: 'id' })
    const eps = db.createObjectStore('animeEpisodes', { keyPath: 'id' })
    eps.createIndex('by_series', 'seriesId')
    // Khóa ghép [tập, 'jp' | 'tr'] → mỗi tập có tối đa một phụ đề Nhật và một phụ đề dịch
    db.createObjectStore('animeSubs', { keyPath: ['episodeId', 'track'] })
    db.createObjectStore('animeMedia', { keyPath: 'episodeId' })
  },
  // Phiên bản tiếp theo (module Đọc manga — bong bóng thoại, đánh dấu trang, ghi chú)
  (db) => {
    const notes = db.createObjectStore('mangaNotes', { keyPath: 'id' })
    notes.createIndex('by_chapter', 'chapterId')
  },
  // Phiên bản tiếp theo (module Hôm nay & Tiến độ — today, me): mỗi ngày học một dòng, khóa 'YYYY-MM-DD'
  (db) => {
    db.createObjectStore('studyDays', { keyPath: 'day' })
  },
  // Phiên bản tiếp theo (module Giáo trình — textbook)
  (db) => {
    db.createObjectStore('textbooks', { keyPath: 'id' })
    const lessons = db.createObjectStore('textbookLessons', { keyPath: 'id' })
    lessons.createIndex('by_book', 'bookId')
    const media = db.createObjectStore('textbookMedia', { keyPath: 'id' })
    media.createIndex('by_lesson', 'lessonId')
  },
]

export const DB_VERSION = migrations.length

/** Các bảng được đưa vào file sao lưu. */
export const backupStores = (Object.keys(STORES) as StoreName[]).filter((s) => STORES[s].backup)
