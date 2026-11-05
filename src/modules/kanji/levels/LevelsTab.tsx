/**
 * TAB "THEO CẤP" (kiểu WaniKani): bộ thủ → Kanji → từ vựng, mở khóa dần.
 *   - Khung trên: cấp hiện tại, tiến độ lên cấp, nút "Học bài mới" và "Ôn tập".
 *   - Học bài mới: xem từng mục (5 mục một lượt), xong thì đưa cả lượt vào Ôn tập.
 *   - Dải chọn cấp + lưới mục của cấp đang xem, tô màu theo trạng thái.
 * Cách chia cấp: plan.ts. Luật mở khóa: progress.ts.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Button, ButtonLink } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { getWord, shortMeaning as wordMeaning, type KanjiData } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { STORIES } from '../data/stories'
import { formatKun, hanViet, shortMeaning, useKanjiDicMany } from '../lib/data'
import type { KanjiLevel, LevelPlan, VocabItem } from './plan'
import {
  addLessonCards, entriesOf, LESSON_BATCH, LEVEL_UP_RATIO, PASS_DAYS, radicalLabel, setManualUnlock, usedIn,
  useLevelStatus, type ItemState, type LevelEntry, type LevelStatus,
} from './progress'

const JLPT = (j?: number) => (j ? `N${j}` : 'Jōyō')

/** Kiểu viền/nền theo trạng thái. */
const STATE_STYLE: Record<ItemState, string> = {
  locked: 'border-border opacity-45',
  lesson: 'border-primary border-dashed',
  learning: 'border-border',
  passed: 'border-good bg-good/5',
}
const STATE_LABEL: Record<ItemState, string> = {
  locked: 'Chưa mở', lesson: 'Chờ học', learning: 'Đang ôn', passed: 'Đã thuộc',
}

function StateMark({ s }: { s: ItemState }) {
  if (s === 'locked') return <span className="absolute right-1 top-0.5 text-[10px]" aria-label="Chưa mở">🔒</span>
  if (s === 'learning') return <span className="absolute right-1.5 top-0.5 text-xs text-primary" aria-label="Đang ôn">●</span>
  if (s === 'passed') return <span className="absolute right-1.5 top-0.5 text-xs font-bold text-good" aria-label="Đã thuộc">✓</span>
  return <span className="absolute right-1.5 top-0.5 text-[10px] font-semibold text-primary" aria-label="Chờ học">mới</span>
}

/** Nghĩa (tiếng Việt nếu có) cho các từ vựng của một cấp. */
function useVocabMeanings(vocab: VocabItem[]) {
  const ids = vocab.map((v) => v.id).join(',')
  return useDbQuery(async () => {
    const out = new Map<string, string>()
    await Promise.all(vocab.map(async (v) => {
      const d = await getWord(v.id)
      if (d) out.set(v.id, await wordMeaning(v.id, d, 1, 2))
    }))
    return out
  }, [ids], ['packs']).data
}

/** Ký tự cần thông tin KANJIDIC: Kanji + thành phần không phải bộ thủ của một cấp. */
const dicCharsOf = (lv: KanjiLevel) => lv.kanji.map((k) => k.char).join('') + lv.radicals.filter((r) => !r.n).map((r) => r.char).join('')

// ---------------------------------------------------------------------------
// Học bài mới
// ---------------------------------------------------------------------------

