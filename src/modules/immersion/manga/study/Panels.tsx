/**
 * CÁC BẢNG HỌC TRONG TRÌNH ĐỌC: danh sách bong bóng (nghe liên tục), từ & Kanji của chương,
 * đánh dấu trang, luyện tập (điền khuyết, nghe chép).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { getKanjiList, type KanjiData } from '@/modules/dictionary'
import { saveNote } from '../notes'
import { speakJa, stopSpeaking, useJaVoice } from './audio'
import { downloadCsv, getLookupHistory, sourceLabel, wordsOf, type LookupEntry, type WordInfo } from './mining'
import { Small } from './BubbleCard'
import type { MangaBookmark, MangaBubble, MangaChapter, MangaSeries } from '../types'

// ---------- Bong bóng ----------

export function BubblesTab({ bubbles, page, onOpen, onGo, rate }: {
  bubbles: MangaBubble[]
  page: number
  onOpen: (b: MangaBubble) => void
  onGo: (page: number, highlight?: string) => void
  rate: number
}) {
  const voice = useJaVoice()
  const [playing, setPlaying] = useState(false)
  const stopRef = useRef(false)
  useEffect(() => () => { stopRef.current = true; stopSpeaking() }, [])

  const playFrom = async (startIdx: number) => {
    stopRef.current = false
    setPlaying(true)
    for (let i = startIdx; i < bubbles.length && !stopRef.current; i++) {
      onGo(bubbles[i].page, bubbles[i].id)
      await speakJa(bubbles[i].text, rate)
      await new Promise((r) => setTimeout(r, 500))
    }
    setPlaying(false)
    onGo(bubbles[Math.min(bubbles.length - 1, startIdx)]?.page ?? page)
  }

  if (!bubbles.length) {
    return (
      <div className="grid gap-2 text-sm text-muted">
        <p>Chương này chưa có bong bóng nào có chữ.</p>
        <p>Bấm nút <b className="text-text">＋</b> trên thanh công cụ (hoặc <b className="text-text">giữ ngón tay/chuột</b> trên trang) rồi kéo khoanh một bong bóng thoại, sau đó gõ hoặc dán chữ trong đó. Khi có OCR (giai đoạn 3), chữ sẽ tự điền.</p>
      </div>
    )
  }
  const firstHere = Math.max(0, bubbles.findIndex((b) => b.page >= page))
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex flex-wrap gap-2">
        {playing
          ? <Button className="min-h-9" onClick={() => { stopRef.current = true; stopSpeaking(); setPlaying(false) }}>■ Dừng nghe</Button>
          : <Button className="min-h-9" disabled={!voice} onClick={() => void playFrom(firstHere)}>▶ Nghe liên tục từ trang này</Button>}
      </div>
      {!voice && <p className="text-xs text-muted">Máy chưa có giọng tiếng Nhật. Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → 日本語.</p>}
      <ol className="grid gap-1">
        {bubbles.map((b) => (
          <li key={b.id}>
            <button onClick={() => onOpen(b)} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2 ${b.page === page ? 'bg-surface-2' : ''}`}>
              <span className="text-xs text-muted">Tr.{b.page + 1}{b.speaker ? ` · ${b.speaker}` : ''}{b.minedAt ? ' · ★' : ''}</span>
              <span className="jp block truncate">{b.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------- Từ & Kanji của chương ----------

export function WordsTab({ bubbles, chapter, series }: { bubbles: MangaBubble[]; chapter: MangaChapter; series?: MangaSeries }) {
  const [words, setWords] = useState<(WordInfo & { sentence: string; page: number })[] | null>(null)
  const [kanji, setKanji] = useState<{ char: string; data: KanjiData }[]>([])
  const [history, setHistory] = useState<LookupEntry[]>([])
  const [err, setErr] = useState<string>()
  const text = bubbles.map((b) => b.text).join('\n')

  useEffect(() => {
    let alive = true
    getLookupHistory().then((h) => alive && setHistory(h))
    getKanjiList(text).then((k) => alive && setKanji(k), () => {})
    ;(async () => {
      const all: (WordInfo & { sentence: string; page: number })[] = []
      const seen = new Set<string>()
      for (const b of bubbles) {
        for (const w of await wordsOf(b.text)) {
          const key = w.id ?? w.base
          if (!seen.has(key)) { seen.add(key); all.push({ ...w, sentence: b.text, page: b.page }) }
        }
      }
      if (alive) setWords(all)
    })().catch(() => alive && setErr('Cần tải Từ điển trước (Học → Từ điển) để thống kê từ.'))
    return () => { alive = false }
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const byLevel = (list: { jlpt?: number }[]) => {
    const m = new Map<string, number>()
    for (const x of list) { const k = x.jlpt ? `N${x.jlpt}` : 'Khác'; m.set(k, (m.get(k) ?? 0) + 1) }
    return ['N5', 'N4', 'N3', 'N2', 'N1', 'Khác'].filter((k) => m.has(k)).map((k) => `${k}: ${m.get(k)}`).join(' · ')
  }
  const chapterHistory = history.filter((h) => h.chapterId === chapter.id)

  return (
    <div className="grid gap-4 text-sm">
      {!bubbles.length && <p className="text-muted">Thêm chữ vào các bong bóng để xem thống kê từ và Kanji của chương.</p>}
      {err && <p className="text-bad">{err}</p>}
      {bubbles.length > 0 && (
        <section className="grid gap-1">
          <h4 className="font-semibold">Kanji trong chương ({kanji.length})</h4>
          <p className="text-xs text-muted">{byLevel(kanji.map((k) => ({ jlpt: k.data.j })))}</p>
          <div className="flex flex-wrap gap-1">
            {kanji.sort((a, b) => (b.data.j ?? 0) - (a.data.j ?? 0)).map((k) => (
              <a key={k.char} href={`#/learn/kanji?k=${encodeURIComponent(k.char)}`} title={`${k.data.hv?.join(', ') ?? ''} ${k.data.j ? 'N' + k.data.j : ''}`}
                className="jp grid size-9 place-items-center rounded-lg bg-surface-2 text-lg hover:bg-primary-soft">{k.char}</a>
            ))}
          </div>
          <p className="text-xs text-muted">Bấm một chữ để xem thứ tự nét, âm On/Kun và luyện viết.</p>
        </section>
      )}
      {words && words.length > 0 && (
        <section className="grid gap-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Từ vựng ({words.length})</h4>
            <Small title="Xuất CSV (Excel/Anki)" onClick={() => downloadCsv(`tu-vung-${series?.title ?? 'manga'}.csv`,
              [['Từ', 'Cách đọc', 'Nghĩa', 'JLPT', 'Câu', 'Nguồn'],
                ...words.map((w) => [w.base, w.reading, w.meaning, w.jlpt ? `N${w.jlpt}` : '', w.sentence, sourceLabel(series, chapter, w.page)])])}>⭳ CSV</Small>
          </div>
          <p className="text-xs text-muted">{byLevel(words)}</p>
          <ul className="grid max-h-60 gap-0.5 overflow-y-auto">
            {words.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="jp shrink-0">{w.base}</span>
                <span className="min-w-0 truncate text-xs leading-6 text-muted">{w.reading !== w.base ? `${w.reading} · ` : ''}{w.meaning}</span>
                {w.jlpt && <span className="ml-auto shrink-0 text-xs leading-6 text-muted">N{w.jlpt}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="grid gap-1">
        <h4 className="font-semibold">Từ bạn đã tra trong chương ({chapterHistory.length})</h4>
        {chapterHistory.length === 0 && <p className="text-xs text-muted">Bấm vào một từ trong bong bóng để tra; từ đó sẽ hiện ở đây.</p>}
        <ul className="grid gap-0.5">
          {chapterHistory.slice(0, 50).map((h) => (
            <li key={h.word + h.at} className="flex gap-2"><span className="jp">{h.word}</span><span className="truncate text-xs leading-6 text-muted">{h.meaning}</span></li>
          ))}
        </ul>
      </section>
      {bubbles.length > 0 && (
        <Button variant="soft" className="min-h-9" onClick={() => downloadCsv(`cau-${series?.title ?? 'manga'}.csv`,
          [['Câu', 'Bạn hiểu', 'Nhân vật', 'Ghi chú', 'Nguồn'],
            ...bubbles.map((b) => [b.text, b.translation ?? '', b.speaker ?? '', b.note ?? '', sourceLabel(series, chapter, b.page)])])}>
          ⭳ Xuất mọi câu của chương (CSV cho Anki)
        </Button>
      )}
    </div>
  )
}

// ---------- Đánh dấu trang ----------

export function MarksTab({ marks, page, onGo, onToggle }: {
  marks: MangaBookmark[]; page: number; onGo: (p: number) => void; onToggle: () => void
}) {
  const here = marks.find((m) => m.page === page)
  return (
    <div className="grid gap-3 text-sm">
      <Button variant={here ? 'soft' : 'primary'} className="min-h-9" onClick={onToggle}>
        {here ? `Bỏ đánh dấu trang ${page + 1}` : `🔖 Đánh dấu trang ${page + 1}`}
      </Button>
      {marks.length === 0 && <p className="text-muted">Chưa có trang nào được đánh dấu.</p>}
      <ul className="grid gap-2">
        {[...marks].sort((a, b) => a.page - b.page).map((m) => (
          <li key={m.id} className={`grid gap-1 rounded-xl border p-2 ${m.page === page ? 'border-primary' : 'border-border'}`}>
            <button className="text-left font-medium hover:text-primary" onClick={() => onGo(m.page)}>🔖 Trang {m.page + 1}</button>
            <NoteInput mark={m} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function NoteInput({ mark }: { mark: MangaBookmark }) {
  const [v, setV] = useState(mark.note)
  return (
    <textarea rows={2} value={v} placeholder="Ghi chú cho trang này…"
      onChange={(e) => { setV(e.target.value); void saveNote({ ...mark, note: e.target.value }) }}
      className="w-full rounded-lg border border-border bg-surface-2 p-2 outline-none focus:border-primary" />
  )
}

// ---------- Luyện tập ----------

const strip = (s: string) => s.replace(/[\s、。！？!?「」『』…・ー〜~,.]/g, '')

export function PracticeTab({ bubbles }: { bubbles: MangaBubble[] }) {
  const [mode, setMode] = useState<'cloze' | 'dictation'>('cloze')
  const pool = useMemo(() => bubbles.filter((b) => strip(b.text).length >= 3), [bubbles])
  if (pool.length < 2) {
    return <p className="text-sm text-muted">Cần ít nhất 2 bong bóng có chữ trong chương để luyện tập.</p>
  }
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex gap-1">
        <Small active={mode === 'cloze'} onClick={() => setMode('cloze')}>Điền khuyết</Small>
        <Small active={mode === 'dictation'} onClick={() => setMode('dictation')}>Nghe chép</Small>
      </div>
      {mode === 'cloze' ? <Cloze pool={pool} /> : <Dictation pool={pool} />}
    </div>
  )
}

function useRound<T>(make: () => Promise<T | null>) {
  const [q, setQ] = useState<T | null>(null)
  const [n, setN] = useState(0)
  useEffect(() => { let alive = true; void make().then((x) => alive && setQ(x)); return () => { alive = false } }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  return { q, next: () => { setQ(null); setN((x) => x + 1) } }
}

const pickRandom = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function Cloze({ pool }: { pool: MangaBubble[] }) {
  const [chosen, setChosen] = useState<string>()
  const [score, setScore] = useState({ ok: 0, all: 0 })
  const { q, next } = useRound(async () => {
    for (let tries = 0; tries < 6; tries++) {
      const b = pickRandom(pool)
      const ws = (await wordsOf(b.text).catch(() => [])).filter((w) => w.surface.length >= 1 && b.text.includes(w.surface))
      if (!ws.length) continue
      const answer = pickRandom(ws)
      const others = new Set<string>()
      for (const ob of pool) for (const w of await wordsOf(ob.text).catch(() => [])) if (w.surface !== answer.surface) others.add(w.surface)
      const opts = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
      if (opts.length < 1) continue
      return { b, answer, options: [...opts, answer.surface].sort(() => Math.random() - 0.5) }
    }
    return null
  })
  if (!q) return <p className="text-muted">Đang tạo câu hỏi… (cần đã tải Từ điển)</p>
  const blank = q.b.text.replace(q.answer.surface, '＿＿')
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted">Chọn từ đúng cho chỗ trống · đúng {score.ok}/{score.all}</p>
      <p className="jp rounded-xl bg-surface-2 p-3 text-lg">{blank}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => {
          const state = chosen && (o === q.answer.surface ? 'border-good text-good' : o === chosen ? 'border-bad text-bad' : 'opacity-60')
          return (
            <button key={o} disabled={!!chosen} onClick={() => { setChosen(o); setScore((s) => ({ ok: s.ok + (o === q.answer.surface ? 1 : 0), all: s.all + 1 })) }}
              className={`jp min-h-11 rounded-xl border border-border px-3 text-base hover:bg-surface-2 ${state || ''}`}>{o}</button>
          )
        })}
      </div>
      {chosen && (
        <>
          <p className="text-xs text-muted">{q.answer.base} ({q.answer.reading}): {q.answer.meaning}</p>
          <Button className="min-h-9" onClick={() => { setChosen(undefined); next() }}>Câu tiếp →</Button>
        </>
      )}
    </div>
  )
}

function Dictation({ pool }: { pool: MangaBubble[] }) {
  const voice = useJaVoice()
  const [b, setB] = useState(() => pickRandom(pool))
  const [v, setV] = useState('')
  const [checked, setChecked] = useState(false)
  const target = strip(b.text)
  const mine = strip(v)
  const right = [...target].filter((c, i) => mine[i] === c).length
  return (
    <div className="grid gap-2">
      {!voice && <p className="text-xs text-bad">Máy chưa có giọng tiếng Nhật nên chưa nghe chép được.</p>}
      <div className="flex gap-2">
        <Button className="min-h-9" disabled={!voice} onClick={() => void speakJa(b.text, 0.9)}>🔊 Nghe</Button>
        <Button variant="soft" className="min-h-9" disabled={!voice} onClick={() => void speakJa(b.text, 0.6)}>🐢 Nghe chậm</Button>
      </div>
      <textarea rows={2} lang="ja" value={v} onChange={(e) => { setV(e.target.value); setChecked(false) }} placeholder="Gõ lại câu vừa nghe (kana hoặc kanji)"
        className="jp w-full rounded-xl border border-border bg-surface-2 p-2 text-base outline-none focus:border-primary" />
      {checked ? (
        <div className="grid gap-1">
          <p className="jp text-base">
            {[...target].map((c, i) => <span key={i} className={mine[i] === c ? 'text-good' : 'text-bad underline'}>{c}</span>)}
          </p>
          <p className="text-xs text-muted">Đúng {right}/{target.length} ký tự (kana khác kanji vẫn tính là sai).</p>
          <Button className="min-h-9" onClick={() => { setB(pickRandom(pool)); setV(''); setChecked(false) }}>Câu tiếp →</Button>
        </div>
      ) : (
        <Button className="min-h-9" disabled={!v.trim()} onClick={() => setChecked(true)}>Kiểm tra</Button>
      )}
    </div>
  )
}
