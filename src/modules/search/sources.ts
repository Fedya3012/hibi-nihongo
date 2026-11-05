/**
 * CÁC NGUỒN TÌM KIẾM CÓ SẴN
 * Mỗi nguồn chỉ đọc dữ liệu qua API công khai của module đó (hoặc bảng trong @/core/db),
 * không sửa gì. Nguồn của module mới: file search.ts trong thư mục module (tự được tìm thấy).
 */
import { getAll, listItems } from '@/core/db'
import { translate, type Lang } from '@/core/i18n'
import { moduleNames, moduleText } from '@/core/i18n/modules'
import { modules } from '@/modules/registry'
import {
  getKanji, headword, isKanji, searchWords, KANJI_PACK, type KanjiData,
} from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import type { SrsCard } from '@/modules/review/api'
import { mangaReaderPath, mangaSeriesPath } from '@/modules/immersion/manga/api'
import type { MangaChapter, MangaNote, MangaSeries } from '@/modules/immersion/manga/types'
import { animePlayerPath, animeSeriesPath } from '@/modules/immersion/anime/api'
import type { AnimeEpisode, AnimeSeries, AnimeSubs } from '@/modules/immersion/anime/types'
import { cached } from './cache'
import { matchFields, matchText, normalize, snippet } from './normalize'
import type { SearchHit, SearchQuery, SearchSource } from './types'
import { S } from './strings'

/** Cộng điểm ưu tiên, nhưng chỉ khi đã khớp (0 vẫn là 0). */
const bonus = (score: number, extra: number) => (score > 0 ? score + extra : 0)

const top = (hits: SearchHit[], limit: number) =>
  hits.filter((h) => (h.score ?? 1) > 0).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit)

const tr = (lang: Lang, key: keyof typeof S.vi, vars?: Record<string, string | number>) => translate(S, lang, key, vars)

// ---------- Trang & bài học (các module trong registry + vài lối tắt) ----------

const SHORTCUTS: { id: string; to: string; vi: string; en: string; ja: string }[] = [
  { id: 'quick', to: '/review?quick=1', vi: 'Ôn nhanh 5 phút', en: 'Quick 5-minute review', ja: '5分間クイック復習' },
  ...[5, 4, 3, 2, 1].map((n) => ({
    id: `kanji-n${n}`, to: `/learn/kanji?lv=${n}`, vi: `Kanji N${n}`, en: `Kanji N${n}`, ja: `N${n}の漢字`,
  })),
  { id: 'radicals', to: '/learn/kanji?tab=radicals', vi: 'Bộ thủ Kanji', en: 'Kanji radicals', ja: '部首' },
  { id: 'kanji-write', to: '/learn/kanji?tab=write', vi: 'Luyện viết Kanji', en: 'Kanji writing practice', ja: '漢字の書き取り' },
  { id: 'sentence', to: '/dictionary?tab=sentence', vi: 'Phân tích câu', en: 'Sentence breakdown', ja: '文の分析' },
  { id: 'backup', to: '/settings', vi: 'Sao lưu dữ liệu', en: 'Back up data', ja: 'データのバックアップ' },
  { id: 'language', to: '/settings', vi: 'Đổi ngôn ngữ giao diện', en: 'Change interface language', ja: '表示言語を変更' },
]

const pages: SearchSource = {
  id: 'pages',
  label: { vi: 'Trang & bài học', en: 'Pages & lessons', ja: 'ページ・レッスン' },
  order: 10,
  async search(q, { limit, lang }) {
    const hits: SearchHit[] = modules.map((m) => {
      const tx = moduleText(m, lang)
      return {
        id: m.id, title: tx.title, subtitle: tx.description, to: m.path,
        badge: m.status === 'planned' ? tr(lang, 'soon') : undefined,
        // Khớp phần mô tả chỉ tính khi khớp đầu một chữ (tránh "eat" khớp "heatmap")
        score: Math.max(matchFields(q, ...moduleNames(m)), q.norm.length >= 3 && matchText(tx.description, q) >= 60 ? 30 : 0),
      }
    })
    for (const s of SHORTCUTS) {
      hits.push({ id: s.id, title: s[lang], to: s.to, score: matchFields(q, s[lang], s.vi, s.en, s.ja) })
    }
    return top(hits, limit)
  },
}

