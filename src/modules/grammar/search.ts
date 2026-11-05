/** Nguồn tìm kiếm Ctrl+K: bài ngữ pháp (mẫu, nghĩa, câu ví dụ). Xem src/modules/search/README.md */
import type { SearchSource } from '@/modules/search/api'
import { matchFields } from '@/modules/search/normalize'
import { loadGrammar } from './lib/content'
import { plainText } from './lib/parse'
import { grammarPath } from './lib/paths'

const source: SearchSource = {
  id: 'grammar-points',
  label: { vi: 'Bài ngữ pháp', en: 'Grammar lessons', ja: '文法解説' },
  order: 35,
  async search(q, { limit }) {
    const { list } = await loadGrammar()
    // Bỏ dấu 〜 để gõ "temoii" hay "てもいい" đều ra 〜てもいいです
    return list.map((p) => {
      const pattern = p.pattern.replace(/[〜～]/g, '')
      const main = matchFields(q, pattern, p.meaning, p.id.replace(/-/g, ' '))
      const ex = main ? 0 : matchFields(q, ...p.examples.map((e) => plainText(e[0])))
      return {
        id: p.id, title: p.pattern, jp: true, subtitle: p.meaning, badge: `N${p.level}`,
        to: grammarPath(p.id), score: main || (ex ? ex / 3 : 0),
      }
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
  },
}

export default source
