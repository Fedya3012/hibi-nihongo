/**
 * MÀN HÌNH ÔN TẬP (một buổi ôn)
 * - Lật thẻ: bấm vào thẻ, hoặc phím Space.
 * - Chấm: 4 nút Quên/Khó/Được/Dễ, phím 1–4, hoặc vuốt (trái = Quên, phải = Được, lên = Dễ, xuống = Khó).
 * - Hoàn tác: nút ↶, phím Z hoặc Ctrl+Z (hoàn tác cả chấm, chôn, tạm ẩn).
 * - Chôn đến mai: phím B · Tạm ẩn thẻ: phím S · Nghe đọc: phím R. Trên cảm ứng: nhấn giữ thẻ để mở menu.
 * - Các phím trên là mặc định, đổi được ở trang Phím tắt (/shortcuts).
 * - Ôn nhanh: đếm ngược 5 phút, hết giờ thì dừng sau thẻ đang làm.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useSettings } from '@/core/settings'
import { formatInterval, schedule } from './fsrs'
import { readingMatches, romajiToHiragana } from './kana'
import { choiceOptions, clozeAnswers, pickQuestion, QUESTION_LABEL } from './queue'
import {
  buryCard, rateCard, restoreSnapshot, setSuspended, undoRating, type CardSnapshot, type UndoEntry,
} from './store'
import { hasMedia, useCardMedia } from './media'
import { AnswerDetails, Example, Front, frontSize, kindLabel, playCardAudio, speakJa } from './CardFace'
import type { QuestionType, Rating, ReviewSettings, SrsCard } from './types'
import { actionFor, comboOf, formatCombo, hasModifier, keysFor, useKeymap } from '@/modules/shortcuts/keymap'

const LEARN_AHEAD = 20 * 60_000 // thẻ hẹn lại trong vòng 20 phút sẽ quay lại ngay trong buổi này
const QUICK_MS = 5 * 60_000

interface Current {
  card: SrsCard
  question: QuestionType
  options?: string[] // trắc nghiệm
  shownAt: number
}

interface Snapshot {
  queue: SrsCard[]
  pending: SrsCard[]
  current: Current
  done: number
  again: number
}

/** Một bước có thể hoàn tác: chấm thẻ, hoặc đổi trạng thái (chôn / tạm ẩn). */
type UndoItem =
  | { type: 'rate'; entry: UndoEntry; snap: Snapshot }
  | { type: 'state'; before: CardSnapshot; snap: Snapshot }

const RATINGS: { g: Rating; label: string; key: string; cls: string }[] = [
  { g: 1, label: 'Quên', key: '1', cls: 'bg-bad/15 text-bad ring-bad' },
  { g: 2, label: 'Khó', key: '2', cls: 'bg-warn/15 text-warn ring-warn' },
  { g: 3, label: 'Được', key: '3', cls: 'bg-good/15 text-good ring-good' },
  { g: 4, label: 'Dễ', key: '4', cls: 'bg-primary/15 text-primary ring-primary' },
]

/** Hành động phím tắt → mức chấm. */
const RATING_OF: Record<string, Rating> = { 'review.again': 1, 'review.hard': 2, 'review.good': 3, 'review.easy': 4 }

/** Dòng gợi ý phím tắt dưới thẻ, theo phím người dùng đã đặt. */
function KeyHint() {
  const custom = useKeymap((s) => s.custom)
  const k = (id: string) => { const c = keysFor(id, custom)[0]; return c ? formatCombo(c) : '—' }
  const items: [string, string][] = [
    [k('review.reveal'), 'lật thẻ / chọn gợi ý'],
    [[k('review.again'), k('review.hard'), k('review.good'), k('review.easy')].join(' '), 'chấm'],
    [k('review.undo'), 'hoàn tác'], [k('review.bury'), 'chôn'], [k('review.suspend'), 'ẩn'],
    [k('review.replay'), 'nghe'], [k('review.exit'), 'thoát'],
  ]
  return (
    <p className="hidden text-center text-xs text-muted md:block">
      Phím tắt: {items.map(([key, what]) => `${key} ${what}`).join(' · ')}
      {' · '}<a href="#/shortcuts" className="underline hover:text-text">đổi phím</a>
    </p>
  )
}

/** Chọn thẻ kế tiếp: thẻ đang học đã đến giờ → thẻ trong hàng đợi → thẻ đang học sớm nhất. */
function takeNext(queue: SrsCard[], pending: SrsCard[], now: number) {
  const p = [...pending].sort((a, b) => a.due - b.due)
  if (p.length && p[0].due <= now) return { card: p[0], queue, pending: p.slice(1) }
  if (queue.length) return { card: queue[0], queue: queue.slice(1), pending: p }
  if (p.length) return { card: p[0], queue, pending: p.slice(1) }
  return null
}