// ---------- Từ vựng (từ điển offline) ----------

const words: SearchSource = {
  id: 'words',
  label: { vi: 'Từ vựng', en: 'Words', ja: '単語' },
  order: 20,
  async search(q, { limit, lang }) {
    const results = await searchWords(q.raw, limit)
    const hits: SearchHit[] = results.map((r, i) => {
      const hw = headword(r.data)
      const sense = r.data.s.find((s) => s.g.length)?.g.slice(0, 3).join('; ')
      return {
        id: r.id, title: hw.word, jp: true, reading: hw.reading !== hw.word ? hw.reading : undefined,
        subtitle: sense, badge: r.data.j ? `N${r.data.j}` : undefined,
        run: () => openLookup(hw.word), score: 100 - i,
      }
    })
    if (hits.length) {
      hits.push({
        id: '_all', title: tr(lang, 'openInDictionary', { q: q.raw }),
        to: `/dictionary?q=${encodeURIComponent(q.raw)}`, score: 0.5,
      })
    }
    return hits
  },
}

// ---------- Kanji: gõ chữ Kanji, âm Hán Việt ("thực") hoặc nghĩa tiếng Anh ("eat") ----------

interface KanjiRow { c: string; hv: string[]; hvRaw: string[]; m: string[]; d: KanjiData }

function kanjiIndex(): Promise<KanjiRow[]> {
  return cached('kanji-index', ['packs'], async () => {
    const items = await listItems<KanjiData>(KANJI_PACK, { kind: 'kanji', limit: 50000 })
    return items
      .filter((it) => it.data.hv?.length || it.data.j || it.data.f)
      .map((it) => ({
        c: it.id, d: it.data,
        hvRaw: (it.data.hv ?? []).map((x) => x.toLowerCase()),
        hv: (it.data.hv ?? []).map(normalize),
        m: (it.data.m ?? []).map((x) => x.toLowerCase()),
      }))
  })
}

const kanjiHit = (c: string, d: KanjiData, score: number): SearchHit => ({
  id: c, title: c, jp: true,
  reading: [...(d.on ?? []).slice(0, 2), ...(d.kun ?? []).slice(0, 2)].join('・') || undefined,
  subtitle: [d.hv?.map((x) => x.toUpperCase()).join(', '), d.m?.slice(0, 3).join(', ')].filter(Boolean).join(' · '),
  badge: d.j ? `N${d.j}` : undefined,
  to: `/learn/kanji?k=${encodeURIComponent(c)}`,
  score,
})

/** Chữ dễ/hay gặp lên trước: có JLPT (N5 trước), rồi theo tần suất trên báo. */
const commonness = (d: KanjiData) => (d.j ? d.j * 2 : 0) + (d.f ? (2500 - d.f) / 2500 : 0)

const kanji: SearchSource = {
  id: 'kanji',
  label: { vi: 'Kanji', en: 'Kanji', ja: '漢字' },
  order: 30,
  async search(q, { limit }) {
    const chars = [...new Set([...q.raw].filter(isKanji))].slice(0, limit)
    if (chars.length) {
      const data = await Promise.all(chars.map((c) => getKanji(c)))
      return chars.flatMap((c, i) => (data[i] ? [kanjiHit(c, data[i]!, 100 - i)] : []))
    }
    if (q.hasJp || q.norm.length < 2) return []
    const rows = await kanjiIndex()
    const raw = q.raw.toLowerCase()
    const hits: SearchHit[] = []
    for (const r of rows) {
      let s = 0
      if (r.hvRaw.includes(raw)) s = 100 // đúng cả dấu: "thực"
      else if (r.hv.includes(q.norm)) s = 80 // không dấu: "thuc" → Thực, Thức, Thục...
      else if (q.norm.length >= 3 && r.m.some((m) => m === q.norm || m.split(/[ ,;()]+/).includes(q.norm))) s = 60
      if (s) hits.push(kanjiHit(r.c, r.d, s + commonness(r.d)))
    }
    return top(hits, limit)
  },
}

