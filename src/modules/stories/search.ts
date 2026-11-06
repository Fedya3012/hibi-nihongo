/** Nguồn tìm kiếm Ctrl+K: truyện đọc theo cấp độ (tên, tên tiếng Việt, câu trong truyện). Xem src/modules/search/README.md */
import type { SearchSource } from '@/modules/search/api'
import { matchFields } from '@/modules/search/normalize'
import { STORIES, storyLines } from './data'

const source: SearchSource = {
  id: 'stories',
  label: { vi: 'Truyện theo cấp độ', en: 'Graded stories', ja: 'レベル別読み物' },
  order: 60,
  async search(q, { limit }) {
    return STORIES.map((s) => {
      const main = matchFields(q, s.title, s.titleVi, s.blurb)
      const inText = main ? 0 : matchFields(q, ...storyLines(s).flatMap((l) => [l.ja, l.vi]))
      return {
        id: s.id, title: s.title, jp: true, subtitle: s.titleVi, badge: `N${s.level}`,
        to: `/immersion/stories?s=${s.id}`, score: main || (inText ? inText / 3 : 0),
      }
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
  },
}

export default source
