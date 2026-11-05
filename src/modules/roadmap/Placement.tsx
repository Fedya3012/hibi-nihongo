/**
 * BÀI KIỂM TRA XẾP LỚP
 * Làm lần lượt từng phần: Kana → N5 → N4 → N3 → N2, mỗi phần PER_LEVEL câu lấy ngẫu nhiên.
 * Đúng ≥ PASS_RIGHT câu thì sang phần khó hơn; chưa đạt thì dừng, chặng bắt đầu = phần đó.
 * Qua hết cả N2 → bắt đầu từ N1.
 * Trong lúc làm không báo đúng/sai (cho nhanh); xem lại câu sai ở màn hình kết quả.
 */
import { useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useT } from '@/core/i18n'
import { PER_LEVEL, PASS_RIGHT, QUESTIONS, TEST_LEVELS, type PlacementQuestion } from './data/placement'
import { LEVEL_LABEL } from './data/levels'
import { S } from './strings'
import type { LevelId, PlacementResult } from './types'

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

interface Asked { q: PlacementQuestion; options: string[] }
interface Answer { q: PlacementQuestion; chosen: string | null; ok: boolean }

/** Lấy ngẫu nhiên các câu của một phần, xáo thứ tự đáp án. */
function pick(level: LevelId): Asked[] {
  return shuffle(QUESTIONS.filter((q) => q.level === level))
    .slice(0, PER_LEVEL)
    .map((q) => ({ q, options: shuffle(q.choices) }))
}

export function Placement({ onApply, onCancel }: { onApply: (r: PlacementResult) => void; onCancel: () => void }) {
  const t = useT(S)
  const [phase, setPhase] = useState<'intro' | 'test' | 'result'>('intro')
  const [levelIx, setLevelIx] = useState(0)
  const [asked, setAsked] = useState<Asked[]>(() => pick(TEST_LEVELS[0]))
  const [qIx, setQIx] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [showWrong, setShowWrong] = useState(false)

  const level = TEST_LEVELS[levelIx]
  const cur = asked[qIx]

  const answer = (chosen: string | null) => {
    const all = [...answers, { q: cur.q, chosen, ok: chosen === cur.q.choices[0] }]
    setAnswers(all)
    if (qIx + 1 < asked.length) { setQIx(qIx + 1); return }
    // Hết một phần: chấm phần này
    const mine = all.filter((a) => a.q.level === level)
    const right = mine.filter((a) => a.ok).length
    const passed = right >= Math.min(PASS_RIGHT, mine.length)
    if (passed && levelIx + 1 < TEST_LEVELS.length) {
      const nextLevel = TEST_LEVELS[levelIx + 1]
      setLevelIx(levelIx + 1)
      setAsked(pick(nextLevel))
      setQIx(0)
      return
    }
    // Kết thúc: tính điểm từng phần đã làm
    const scores: PlacementResult['scores'] = {}
    for (const a of all) {
      const s = (scores[a.q.level] ??= { right: 0, total: 0 })
      s.total++
      if (a.ok) s.right++
    }
    setResult({ at: Date.now(), start: passed ? 'n1' : level, scores })
    setPhase('result')
  }

  const askText: Record<PlacementQuestion['kind'], string> = useMemo(() => ({
    kana: t('askKana'), kanji: t('askKanji'), vocab: t('askVocab'), grammar: t('askGrammar'),
  }), [t])

  if (phase === 'intro') {
    return (
      <Card className="mx-auto grid max-w-2xl gap-4">
        <h2 className="text-xl font-bold">{t('testTitle')}</h2>
        <p className="text-sm text-muted">{t('testIntro', { n: PER_LEVEL })}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPhase('test')}>{t('testStart')}</Button>
          <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
        </div>
        <p className="text-xs text-muted">{t('credit')}</p>
      </Card>
    )
  }

  if (phase === 'result' && result) {
    const wrong = answers.filter((a) => !a.ok)
    return (
      <Card className="mx-auto grid max-w-2xl gap-4">
        <h2 className="text-xl font-bold">{t('resultTitle')}</h2>
        <p className="text-lg">{t('resultStart', { lv: LEVEL_LABEL[result.start] })}</p>
        <ul className="grid gap-1 text-sm">
          {TEST_LEVELS.filter((l) => result.scores[l]).map((l) => {
            const s = result.scores[l]!
            const ok = s.right >= Math.min(PASS_RIGHT, s.total)
            return (
              <li key={l} className={ok ? 'text-good' : 'text-bad'}>
                {ok ? '✓ ' : '✗ '}{t('scoreLine', { lv: LEVEL_LABEL[l], right: s.right, total: s.total })}
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-muted">{t('resultHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onApply(result)}>{t('applyResult')}</Button>
          <Button variant="soft" onClick={() => setShowWrong((v) => !v)} aria-expanded={showWrong}>{t('review')}</Button>
          <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
        </div>
        {showWrong && (
          wrong.length === 0 ? <p className="text-sm text-good">{t('noWrong')}</p> : (
            <ul className="grid gap-2">
              {wrong.map((a) => (
                <li key={a.q.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                  <div className="jp text-base">{a.q.q}</div>
                  {a.chosen && <div className="text-bad">{t('yourAnswer', { a: a.chosen })}</div>}
                  <div className="text-good">{t('correct', { a: a.q.choices[0] })}</div>
                  {a.q.note && <div className="mt-1 text-muted">{a.q.note}</div>}
                </li>
              ))}
            </ul>
          )
        )}
      </Card>
    )
  }

  // Đang làm bài
  const doneBefore = TEST_LEVELS.slice(0, levelIx).length * PER_LEVEL
  const maxQ = TEST_LEVELS.length * PER_LEVEL
  return (
    <Card className="mx-auto grid max-w-2xl gap-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>{t('part', { lv: LEVEL_LABEL[level] })} · {t('qNum', { i: qIx + 1, n: asked.length })}</span>
        <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full bg-primary transition-all" style={{ width: `${((doneBefore + qIx) / maxQ) * 100}%` }} />
      </div>
      <p className="text-sm text-muted">{askText[cur.q.kind]}</p>
      <p lang="ja" className={`jp text-center font-medium ${cur.q.kind === 'grammar' ? 'text-2xl' : 'text-5xl'}`}>{cur.q.q}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cur.options.map((o) => (
          <Button key={o} variant="soft" className={`${/[぀-ヿ一-龯]/.test(o) ? 'jp text-lg' : ''}`} onClick={() => answer(o)}>
            {o}
          </Button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => answer(null)}>{t('dontKnow')}</Button>
    </Card>
  )
}