// ---------- Thẻ ôn tập (SRS) và ngữ pháp ----------

const allCards = () => cached('cards', ['srsCards'], () => getAll<SrsCard>('srsCards'))

function cardHits(list: SrsCard[], q: SearchQuery, limit: number, lang: Lang): SearchHit[] {
  return top(list.map((c) => ({
    id: c.id, title: c.front, jp: true, reading: c.reading,
    subtitle: [c.meaning, c.deck].filter(Boolean).join(' · '),
    badge: c.suspended ? tr(lang, 'suspended') : undefined,
    to: `/review?tab=cards&q=${encodeURIComponent(c.front)}`,
    score: matchFields(q, c.front, c.reading, c.meaning, c.tags?.join(' '), c.example, c.notes, c.deck),
  })), limit)
}

const grammar: SearchSource = {
  id: 'grammar',
  label: { vi: 'Ngữ pháp', en: 'Grammar', ja: '文法' },
  order: 40,
  async search(q, { limit, lang }) {
    return cardHits((await allCards()).filter((c) => c.kind === 'grammar'), q, limit, lang)
  },
}

const cards: SearchSource = {
  id: 'cards',
  label: { vi: 'Thẻ ôn tập', en: 'Review cards', ja: '復習カード' },
  order: 50,
  async search(q, { limit, lang }) {
    return cardHits((await allCards()).filter((c) => c.kind !== 'grammar'), q, limit, lang)
  },
}

// ---------- Manga & anime: tên series, chương, tập ----------

const mangaLib = () => cached('manga-lib', ['mangaSeries', 'mangaChapters'], async () => {
  const [series, chapters] = await Promise.all([getAll<MangaSeries>('mangaSeries'), getAll<MangaChapter>('mangaChapters')])
  return { series, chapters, byId: new Map(series.map((s) => [s.id, s])) }
})

const animeLib = () => cached('anime-lib', ['animeSeries', 'animeEpisodes'], async () => {
  const [series, episodes] = await Promise.all([getAll<AnimeSeries>('animeSeries'), getAll<AnimeEpisode>('animeEpisodes')])
  return { series, episodes, byId: new Map(series.map((s) => [s.id, s])), epById: new Map(episodes.map((e) => [e.id, e])) }
})

const chapterName = (c: MangaChapter) =>
  [c.volume != null ? `Vol. ${c.volume}` : '', c.number != null ? `Ch. ${c.number}` : '', c.title].filter(Boolean).join(' · ')
const episodeName = (e: AnimeEpisode) =>
  [e.number != null ? `#${e.number}` : '', e.title].filter(Boolean).join(' · ')

const library: SearchSource = {
  id: 'library',
  label: { vi: 'Manga & anime', en: 'Manga & anime', ja: '漫画・アニメ' },
  order: 60,
  async search(q, { limit, lang }) {
    const [m, a] = await Promise.all([mangaLib(), animeLib()])
    const hits: SearchHit[] = []
    for (const s of m.series) {
      hits.push({ id: 'ms' + s.id, title: s.title, reading: s.titleJp, subtitle: tr(lang, 'mangaSeries'),
        to: mangaSeriesPath(s.id), score: bonus(matchFields(q, s.title, s.titleJp), 3) })
    }
    for (const c of m.chapters) {
      const s = m.byId.get(c.seriesId)
      hits.push({ id: 'mc' + c.id, title: chapterName(c) || c.fileName, subtitle: `${tr(lang, 'chapter')} · ${s?.title ?? ''}`,
        to: mangaReaderPath(c.id), score: matchFields(q, c.title, c.fileName, String(c.number ?? '')) })
    }
    for (const s of a.series) {
      hits.push({ id: 'as' + s.id, title: s.title, reading: s.titleJp, subtitle: tr(lang, 'animeSeries'),
        to: animeSeriesPath(s.id), score: bonus(matchFields(q, s.title, s.titleJp), 3) })
    }
    for (const e of a.episodes) {
      const s = a.byId.get(e.seriesId)
      hits.push({ id: 'ae' + e.id, title: episodeName(e) || e.fileName, subtitle: `${tr(lang, 'episode')} · ${s?.title ?? ''}`,
        to: animePlayerPath(e.id), score: matchFields(q, e.title, e.fileName, String(e.number ?? '')) })
    }
    return top(hits, limit)
  },
}