function LessonItem({ e, plan, dic, meaning, onOpen }: {
  e: LevelEntry
  plan: LevelPlan
  dic?: Map<string, KanjiData | undefined>
  meaning?: string
  onOpen: (c: string) => void
}) {
  if (e.type === 'radical') {
    const { name, meaning: m } = radicalLabel(e.item, dic?.get(e.item.char))
    const uses = usedIn(plan, e.item.char)
    return (
      <div className="flex flex-wrap items-center gap-5">
        <div className="jp grid size-28 shrink-0 place-items-center rounded-2xl bg-primary-soft text-7xl">{e.item.char}</div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{e.item.n ? `Bộ thủ số ${e.item.n}` : 'Thành phần'}</p>
          <p className="text-2xl font-bold">{name || '—'} <span className="text-lg font-normal">· {m}</span></p>
          {uses.length > 0 && (
            <p className="text-sm text-muted">Sẽ gặp trong: <span className="jp text-lg text-text">{uses.join(' ')}</span></p>
          )}
          <p className="text-sm text-muted">Nhớ hình và nghĩa của thành phần này, nó giúp đoán và nhớ các chữ phía sau.</p>
        </div>
      </div>
    )
  }
  if (e.type === 'kanji') {
    const d = dic?.get(e.item.char)
    const story = STORIES[e.item.char]
    const parts = [...e.item.radicals, ...e.item.kanji].filter((c) => c !== e.item.char)
    return (
      <div className="flex flex-wrap items-start gap-5">
        <div className="jp grid size-28 shrink-0 place-items-center rounded-2xl bg-surface-2 text-7xl">{e.item.char}</div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kanji</p>
          <p className="text-2xl font-bold"><span className="text-primary">{hanViet(d)}</span> <span className="text-lg font-normal">· {shortMeaning(e.item.char, d)}</span></p>
          {d?.on?.length ? <p className="text-sm">On: <span className="jp">{d.on.slice(0, 3).join('、')}</span></p> : null}
          {d?.kun?.length ? <p className="text-sm">Kun: <span className="jp">{d.kun.slice(0, 3).map(formatKun).join('、')}</span></p> : null}
          {parts.length > 0 && (
            <p className="text-sm text-muted">Thành phần: <span className="jp text-lg text-text">{parts.join(' + ')}</span></p>
          )}
          {story?.s && <p className="rounded-xl bg-surface-2 p-3 text-sm">💡 {story.s}</p>}
          <button className="text-sm text-primary underline" onClick={() => onOpen(e.item.char)}>Xem chi tiết, thứ tự nét ›</button>
        </div>
      </div>
    )
  }
  const v = e.item
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="grid min-h-28 min-w-28 shrink-0 place-items-center rounded-2xl bg-surface-2 px-4">
        <ruby className="jp text-5xl">{v.word}<rt className="text-base">{v.reading}</rt></ruby>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Từ vựng</p>
        <p className="text-xl font-semibold">{meaning ?? v.gloss}</p>
        <p className="text-sm text-muted">
          Gồm: {v.kanji.map((c) => <span key={c} className="mr-2"><span className="jp text-lg text-text">{c}</span> {hanViet(dic?.get(c))}</span>)}
        </p>
        <button className="text-sm text-primary underline" onClick={(ev) => openLookup(v.word, { x: ev.clientX, y: ev.clientY })}>Tra từ điển ›</button>
      </div>
    </div>
  )
}

