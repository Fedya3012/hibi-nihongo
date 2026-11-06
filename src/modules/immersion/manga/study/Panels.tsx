/**
 * CÁC BẢNG HỌC TRONG TRÌNH ĐỌC: danh sách bong bóng (nghe liên tục), từ & Kanji của chương,
 * đánh dấu trang, luyện tập (điền khuyết, nghe chép).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { getKanjiList, type KanjiData } from '@/modules/dictionary'
import { saveNote } from '../notes'
import { maskedPanel, cropPanel } from './mining'
import { speakJa, stopSpeaking, useJaVoice } from './audio'
import { downloadCsv, getLookupHistory, sourceLabel, wordsOf, type LookupEntry, type WordInfo } from './mining'
import { Small } from './BubbleCard'
import type { MangaBookmark, MangaBubble, MangaChapter, MangaPin, MangaSeries } from '../types'

// ---------- Bong bóng ----------

type BubbleFilter = { speaker?: string; mark?: 'good' | 'hard' | 'mined' }

export function BubblesTab({ bubbles: allBubbles, series, page, onOpen, onGo, rate }: {
  bubbles: MangaBubble[]
  series?: MangaSeries
  page: number
  onOpen: (b: MangaBubble) => void
  onGo: (page: number, highlight?: string) => void
  rate: number
}) {
  const voice = useJaVoice()
  const [playing, setPlaying] = useState(false)
  const [filter, setFilter] = useState<BubbleFilter>({})
  const stopRef = useRef(false)
  useEffect(() => () => { stopRef.current = true; stopSpeaking() }, [])
  // Lọc lời thoại theo nhân vật / đánh dấu
  const speakers = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of allBubbles) if (b.speaker) m.set(b.speaker, (m.get(b.speaker) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [allBubbles])
  const bubbles = allBubbles.filter((b) => (!filter.speaker || (filter.speaker === '?' ? !b.speaker : b.speaker === filter.speaker))
    && (!filter.mark || (filter.mark === 'mined' ? !!b.minedAt : b.mark === filter.mark)))
  const voiceOf = (b: MangaBubble) => series?.characters?.find((c) => c.name === b.speaker)?.voice ?? 'auto'

  const playFrom = async (startIdx: number) => {
    stopRef.current = false
    setPlaying(true)
    for (let i = startIdx; i < bubbles.length && !stopRef.current; i++) {
      onGo(bubbles[i].page, bubbles[i].id)
      await speakJa(bubbles[i].text, rate, voiceOf(bubbles[i]))
      await new Promise((r) => setTimeout(r, 500))
    }
    setPlaying(false)
    onGo(bubbles[Math.min(bubbles.length - 1, startIdx)]?.page ?? page)
  }

  if (!allBubbles.length) {
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
      <div className="flex flex-wrap gap-1" aria-label="Lọc lời thoại">
        <Small active={!filter.speaker && !filter.mark} onClick={() => setFilter({})}>Tất cả {allBubbles.length}</Small>
        {speakers.map(([name, n]) => (
          <Small key={name} active={filter.speaker === name} onClick={() => setFilter((f) => ({ ...f, speaker: f.speaker === name ? undefined : name }))}>{name} {n}</Small>
        ))}
        {speakers.length > 0 && <Small active={filter.speaker === '?'} onClick={() => setFilter((f) => ({ ...f, speaker: f.speaker === '?' ? undefined : '?' }))}>Chưa rõ ai nói</Small>}
        <Small active={filter.mark === 'good'} onClick={() => setFilter((f) => ({ ...f, mark: f.mark === 'good' ? undefined : 'good' }))}>⭐ Câu hay</Small>
        <Small active={filter.mark === 'hard'} onClick={() => setFilter((f) => ({ ...f, mark: f.mark === 'hard' ? undefined : 'hard' }))}>⚠ Câu khó</Small>
        <Small active={filter.mark === 'mined'} onClick={() => setFilter((f) => ({ ...f, mark: f.mark === 'mined' ? undefined : 'mined' }))}>★ Đã lưu</Small>
      </div>
      {!speakers.length && <p className="text-xs text-muted">Mẹo: điền "Nhân vật nói" khi sửa bong bóng để tách riêng lời thoại của từng nhân vật.</p>}
      {bubbles.length === 0 && <p className="text-muted">Không có câu nào khớp bộ lọc.</p>}
      {!voice && <p className="text-xs text-muted">Máy chưa có giọng tiếng Nhật. Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → 日本語.</p>}
      <ol className="grid gap-1">
        {bubbles.map((b) => (
          <li key={b.id}>
            <button onClick={() => onOpen(b)} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2 ${b.page === page ? 'bg-surface-2' : ''}`}>
              <span className="text-xs text-muted">Tr.{b.page + 1}{b.speaker ? ` · ${b.speaker}` : ''}{b.minedAt ? ' · ★' : ''}{b.mark === 'good' ? ' · ⭐' : b.mark === 'hard' ? ' · ⚠' : ''}</span>
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

export function MarksTab({ marks, pins, page, onGo, onToggle, onOpenPin }: {
  marks: MangaBookmark[]; pins: MangaPin[]; page: number; onGo: (p: number) => void; onToggle: () => void; onOpenPin: (p: MangaPin) => void
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
      <h3 className="mt-2 font-semibold">📌 Ghi chú ghim trên khung tranh</h3>
      {pins.length === 0 && <p className="text-muted">Bấm 📌 trên thanh công cụ rồi chạm vào khung tranh để ghim ghi chú ngay tại chỗ.</p>}
      <ul className="grid gap-1">
        {[...pins].sort((a, b) => a.page - b.page || a.y - b.y).map((p) => (
          <li key={p.id}>
            <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2" onClick={() => onOpenPin(p)}>
              <span className="text-xs text-muted">Trang {p.page + 1}</span>
              <span className="block truncate">{p.note || <i className="text-muted">(chưa ghi gì)</i>}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Sửa một ghi chú ghim (tự lưu). */