// ---------- Ghi chú, đánh dấu trang, bong bóng thoại trong manga ----------

const notes: SearchSource = {
  id: 'notes',
  label: { vi: 'Ghi chú & đánh dấu', en: 'Notes & bookmarks', ja: 'メモ・しおり' },
  order: 70,
  async search(q, { limit, lang }) {
    const [list, lib] = await Promise.all([cached('manga-notes', ['mangaNotes'], () => getAll<MangaNote>('mangaNotes')), mangaLib()])
    const chapters = new Map(lib.chapters.map((c) => [c.id, c]))
    return top(list.map((n) => {
      const c = chapters.get(n.chapterId)
      const where = [lib.byId.get(n.seriesId)?.title, c && chapterName(c), tr(lang, 'page', { n: n.page + 1 })].filter(Boolean).join(' · ')
      const to = `${mangaReaderPath(n.chapterId)}&page=${n.page}`
      if (n.kind === 'bookmark') {
        return { id: n.id, title: n.note ? snippet(n.note, q) : tr(lang, 'bookmark'), subtitle: `🔖 ${where}`, to,
          score: matchFields(q, n.note) }
      }
      const text = [n.text, n.translation, n.note, n.speaker].filter(Boolean).join(' — ')
      return { id: n.id, title: snippet(n.text, q), jp: true, subtitle: `💬 ${[n.translation, where].filter(Boolean).join(' · ')}`, to,
        score: matchFields(q, n.text, n.translation, n.note, n.speaker) || matchFields(q, text) }
    }), limit)
  },
}

// ---------- Câu trong phụ đề anime ----------

const sentences: SearchSource = {
  id: 'sentences',
  label: { vi: 'Câu trong phụ đề', en: 'Subtitle lines', ja: '字幕の文' },
  order: 80,
  async search(q, { limit }) {
    if (!q.hasJp && q.norm.length < 2) return [] // gõ 1 chữ cái Latin thì quá nhiều dòng khớp
    const [subs, lib] = await Promise.all([cached('anime-subs', ['animeSubs'], () => getAll<AnimeSubs>('animeSubs')), animeLib()])
    const hits: SearchHit[] = []
    for (const sub of subs) {
      const e = lib.epById.get(sub.episodeId)
      for (const cue of sub.cues) {
        const s = matchFields(q, cue.t)
        if (!s) continue
        const mm = Math.floor(cue.s / 60000)
        const ss = String(Math.floor(cue.s / 1000) % 60).padStart(2, '0')
        hits.push({
          id: `${sub.episodeId}:${sub.track}:${cue.s}`, title: snippet(cue.t, q), jp: sub.track === 'jp',
          subtitle: [e && lib.byId.get(e.seriesId)?.title, e && episodeName(e), `${mm}:${ss}`].filter(Boolean).join(' · '),
          to: animePlayerPath(sub.episodeId), score: s,
        })
        if (hits.length > 200) return top(hits, limit)
      }
    }
    return top(hits, limit)
  },
}

export const BUILTIN_SOURCES: SearchSource[] = [pages, words, kanji, grammar, cards, library, notes, sentences]
