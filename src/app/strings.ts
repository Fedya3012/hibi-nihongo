/** Chữ của khung app (thanh bên, thanh dưới) và các trang cổng (Học, Immersion, trang tạm). */
import { defineStrings } from '@/core/i18n'

export const APP = defineStrings({
  vi: {
    settings: 'Cài đặt',
    loading: 'Đang tải…',
    nav: 'Điều hướng chính',
    immersionHint: 'Học qua nội dung thật: manga và anime từ file của bạn.',
    building: 'Đang xây dựng',
    plannedPhase: 'Dự kiến: giai đoạn {n}',
  },
  en: {
    settings: 'Settings',
    loading: 'Loading…',
    nav: 'Main navigation',
    immersionHint: 'Learn from real content: manga and anime from your own files.',
    building: 'In progress',
    plannedPhase: 'Planned: phase {n}',
  },
  ja: {
    settings: '設定',
    loading: '読み込み中…',
    nav: 'メインメニュー',
    immersionHint: '本物のコンテンツで学ぶ：自分のファイルの漫画とアニメ。',
    building: '開発中',
    plannedPhase: '予定：フェーズ{n}',
  },
})
