/** Nguồn tìm kiếm Ctrl+K: bảng chia của các từ trong danh sách luyện. Xem src/modules/search/README.md */
import type { SearchSource } from '@/modules/search/api'
import { matchFields } from '@/modules/search/normalize'
import { WORDS } from './data/words'
import { CLASS_LABEL } from './lib/forms'

const source: SearchSource = {
  id: 'conjugation-table',
  label: { vi: 'Bảng chia', en: 'Conjugation tables', ja: '活用表' },
  order: 38,
  async search(q, { limit }) {
    return WORDS.map((w) => ({
      id: `${w.w}|${w.r}`, title: w.w, jp: true, subtitle: `${w.m} · ${CLASS_LABEL[w.c].vi}`,
      to: `/learn/conjugation?tab=table&w=${encodeURIComponent(w.w)}`,
      // Chỉ khớp chữ Nhật (cách viết, cách đọc): nghĩa tiếng Việt đã có ở nguồn Từ điển
      score: matchFields(q, w.w, w.r) * 0.8,
    })).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
  },
}

export default source
