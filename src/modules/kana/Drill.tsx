/**
 * LUYỆN NHẬN DIỆN: hai chế độ dùng chung một khung
 *  - 'quick'  (Nhận diện nhanh): thấy chữ → chọn hoặc gõ romaji, đua với đồng hồ 60 giây.
 *  - 'listen' (Nghe nhận diện): nghe đọc → chọn đúng chữ trong 4 chữ.
 * Chữ hay sai được hỏi nhiều hơn. Đáp án nhiễu ưu tiên các chữ dễ nhầm (シ/ツ, さ/ち...).
 * Hết buổi: lưu tiến độ, chữ vừa thuộc được tự đưa vào Ôn tập (nếu bật).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { ALL_KANA, GROUP_LABEL, confusablesOf, romajiMatches, type Kana, type KanaGroup, type Script } from './data'
import {
  addKanaToSrs, getKanaSettings, getProgress, levelOf, recordResults, saveKanaSettings, useKanaSettings,
  type KanaProgress,
} from './progress'
import { speak, useJapaneseVoice } from './speech'

export type DrillMode = 'quick' | 'listen'
type ScriptChoice = Script | 'both'
type AnswerMode = 'choice' | 'type'

interface DrillConfig {
  scripts: ScriptChoice
  groups: KanaGroup[]
  weakOnly: boolean
  answer: AnswerMode
}

interface Question {
  kana: Kana
  options: Kana[] // 4 lựa chọn (đã trộn), chế độ gõ thì không dùng
}

const QUICK_SECONDS = 60
const LISTEN_COUNT = 20

const shuffle = <T,>(a: T[]) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function buildPool(cfg: DrillConfig, progress: KanaProgress): Kana[] {
  const pool = ALL_KANA.filter((k) =>
    (cfg.scripts === 'both' || k.script === cfg.scripts) && cfg.groups.includes(k.group))
  if (!cfg.weakOnly) return pool
  const weak = pool.filter((k) => levelOf(progress[k.char]) !== 'known')
  return weak.length >= 4 ? weak : pool
}

/** Chọn chữ tiếp theo: chữ sai nhiều / chưa gặp có trọng số cao hơn, tránh lặp lại ngay chữ vừa hỏi. */
function pickNext(pool: Kana[], progress: KanaProgress, wrongNow: Map<string, number>, last?: string): Kana {
  const weights = pool.map((k) => {
    if (k.char === last) return 0
    const s = progress[k.char]
    let w = 1
    if (!s || s.c + s.w === 0) w = 2
    else if (levelOf(s) !== 'known') w = 2.5
    return w + 3 * (wrongNow.get(k.char) ?? 0)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

/** 4 lựa chọn: đáp án + 3 chữ nhiễu cùng bảng, khác âm, ưu tiên chữ dễ nhầm. */
function buildOptions(target: Kana, pool: Kana[]): Kana[] {
  const sameScript = ALL_KANA.filter((k) => k.script === target.script)
  const clash = (k: Kana, chosen: Kana[]) =>
    chosen.some((c) => c.sound === k.sound || c.romaji === k.romaji || c.char === k.char)
  const chosen: Kana[] = [target]
  const tryAdd = (cands: Kana[]) => {
    for (const k of shuffle(cands)) {
      if (chosen.length >= 4) return
      if (!clash(k, chosen)) chosen.push(k)
    }
  }
  const look = new Set(confusablesOf(target.char))
  tryAdd(sameScript.filter((k) => look.has(k.char)).slice(0, 2))
  tryAdd(pool.filter((k) => k.script === target.script && k.group === target.group))
  tryAdd(sameScript.filter((k) => k.group === target.group))
  tryAdd(sameScript)
  return shuffle(chosen)
}

export function Drill({ mode }: { mode: DrillMode }) {
  const [cfg, setCfg] = useState<DrillConfig>({ scripts: 'hiragana', groups: ['basic'], weakOnly: false, answer: 'choice' })
  const [running, setRunning] = useState<{ pool: Kana[]; progress: KanaProgress } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  const start = async () => {
    const progress = await getProgress()
    setSummary(null)
    setRunning({ pool: buildPool(cfg, progress), progress })
  }

  if (running) {
    return (
      <Runner
        mode={mode}
        answer={mode === 'listen' ? 'choice' : cfg.answer}
        pool={running.pool}
        progress={running.progress}
        onFinish={(s) => { setRunning(null); setSummary(s) }}
      />
    )
  }
  if (summary) return <SummaryView mode={mode} summary={summary} onAgain={start} onClose={() => setSummary(null)} />
  return <Setup mode={mode} cfg={cfg} setCfg={setCfg} onStart={start} />
}

// ---------- Màn hình chọn ----------

function Setup({ mode, cfg, setCfg, onStart }: {
  mode: DrillMode
  cfg: DrillConfig
  setCfg: (c: DrillConfig) => void
  onStart: () => void
}) {
  const voice = useJapaneseVoice()
  const settings = useKanaSettings()
  const toggleGroup = (g: KanaGroup) => {
    const has = cfg.groups.includes(g)
    const groups = has ? cfg.groups.filter((x) => x !== g) : [...cfg.groups, g]
    if (groups.length) setCfg({ ...cfg, groups })
  }
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{mode === 'quick' ? 'Nhận diện nhanh' : 'Nghe nhận diện'}</h2>
        <p className="mt-1 text-sm text-muted">
          {mode === 'quick'
            ? `Nhìn chữ, chọn cách đọc đúng. Làm được càng nhiều câu trong ${QUICK_SECONDS} giây càng tốt.`
            : `Nghe đọc một chữ, chọn đúng chữ đó. ${LISTEN_COUNT} câu, không tính giờ.`}
        </p>
      </div>

      {mode === 'listen' && !voice.ready && <VoiceHelp supported={voice.supported} />}

      <Field label="Bảng chữ">
        <Segmented<ScriptChoice> label="Bảng chữ" value={cfg.scripts} onChange={(scripts) => setCfg({ ...cfg, scripts })}
          options={[{ value: 'hiragana', label: 'Hiragana' }, { value: 'katakana', label: 'Katakana' }, { value: 'both', label: 'Cả hai' }]} />
      </Field>

      <Field label="Nhóm chữ">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GROUP_LABEL) as KanaGroup[]).map((g) => (
            <button key={g} onClick={() => toggleGroup(g)} aria-pressed={cfg.groups.includes(g)}
              className={`min-h-9 rounded-lg border px-3 text-sm transition ${cfg.groups.includes(g)
                ? 'border-primary bg-primary-soft text-text' : 'border-border text-muted hover:text-text'}`}>
              {GROUP_LABEL[g]}
            </button>
          ))}
        </div>
      </Field>

      {mode === 'quick' && (
        <Field label="Cách trả lời">
          <Segmented<AnswerMode> label="Cách trả lời" value={cfg.answer} onChange={(answer) => setCfg({ ...cfg, answer })}
            options={[{ value: 'choice', label: 'Chọn 4 đáp án' }, { value: 'type', label: 'Gõ romaji' }]} />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={cfg.weakOnly}
          onChange={(e) => setCfg({ ...cfg, weakOnly: e.target.checked })} />
        Chỉ luyện chữ chưa thuộc
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={settings?.autoSrs ?? true}
          onChange={(e) => void saveKanaSettings({ autoSrs: e.target.checked })} />
        Tự đưa chữ đã thuộc vào Ôn tập
      </label>

      <Button onClick={onStart} className="w-full sm:w-auto">Bắt đầu</Button>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-muted">{label}</div>
      {children}
    </div>
  )
}

export function VoiceHelp({ supported }: { supported: boolean }) {
  return (
    <div className="rounded-xl border border-warn bg-surface-2 p-3 text-sm">
      {supported ? (
        <>
          <p className="font-medium">Máy chưa có giọng đọc tiếng Nhật, nên có thể không nghe được.</p>
          <p className="mt-1 text-muted">
            Trên Windows: mở <b>Settings → Time &amp; language → Speech</b>, mục <b>Manage voices</b> bấm <b>Add voices</b>,
            chọn <b>日本語 (Japanese)</b>. Cài xong mở lại app. Trên Chrome/Edge có mạng thường đã có sẵn.
          </p>
        </>
      ) : (
        <p>Trình duyệt này không hỗ trợ đọc chữ. Hãy dùng Chrome hoặc Edge.</p>
      )}
    </div>
  )
}

// ---------- Buổi luyện ----------

interface Summary {
  results: { char: string; ok: boolean }[]
  newlyKnown: string[]
  addedToSrs: number
}

function Runner({ mode, answer, pool, progress, onFinish }: {
  mode: DrillMode
  answer: AnswerMode
  pool: Kana[]
  progress: KanaProgress
  onFinish: (s: Summary) => void
}) {
  const wrongNow = useRef(new Map<string, number>())
  const results = useRef<{ char: string; ok: boolean }[]>([])
  const makeQuestion = (last?: string): Question => {
    const kana = pickNext(pool, progress, wrongNow.current, last)
    return { kana, options: buildOptions(kana, pool) }
  }
  const [q, setQ] = useState<Question>(() => makeQuestion())
  const [picked, setPicked] = useState<string | null>(null) // chữ đã chọn (hoặc '?' khi gõ sai)
  const [typed, setTyped] = useState('')
  const [streak, setStreak] = useState(0)
  const [left, setLeft] = useState(QUICK_SECONDS)
  const [finishing, setFinishing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const advanceTimer = useRef<number>(0)

  const count = results.current.length
  const correct = results.current.filter((r) => r.ok).length

  const finish = async () => {
    if (finishing) return
    setFinishing(true)
    window.clearTimeout(advanceTimer.current)
    const before = progress
    const res = results.current
    const after = res.length ? await recordResults(res) : before
    const newlyKnown = [...new Set(res.map((r) => r.char))].filter(
      (c) => levelOf(after[c]) === 'known' && levelOf(before[c]) !== 'known')
    const settings = await getKanaSettings()
    // Chữ đã thuộc (cả trước đây) mà chưa vào Ôn tập thì đưa vào luôn
    const toSrs = [...new Set(res.map((r) => r.char))].filter((c) => levelOf(after[c]) === 'known' && !after[c]?.srs)
    const addedToSrs = settings.autoSrs && toSrs.length ? await addKanaToSrs(toSrs) : 0
    onFinish({ results: res, newlyKnown, addedToSrs })
  }

  // Đồng hồ cho chế độ nhanh
  useEffect(() => {
    if (mode !== 'quick') return
    const t = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => window.clearInterval(t)
  }, [mode])
  useEffect(() => { if (mode === 'quick' && left <= 0) void finish() }, [left])

  // Bài nghe: tự đọc khi sang câu mới
  useEffect(() => {
    if (mode === 'listen') speak(q.kana.char, { force: true })
    if (answer === 'type') inputRef.current?.focus()
  }, [q])

  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  const next = () => {
    window.clearTimeout(advanceTimer.current)
    if (mode === 'listen' && results.current.length >= LISTEN_COUNT) { void finish(); return }
    setPicked(null)
    setTyped('')
    setQ(makeQuestion(q.kana.char))
  }

  const submit = (ok: boolean, chosen: string) => {
    if (picked || finishing) return
    setPicked(chosen)
    results.current.push({ char: q.kana.char, ok })
    if (ok) setStreak((s) => s + 1)
    else {
      setStreak(0)
      wrongNow.current.set(q.kana.char, (wrongNow.current.get(q.kana.char) ?? 0) + 1)
    }
    if (mode === 'quick' && !ok) speak(q.kana.char)
    // Đúng thì sang câu nhanh; sai thì dừng lâu hơn để kịp nhìn đáp án
    advanceTimer.current = window.setTimeout(next, ok ? (mode === 'quick' ? 300 : 700) : mode === 'quick' ? 1300 : 2200)
  }

  const choose = (k: Kana) => submit(k.char === q.kana.char, k.char)
  const submitTyped = () => {
    if (!typed.trim()) return
    submit(romajiMatches(q.kana, typed), romajiMatches(q.kana, typed) ? q.kana.char : '?')
  }

  // Phím tắt: 1–4 chọn đáp án, Space nghe lại, Enter sang câu, Esc kết thúc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { void finish(); return }
      if (answer === 'type') return
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && q.options[n - 1]) { choose(q.options[n - 1]); return }
      if (e.key === ' ' && mode === 'listen') { e.preventDefault(); speak(q.kana.char, { force: true }) }
      if (e.key === 'Enter' && picked) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const optionClass = (k: Kana) => {
    if (!picked) return 'border-border hover:border-primary hover:bg-surface-2'
    if (k.char === q.kana.char) return 'border-good bg-surface-2 text-good'
    if (k.char === picked) return 'border-bad text-bad'
    return 'border-border opacity-60'
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{mode === 'quick' ? `Còn ${Math.max(0, left)} giây` : `Câu ${Math.min(count + (picked ? 0 : 1), LISTEN_COUNT)}/${LISTEN_COUNT}`}</span>
        <span>Đúng {correct}/{count}{streak >= 3 && <span className="ml-2 text-primary">Chuỗi {streak} 🔥</span>}</span>
        <Button variant="ghost" onClick={() => void finish()}>Kết thúc</Button>
      </div>
      {mode === 'quick' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${(Math.max(0, left) / QUICK_SECONDS) * 100}%` }} />
        </div>
      )}

      <Card className="flex flex-col items-center gap-2 py-8">
        {mode === 'quick' ? (
          <div className="jp text-8xl leading-none">{q.kana.char}</div>
        ) : (
          <button onClick={() => speak(q.kana.char, { force: true })}
            className="grid size-28 place-items-center rounded-full bg-primary-soft text-5xl transition hover:scale-105"
            aria-label="Nghe lại (phím Space)">
            🔊
          </button>
        )}
        <p className="min-h-6 text-sm" aria-live="polite">
          {picked ? (
            picked === q.kana.char
              ? <span className="font-medium text-good">Đúng rồi!</span>
              : <span className="text-bad">Đáp án: <span className="jp">{q.kana.char}</span> = <b>{q.kana.romaji}</b></span>
          ) : <span className="text-muted">{mode === 'listen' ? 'Bấm loa hoặc phím Space để nghe lại' : ' '}</span>}
        </p>
      </Card>

      {answer === 'choice' ? (
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((k, i) => (
            <button key={k.char} onClick={() => choose(k)} disabled={!!picked}
              className={`relative min-h-16 rounded-xl border bg-surface text-2xl transition ${optionClass(k)} ${mode === 'listen' ? 'jp text-3xl' : ''}`}>
              <span className="absolute left-2 top-1 text-xs text-muted">{i + 1}</span>
              {mode === 'quick' ? k.romaji : k.char}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (picked) next(); else submitTyped() }} className="flex gap-2">
          <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Gõ romaji rồi Enter (vd: shi)"
            className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 text-lg outline-none focus:border-primary" />
          <Button type="submit">{picked ? 'Tiếp' : 'Trả lời'}</Button>
        </form>
      )}

      {picked && picked !== q.kana.char && (
        <div className="text-center">
          <Button variant="soft" onClick={next}>Tiếp (Enter)</Button>
        </div>
      )}
    </div>
  )
}

// ---------- Kết quả ----------

function SummaryView({ mode, summary, onAgain, onClose }: {
  mode: DrillMode
  summary: Summary
  onAgain: () => void
  onClose: () => void
}) {
  const { results, newlyKnown, addedToSrs } = summary
  const correct = results.filter((r) => r.ok).length
  const wrong = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of results) if (!r.ok) m.set(r.char, (m.get(r.char) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [results])
  const pct = results.length ? Math.round((correct / results.length) * 100) : 0
  const [manualAdded, setManualAdded] = useState<number | null>(null)

  return (
    <Card className="space-y-4 text-center">
      <h2 className="text-lg font-semibold">{mode === 'quick' ? 'Kết quả nhận diện nhanh' : 'Kết quả bài nghe'}</h2>
      <div className="text-5xl font-bold text-primary">{correct}<span className="text-2xl text-muted">/{results.length}</span></div>
      <p className="text-muted">Chính xác {pct}%</p>

      {wrong.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Chữ cần luyện thêm</p>
          <div className="flex flex-wrap justify-center gap-2">
            {wrong.map(([c, n]) => (
              <button key={c} onClick={() => speak(c, { force: true })} title={`Sai ${n} lần, bấm để nghe`}
                className="jp rounded-lg border border-bad px-3 py-1 text-xl">{c}</button>
            ))}
          </div>
        </div>
      )}
      {newlyKnown.length > 0 && (
        <p className="text-sm">Mới thuộc: <span className="jp text-lg text-good">{newlyKnown.join(' ')}</span></p>
      )}
      {addedToSrs > 0 && (
        <p className="text-sm text-muted">
          Đã thêm {addedToSrs} chữ vào <Link to="/review" className="text-primary underline">Ôn tập</Link> để nhớ lâu.
        </p>
      )}
      {wrong.length > 0 && manualAdded === null && (
        <Button variant="ghost" onClick={async () => setManualAdded(await addKanaToSrs(wrong.map(([c]) => c)))}>
          Đưa chữ sai vào Ôn tập
        </Button>
      )}
      {manualAdded !== null && <p className="text-sm text-muted">Đã thêm {manualAdded} chữ (chữ đã có thì bỏ qua).</p>}

      <div className="flex justify-center gap-2">
        <Button variant="soft" onClick={onClose}>Đổi cài đặt</Button>
        <Button onClick={onAgain}>Làm lại</Button>
      </div>
    </Card>
  )
}
