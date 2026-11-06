/**
 * KHUNG LUYỆN TẬP HIỆN TRÊN VIDEO (khi video tự dừng ở cuối câu)
 *  - Kiểm tra nghe: tự đánh giá "Hiểu / Một phần / Không" rồi xem đáp án
 *  - Chép chính tả: gõ lại câu vừa nghe, app so từng chữ (theo cách đọc)
 *  - Shadowing: khoảng lặng để nhắc lại, ghi âm giọng bạn, nghe lại để so với bản gốc
 *  - Học theo đoạn: ôn các từ mới vừa nghe trong đoạn
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { tokenize } from '@/modules/dictionary'
import { isStudyWord, wordStatus, type Knowledge } from './analysis'
import { addWordCards } from './cards'
import { glossOf, lookupWord } from './dict'
import { playBlob } from './capture'
import { getSeries } from './store'
import { setWordStatus } from '@/modules/vocab/api'
import { SubtitleLine } from './SubtitleLine'
import { compareReadings, inputReading, toReading, type MatchResult } from './textmatch'
import type { AnimeEpisode, Cue } from './types'

export function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 max-h-[85%] overflow-y-auto rounded-card border border-border bg-surface/95 p-4 text-text shadow-card backdrop-blur">
      {children}
    </div>
  )
}

const Lines = ({ cue, tr, k, furigana }: { cue: Cue; tr?: Cue[]; k?: Knowledge; furigana: boolean }) => (
  <div className="grid gap-1">
    <p className="text-xl leading-relaxed">
      {cue.n && <span className="mr-1 text-sm text-muted">{cue.n}:</span>}
      {cue.t.split('\n').map((l, i) => <span key={i} className="block"><SubtitleLine text={l} furigana={furigana} k={k} highlight /></span>)}
    </p>
    {tr?.map((c, i) => <p key={i} className="whitespace-pre-line text-sm text-muted">{c.t}</p>)}
  </div>
)

// ------------------------------------------------------------ Kiểm tra nghe

export type ListenAnswer = 'yes' | 'partly' | 'no'

export function ListenCheck({ cue, tr, k, furigana, answered, onAnswer, onReplay, onContinue }: {
  cue: Cue; tr: Cue[]; k?: Knowledge; furigana: boolean; answered?: ListenAnswer
  onAnswer: (a: ListenAnswer) => void; onReplay: () => void; onContinue: () => void
}) {
  return (
    <Overlay>
      {!answered ? (
        <div className="grid gap-3">
          <p className="font-medium">Bạn nghe hiểu câu vừa rồi không?</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onAnswer('yes')}>1 · Hiểu</Button>
            <Button variant="soft" onClick={() => onAnswer('partly')}>2 · Một phần</Button>
            <Button variant="soft" onClick={() => onAnswer('no')}>3 · Không hiểu</Button>
            <Button variant="ghost" onClick={onReplay}>↺ Nghe lại (S)</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <Lines cue={cue} tr={tr} k={k} furigana={furigana} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={onContinue}>Tiếp tục (Space)</Button>
            <Button variant="ghost" onClick={onReplay}>↺ Nghe lại</Button>
          </div>
        </div>
      )}
    </Overlay>
  )
}

// ------------------------------------------------------------ Chép chính tả

export function Dictation({ cue, tr, k, furigana, onReplay, onContinue, onScore }: {
  cue: Cue; tr: Cue[]; k?: Knowledge; furigana: boolean
  onReplay: () => void; onContinue: () => void; onScore: (score: number) => void
}) {
  const [text, setText] = useState('')
  const [res, setRes] = useState<MatchResult>()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const check = async () => {
    const [target, answer] = await Promise.all([toReading(cue.t), inputReading(text)])
    const r = compareReadings(target, answer)
    setRes(r)
    onScore(r.score)
  }

  return (
    <Overlay>
      <div className="grid gap-3">
        {!res ? (
          <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); void check() }}>
            <label className="font-medium" htmlFor="dictation">Gõ lại câu vừa nghe</label>
            <input id="dictation" ref={ref} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off"
              className="jp min-h-11 rounded-xl border border-border bg-surface-2 px-3 text-lg outline-none focus:border-primary"
              placeholder="kana, Kanji hoặc romaji (tabemasu → たべます)" />
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Kiểm tra (Enter)</Button>
              <Button type="button" variant="ghost" onClick={onReplay}>↺ Nghe lại</Button>
              <Button type="button" variant="ghost" onClick={onContinue}>Bỏ qua</Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm">
              Đúng <b className={res.score >= 0.8 ? 'text-good' : res.score >= 0.5 ? 'text-warn' : 'text-bad'}>{Math.round(res.score * 100)}%</b> (so theo cách đọc)
            </p>
            <p className="jp text-lg tracking-wide" aria-label="Cách đọc đúng, chữ đỏ là chỗ thiếu hoặc sai">
              {res.chars.map((c, i) => <span key={i} className={c.ok ? 'text-good' : 'text-bad underline'}>{c.ch}</span>)}
            </p>
            {res.answer && <p className="jp text-sm text-muted">Bạn gõ: {res.answer}</p>}
            <Lines cue={cue} tr={tr} k={k} furigana={furigana} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onContinue}>Câu tiếp theo (Space)</Button>
              <Button variant="ghost" onClick={onReplay}>↺ Nghe lại</Button>
              <Button variant="ghost" onClick={() => { setRes(undefined); setText('') }}>Thử lại</Button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  )
}

// ------------------------------------------------------------ Shadowing

export type ShadowPhase = 'gap' | 'replay' | 'compare'

export function Shadowing({ phase, cue, gapMs, mine, heard, score, onPlayOriginal, onContinue, onReplay }: {
  phase: ShadowPhase; cue: Cue; gapMs: number
  mine?: Blob; heard?: string; score?: number
  onPlayOriginal: () => void; onContinue: () => void; onReplay: () => void
}) {
  const [left, setLeft] = useState(gapMs)
  useEffect(() => {
    if (phase !== 'gap') return
    const t0 = performance.now()
    const id = window.setInterval(() => setLeft(Math.max(0, gapMs - (performance.now() - t0))), 100)
    return () => window.clearInterval(id)
  }, [phase, gapMs])

  return (
    <Overlay>
      {phase === 'gap' && (
        <div className="grid gap-2">
          <p className="font-medium">🎙 Đến lượt bạn: nhắc lại câu vừa nghe</p>
          <p className="jp text-lg">{cue.t.replace(/\n/g, ' ')}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-primary transition-[width]" style={{ width: `${(left / gapMs) * 100}%` }} /></div>
          <p className="text-xs text-muted">Sau khoảng lặng, app phát lại bản gốc để bạn so sánh.</p>
        </div>
      )}
      {phase === 'replay' && <p className="font-medium">🔁 Bản gốc: nghe và so với giọng của bạn</p>}
      {phase === 'compare' && (
        <div className="grid gap-2">
          <p className="font-medium">So sánh giọng bạn với bản gốc</p>
          {heard !== undefined && (
            <p className="text-sm">
              App nghe được: <span className="jp">{heard || '(không nghe rõ)'}</span>
              {score !== undefined && <> · giống <b className={score >= 0.8 ? 'text-good' : score >= 0.5 ? 'text-warn' : 'text-bad'}>{Math.round(score * 100)}%</b></>}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {mine && <Button variant="soft" onClick={() => playBlob(mine)}>▶ Giọng của bạn</Button>}
            <Button variant="soft" onClick={onPlayOriginal}>▶ Bản gốc</Button>
            <Button variant="ghost" onClick={onReplay}>↺ Luyện lại câu này</Button>
            <Button onClick={onContinue}>Câu tiếp theo (Space)</Button>
          </div>
        </div>
      )}
    </Overlay>
  )
}

// ------------------------------------------------------------ Học theo đoạn

interface ChunkWord { w: string; s: string; pos: string; example: string; gloss?: string }

export function StudyBreak({ lines, ep, seriesId, k, onContinue }: {
  lines: Cue[]; ep: AnimeEpisode; seriesId: string; k?: Knowledge; onContinue: () => void
}) {
  const [words, setWords] = useState<ChunkWord[]>()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string>()
  const { data: series } = useDbQuery(() => getSeries(seriesId), [seriesId], ['animeSeries'])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const seen = new Set<string>()
      const out: ChunkWord[] = []
      for (const c of lines) {
        const line = c.t.replace(/\n/g, ' ')
        for (const seg of await tokenize(line).catch(() => [])) {
          const w = seg.base || seg.surface
          if (!isStudyWord(seg) || seen.has(w)) continue
          seen.add(w)
          if (k && wordStatus({ w, r: seg.reading, s: seg.surface }, k) !== 'new') continue
          const r = await lookupWord(w)
          if (r) out.push({ w, s: seg.surface, pos: seg.pos, example: line, gloss: glossOf(r) })
        }
      }
      if (alive) { setWords(out); setPicked(new Set(out.map((x) => x.w))) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines])

  const toggle = (w: string) => setPicked((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n })

  return (
    <Overlay>
      <div className="grid gap-3">
        <p className="font-medium">📒 Ôn đoạn vừa xem ({lines.length} câu)</p>
        {!words ? <p className="text-sm text-muted">Đang tìm từ mới…</p> : words.length === 0 ? (
          <p className="text-sm text-muted">Đoạn này không có từ mới nào với bạn. Giỏi lắm!</p>
        ) : (
          <>
            <p className="text-sm text-muted">Từ mới trong đoạn. Bỏ chọn từ bạn đã biết rồi bấm thêm thẻ.</p>
            <ul className="grid gap-1">
              {words.map((x) => (
                <li key={x.w}>
                  <label className="flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-surface-2">
                    <input type="checkbox" className="mt-1.5" checked={picked.has(x.w)} onChange={() => toggle(x.w)} />
                    <span className="jp min-w-12 text-lg leading-normal">{x.w}</span>
                    <span className="text-sm">{x.gloss}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        {msg && <p className="text-sm text-good">{msg}</p>}
        <div className="flex flex-wrap gap-2">
          {words && words.length > 0 && series && (
            <>
              <Button disabled={!picked.size} onClick={async () => {
                const r = await addWordCards(series, ep, undefined, words.filter((x) => picked.has(x.w)))
                setMsg(`Đã thêm ${r.added} thẻ ôn tập.`)
                setPicked(new Set())
              }}>+ Thêm {picked.size} thẻ</Button>
              <Button variant="soft" onClick={async () => {
                const known = words.filter((x) => !picked.has(x.w)).map((x) => x.w)
                await setWordStatus(known.map((w) => ({ w })), 'known', 'anime')
                setMsg(`Đã đánh dấu ${known.length} từ là "Đã biết".`)
              }}>Từ không chọn = Đã biết</Button>
            </>
          )}
          <Button variant="ghost" onClick={onContinue}>Xem tiếp (Space)</Button>
        </div>
      </div>
    </Overlay>
  )
}