export function Session({
  initial, pool, settings, quick, onExit,
}: { initial: SrsCard[]; pool: SrsCard[]; settings: ReviewSettings; quick: boolean; onExit: () => void }) {
  const haptics = useSettings((s) => s.haptics)
  const makeCurrent = useCallback(
    (card: SrsCard): Current => {
      const question = pickQuestion(card, settings.questionMode, pool)
      return { card, question, options: question === 'choice' ? choiceOptions(card, pool) : undefined, shownAt: Date.now() }
    },
    [pool, settings.questionMode],
  )

  const [queue, setQueue] = useState<SrsCard[]>(() => initial.slice(1))
  const [pending, setPending] = useState<SrsCard[]>([])
  const [current, setCurrent] = useState<Current | null>(() => (initial[0] ? makeCurrent(initial[0]) : null))
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null) // null = tự chấm
  const [done, setDone] = useState(0)
  const [again, setAgain] = useState(0)
  const [busy, setBusy] = useState(false)
  const [undoStack, setUndoStack] = useState<UndoItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [menu, setMenu] = useState(false) // menu nhấn giữ (cảm ứng)
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [timeUp, setTimeUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ảnh/tiếng của thẻ nằm ở bảng riêng (media.ts): đọc khi thẻ hiện lên
  const shown = useCardMedia(current?.card)

  // Đồng hồ cho chế độ ôn nhanh
  useEffect(() => {
    if (!quick) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [quick])
  const remainingMs = quick ? Math.max(0, startedAt + QUICK_MS - now) : 0
  useEffect(() => {
    if (quick && remainingMs === 0) setTimeUp(true)
  }, [quick, remainingMs])

  const resetAnswer = () => {
    setRevealed(false)
    setTyped('')
    setPicked(null)
    setCorrect(null)
  }

  const vibrate = (ms: number) => {
    if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
  }

  /** Lật thẻ. Với câu hỏi có đáp án gõ/chọn thì chấm đúng sai luôn. */
  const reveal = useCallback(
    (choice?: string) => {
      if (!current || revealed) return
      const { card, question } = current
      let ok: boolean | null = null
      if (question === 'choice' && choice !== undefined) {
        setPicked(choice)
        ok = choice === card.meaning
      } else if (question === 'typing' && typed.trim()) {
        ok = readingMatches(typed, card.reading ?? '')
      } else if (question === 'cloze' && typed.trim() && card.example) {
        const t = romajiToHiragana(typed).replace(/\s/g, '')
        ok = t === clozeAnswers(card.example).join('') || readingMatches(typed, clozeAnswers(card.example).join(''))
      }
      setCorrect(ok)
      if (ok === false) vibrate(30)
      setRevealed(true)
    },
    [current, revealed, typed],
  )

  /** Chấm thẻ, lưu, rồi chuyển thẻ kế tiếp. */
  const rate = useCallback(
    async (g: Rating) => {
      if (!current || !revealed || busy) return
      setBusy(true)
      vibrate(10)
      try {
        const snap: Snapshot = { queue, pending, current, done, again }
        const { card: updated, undo, leech } = await rateCard(current.card, g, {
          settings, durationMs: Date.now() - current.shownAt, question: current.question,
        })
        const t = Date.now()
        const keep = !updated.suspended && updated.due - t <= LEARN_AHEAD
        const nextPending = keep ? [...pending, updated] : pending
        setUndoStack((s) => [...s.slice(-19), { type: 'rate', entry: undo, snap }])
        setNotice(leech
          ? `“${current.card.front}” bị quên ${updated.lapses} lần nên được đánh dấu “khó nhớ”${updated.suspended ? ' và tạm ẩn' : ''}. Thử sửa thẻ: thêm mẹo nhớ, ảnh hoặc câu ví dụ.`
          : null)
        setDone((d) => d + 1)
        if (g === 1) setAgain((a) => a + 1)
        resetAnswer()
        const stop = quick && t >= startedAt + QUICK_MS
        const next = stop ? null : takeNext(queue, nextPending, t)
        setQueue(next ? next.queue : queue)
        setPending(next ? next.pending : nextPending)
        setCurrent(next ? makeCurrent(next.card) : null)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [current, revealed, busy, queue, pending, done, again, settings, quick, startedAt, makeCurrent],
  )

  /**
   * Chôn (đến mai) hoặc tạm ẩn thẻ đang hỏi: thẻ rời buổi ôn, chuyển sang thẻ kế.
   * Hoàn tác được như lần chấm.
   */
  const putAway = useCallback(
    async (how: 'bury' | 'suspend') => {
      if (!current || busy) return
      setBusy(true)
      setMenu(false)
      try {
        const snap: Snapshot = { queue, pending, current, done, again }
        const before = how === 'bury' ? await buryCard(current.card.id) : await setSuspended(current.card.id, true)
        if (before) setUndoStack((s) => [...s.slice(-19), { type: 'state', before, snap }])
        setNotice(how === 'bury' ? `Đã chôn “${current.card.front}” đến ngày mai.` : `Đã tạm ẩn “${current.card.front}”. Bỏ ẩn trong tab Thẻ.`)
        resetAnswer()
        const next = takeNext(queue, pending, Date.now())
        setQueue(next ? next.queue : queue)
        setPending(next ? next.pending : pending)
        setCurrent(next ? makeCurrent(next.card) : null)
      } finally {
        setBusy(false)
      }
    },
    [current, busy, queue, pending, done, again, makeCurrent],
  )

  /** Hoàn tác thao tác gần nhất (chấm, chôn, tạm ẩn): thẻ trở lại như cũ, hiện lại câu hỏi. */
  const undo = useCallback(async () => {
    const last = undoStack[undoStack.length - 1]
    if (!last || busy) return
    setBusy(true)
    try {
      if (last.type === 'rate') await undoRating(last.entry)
      else await restoreSnapshot(last.before)
      setNotice(null)
      setUndoStack((s) => s.slice(0, -1))
      setQueue(last.snap.queue)
      setPending(last.snap.pending)
      setCurrent({ ...last.snap.current, shownAt: Date.now() })
      setDone(last.snap.done)
      setAgain(last.snap.again)
      setTimeUp(false)
      resetAnswer()
    } finally {
      setBusy(false)
    }
  }, [undoStack, busy])

  // Phím tắt
  const suggested: Rating = correct === false ? 1 : 3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Phím đổi được ở trang Phím tắt (src/modules/shortcuts/keymap.ts, nhóm "review")
      const inInput = (e.target as HTMLElement | null)?.tagName === 'INPUT'
      const combo = comboOf(e)
      const id = actionFor(e, 'review')
      if (id === 'review.undo' && (hasModifier(combo) || !inInput)) {
        e.preventDefault()
        void undo()
        return
      }
      if (id === 'review.exit') { if (menu) setMenu(false); else onExit(); return }
      if (inInput) return // trong ô gõ: Enter do form tự xử lý
      if (id === 'review.bury') { void putAway('bury'); return }
      if (id === 'review.suspend') { void putAway('suspend'); return }
      if (id === 'review.replay' && current && revealed && shown?.audio) { playCardAudio(shown.audio); return }
      if (id === 'review.replay' && current) { speakJa(revealed && current.card.example && current.question === 'cloze' ? current.card.example : current.card.front); return }
      if (!revealed) {
        if (id === 'review.reveal') { e.preventDefault(); reveal(); return }
        // Trắc nghiệm: chọn đáp án bằng phím 1–4 (cố định)
        if (current?.question === 'choice' && current.options && /^[1-4]$/.test(combo)) {
          reveal(current.options[Number(combo) - 1])
        }
        return
      }
      if (id === 'review.reveal') { e.preventDefault(); void rate(suggested); return }
      const rating = RATING_OF[id ?? '']
      if (rating) { e.preventDefault(); void rate(rating) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, reveal, rate, undo, onExit, current, shown, suggested, putAway, menu])

  // Vuốt thẻ
  const drag = useRef<{ x: number; y: number; id: number; long: boolean } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const cancelPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null }
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, long: false }
    // Nhấn giữ 0,5 giây → mở menu Chôn / Tạm ẩn
    cancelPress()
    pressTimer.current = setTimeout(() => {
      if (drag.current) drag.current.long = true
      vibrate(15)
      setMenu(true)
    }, 500)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelPress()
    if (revealed) setOffset({ x: dx, y: dy })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    cancelPress()
    const d = drag.current
    drag.current = null
    if (!d || d.long) { setOffset({ x: 0, y: 0 }); return }
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    setOffset({ x: 0, y: 0 })
    const far = 80
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // chạm nhẹ = lật thẻ (chỉ với câu hỏi tự chấm)
      if (!revealed && current && (current.question === 'recognize' || current.question === 'recall')) reveal()
      return
    }
    if (!revealed) return
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > far) void rate(3)
      else if (dx < -far) void rate(1)
    } else {
      if (dy < -far) void rate(4)
      else if (dy > far) void rate(2)
    }
  }
  const swipeHint =
    offset.x > 40 ? 'Được' : offset.x < -40 ? 'Quên' : offset.y < -40 ? 'Dễ' : offset.y > 40 ? 'Khó' : null

  const previews = useMemo(() => {
    if (!current) return null
    const t = Date.now()
    return RATINGS.map((r) => formatInterval(schedule(current.card, r.g, t, settings, current.card.id).due - t))
  }, [current, settings])

  const left = queue.length + pending.length + (current ? 1 : 0)
  const mmss = `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}`

  // ----- Hết thẻ hoặc hết giờ -----
  if (!current) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    const pct = done ? Math.round(((done - again) / done) * 100) : 0
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="jp text-5xl text-primary">{quick && timeUp ? '時' : '完'}</p>
        <h2 className="mt-3 text-xl font-bold">
          {done === 0 ? 'Không có thẻ nào cần ôn' : quick && timeUp ? 'Hết 5 phút, giỏi lắm!' : 'Xong buổi ôn!'}
        </h2>
        {done > 0 && (
          <p className="mt-2 text-muted">
            Bạn đã ôn <b className="text-text">{done}</b> lượt trong khoảng {minutes} phút, nhớ đúng {pct}%.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {undoStack.length > 0 && <Button variant="ghost" onClick={() => void undo()}>↶ Hoàn tác thẻ cuối</Button>}
          <Button onClick={onExit}>Về trang Ôn tập</Button>
        </div>
      </Card>
    )
  }

  const { question } = current
  const card = shown ?? current.card
  const selfGraded = question === 'recognize' || question === 'recall'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Thanh trên: số thẻ còn lại, đồng hồ, hoàn tác, thoát */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" onClick={onExit} aria-label="Thoát buổi ôn">✕</Button>
        <span className="text-muted">
          Còn <b className="text-text">{left}</b> thẻ · đã ôn {done}
        </span>
        {quick && (
          <span className={`ml-2 rounded-lg px-2 py-1 font-mono ${timeUp ? 'bg-warn/15 text-warn' : 'bg-surface-2'}`}>
            ⏱ {timeUp ? 'hết giờ' : mmss}
          </span>
        )}
        <div className="ml-auto flex">
          <Button variant="ghost" className="px-2" disabled={busy} onClick={() => void putAway('bury')} title="Chôn đến mai (B)">
            <span aria-hidden>⏭</span><span className="hidden sm:inline">Chôn</span>
            <span className="sr-only sm:hidden">Chôn đến mai</span>
          </Button>
          <Button variant="ghost" className="px-2" disabled={busy} onClick={() => void putAway('suspend')} title="Tạm ẩn thẻ (S)">
            <span aria-hidden>⊘</span><span className="hidden sm:inline">Ẩn</span>
            <span className="sr-only sm:hidden">Tạm ẩn thẻ</span>
          </Button>
          <Button variant="ghost" className="px-2" disabled={!undoStack.length || busy} onClick={() => void undo()}
            title="Hoàn tác (Z)">↶ <span className="hidden sm:inline">Hoàn tác</span><span className="sr-only sm:hidden">Hoàn tác</span></Button>
        </div>
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-surface-2 px-4 py-2 text-sm">
          {notice}{' '}
          {undoStack.length > 0 && <button className="font-semibold text-primary" onClick={() => void undo()}>Hoàn tác</button>}
        </p>
      )}

      <Card
        className="relative min-h-80 touch-none select-none overflow-hidden transition-transform"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 30}deg)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { cancelPress(); drag.current = null; setOffset({ x: 0, y: 0 }) }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="mb-4 flex justify-between gap-2 text-xs text-muted">
          <span>{kindLabel(card.kind)} · {card.deck}{card.tags?.includes('leech') && <span className="ml-1 text-bad">· khó nhớ</span>}</span>
          <span>{QUESTION_LABEL[question]}</span>
        </div>
        {menu && (
          <div className="absolute inset-x-4 top-10 z-10 grid gap-2 rounded-xl border border-border bg-surface p-3 shadow-card">
            <Button variant="soft" onClick={() => void putAway('bury')}>Chôn đến mai</Button>
            <Button variant="soft" onClick={() => void putAway('suspend')}>Tạm ẩn thẻ này</Button>
            <Button variant="ghost" onClick={() => setMenu(false)}>Đóng</Button>
          </div>
        )}
        {swipeHint && (
          <div className="pointer-events-none absolute inset-x-0 top-10 text-center text-lg font-bold text-primary">{swipeHint}</div>
        )}

        {/* ----- Câu hỏi ----- */}
        {!revealed && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            {question === 'recognize' && hasMedia(card, 'frontImage') && (
              <>
                {card.frontImage
                  ? <img src={card.frontImage} alt="Ảnh câu hỏi: đoán phần bị che" className="max-h-64 rounded-xl border border-border object-contain md:max-h-80" />
                  : <div className="grid h-48 w-full max-w-sm place-items-center rounded-xl border border-border text-sm text-muted">Đang tải ảnh…</div>}
                <p className="text-sm text-muted">Phần bị che nói gì? Nghĩ trong đầu rồi chạm vào thẻ hoặc bấm Space.</p>
              </>
            )}
            {question === 'recognize' && !hasMedia(card, 'frontImage') && (
              <>
                <Front card={card} withReading={false} className={`${frontSize(card.front)} font-semibold`} />
                <p className="text-sm text-muted">Nghĩa là gì? Chạm vào thẻ hoặc bấm Space để xem đáp án.</p>
              </>
            )}
            {question === 'recall' && (
              <>
                <p className="whitespace-pre-line text-2xl font-medium">{card.meaning}</p>
                <p className="text-sm text-muted">
                  Viết bằng tiếng Nhật thế nào? {card.kind === 'grammar' ? '(mẫu ngữ pháp)' : ''} Nghĩ trong đầu rồi lật thẻ.
                </p>
              </>
            )}
            {question === 'choice' && current.options && (
              <>
                <Front card={card} withReading={false} className={`${frontSize(card.front)} font-semibold`} />
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {current.options.map((o, i) => (
                    <button key={o} onClick={() => reveal(o)}
                      className="min-h-12 rounded-xl border border-border bg-surface-2 px-3 py-2 text-left transition hover:border-primary">
                      <span className="mr-2 text-xs text-muted">{i + 1}</span>{o}
                    </button>
                  ))}
                </div>
              </>
            )}
            {(question === 'typing' || question === 'cloze') && (
              <>
                {question === 'typing' ? (
                  <Front card={card} withReading={false} className={`${frontSize(card.front)} font-semibold`} />
                ) : (
                  <div>
                    <p className="text-2xl"><Example text={card.example ?? ''} blank /></p>
                    <p className="mt-2 text-sm text-muted">
                      {card.exampleMeaning ? `“${card.exampleMeaning}”` : card.meaning}
                    </p>
                  </div>
                )}
                <form className="flex w-full max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); reveal() }}>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={question === 'typing' ? 'Gõ cách đọc (vd: taberu)' : 'Điền vào chỗ trống'}
                    aria-label="Câu trả lời"
                    lang="ja"
                    className="jp min-h-11 flex-1 rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary"
                  />
                  <Button type="submit">Kiểm tra</Button>
                </form>
                {typed && /[a-z]/i.test(typed) && (
                  <p className="jp text-muted">→ {romajiToHiragana(typed)}</p>
                )}
                <p className="text-xs text-muted">Không nhớ? Để trống và bấm Kiểm tra để xem đáp án.</p>
              </>
            )}
          </div>
        )}

        {/* ----- Đáp án ----- */}
        {revealed && (
          <div className="flex min-h-56 flex-col justify-center gap-4">
            {correct !== null && (
              <p className={`text-center font-semibold ${correct ? 'text-good' : 'text-bad'}`}>
                {correct ? '✓ Chính xác!' : `✗ Chưa đúng${picked ? `: bạn chọn “${picked}”` : typed ? `: bạn gõ “${typed}”` : ''}`}
              </p>
            )}
            <AnswerDetails card={card} />
          </div>
        )}
      </Card>

      {error && <p className="text-center text-sm text-bad">Lỗi khi lưu: {error}</p>}

      {/* ----- Nút chấm ----- */}
      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r, i) => (
            <button
              key={r.g}
              disabled={busy}
              onClick={() => void rate(r.g)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 font-semibold transition hover:opacity-85 disabled:opacity-50 ${r.cls} ${
                !selfGraded && r.g === suggested ? 'ring-2' : ''
              }`}
            >
              <span>{r.label}</span>
              <span className="text-xs font-normal opacity-80">{previews?.[i]}</span>
            </button>
          ))}
        </div>
      ) : selfGraded ? (
        <Button className="min-h-14 text-lg" onClick={() => reveal()}>Xem đáp án</Button>
      ) : null}

      <KeyHint />
      <p className="text-center text-xs text-muted md:hidden">
        Vuốt sau khi lật: ← Quên · → Được · ↑ Dễ · ↓ Khó · Nhấn giữ thẻ: Chôn / Ẩn
      </p>
    </div>
  )
}
