/** Nguồn tìm kiếm Ctrl+K: huy hiệu (gõ "cú đêm", "streak", "huy hiệu"...). Xem src/modules/search/README.md */
import type { SearchSource } from '@/modules/search/api'
import { matchFields } from '@/modules/search/normalize'
import { translate } from '@/core/i18n'
import { S, type Key } from './strings'
import { BADGES } from './lib/badges'
import { badgeDesc, badgeTitle } from './lib/text'

const source: SearchSource = {
  id: 'achievements',
  label: { vi: 'Huy hiệu', en: 'Badges', ja: 'バッジ' },
  order: 90,
  minLength: 2,
  async search(q, { limit, lang }) {
    const t = (k: Key, v?: Record<string, string | number>) => translate(S, lang, k, v)
    return BADGES.map((b) => {
      const title = badgeTitle(t, b)
      // Tìm cả theo tiếng Việt (gốc) để gõ không dấu vẫn ra khi đang dùng ngôn ngữ khác
      const vi = (k: Key) => translate(S, 'vi', k)
      const score = matchFields(q, title, badgeDesc(t, b, 0), vi(`b_${b.id}` as Key), b.id, t('title'), 'huy hieu thanh tich badge')
      return { id: b.id, title: `${b.icon} ${title}`, subtitle: badgeDesc(t, b, 0), to: '/achievements', score }
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
  },
}

export default source
