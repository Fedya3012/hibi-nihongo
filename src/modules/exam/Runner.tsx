/**
 * ĐANG THI: từng buổi có đồng hồ đếm ngược riêng, hết giờ tự nộp. Chọn/đổi đáp án tự do trong buổi,
 * đánh dấu câu để xem lại, lưới câu hỏi để nhảy nhanh. Giữa hai buổi có màn hình nghỉ (đồng hồ dừng).
 * Bài được lưu liên tục (kv "exam:current"): đóng app rồi mở lại vẫn làm tiếp với thời gian còn lại.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { speak, useJapaneseVoice } from '@/modules/kana/speech'
import { PART_JP } from './data/format'
import { saveCurrent } from './lib/store'
import { PART_VI, S } from './strings'
import type { ExamQuestion, ExamSession, PartId } from './types'

const fmt = (sec: number) => {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(r).padStart(2, '0')
}

export function Runner({ initial, onFinish, onQuit }: { initial: ExamSession; onFinish: (s: ExamSession) => void; onQuit: () => void }) {
  const t = useT(S)
  const tp = useT(PART_VI)
  const [s, setS] = useState(initial)
  const [qIx, setQIx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const latest = useRef(s)
  latest.current = s
  const finishing = useRef(false)

  const sec = s.sections[s.current]
  const q = sec?.questions[qIx]

  // Lưu khi trả lời / đánh dấu / chuyển buổi; đồng hồ thì lưu 10 giây một lần (trong tick bên dưới)
  useEffect(() => { if (!finishing.current) saveCurrent(s).catch(() => {}) }, [s.answers, s.flags, s.current, s.onBreak]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (!finishing.current) saveCurrent(latest.current).catch(() => {}) }, [])

  const submit = useCallback(() => {
    const cur = latest.current
    setConfirm(false)
    setQIx(0)
    if (cur.current + 1 < cur.sections.length) {
      const next = cur.current + 1
      setS({ ...cur, current: next, left: cur.sections[next].seconds, onBreak: true })
    } else {
      finishing.current = true
      onFinish(cur)
    }
  }, [onFinish])

  // Đồng hồ
  const running = !paused && !s.onBreak
  useEffect(() => {
    if (!running) return
    let ticks = 0
    const id = window.setInterval(() => {
      const cur = latest.current
      const used = [...cur.used]
      used[cur.current] = (used[cur.current] ?? 0) + 1
      const next = { ...cur, left: cur.left - 1, used }
      latest.current = next
      setS(next)
      if (++ticks % 10 === 0) saveCurrent(next).catch(() => {})
      if (next.left <= 0) submit()
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, s.current, submit])

  const choose = useCallback((i: number) => {
    setS((cur) => {
      const answers = cur.answers.map((a) => [...a])
      answers[cur.current][qIx] = i
      return { ...cur, answers }
    })
  }, [qIx])
  const toggleFlag = useCallback(() => {
    setS((cur) => {
      const flags = cur.flags.map((a) => [...a])
      flags[cur.current][qIx] = !flags[cur.current][qIx]
      return { ...cur, flags }
    })
  }, [qIx])

  // Phím tắt
  useEffect(() => {
    if (!running || !q) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) { choose(Number(e.key) - 1); e.preventDefault() }
      else if (e.key === 'ArrowRight') setQIx((i) => Math.min(sec.questions.length - 1, i + 1))
      else if (e.key === 'ArrowLeft') setQIx((i) => Math.max(0, i - 1))
      else if (e.key === 'f' || e.key === 'F') toggleFlag()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, q, sec, choose, toggleFlag])

  if (!sec) return null

  if (s.onBreak) {
    const prev = s.sections[s.current - 1]
    return (
      <Card className="mx-auto grid max-w-2xl gap-4 text-center">
        <h2 className="text-xl font-bold">{t('breakTitle', { name: '' })}<span lang="ja" className="jp">{prev?.title}</span></h2>
        <p className="text-muted">{t('breakHint', { next: sec.title, min: Math.round(sec.seconds / 60) })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => setS({ ...s, onBreak: false })}>{t('nextSection')}</Button>
          <Button variant="ghost" onClick={onQuit}>{t('quit')}</Button>
        </div>
      </Card>
    )
  }

  const answers = s.answers[s.current]
  const flags = s.flags[s.current]
  const unanswered = answers.filter((a) => a === null).length
  const low = s.left <= 5 * 60
  // Số thứ tự "問題" của dạng câu trong buổi này (theo thứ tự xuất hiện)
  const partsOrder = [...new Set(sec.questions.map((x) => x.part))]
  const mondai = partsOrder.indexOf(q.part) + 1
  const shortParts = Object.keys(s.short ?? {}) as PartId[]

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {/* Thanh trên: buổi, đồng hồ */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2 shadow-card">
        <span className="font-semibold">N{s.level}</span>
        <span className="text-sm text-muted">{t('section', { i: s.current + 1, n: s.sections.length })} · <span lang="ja" className="jp">{sec.title}</span></span>
        <span className="ml-auto flex items-center gap-2">
          <span className="sr-only">{t('timeLeft')}</span>
          <span role="timer" className={`font-mono text-lg font-semibold tabular-nums ${low ? 'text-bad' : ''}`}>{fmt(s.left)}</span>
          <Button variant="ghost" className="min-h-9" onClick={() => setPaused(true)}>{t('pause')}</Button>
        </span>
      </div>

      {paused ? (
        <Card className="grid gap-4 text-center">
          <p>{t('paused')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPaused(false)}>{t('continue')}</Button>
            <Button variant="ghost" onClick={() => { saveCurrent(latest.current).catch(() => {}); onQuit() }}>{t('quit')}</Button>
          </div>
        </Card>
      ) : (
        <>
          <QuestionCard key={q.id} q={q} mondai={mondai} index={qIx} count={sec.questions.length}
            chosen={answers[qIx]} flagged={flags[qIx]} onChoose={choose} onFlag={toggleFlag} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" disabled={qIx === 0} onClick={() => setQIx(qIx - 1)}>{t('prev')}</Button>
            {qIx + 1 < sec.questions.length
              ? <Button variant="soft" onClick={() => setQIx(qIx + 1)}>{t('next')}</Button>
              : <Button onClick={() => (unanswered && !confirm ? setConfirm(true) : submit())}>{confirm ? t('submitConfirm', { n: unanswered }) : t('submitSection')}</Button>}
          </div>

          {/* Lưới câu hỏi */}
          <Card className="grid gap-3 p-4">
            <div className="flex flex-wrap gap-1.5" role="list">
              {sec.questions.map((x, i) => (
                <button key={x.id} role="listitem" onClick={() => setQIx(i)}
                  aria-label={`${t('qNum', { i: i + 1, n: sec.questions.length })}${flags[i] ? ` · ${t('flagged')}` : ''}`}
                  aria-current={i === qIx ? 'true' : undefined}
                  className={`relative grid size-9 place-items-center rounded-lg text-sm tabular-nums transition ${
                    i === qIx ? 'ring-2 ring-primary' : ''} ${answers[i] !== null ? 'bg-primary-soft font-semibold' : 'bg-surface-2 text-muted'}`}>
                  {i + 1}
                  {flags[i] && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-warn" />}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{t('keyHint')}</p>
              <Button variant={confirm ? 'primary' : 'ghost'} className="min-h-9"
                onClick={() => (unanswered && !confirm ? setConfirm(true) : submit())}>
                {confirm ? t('submitConfirm', { n: unanswered }) : t('submitSection')}
              </Button>
            </div>
            {shortParts.length > 0 && s.current === 0 && qIx === 0 && (
              <p className="text-xs text-muted">{t('shortNote', { parts: shortParts.map((p) => `${tp(p)} (−${s.short![p]})`).join(', ') })}</p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

/** Một câu hỏi: đề bài của dạng câu, câu hỏi (có gạch chân), nút nghe, 4 đáp án. */
export function QuestionCard({ q, mondai, index, count, chosen, flagged, onChoose, onFlag }: {
  q: ExamQuestion; mondai: number; index: number; count: number; chosen: number | null; flagged: boolean
  onChoose: (i: number) => void; onFlag: () => void
}) {
  const t = useT(S)
  const tp = useT(PART_VI)
  const voice = useJapaneseVoice()
  const canSpeak = voice.supported && voice.ready
  const [plays, setPlays] = useState(0)

  // Bài nghe tự phát một lần khi mở câu (giống đề thật)
  useEffect(() => {
    if (!q.audio || !canSpeak) return
    const id = window.setTimeout(() => { speak(q.audio!, { force: true, rate: 0.9 }); setPlays(1) }, 300)
    return () => window.clearTimeout(id)
  }, [q.audio, canSpeak])

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">問題{mondai} · {tp(q.part)}</p>
          <p lang="ja" className="jp text-sm text-muted">{PART_JP[q.part]}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t('qNum', { i: index + 1, n: count })}</span>
          <Button variant={flagged ? 'soft' : 'ghost'} className="min-h-9" aria-pressed={flagged} onClick={onFlag}>
            {flagged ? '⚑ ' + t('flagged') : '⚐ ' + t('flag')}
          </Button>
        </div>
      </div>

      {q.audio && (
        <div className="flex flex-wrap items-center gap-3">
          {canSpeak ? (
            <Button variant="soft" onClick={() => { speak(q.audio!, { force: true, rate: 0.9 }); setPlays((n) => n + 1) }}>
              {plays ? t('replay') : t('play')}
            </Button>
          ) : (
            <>
              <p className="w-full text-sm text-warn">{t('noVoice')}</p>
              <p lang="ja" className="jp text-2xl">{q.audio}</p>
            </>
          )}
        </div>
      )}

      {q.stem && <Stem q={q} />}

      <div role="radiogroup" aria-label={t('qNum', { i: index + 1, n: count })} className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <button key={i} role="radio" aria-checked={chosen === i} onClick={() => onChoose(i)}
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2 text-left transition ${
              chosen === i ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary'}`}>
            <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${chosen === i ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted'}`}>{i + 1}</span>
            <span lang={q.optionsJp ? 'ja' : undefined} className={q.optionsJp ? 'jp text-lg' : ''}>{o}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/** Câu hỏi tiếng Nhật, gạch chân đoạn `mark` (không có furigana: đây là bài thi). */
export function Stem({ q, className = '' }: { q: ExamQuestion; className?: string }) {
  const big = [...q.stem].length <= 8
  const cls = `jp leading-relaxed ${big ? 'text-center text-3xl' : 'text-xl'} ${className}`
  if (!q.mark) return <p lang="ja" className={cls}>{q.stem}</p>
  const [a, b] = q.mark
  return (
    <p lang="ja" className={cls}>
      {q.stem.slice(0, a)}
      <span className="underline decoration-2 underline-offset-[6px]">{q.stem.slice(a, b)}</span>
      {q.stem.slice(b)}
    </p>
  )
}
