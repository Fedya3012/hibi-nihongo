/**
 * TỪ VỰNG & KANJI CỦA MỘT TẬP
 * - Điểm hiểu (Comprehension Score) theo thẻ ôn tập của bạn.
 * - Danh sách từ / Kanji trong phụ đề, xếp theo số lần xuất hiện.
 * - Chọn từ → thêm vào Ôn tập (kèm câu ví dụ lấy từ phụ đề), hoặc đánh dấu "Đã biết".
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import {
  PackSetup, addKanjiToReview, getKanji, useDictPacks, useTokenizerStatus,
  type KanjiData, type WordResult,
} from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { ProgressBar } from '../manga/ui'
import {
  comprehension, comprehensionLabel, ensureAnalysis, kanjiStatus, useKnowledge, wordStatus,
  type Knowledge, type WordStatus,
} from './analysis'
import { getSubs } from './store'
import { setWordStatus } from '@/modules/vocab/api'
import { addWordCards, animeDeck } from './cards'
import { glossOf, guessWordCategory, lookupWord, styleNotes } from './dict'
import { CATEGORY_LABEL, type AnimeEpisode, type AnimeSeries, type ClipCategory, type Cue, type SubAnalysis, type WordStat } from './types'

const PAGE = 40

/** Thanh điểm hiểu: phần đã biết (xanh), đang học (vàng), còn lại là từ mới. */
export function ComprehensionBar({ a, k, compact }: { a: SubAnalysis; k: Knowledge; compact?: boolean }) {
  const c = comprehension(a, k)
  const pct = Math.round(c.known * 100)
  return (
    <div className="grid gap-1" title={`Đã biết ${pct}% · đang học ${Math.round(c.learning * 100)}% lượt từ`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span><b className="text-base">{pct}%</b> {compact ? 'hiểu' : `điểm hiểu · ${comprehensionLabel(c.known)}`}</span>
        {!compact && <span className="text-xs text-muted">{c.newUnique} từ mới / {c.totalUnique} từ</span>}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="bg-good" style={{ width: `${c.known * 100}%` }} />
        <div className="bg-warn" style={{ width: `${c.learning * 100}%` }} />
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<WordStatus, string> = { known: 'Đã biết', learning: 'Đang học', new: 'Mới' }
const STATUS_CLASS: Record<WordStatus, string> = {
  known: 'bg-surface-2 text-good', learning: 'bg-surface-2 text-warn', new: 'bg-primary-soft text-text',
}

function Meaning({ w }: { w: string }) {
  const [r, setR] = useState<WordResult | null>()
  useEffect(() => {
    let alive = true
    lookupWord(w).then((x) => alive && setR(x ?? null))
    return () => { alive = false }
  }, [w])
  if (r === undefined) return <span className="text-muted">…</span>
  if (r === null) return <span className="text-muted">(không có trong từ điển)</span>
  const reading = r.data.r[0]?.t
  const notes = styleNotes(r)
  return (
    <span>
      {reading && reading !== w && <span className="jp mr-1 text-muted">{reading}</span>}{glossOf(r)}
      {notes.length > 0 && <span className="ml-1 rounded bg-surface-2 px-1 text-xs text-muted">{notes.join(', ')}</span>}
    </span>
  )
}

function KanjiMeaning({ ch }: { ch: string }) {
  const [d, setD] = useState<KanjiData | null>()
  useEffect(() => {
    let alive = true
    getKanji(ch).then((x) => alive && setD(x ?? null), () => alive && setD(null))
    return () => { alive = false }
  }, [ch])
  if (d === undefined) return <span className="text-muted">…</span>
  if (d === null) return <span className="text-muted">(không có dữ liệu)</span>
  return <span>{d.hv?.length ? <b className="mr-1">{d.hv.join(', ').toUpperCase()}</b> : null}{(d.m ?? []).slice(0, 3).join(', ')}</span>
}

/** Lọc theo loại từ (đoán từ ghi chú của từ điển). */
type CatFilter = 'all' | ClipCategory

export function VocabPanel({ episode, series, className = '' }: {
  episode: AnimeEpisode
  series: AnimeSeries
  className?: string
}) {
  const [cat, setCat] = useState<CatFilter>('all')
  const [cats, setCats] = useState<Map<string, ClipCategory>>(new Map())
  const [analysis, setAnalysis] = useState<SubAnalysis | null>()
  const [cues, setCues] = useState<Cue[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()
  const [tab, setTab] = useState<'words' | 'kanji'>('words')
  const [filter, setFilter] = useState<'new' | 'all'>('new')
  const [limit, setLimit] = useState(PAGE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string>()
  const [busy, setBusy] = useState(false)
  const k = useKnowledge()
  const packs = useDictPacks()
  const tokStatus = useTokenizerStatus((s) => s.status)

  useEffect(() => {
    let alive = true
    setAnalysis(undefined); setError(undefined); setSelected(new Set()); setMsg(undefined)
    ;(async () => {
      try {
        const subs = await getSubs(episode.id, 'jp')
        if (!alive) return
        setCues(subs?.cues ?? [])
        const a = await ensureAnalysis(episode, (p) => alive && setProgress(p))
        if (alive) setAnalysis(a ?? null)
      } catch (e) {
        if (alive) setError(`Không phân tích được phụ đề: ${(e as Error).message}`)
      }
    })()
    return () => { alive = false }
    // Chỉ chạy lại khi đổi tập hoặc đổi phụ đề
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id, episode.subFile])

  const words = useMemo(() => {
    if (!analysis || !k) return []
    return analysis.words.filter((w) => (filter === 'all' || wordStatus(w, k) === 'new') && (cat === 'all' || cats.get(w.w) === cat))
  }, [analysis, k, filter, cat, cats])
  const kanji = useMemo(() => {
    if (!analysis || !k) return []
    return analysis.kanji.filter((x) => filter === 'all' || kanjiStatus(x.k, k) === 'new')
  }, [analysis, k, filter])

  useEffect(() => { setLimit(PAGE); setSelected(new Set()) }, [tab, filter, cat])

  // Đoán loại của từng từ (lóng, khẩu ngữ, cảm thán...) khi người dùng bật bộ lọc loại
  useEffect(() => {
    if (cat === 'all' || !analysis) return
    let alive = true
    ;(async () => {
      const m = new Map(cats)
      for (const w of analysis.words) {
        if (m.has(w.w)) continue
        m.set(w.w, guessWordCategory(await lookupWord(w.w), w.p))
      }
      if (alive) setCats(m)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, analysis])

  if (error) return <p className={`text-sm text-bad ${className}`}>{error}</p>
  if (analysis === null) return <p className={`text-sm text-muted ${className}`}>Tập này chưa có phụ đề tiếng Nhật nên chưa có danh sách từ.</p>
  if (!analysis || !k) {
    return (
      <div className={`grid gap-2 text-sm text-muted ${className}`}>
        <p>{tokStatus === 'loading' && progress === 0 ? 'Đang chuẩn bị bộ tách từ (lần đầu tải ~17 MB)…' : 'Đang phân tích phụ đề…'}</p>
        <ProgressBar value={progress} />
      </div>
    )
  }

  const list: { key: string; n: number }[] = tab === 'words' ? words.map((w) => ({ key: w.w, n: w.n })) : kanji.map((x) => ({ key: x.k, n: x.n }))
  const shown = list.slice(0, limit)
  const toggle = (key: string) => setSelected((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const byWord = new Map(analysis.words.map((w) => [w.w, w]))

  const addSelected = async () => {
    setBusy(true); setMsg(undefined)
    try {
      if (tab === 'kanji') {
        let added = 0
        for (const ch of selected) {
          const d = await getKanji(ch)
          if (d && await addKanjiToReview(ch, d)) added++
        }
        setMsg(`Đã thêm ${added} thẻ Kanji vào bộ "Kanji của tôi".`)
      } else {
        const deck = animeDeck(series)
        const words = [...selected].map((w) => {
          const st = byWord.get(w) as WordStat
          return { w, s: st.s, pos: st.p, example: cues[st.c]?.t.replace(/\n/g, ' ') }
        })
        const { added, dup, missing } = await addWordCards(series, episode, undefined, words)
        setMsg(`Đã thêm ${added} thẻ vào bộ "${deck}".${dup ? ` ${dup} từ đã có thẻ.` : ''}${missing ? ` ${missing} từ không có trong từ điển nên bỏ qua.` : ''}`)
      }
      setSelected(new Set())
    } catch (e) {
      setMsg(`Lỗi: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const markKnown = async (known: boolean) => {
    // Ghi vào Kho từ dùng chung → chữ trong manga, giáo trình... cũng đổi màu theo
    await setWordStatus([...selected].map((w) => {
      const st = byWord.get(w)
      return { w, r: st?.r, alt: st && st.s !== w ? [st.s] : undefined }
    }), known ? 'known' : null, 'anime')
    setMsg(known ? `Đã đánh dấu ${selected.size} từ là "Đã biết".` : `Đã bỏ đánh dấu ${selected.size} từ.`)
    setSelected(new Set())
  }

  return (
    <div className={`grid content-start gap-3 ${className}`}>
      <ComprehensionBar a={analysis} k={k} />
      {!packs.loading && !packs.ready && <PackSetup compact />}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Loại" value={tab} onChange={setTab}
          options={[{ value: 'words', label: `Từ (${analysis.words.length})` }, { value: 'kanji', label: `Kanji (${analysis.kanji.length})` }]} />
        <Segmented label="Lọc" value={filter} onChange={setFilter}
          options={[{ value: 'new', label: 'Chưa có thẻ' }, { value: 'all', label: 'Tất cả' }]} />
        {tab === 'words' && (
          <select value={cat} onChange={(e) => setCat(e.target.value as CatFilter)} aria-label="Loại từ"
            className="min-h-9 rounded-lg border border-border bg-surface-2 px-2 text-sm">
            <option value="all">Mọi loại từ</option>
            {(Object.keys(CATEGORY_LABEL) as ClipCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        )}
      </div>
      {cat !== 'all' && cats.size < analysis.words.length && <p className="text-xs text-muted">Đang phân loại từ…</p>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="text-primary hover:underline" onClick={() => setSelected(new Set(list.slice(0, 20).map((x) => x.key)))}>
          Chọn 20 {tab === 'words' ? 'từ' : 'chữ'} hay gặp nhất
        </button>
        {selected.size > 0 && <button className="text-muted hover:underline" onClick={() => setSelected(new Set())}>Bỏ chọn</button>}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={addSelected} disabled={busy}>+ Thêm {selected.size} thẻ ôn tập</Button>
          {tab === 'words' && <Button variant="soft" onClick={() => markKnown(true)} disabled={busy}>Đã biết</Button>}
          {tab === 'words' && filter === 'all' && <Button variant="ghost" onClick={() => markKnown(false)} disabled={busy}>Bỏ "Đã biết"</Button>}
        </div>
      )}
      {msg && <p className="text-sm text-good">{msg}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-muted">{filter === 'new' ? 'Bạn đã có thẻ cho mọi từ trong tập này. 🎉' : 'Không có mục nào.'}</p>
      ) : (
        <ul className="grid gap-1">
          {shown.map(({ key, n }) => {
            const st = tab === 'words' ? wordStatus(byWord.get(key)!, k) : kanjiStatus(key, k)
            return (
              <li key={key} className={`flex items-start gap-2 rounded-xl px-2 py-1.5 ${selected.has(key) ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}>
                <input type="checkbox" className="mt-2" checked={selected.has(key)} onChange={() => toggle(key)} aria-label={`Chọn ${key}`} />
                <button className="jp min-w-12 shrink-0 text-left text-lg leading-normal hover:text-primary"
                  onClick={(e) => openLookup(key, { x: e.clientX, y: e.clientY })} title="Tra từ">{key}</button>
                <span className="min-w-0 flex-1 text-sm leading-snug">
                  {tab === 'words' ? <Meaning w={key} /> : <KanjiMeaning ch={key} />}
                  <span className="mt-0.5 flex gap-2 text-xs text-muted">
                    <span>×{n}</span>
                    <span className={`rounded px-1.5 ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > limit && (
        <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>Xem thêm ({list.length - limit})</Button>
      )}
    </div>
  )
}
