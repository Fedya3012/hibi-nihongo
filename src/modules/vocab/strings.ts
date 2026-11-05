/** Chữ giao diện của module Kho từ (Việt / Anh / Nhật). Xem src/core/i18n/README.md */
import { defineStrings } from '@/core/i18n'

export const S = defineStrings({
  vi: {
    title: 'Kho từ của tôi',
    intro: 'Một danh sách chung cho cả app: từ bạn đánh dấu ở đây (hoặc trong popup tra từ) được tô màu đúng ở manga, anime, giáo trình, ngữ pháp. Thẻ Ôn tập đã thuộc tự tính là "Đã biết".',
    // Trạng thái
    sNew: 'Mới', sLearning: 'Đang học', sKnown: 'Đã biết', sIgnored: 'Bỏ qua', sClear: 'Bỏ đánh dấu',
    pickerLabel: 'Mức độ biết từ này',
    fromSrs: 'theo Ôn tập',
    // Tô màu
    hlTitle: 'Tô màu chữ khi đọc',
    hlAll: 'Từ mới + đang học', hlNew: 'Chỉ từ mới', hlOff: 'Tắt',
    legendNew: 'gạch liền = từ mới', legendLearning: 'gạch chấm = đang học', legendKnown: 'không gạch = đã biết',
    // Thống kê
    statKnown: 'Đã biết', statLearning: 'Đang học', statIgnored: 'Bỏ qua', statSrs: 'Thẻ Ôn tập đã thuộc',
    // Danh sách
    tabList: 'Danh sách', tabImport: 'Thêm nhiều từ',
    filterAll: 'Tất cả', search: 'Lọc theo chữ…', empty: 'Chưa có từ nào. Bấm một từ bất kỳ trong app rồi chọn "Đã biết" trong popup, hoặc dán cả danh sách ở tab "Thêm nhiều từ".',
    noMatch: 'Không có từ nào khớp.', more: 'Xem thêm ({n})', source: 'Từ: {src}',
    remove: 'Xóa', lookup: 'Tra từ',
    srcPopup: 'popup tra từ', srcAnime: 'anime', srcTextbook: 'giáo trình', srcImport: 'nhập danh sách', srcPage: 'trang Kho từ',
    // Nhập
    importHint: 'Dán danh sách từ, mỗi dòng một từ (hoặc cách nhau bằng dấu phẩy, dấu cách). Có thể dán cột từ vựng chép từ Anki/Excel: chỉ lấy cột đầu tiên của mỗi dòng.',
    importAs: 'Đánh dấu là', importBtn: 'Thêm {n} từ', imported: 'Đã cập nhật {n} từ.', importNone: 'Không có từ nào mới.',
    exportBtn: 'Tải danh sách (.txt)', clearAll: 'Xóa toàn bộ đánh dấu', clearConfirm: 'Bấm lần nữa để xóa hết',
  },
  en: {
    title: 'My words',
    intro: 'One shared list for the whole app: words you mark here (or in the lookup popup) are colored correctly in manga, anime, textbooks and grammar. Review cards you have learned count as "Known" automatically.',
    sNew: 'New', sLearning: 'Learning', sKnown: 'Known', sIgnored: 'Ignore', sClear: 'Unmark',
    pickerLabel: 'How well you know this word',
    fromSrs: 'from Review',
    hlTitle: 'Color words while reading',
    hlAll: 'New + learning', hlNew: 'New only', hlOff: 'Off',
    legendNew: 'solid = new', legendLearning: 'dotted = learning', legendKnown: 'none = known',
    statKnown: 'Known', statLearning: 'Learning', statIgnored: 'Ignored', statSrs: 'Learned review cards',
    tabList: 'List', tabImport: 'Add many',
    filterAll: 'All', search: 'Filter…', empty: 'No words yet. Click any word in the app and pick "Known" in the popup, or paste a list in "Add many".',
    noMatch: 'No matching words.', more: 'Show more ({n})', source: 'From: {src}',
    remove: 'Remove', lookup: 'Look up',
    srcPopup: 'lookup popup', srcAnime: 'anime', srcTextbook: 'textbook', srcImport: 'import', srcPage: 'My words page',
    importHint: 'Paste words, one per line (or separated by commas/spaces). You can paste a vocabulary column copied from Anki/Excel: only the first column of each line is used.',
    importAs: 'Mark as', importBtn: 'Add {n} words', imported: 'Updated {n} words.', importNone: 'Nothing new.',
    exportBtn: 'Download list (.txt)', clearAll: 'Clear all marks', clearConfirm: 'Click again to clear all',
  },
  ja: {
    title: 'マイ単語',
    sNew: '未習', sLearning: '学習中', sKnown: '既知', sIgnored: '無視', sClear: '解除',
    hlTitle: '読むときの色分け',
    tabList: '一覧', tabImport: 'まとめて追加',
  },
})
