/** Đăng ký module "Từ điển". Xem cách hoạt động ở src/modules/define.ts. */
import { lazy } from 'react'
import { defineModule } from '@/modules/define'

export default defineModule({
  id: 'dictionary',
  path: '/dictionary',
  title: 'Từ điển',
  icon: '辞',
  nav: 'learn',
  status: 'ready',
  phase: 1,
  order: 130,
  description: 'Từ điển offline JMdict/KANJIDIC, popup tra từ dùng chung cho mọi module',
  text: {
    en: { title: 'Dictionary', description: 'Offline JMdict/KANJIDIC, shared word lookup popup' },
    ja: { title: '辞書', description: 'オフライン辞書 JMdict/KANJIDIC、共通の単語ポップアップ' },
  },
  page: lazy(() => import('./DictionaryPage')),
})