export function PinCard({ pin, onClose, onDelete }: { pin: MangaPin; onClose: () => void; onDelete: () => void }) {
  const [v, setV] = useState(pin.note)
  useEffect(() => setV(pin.note), [pin.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center">
        <span className="text-xs text-muted">📌 Ghi chú ghim · trang {pin.page + 1}</span>
        <div className="ml-auto"><Small onClick={onClose} title="Đóng">✕</Small></div>
      </div>
      <textarea autoFocus rows={4} value={v} placeholder="Ghi chú ngay trên khung tranh này: ý nghĩa cảnh, câu hay, chỗ chưa hiểu…"
        onChange={(e) => { setV(e.target.value); void saveNote({ ...pin, note: e.target.value }) }}
        className="w-full rounded-xl border border-border bg-surface-2 p-2 outline-none focus:border-primary" />
      <div className="flex justify-between">
        <Button variant="ghost" className="text-bad" onClick={onDelete}>Xóa ghim</Button>
        <Button onClick={onClose}>Xong</Button>
      </div>
      <p className="text-xs text-muted">Tự lưu. Ghi chú ghim cũng hiện trong Sổ tay của bộ truyện và tìm được ở ô tìm kiếm.</p>
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

export function PracticeTab({ bubbles, pageBlob }: { bubbles: MangaBubble[]; pageBlob?: (page: number) => Promise<Blob> }) {
  const [mode, setMode] = useState<'cloze' | 'dictation' | 'occlusion'>('cloze')
  const pool = useMemo(() => bubbles.filter((b) => strip(b.text).length >= 3), [bubbles])
  if (pool.length < 2) {
    return <p className="text-sm text-muted">Cần ít nhất 2 bong bóng có chữ trong chương để luyện tập.</p>
  }
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex gap-1">
        <Small active={mode === 'cloze'} onClick={() => setMode('cloze')}>Điền khuyết</Small>
        <Small active={mode === 'dictation'} onClick={() => setMode('dictation')}>Nghe chép</Small>
        {pageBlob && <Small active={mode === 'occlusion'} onClick={() => setMode('occlusion')}>Che chữ</Small>}
      </div>
      {mode === 'cloze' ? <Cloze pool={pool} /> : mode === 'dictation' ? <Dictation pool={pool} /> : pageBlob && <Occlusion pool={pool} pageBlob={pageBlob} />}
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

/** Che chữ (image occlusion): nhìn khung tranh đã che bong bóng, nhớ lại câu, rồi lật xem. */
function Occlusion({ pool, pageBlob }: { pool: MangaBubble[]; pageBlob: (page: number) => Promise<Blob> }) {
  const [shown, setShown] = useState(false)
  const [score, setScore] = useState({ ok: 0, all: 0 })
  const { q, next } = useRound(async () => {
    const b = pickRandom(pool)
    const page = await pageBlob(b.page).catch(() => null)
    if (!page) return null
    const [masked, full] = await Promise.all([maskedPanel(page, b.box), cropPanel(page, b.box)])
    if (!masked || !full) return null
    return { b, masked: URL.createObjectURL(masked), full: URL.createObjectURL(full) }
  })
  useEffect(() => () => { if (q) { URL.revokeObjectURL(q.masked); URL.revokeObjectURL(q.full) } }, [q])
  if (!q) return <p className="text-muted">Đang chuẩn bị ảnh…</p>
  const grade = (ok: boolean) => { setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), all: s.all + 1 })); setShown(false); next() }
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted">Bong bóng bị che nói gì? Nhớ trong đầu (hoặc nói to) rồi lật · nhớ được {score.ok}/{score.all}</p>
      <img src={shown ? q.full : q.masked} alt={shown ? 'Khung tranh gốc' : 'Khung tranh đã che bong bóng'} className="max-h-72 w-full rounded-xl border border-border object-contain" />
      {shown ? (
        <>
          <p className="jp rounded-xl bg-surface-2 p-3 text-lg">{q.b.text}</p>
          {q.b.translation && <p className="text-muted">“{q.b.translation}”</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" className="min-h-10" onClick={() => grade(false)}>Chưa nhớ</Button>
            <Button className="min-h-10" onClick={() => grade(true)}>Nhớ được</Button>
          </div>
        </>
      ) : (
        <Button className="min-h-10" onClick={() => setShown(true)}>Lật xem câu</Button>
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