function Lesson({ status, onOpen, onClose }: { status: LevelStatus; onOpen: (c: string) => void; onClose: () => void }) {
  // Giữ cố định lượt học: thẻ vừa thêm làm danh sách "chờ học" đổi, không để lượt đang xem bị nhảy
  const [batch] = useState(() => status.lessons.slice(0, LESSON_BATCH))
  const [i, setI] = useState(0)
  const [saving, setSaving] = useState(false)
  const chars = useMemo(() => [...new Set(batch.flatMap((e) =>
    e.type === 'kanji' ? [e.item.char] : e.type === 'vocab' ? e.item.kanji : e.item.n ? [] : [e.item.char]))].join(''), [batch])
  const dic = useKanjiDicMany(chars)
  const meanings = useVocabMeanings(useMemo(() => batch.flatMap((e) => (e.type === 'vocab' ? [e.item] : [])), [batch]))
  const last = i === batch.length - 1
  const e = batch[i]

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
      if (ev.key === 'ArrowRight') setI((x) => Math.min(batch.length - 1, x + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [batch.length])

  if (!e) return null
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Bài mới · cấp {e.level}</h2>
        <div className="flex gap-1.5" aria-label={`Mục ${i + 1} / ${batch.length}`}>
          {batch.map((x, k) => (
            <button key={x.key} onClick={() => setI(k)} aria-label={`Mục ${k + 1}`}
              className={`size-2.5 rounded-full ${k === i ? 'bg-primary' : k < i ? 'bg-primary/50' : 'bg-surface-2'}`} />
          ))}
        </div>
      </div>
      <LessonItem e={e} plan={status.plan} dic={dic} meaning={e.type === 'vocab' ? meanings?.get(e.item.id) : undefined} onOpen={onOpen} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button variant="ghost" onClick={onClose}>Để sau</Button>
        <div className="flex gap-2">
          <Button variant="soft" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Trước</Button>
          {last ? (
            <Button disabled={saving} onClick={async () => {
              setSaving(true)
              try { await addLessonCards(status.plan, batch) } finally { setSaving(false) }
              onClose()
            }}>Đã nhớ, đưa {batch.length} mục vào Ôn tập</Button>
          ) : (
            <Button onClick={() => setI(i + 1)}>Tiếp ›</Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Lưới một cấp
// ---------------------------------------------------------------------------

function LevelView({ lv, status, onOpen, onRadical }: {
  lv: KanjiLevel
  status: LevelStatus
  onOpen: (c: string, list?: string) => void
  onRadical: (n: number) => void
}) {
  const dic = useKanjiDicMany(useMemo(() => dicCharsOf(lv), [lv]))
  const meanings = useVocabMeanings(lv.vocab)
  const st = (key: string): ItemState => status.state.get(key) ?? 'locked'
  const stat = status.stats[lv.n - 1]
  const kanjiList = lv.kanji.map((k) => k.char).join('')
  const counts = entriesOf(lv).reduce((m, e) => m.set(st(e.key), (m.get(st(e.key)) ?? 0) + 1), new Map<ItemState, number>())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Cấp {lv.n} <span className="text-sm font-normal text-muted">· {JLPT(lv.jlpt)} · {lv.radicals.length} bộ thủ, {lv.kanji.length} Kanji, {lv.vocab.length} từ</span></h2>
        <p className="text-xs text-muted">
          {(['passed', 'learning', 'lesson', 'locked'] as ItemState[]).filter((s) => counts.get(s)).map((s) => `${STATE_LABEL[s]} ${counts.get(s)}`).join(' · ')}
        </p>
      </div>

      {!stat.unlocked && (
        <Card className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm">🔒 Cấp này mở khi bạn thuộc {Math.round(LEVEL_UP_RATIO * 100)}% Kanji của cấp trước.</p>
          <Button variant="soft" onClick={() => setManualUnlock(lv.n)}>Tôi đã biết các cấp trước, mở tới cấp {lv.n}</Button>
        </Card>
      )}

      {lv.radicals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Bộ thủ / thành phần</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            {lv.radicals.map((r) => {
              const s = st('r:' + r.char)
              const { name, meaning } = radicalLabel(r, dic?.get(r.char))
              return (
                <button key={r.char} onClick={() => (r.n ? onRadical(r.n) : onOpen(r.char))} title={`${name} · ${meaning} · ${STATE_LABEL[s]}`}
                  className={`relative flex flex-col items-center rounded-xl border bg-surface p-2 text-center transition hover:border-primary ${STATE_STYLE[s]}`}>
                  <StateMark s={s} />
                  <span className="jp text-3xl leading-tight">{r.char}</span>
                  <span className="mt-0.5 text-[11px] font-semibold">{name}</span>
                  <span className="line-clamp-1 w-full text-[11px] text-muted">{meaning}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Kanji <span className="font-normal text-muted">· thuộc {stat.kanjiPassed}/{lv.kanji.length}, cần {stat.kanjiNeeded} để lên cấp</span></h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
          {lv.kanji.map((k) => {
            const s = st('k:' + k.char)
            const d = dic?.get(k.char)
            return (
              <button key={k.char} onClick={() => onOpen(k.char, kanjiList)} title={STATE_LABEL[s]}
                className={`relative flex flex-col items-center rounded-xl border bg-surface p-2 text-center transition hover:border-primary ${STATE_STYLE[s]}`}>
                <StateMark s={s} />
                <span className="jp text-3xl leading-tight">{k.char}</span>
                <span className="mt-0.5 text-[11px] font-semibold text-primary">{hanViet(d)}</span>
                <span className="line-clamp-1 w-full text-[11px] text-muted">{shortMeaning(k.char, d)}</span>
              </button>
            )
          })}
        </div>
      </section>

      {lv.vocab.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Từ vựng</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
            {lv.vocab.map((v) => {
              const s = st('v:' + v.id)
              return (
                <button key={v.id} onClick={(ev) => openLookup(v.word, { x: ev.clientX, y: ev.clientY })} title={STATE_LABEL[s]}
                  className={`relative flex flex-col items-start rounded-xl border bg-surface px-3 py-2 text-left transition hover:border-primary ${STATE_STYLE[s]}`}>
                  <StateMark s={s} />
                  <span className="text-[11px] text-muted jp">{v.reading}</span>
                  <span className="jp text-xl leading-tight">{v.word}</span>
                  <span className="line-clamp-1 w-full text-[11px] text-muted">{meanings?.get(v.id) ?? v.gloss}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export function LevelsTab({ onOpen, onRadical }: { onOpen: (c: string, list?: string) => void; onRadical: (n: number) => void }) {
  const { data: status, loading } = useLevelStatus()
  const [sel, setSel] = useState<number>()
  const [learning, setLearning] = useState(false)

  if (!status) return <p className="text-muted">{loading ? 'Đang chia cấp…' : 'Chưa có dữ liệu Kanji.'}</p>

  const { plan, stats, current, lessons } = status
  const view = plan.levels[(sel ?? current) - 1]
  const cur = stats[current - 1]
  const curLv = plan.levels[current - 1]
  const pct = cur.kanjiNeeded ? Math.min(100, (cur.kanjiPassed / cur.kanjiNeeded) * 100) : 100

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp hiện tại</p>
            <p className="text-3xl font-bold">{current} <span className="text-base font-normal text-muted">/ {plan.levels.length} · {JLPT(curLv.jlpt)}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lessons.length > 0 && !learning && (
              <Button onClick={() => setLearning(true)}>Học bài mới ({lessons.length})</Button>
            )}
            <ButtonLink to="/review" variant="soft">Ôn tập</ButtonLink>
          </div>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-good transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {current < plan.levels.length
              ? <>Thuộc {cur.kanjiPassed}/{cur.kanjiNeeded} Kanji cần thiết để mở cấp {current + 1}.</>
              : <>Đây là cấp cuối cùng.</>}
            {' '}“Thuộc” = đã ôn đúng và nhớ được ít nhất {PASS_DAYS} ngày.
            {lessons.length === 0 && ' Không còn bài mới: hãy ôn tập để mở khóa tiếp.'}
          </p>
        </div>
        {status.manual > 0 && (
          <p className="text-xs text-muted">
            Bạn đã tự mở tới cấp {status.manual}.{' '}
            <button className="underline" onClick={() => setManualUnlock(0)}>Bỏ tự mở</button>
          </p>
        )}
      </Card>

      {learning && (
        <Lesson key={lessons[0]?.key} status={status} onOpen={(c) => onOpen(c)} onClose={() => setLearning(false)} />
      )}

      <nav aria-label="Chọn cấp" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {plan.levels.map((lv) => {
          const s = stats[lv.n - 1]
          const done = s.unlocked && s.kanjiPassed >= s.kanjiNeeded
          const active = lv.n === view.n
          return (
            <button key={lv.n} onClick={() => setSel(lv.n)} aria-current={active ? 'true' : undefined}
              title={`Cấp ${lv.n} · ${JLPT(lv.jlpt)}${s.unlocked ? '' : ' · chưa mở'}`}
              className={`min-w-10 shrink-0 rounded-lg border px-2 py-1 text-sm font-medium transition ${
                active ? 'border-primary bg-primary text-on-primary'
                  : done ? 'border-good text-good'
                    : s.unlocked ? 'border-border bg-surface hover:border-primary' : 'border-border text-muted opacity-60'}`}>
              {s.unlocked ? lv.n : `🔒${lv.n}`}
            </button>
          )
        })}
      </nav>

      <LevelView key={view.n} lv={view} status={status} onOpen={onOpen} onRadical={onRadical} />

      <p className="text-xs text-muted">
        Cách học: thuộc <b>bộ thủ</b> → mở <b>Kanji</b> chứa bộ đó → thuộc Kanji → mở <b>từ vựng</b> dùng các chữ đó.
        Mỗi cấp khoảng 20 chữ, đi từ N5 tới N1. Thẻ được đưa vào <Link to="/review" className="underline">Ôn tập</Link>
        {' '}(bộ “Kanji theo cấp”, Kanji vẫn nằm trong bộ Kanji N5, N4…).
      </p>
    </div>
  )
}
