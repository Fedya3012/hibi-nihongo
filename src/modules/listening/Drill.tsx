/**
 * LUYỆN NGHE SỐ, GIỜ, NGÀY THÁNG: giọng máy đọc một số / giờ / ngày, bạn gõ lại bằng chữ số.
 * Câu hỏi tạo ngẫu nhiên trong lib/numbers.ts (app tự viết cách đọc nên luôn đúng biến âm).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { Chip, isReplayKey, ListenButtons, Row, StatLine, Tips } from './components'
import { dateQuestion, numberQuestion, timeQuestion, type DrillQ, type NumberLevel } from './lib/numbers'
import { speak, stopSpeech } from './lib/speech'
import { recordResult } from './lib/stats'

export type DrillKind = 'number' | 'time' | 'date'

const LEVELS: { id: NumberLevel; key: 'numSmall' | 'numMedium' | 'numLarge' | 'numPrice' | 'numCounter' }[] = [
  { id: 'small', key: 'numSmall' }, { id: 'medium', key: 'numMedium' }, { id: 'large', key: 'numLarge' },
  { id: 'price', key: 'numPrice' }, { id: 'counter', key: 'numCounter' },
]

export function Drill({ kind, canSpeak }: { kind: DrillKind; canSpeak: boolean }) {
  const t = useT(S)
  const [level, setLevel] = useState<NumberLevel>('small')
  const [ampm, setAmpm] = useState(false)
  const [weekday, setWeekday] = useState(false)
  const make = useCallback((prev?: string): DrillQ => {
    // Không ra lại đúng câu vừa làm
    for (let i = 0; i < 5; i++) {
      const q = kind === 'number' ? numberQuestion(level) : kind === 'time' ? timeQuestion(ampm) : dateQuestion(weekday)
      if (q.key !== prev) return q
    }
    return kind === 'number' ? numberQuestion(level) : kind === 'time' ? timeQuestion(ampm) : dateQuestion(weekday)
  }, [kind, level, ampm, weekday])

  const [q, setQ] = useState<DrillQ>(() => make())
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<string>()
  const [result, setResult] = useState<boolean>()
  const [score, setScore] = useState({ r: 0, n: 0 })
  const [started, setStarted] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const play = useCallback((rate = 1, item = q) => { setStarted(true); void speak(item.say, rate * 0.95) }, [q])

  // Đổi loại câu hỏi → làm câu mới (chưa tự đọc nếu bạn chưa bấm Nghe lần nào)
  useEffect(() => { setQ(make()); setText(''); setChoice(undefined); setResult(undefined) }, [make])
  useEffect(() => () => stopSpeech(), [])

  const check = () => {
    if (result !== undefined || !text.trim()) return
    const ok = q.check(text, choice)
    setResult(ok)
    setScore((s) => ({ r: s.r + (ok ? 1 : 0), n: s.n + 1 }))
    recordResult(kind, ok)
  }
  const next = () => {
    const n = make(q.key)
    setQ(n); setText(''); setChoice(undefined); setResult(undefined)
    if (started) play(1, n)
    input.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (isReplayKey(e)) { e.preventDefault(); play() }
    else if (e.key === 'Enter') { e.preventDefault(); if (result === undefined) check(); else next() }
  }

  const ph = kind === 'number' ? t('numPh') : kind === 'time' ? t('timePh') : t('datePh')
  const tips = kind === 'number' ? t('tipsNumber') : kind === 'time' ? t('tipsTime') : t('tipsDate')
  const needChoice = !!q.choices && !choice

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        {kind === 'number' && (
          <Row label={t('numLevel')}>
            {LEVELS.map((l) => <Chip key={l.id} on={level === l.id} onClick={() => setLevel(l.id)}>{t(l.key)}</Chip>)}
          </Row>
        )}
        {kind === 'time' && <Row label=""><Chip on={ampm} onClick={() => setAmpm(!ampm)}>{t('timeAmPm')}</Chip></Row>}
        {kind === 'date' && <Row label=""><Chip on={weekday} onClick={() => setWeekday(!weekday)}>{t('dateWeekday')}</Chip></Row>}
        <StatLine kind={kind} />
      </Card>

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ListenButtons onPlay={(r) => play(r)} disabled={!canSpeak} />
          {score.n > 0 && <span className="text-sm text-muted">{t('score', { r: score.r, n: score.n })}</span>}
        </div>

        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} readOnly={result !== undefined}
          inputMode={kind === 'number' ? 'numeric' : 'text'} placeholder={ph} aria-label={ph} autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-border bg-surface-2 px-3 text-lg outline-none focus:border-primary" />

        {q.choices && (
          <div className="grid gap-1.5">
            <span className="text-sm text-muted">{kind === 'date' ? t('weekdayPick') : t('counterPick')}</span>
            <div className="flex flex-wrap gap-1.5">
              {q.choices.map((c) => <Chip key={c} on={choice === c} onClick={() => result === undefined && setChoice(c)}><span className="jp text-base">{c}</span></Chip>)}
            </div>
          </div>
        )}

        {result === undefined ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={check} disabled={!text.trim() || needChoice}>{t('check')}</Button>
            <Button type="button" variant="ghost" onClick={() => { setResult(false); setScore((s) => ({ ...s, n: s.n + 1 })); recordResult(kind, false) }}>{t('skip')}</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className={`rounded-xl p-3 ${result ? 'bg-good/10' : 'bg-bad/10'}`}>
              <p className={`font-semibold ${result ? 'text-good' : 'text-bad'}`}>{result ? t('right') : t('wrong')}</p>
              <p className="mt-1 text-sm">{t('answer')} <span className="jp text-xl font-semibold">{q.jp}</span> <span className="text-muted">({q.shown})</span></p>
              <p className="jp mt-1 text-sm text-muted">{t('reading')} {q.say}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={next} autoFocus>{t('next')}</Button>
              <Button type="button" variant="soft" onClick={() => play(0.7)} disabled={!canSpeak}>🐢 {t('slow')}</Button>
            </div>
          </div>
        )}
        <p className="text-xs text-muted">{t('keys')}</p>
      </Card>

      <Tips text={tips} />
    </div>
  )
}
