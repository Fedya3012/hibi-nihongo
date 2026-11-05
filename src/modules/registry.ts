/**
 * DANH SÁCH MODULE (TÍNH NĂNG)
 * ----------------------------
 * Mỗi tính năng là một thư mục riêng trong src/modules/<id>/ và có một dòng ở đây.
 * Thêm tính năng mới = tạo thư mục + thêm một dòng, không cần sửa phần khác.
 *
 * nav: nơi hiện trên thanh điều hướng ('main' = thanh chính, 'learn' = trong mục Học,
 *      'hidden' = không hiện, mở bằng đường dẫn)
 * status: 'planned' (chưa làm) | 'building' (đang làm) | 'ready' (dùng được)
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
// Đồng hồ đếm giờ học chạy ngầm trong cả app (module Hôm nay & Tiến độ), dùng cho streak, mục tiêu, thống kê
import './today/lib/tracker'

export interface AppModule {
  id: string
  path: string
  title: string
  icon: string // một ký tự tiếng Nhật làm biểu tượng, nhẹ và không cần thư viện icon
  nav: 'main' | 'learn' | 'hidden'
  status: 'planned' | 'building' | 'ready'
  phase: 1 | 2 | 3 | 4
  description: string
  page: LazyExoticComponent<ComponentType>
}

const placeholder = () => import('./_placeholder/PlaceholderPage')

export const modules: AppModule[] = [
  { id: 'today', path: '/', title: 'Hôm nay', icon: '日', nav: 'main', status: 'ready', phase: 1,
    description: 'Màn hình chính: tiếp tục bài dở, ôn nhanh, streak, mục tiêu ngày', page: lazy(() => import('./today/TodayPage')) },
  { id: 'review', path: '/review', title: 'Ôn tập', icon: '復', nav: 'main', status: 'ready', phase: 1,
    description: 'Flashcard SRS (thuật toán FSRS), Again/Hard/Good/Easy, nhiều dạng câu hỏi', page: lazy(() => import('./review/ReviewPage')) },
  { id: 'immersion', path: '/immersion', title: 'Immersion', icon: '漫', nav: 'main', status: 'building', phase: 1,
    description: 'Đọc manga từ file và xem anime kèm phụ đề tra từ', page: lazy(() => import('./immersion/ImmersionPage')) },
  { id: 'manga', path: '/immersion/manga', title: 'Đọc manga', icon: '本', nav: 'hidden', status: 'ready', phase: 1,
    description: 'CBZ, CBR, PDF, thư mục ảnh; zoom, 2 trang, phải→trái, nhớ trang đang đọc', page: lazy(() => import('./immersion/manga/MangaPage')) },
  { id: 'anime', path: '/immersion/anime', title: 'Xem anime', icon: '映', nav: 'hidden', status: 'ready', phase: 1,
    description: 'Video + phụ đề .srt/.ass/.vtt, bấm tra từ, điểm hiểu, tạo thẻ từ phụ đề, lặp câu (shadowing)', page: lazy(() => import('./immersion/anime/AnimePage')) },
  { id: 'learn', path: '/learn', title: 'Học', icon: '学', nav: 'main', status: 'building', phase: 1,
    description: 'Cổng vào Kana, Kanji, Ngữ pháp, Giáo trình', page: lazy(() => import('./learn/LearnPage')) },
  { id: 'me', path: '/me', title: 'Tôi', icon: '私', nav: 'main', status: 'ready', phase: 1,
    description: 'Tiến độ: streak, biểu đồ, heatmap, lịch sử từng ngày, tóm tắt ngày/tuần/tháng', page: lazy(() => import('./me/ProgressPage')) },

  { id: 'kana', path: '/learn/kana', title: 'Hiragana & Katakana', icon: 'あ', nav: 'learn', status: 'ready', phase: 1,
    description: 'Bảng chữ, luyện viết, nghe nhận diện, nhận diện nhanh', page: lazy(() => import('./kana/KanaPage')) },
  { id: 'kanji', path: '/learn/kanji', title: 'Kanji', icon: '字', nav: 'learn', status: 'ready', phase: 1,
    description: 'Học theo JLPT và bộ thủ, câu chuyện ghi nhớ, thứ tự nét, on/kun, ví dụ, luyện viết chấm từng nét', page: lazy(() => import('./kanji/KanjiPage')) },
  { id: 'dictionary', path: '/dictionary', title: 'Từ điển', icon: '辞', nav: 'learn', status: 'ready', phase: 1,
    description: 'Từ điển offline JMdict/KANJIDIC, popup tra từ dùng chung cho mọi module', page: lazy(() => import('./dictionary/DictionaryPage')) },
  { id: 'grammar', path: '/learn/grammar', title: 'Ngữ pháp', icon: '文', nav: 'learn', status: 'planned', phase: 2,
    description: 'Giải thích tiếng Việt, drill, đưa vào SRS', page: lazy(placeholder) },
  { id: 'textbook', path: '/learn/textbook', title: 'Giáo trình', icon: '本', nav: 'learn', status: 'planned', phase: 2,
    description: 'Khung bài Minna no Nihongo, Genki; ghi chú và audio do bạn tự nhập', page: lazy(placeholder) },
  { id: 'roadmap', path: '/learn/roadmap', title: 'Lộ trình', icon: '道', nav: 'learn', status: 'planned', phase: 2,
    description: 'Lộ trình N5→N1, theo series, tùy chỉnh; onboarding', page: lazy(placeholder) },
  { id: 'assistant', path: '/assistant', title: 'Trợ lý', icon: '狐', nav: 'hidden', status: 'planned', phase: 3,
    description: 'Chú cáo trợ lý AI, sửa câu, role-play', page: lazy(placeholder) },

  { id: 'settings', path: '/settings', title: 'Cài đặt', icon: '設', nav: 'hidden', status: 'building', phase: 1,
    description: 'Giao diện, cỡ chữ, furigana, âm thanh', page: lazy(() => import('./settings/SettingsPage')) },
]

export const mainNav = modules.filter((m) => m.nav === 'main')
export const learnModules = modules.filter((m) => m.nav === 'learn')
