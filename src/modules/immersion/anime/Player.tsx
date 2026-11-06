/**
 * TRÌNH XEM ANIME CHUYÊN CHO VIỆC HỌC
 * - Phụ đề tiếng Nhật vẽ trên video, tô màu từ mới / đang học, bấm hoặc di chuột để tra.
 * - Phụ đề song ngữ, furigana, phụ đề nhúng trong .mkv.
 * - Chế độ xem: Hỗ trợ, Song ngữ, Chỉ phụ đề dịch, Full Immersion, Chỉ nghe,
 *   Kiểm tra nghe, Chép chính tả, Shadowing, Học theo đoạn.
 * - Lưu câu (phím C): câu + thời điểm + ảnh cảnh phim + âm thanh gốc → tạo thẻ ôn tập.
 * - Lặp câu, lặp A-B, tự dừng sau mỗi câu, tốc độ 0,5×–1,5× (giữ nguyên cao độ giọng).
 * - Nhớ chỗ đang xem, đếm thời gian xem, chỉnh lệch phụ đề, sang tập tiếp theo.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { openLookup } from '@/modules/dictionary/api'
import { useKnowledge } from './analysis'
import { canRecognizeSpeech, recognizeJapanese, recordMic } from './capture'
import { MineDialog, type MineTarget } from './MineDialog'
import { actionFor } from '@/modules/shortcuts/keymap'
import { episodeLabel } from './importer'
import { makeMedia, openMedia, pickFiles, playabilityHint } from './media'
import { extractEmbeddedSubs, isJapaneseLang } from './mkv'
import { ExplainPanel, NotesPanel, SentencesPanel, playClip } from './Panels'
import { Dictation, ListenCheck, Shadowing, StudyBreak, type ListenAnswer, type ShadowPhase } from './Practice'
import {
  addWatchTime, getEpisode, getMedia, getPlayerPrefs, getSeries, getSubs, isNearEnd, listEpisodes,
  putMedia, putSubs, savePlayerPrefs, saveProgress, updateEpisode,
} from './store'
import { activeCues, formatClock, lastStartedIndex, looksJapanese, readSubtitleFile } from './subtitles'
import { SubtitleLine } from './SubtitleLine'
import { compareReadings, inputReading, toReading } from './textmatch'
import {
  DEFAULT_PLAYER_PREFS, type AnimeEpisode, type AnimeSeries, type Cue, type PlayerPrefs, type SubMode, type WatchMode,
} from './types'
import { VocabPanel } from './VocabPanel'

type MediaState =
  | { state: 'loading' }
  | { state: 'ok'; url: string; name: string }
  | { state: 'permission' }
  | { state: 'missing'; reason: string }

type Practice =
  | { kind: 'listen'; line: number; answered?: ListenAnswer }
  | { kind: 'dictation'; line: number }
  | { kind: 'shadow'; line: number; phase: ShadowPhase; mine?: Blob; heard?: string; score?: number }
  | { kind: 'study'; from: number; to: number }

type Panel = 'lines' | 'vocab' | 'saved' | 'explain' | 'notes'

const RATES = [0.5, 0.75, 0.85, 1, 1.25, 1.5]
const SUB_MODES: SubMode[] = ['show', 'blur', 'hide']
const SUB_MODE_LABEL: Record<SubMode, string> = { show: 'Hiện', blur: 'Mờ', hide: 'Ẩn' }

export const MODE_INFO: Record<WatchMode, { label: string; hint: string }> = {
  assisted: { label: 'Hỗ trợ', hint: 'Phụ đề Nhật, tra từ, furigana khi cần' },
  bilingual: { label: 'Song ngữ', hint: 'Phụ đề Nhật + phụ đề dịch' },
  translation: { label: 'Chỉ phụ đề dịch', hint: 'Nghe tiếng Nhật, đọc bản dịch' },
  immersion: { label: 'Full Immersion', hint: 'Chỉ tiếng Nhật, không phụ đề' },
  audio: { label: 'Chỉ nghe', hint: 'Ẩn hình và phụ đề, chỉ còn âm thanh' },
  'listen-check': { label: 'Kiểm tra nghe', hint: 'Dừng sau mỗi câu: tự đánh giá rồi xem đáp án' },
  dictation: { label: 'Chép chính tả', hint: 'Nghe từng câu rồi gõ lại' },
  shadowing: { label: 'Shadowing', hint: 'Phát câu → khoảng lặng để nhắc lại → phát lại bản gốc' },
  study: { label: 'Học theo đoạn', hint: 'Xem xong một đoạn → ôn từ mới vừa nghe' },
}
const VIEW_MODES: WatchMode[] = ['assisted', 'bilingual', 'translation', 'immersion', 'audio']

function IconBtn({ label, onClick, active, children, className = '', disabled }: {
  label: string; onClick: () => void; active?: boolean; children: ReactNode; className?: string; disabled?: boolean
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-0.5 rounded-lg px-2 text-sm transition disabled:opacity-40 ${active ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-2'} ${className}`}>
      {children}
    </button>
  )
}

export function Player({ episodeId, startAt, onClose, onOpenEpisode, onStudyEpisode, onReview }: {
  episodeId: string
  /** Mở ở đúng giây này (từ kết quả tìm kiếm). Không có thì xem tiếp chỗ cũ. */
  startAt?: number
  onClose: () => void
  onOpenEpisode: (id: string) => void
  /** Mở trang series với bảng từ vựng của tập này (học trước khi xem). */
  onStudyEpisode: (id: string) => void
  /** Mở "Ôn theo cảnh phim" cho tập này. */
  onReview: (episodeId: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<Blob | null>(null)
  const [ep, setEp] = useState<AnimeEpisode>()
  const [series, setSeries] = useState<AnimeSeries>()
  const [siblings, setSiblings] = useState<AnimeEpisode[]>([])
  const [jp, setJp] = useState<Cue[]>([])
  const [tr, setTr] = useState<Cue[]>([])
  const [media, setMedia] = useState<MediaState>({ state: 'loading' })
  const [prefs, setPrefsState] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS)
  const [offset, setOffset] = useState(0) // ms
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState<number[]>([])
  const [activeTr, setActiveTr] = useState<number[]>([])
  const [loop, setLoop] = useState<{ a: number; b: number; line?: boolean } | null>(null)
  const [aPoint, setAPoint] = useState<number | null>(null)
  const [theater, setTheater] = useState(false)
  const [ended, setEnded] = useState(false)
  const [panel, setPanel] = useState<Panel>('lines')
  const [toast, setToast] = useState<string>()
  const [videoError, setVideoError] = useState<string>()
  const [practice, setPractice] = useState<Practice | null>(null)
  const [busy, setBusy] = useState<string>()
  const [showSpoilers, setShowSpoilers] = useState(false)
  const [explainLine, setExplainLine] = useState<number>(-1)
  const k = useKnowledge()

  const mode = prefs.mode
  const showJp = (mode === 'assisted' || mode === 'bilingual' || mode === 'shadowing' || mode === 'study') && prefs.subMode !== 'hide'
  const showTr = mode === 'bilingual' || mode === 'translation' || (mode === 'assisted' && prefs.showTranslation)
  const hideVideo = mode === 'audio'
  const hideTranscript = (mode === 'immersion' || mode === 'audio' || mode === 'listen-check' || mode === 'dictation') && !showSpoilers

  // Giá trị mới nhất cho vòng lặp requestAnimationFrame (không gây vẽ lại)
  const live = useRef({
    jp, tr, offset, loop, prefs,
    pauseAt: null as number | null, armedLine: -1, activeKey: '', trKey: '',
    mining: false, replay: null as number | null, studyStart: 0,
    onLineEnd: (_line: number) => false as boolean,
  })
  live.current.jp = jp; live.current.tr = tr; live.current.offset = offset; live.current.loop = loop; live.current.prefs = prefs

  // ---------- Tải dữ liệu tập ----------
  useEffect(() => {
    let alive = true
    setMedia({ state: 'loading' }); setEnded(false); setLoop(null); setAPoint(null); setVideoError(undefined); setPractice(null)
    ;(async () => {
      const [e, p, sj, st] = await Promise.all([getEpisode(episodeId), getPlayerPrefs(), getSubs(episodeId, 'jp'), getSubs(episodeId, 'tr')])
      if (!alive) return
      setPrefsState(p)
      if (!e) { setMedia({ state: 'missing', reason: 'Không tìm thấy tập này.' }); return }
      setEp(e); setOffset(e.subOffset ?? 0)
      setJp(sj?.cues ?? []); setTr(st?.cues ?? [])
      const [s, sibs] = await Promise.all([getSeries(e.seriesId), listEpisodes(e.seriesId)])
      if (!alive) return
      setSeries(s); setSiblings(sibs)
      const r = await openMedia(await getMedia(episodeId))
      if (!alive) return
      if (r.state === 'ok') { fileRef.current = r.file; setMedia({ state: 'ok', url: URL.createObjectURL(r.file), name: r.name }) }
      else setMedia(r)
    })()
    return () => { alive = false }
  }, [episodeId])

  useEffect(() => () => { if (media.state === 'ok') URL.revokeObjectURL(media.url) }, [media])

  const setPrefs = useCallback((patch: Partial<PlayerPrefs>) => {
    setPrefsState((p) => { const n = { ...p, ...patch }; void savePlayerPrefs(n); return n })
  }, [])

  // Đổi tốc độ mà không méo tiếng (giữ cao độ giọng nói)
  useEffect(() => {
    const x = videoRef.current
    if (!x) return
    x.playbackRate = prefs.rate
    x.preservesPitch = true
  }, [prefs.rate, media])

  const toastTimer = useRef<number | undefined>(undefined)
  const flash = useCallback((m: string, ms = 1600) => {
    setToast(m)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(undefined), ms)
  }, [])

  // ---------- Lưu chỗ đang xem + đếm thời gian xem ----------
  const save = useCallback(() => {
    const x = videoRef.current
    if (!x || !ep || !x.duration || x.currentTime < 1) return
    void saveProgress(ep.id, x.currentTime, x.duration)
  }, [ep])

  useEffect(() => {
    if (!playing || !ep) return
    const id = window.setInterval(() => { save(); void addWatchTime(ep.id, 5) }, 5000)
    return () => window.clearInterval(id)
  }, [playing, save, ep])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [save])

  // ---------- Vòng lặp theo dõi thời gian (60 lần/giây) ----------
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const x = videoRef.current
      if (x) {
        const L = live.current
        const ms = x.currentTime * 1000 - L.offset
        const act = activeCues(L.jp, ms)
        const key = act.join(',')
        if (key !== L.activeKey) {
          L.activeKey = key
          setActive(act)
          // Hẹn "hết câu" ở cuối dòng vừa bắt đầu (dùng cho tự dừng, luyện nghe, shadowing...)
          if (act.length) {
            const last = act.reduce((a, b) => (L.jp[b].e > L.jp[a].e ? b : a))
            L.pauseAt = L.jp[last].e + L.offset
            L.armedLine = last
          }
        }
        const actTr = activeCues(L.tr, ms)
        const trKey = actTr.join(',')
        if (trKey !== L.trKey) { L.trKey = trKey; setActiveTr(actTr) }
        // Đang ghi câu cho thẻ (hộp Lưu câu): không lặp / tự dừng, để ghi trọn câu
        if (!x.paused && !L.mining) {
          const now = x.currentTime * 1000
          if (L.loop && x.currentTime >= L.loop.b) x.currentTime = L.loop.a
          else if (!L.loop && L.pauseAt != null && now >= L.pauseAt) {
            const line = L.armedLine
            L.pauseAt = null
            if (L.onLineEnd(line)) x.pause()
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---------- Điều khiển ----------
  const v = () => videoRef.current
  const play = () => { const x = v(); if (x) { setEnded(false); void x.play().catch(() => {}) } }
  const togglePlay = () => { const x = v(); if (!x) return; if (x.paused) { setPractice(null); play() } else x.pause() }
  const seek = (sec: number) => { const x = v(); if (x) { x.currentTime = Math.max(0, Math.min(sec, x.duration || sec)); setTime(x.currentTime) } }
  const nowMs = () => (v()?.currentTime ?? 0) * 1000 - offset

  const currentLine = () => (active.length ? active[0] : lastStartedIndex(jp, nowMs()))
  const seekLine = (i: number, autoplay = true) => {
    if (i < 0 || i >= jp.length) return
    live.current.pauseAt = null
    live.current.activeKey = '' // để hẹn lại "hết câu" cho câu này
    seek((jp[i].s + offset) / 1000 + 0.001)
    if (autoplay) play()
  }
  const prevLine = () => {
    const cur = lastStartedIndex(jp, nowMs())
    if (cur < 0) return
    seekLine(nowMs() < jp[cur].e ? cur - 1 : cur)
  }
  const nextLine = () => seekLine(lastStartedIndex(jp, nowMs()) + 1)
  const repeatLine = () => seekLine(currentLine())
  /** Phát lại một câu trong lúc luyện tập: hết câu thì dừng lại ở khung luyện tập. */
  const replayLine = (i: number) => { live.current.replay = i; seekLine(i) }

  const toggleLineLoop = () => {
    if (loop?.line) { setLoop(null); flash('Tắt lặp câu'); return }
    const i = currentLine()
    if (i < 0) return
    const c = jp[i]
    setLoop({ a: (c.s + offset) / 1000 - 0.15, b: (c.e + offset) / 1000 + 0.2, line: true })
    setAPoint(null)
    seekLine(i)
    flash('Lặp câu này (L để tắt)')
  }
  const cycleAB = () => {
    const t = v()?.currentTime ?? 0
    if (loop && !loop.line) { setLoop(null); setAPoint(null); flash('Tắt lặp A-B'); return }
    if (aPoint == null) { setLoop(null); setAPoint(t); flash(`Điểm A: ${formatClock(t)}. Bấm B lần nữa để chọn điểm B`); return }
    if (t <= aPoint + 0.3) { flash('Điểm B phải sau điểm A'); return }
    setLoop({ a: aPoint, b: t }); setAPoint(null); seek(aPoint); play()
    flash(`Lặp ${formatClock(aPoint)} → ${formatClock(t)}`)
  }

  const changeOffset = (d: number) => {
    setOffset((o) => {
      const n = Math.round((o + d) / 50) * 50
      if (ep) void updateEpisode(ep.id, { subOffset: n })
      flash(`Lệch phụ đề: ${n > 0 ? '+' : ''}${(n / 1000).toFixed(2)} giây`)
      return n
    })
  }
  const changeRate = (dir: 1 | -1) => {
    const i = RATES.indexOf(prefs.rate)
    const n = RATES[Math.max(0, Math.min(RATES.length - 1, (i < 0 ? 3 : i) + dir))]
    setPrefs({ rate: n }); flash(`Tốc độ ${n}×`)
  }
  const cycleSubMode = () => {
    const n = SUB_MODES[(SUB_MODES.indexOf(prefs.subMode) + 1) % SUB_MODES.length]
    setPrefs({ subMode: n }); flash(`Phụ đề tiếng Nhật: ${SUB_MODE_LABEL[n]}`)
  }
  const setMode = (m: WatchMode) => {
    setPrefs({ mode: m }); setPractice(null); setShowSpoilers(false)
    live.current.studyStart = Math.max(0, lastStartedIndex(jp, nowMs()) + 1)
    flash(`Chế độ: ${MODE_INFO[m].label}. ${MODE_INFO[m].hint}`, 2600)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    // Phóng toàn trang (không phải riêng khung video) để popup tra từ vẫn hiện được
    else { setTheater(true); void document.documentElement.requestFullscreen?.().catch(() => {}) }
  }
  useEffect(() => {
    const onFs = () => setTheater(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  // ---------- Hết câu: mỗi chế độ xử lý khác nhau ----------
  live.current.onLineEnd = (line: number) => {
    const L = live.current
    if (line < 0) return false
    if (L.replay != null) {
      // Vừa phát lại câu cho khung luyện tập
      L.replay = null
      if (practice?.kind === 'shadow') {
        if (practice.mine || practice.heard !== undefined) { setPractice({ ...practice, phase: 'compare' }); return true }
        setPractice(null)
        return false // không ghi âm: tự sang câu tiếp theo
      }
      return true
    }
    switch (L.prefs.mode) {
      case 'listen-check': setPractice({ kind: 'listen', line }); return true
      case 'dictation': setPractice({ kind: 'dictation', line }); return true
      case 'shadowing': setPractice({ kind: 'shadow', line, phase: 'gap' }); return true
      case 'study': {
        if (line + 1 - L.studyStart >= L.prefs.studyChunk) {
          setPractice({ kind: 'study', from: L.studyStart, to: line })
          L.studyStart = line + 1
          return true
        }
        return L.prefs.autoPause
      }
      default: return L.prefs.autoPause
    }
  }

  // Shadowing: khoảng lặng (ghi âm nếu bật) → phát lại bản gốc
  const shadowKey = practice?.kind === 'shadow' && practice.phase === 'gap' ? practice.line : -1
  useEffect(() => {
    if (shadowKey < 0) return
    const c = jp[shadowKey]
    const gapMs = Math.round((c.e - c.s) * prefs.shadowGap + 600)
    const ctrl = new AbortController()
    let alive = true
    ;(async () => {
      let mine: Blob | undefined, heard: string | undefined, score: number | undefined
      if (prefs.shadowRecord) {
        const rec = recordMic(gapMs, ctrl.signal).catch(() => undefined)
        const sr = canRecognizeSpeech() ? recognizeJapanese(gapMs).catch(() => undefined) : Promise.resolve(undefined)
        ;[mine, heard] = await Promise.all([rec, sr])
        if (heard !== undefined) score = compareReadings(await toReading(c.t), await inputReading(heard)).score
      } else {
        await new Promise((r) => window.setTimeout(r, gapMs))
      }
      if (!alive) return
      setPractice({ kind: 'shadow', line: shadowKey, phase: 'replay', mine, heard, score })
      replayLine(shadowKey)
    })()
    return () => { alive = false; ctrl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shadowKey])

  const continuePractice = () => { setPractice(null); play() }

  const answerListen = async (a: ListenAnswer) => {
    if (practice?.kind !== 'listen' || !ep) return
    setPractice({ ...practice, answered: a })
    const e = await getEpisode(ep.id)
    const l = e?.listening ?? { yes: 0, partly: 0, no: 0 }
    await updateEpisode(ep.id, { listening: { ...l, [a]: l[a] + 1 } })
  }
  const scoreDictation = async (score: number) => {
    if (!ep) return
    const e = await getEpisode(ep.id)
    const d = e?.dictation ?? { score: 0, count: 0 }
    await updateEpisode(ep.id, { dictation: { score: (d.score * d.count + score) / (d.count + 1), count: d.count + 1 } })
  }

  // ---------- Lưu câu + tạo thẻ (ảnh cảnh phim + âm thanh gốc), xem MineDialog ----------
  const [mining, setMining] = useState<MineTarget | null>(null)
  live.current.mining = !!mining
  const saveCurrent = (i = currentLine()) => {
    if (i < 0 || i >= jp.length || !v()) { flash('Chưa có câu thoại nào để lưu'); return }
    const c = jp[i]
    const mid = (c.s + c.e) / 2
    const translation = activeCues(tr, mid).map((j) => tr[j].t).join(' ').replace(/\n/g, ' ').trim() || undefined
    v()?.pause()
    setPractice(null)
    setMining({ index: i, cue: c, translation })
  }

  // ---------- Phím tắt ----------
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  keys.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('input, select, textarea, [contenteditable="true"]')) return
    if (live.current.mining) return // hộp lưu câu đang mở
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey
    // Khung luyện tập đang mở: Space = tiếp tục, 1-3 = trả lời kiểm tra nghe, S = nghe lại
    if (practice && plain) {
      if (key === ' ' && (practice.kind !== 'listen' || practice.answered) && !(practice.kind === 'shadow' && practice.phase !== 'compare')) {
        e.preventDefault(); continuePractice(); return
      }
      if (practice.kind === 'listen' && !practice.answered && ['1', '2', '3'].includes(key)) {
        e.preventDefault(); void answerListen((['yes', 'partly', 'no'] as const)[Number(key) - 1]); return
      }
      if (key === 's' && practice.kind !== 'study') { e.preventDefault(); replayLine(practice.line); return }
    }
    // Phím đổi được ở trang Phím tắt (src/modules/shortcuts/keymap.ts, nhóm "anime")
    const actions: Record<string, () => void> = {
      'anime.play': togglePlay,
      'anime.back5': () => seek((v()?.currentTime ?? 0) - 5), 'anime.fwd5': () => seek((v()?.currentTime ?? 0) + 5),
      'anime.prevLine': prevLine, 'anime.nextLine': nextLine, 'anime.repeat': repeatLine,
      'anime.loop': toggleLineLoop, 'anime.ab': cycleAB,
      'anime.autoPause': () => { setPrefs({ autoPause: !prefs.autoPause }); flash(prefs.autoPause ? 'Tắt tự dừng sau mỗi câu' : 'Bật tự dừng sau mỗi câu') },
      'anime.subMode': cycleSubMode,
      'anime.translation': () => { if (tr.length) setPrefs({ showTranslation: !prefs.showTranslation }) },
      'anime.furigana': () => setPrefs({ furigana: !prefs.furigana }),
      'anime.offsetMinus': () => changeOffset(-100), 'anime.offsetPlus': () => changeOffset(100),
      'anime.slower': () => changeRate(-1), 'anime.faster': () => changeRate(1),
      'anime.fullscreen': toggleFullscreen,
      'anime.mine': () => saveCurrent(),
    }
    const id = actionFor(e, 'anime')
    let fn = id ? actions[id] : undefined
    // Phím riêng của các chế độ học (chưa có trong trang Phím tắt)
    if (!fn && plain) {
      if (key === 'm') fn = () => setMode(VIEW_MODES[(VIEW_MODES.indexOf(mode) + 1) % VIEW_MODES.length])
      else if (key === 'g') fn = () => setPrefs({ highlight: !prefs.highlight })
      else if (e.shiftKey && key === 'ArrowLeft') fn = () => seek((v()?.currentTime ?? 0) - 3)
      else if (e.shiftKey && key === 'ArrowRight') fn = () => seek((v()?.currentTime ?? 0) + 3)
    }
    if (fn) { e.preventDefault(); fn() }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ---------- Di chuột vào phụ đề → tạm dừng ----------
  const subBoxRef = useRef<HTMLDivElement>(null)
  const hoverPaused = useRef(false)
  const resumeTimer = useRef<number | undefined>(undefined)
  const onSubEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !prefs.hoverPause) return
    window.clearInterval(resumeTimer.current)
    const x = v()
    if (x && !x.paused) { x.pause(); hoverPaused.current = true }
  }
  const onSubLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !hoverPaused.current) return
    window.clearInterval(resumeTimer.current)
    resumeTimer.current = window.setInterval(() => {
      const overPopup = document.querySelector('[role="dialog"]:hover')
      if (overPopup || subBoxRef.current?.matches(':hover')) return
      window.clearInterval(resumeTimer.current)
      if (hoverPaused.current) { hoverPaused.current = false; play() }
    }, 300)
  }
  const onSubClick = () => { hoverPaused.current = false; window.clearInterval(resumeTimer.current) }
  useEffect(() => () => window.clearInterval(resumeTimer.current), [])

  // ---------- Video thiếu / cần quyền / phụ đề ----------
  const allowAccess = async () => {
    const r = await openMedia(await getMedia(episodeId), true)
    if (r.state === 'ok') { fileRef.current = r.file; setMedia({ state: 'ok', url: URL.createObjectURL(r.file), name: r.name }) }
    else setMedia(r)
  }
  const chooseVideo = async () => {
    const [picked] = await pickFiles('video', false)
    if (!picked || !ep) return
    const m = makeMedia(ep.id, picked, false)
    if (m) await putMedia(m)
    if (picked.file.name !== ep.fileName) await updateEpisode(ep.id, { fileName: picked.file.name, size: picked.file.size })
    fileRef.current = picked.file
    setMedia({ state: 'ok', url: URL.createObjectURL(picked.file), name: picked.file.name })
  }
  const applySubs = async (track: 'jp' | 'tr', cues: Cue[], fileName: string) => {
    if (!ep) return
    await putSubs({ episodeId: ep.id, track, fileName, cues })
    const patch = track === 'jp' ? { subFile: fileName, subOffset: 0, stats: undefined } : { trFile: fileName }
    await updateEpisode(ep.id, patch)
    setEp((x) => (x ? { ...x, ...patch } : x))
    if (track === 'jp') { setJp(cues); setOffset(0) } else { setTr(cues); setPrefs({ showTranslation: true }) }
  }
  const addSubs = async () => {
    const files = await pickFiles('subs', true)
    for (const { file } of files) {
      const cues = await readSubtitleFile(file).catch(() => [] as Cue[])
      if (!cues.length) { flash(`Không đọc được ${file.name}`); continue }
      const track = looksJapanese(cues) ? 'jp' : 'tr'
      await applySubs(track, cues, file.name)
      flash(track === 'jp' ? `Đã thêm phụ đề tiếng Nhật (${cues.length} dòng)` : 'Đã thêm phụ đề dịch')
    }
  }
  const readEmbedded = async () => {
    const f = fileRef.current
    if (!f || media.state !== 'ok') return
    setBusy('Đang đọc phụ đề nhúng trong file video… 0%')
    try {
      const tracks = (await extractEmbeddedSubs(f, (p) => setBusy(`Đang đọc phụ đề nhúng trong file video… ${Math.round(p * 100)}%`))).filter((t) => t.cues.length)
      if (!tracks.length) { flash('File này không có phụ đề dạng chữ bên trong', 3000); return }
      const jpTrack = tracks.find((t) => isJapaneseLang(t.lang) || looksJapanese(t.cues))
      const trTrack = tracks.find((t) => t !== jpTrack && !looksJapanese(t.cues))
      if (jpTrack) await applySubs('jp', jpTrack.cues, `${media.name} · phụ đề nhúng #${jpTrack.number}`)
      if (trTrack) await applySubs('tr', trTrack.cues, `${media.name} · phụ đề nhúng #${trTrack.number}`)
      flash(jpTrack ? `Đã đọc ${jpTrack.cues.length} dòng phụ đề tiếng Nhật` : 'Không thấy phụ đề tiếng Nhật, chỉ có phụ đề dịch', 3000)
    } catch (e) {
      flash(`Không đọc được: ${(e as Error).message}`, 3000)
    } finally {
      setBusy(undefined)
    }
  }

  const idx = siblings.findIndex((s) => s.id === episodeId)
  const nextEp = idx >= 0 ? siblings[idx + 1] : undefined
  const prevEp = idx > 0 ? siblings[idx - 1] : undefined
  const speakers = useMemo(() => [...new Set(jp.map((c) => c.n).filter((n): n is string => !!n))], [jp])

  // ---------- Danh sách lời thoại: tự cuộn tới dòng đang nói ----------
  const listRef = useRef<HTMLDivElement>(null)
  const curLine = active[0] ?? -1
  useEffect(() => {
    if (curLine < 0 || panel !== 'lines') return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-line="${curLine}"]`)
    const box = listRef.current
    if (el && box) {
      const top = el.offsetTop - box.offsetTop
      if (top < box.scrollTop + 40 || top > box.scrollTop + box.clientHeight - 80) box.scrollTo({ top: top - box.clientHeight / 3, behavior: 'smooth' })
    }
  }, [curLine, panel])

  if (!ep && media.state !== 'missing') return <p className="text-muted">Đang mở…</p>

  const title = ep ? `${series?.title ?? ''} · ${episodeLabel(ep)}` : ''
  const subSize = `${prefs.subSize}rem`
  const isMkv = media.state === 'ok' && /\.(mkv|webm)$/i.test(media.name)
  const explainCue = jp[explainLine >= 0 ? explainLine : curLine >= 0 ? curLine : lastStartedIndex(jp, time * 1000 - offset)]
  const practiceTr = (line: number) => activeCues(tr, (jp[line].s + jp[line].e) / 2).map((j) => tr[j])

  const subtitleOverlay = (
    <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex flex-col items-center gap-1 px-4 text-center">
      {showJp && active.length > 0 && !practice && (
        <div ref={subBoxRef} onPointerEnter={onSubEnter} onPointerLeave={onSubLeave} onClickCapture={onSubClick}
          className={`pointer-events-auto max-w-[95%] rounded-xl bg-bg/85 px-3 py-1 text-text shadow-card transition ${prefs.subMode === 'blur' ? 'blur-md hover:blur-none' : ''}`}
          style={{ fontSize: subSize, lineHeight: prefs.furigana ? 2.1 : 1.6 }}>
          {active.map((i) => jp[i].t.split('\n').map((line, j) => (
            <div key={`${i}-${j}`}>
              {j === 0 && jp[i].n && <span className="mr-1 align-middle text-[0.5em] text-muted">{jp[i].n}</span>}
              <SubtitleLine text={line} furigana={prefs.furigana} k={k} highlight={prefs.highlight} />
            </div>
          )))}
        </div>
      )}
      {showTr && activeTr.length > 0 && !practice && (
        <div className="max-w-[95%] rounded-lg bg-bg/75 px-3 py-0.5 text-text" style={{ fontSize: `calc(${subSize} * ${mode === 'translation' ? 0.8 : 0.6})` }}>
          {activeTr.map((i) => <div key={i} className="whitespace-pre-line">{tr[i].t}</div>)}
        </div>
      )}
    </div>
  )

  const practiceOverlay = practice && (
    practice.kind === 'listen' ? (
      <ListenCheck cue={jp[practice.line]} tr={practiceTr(practice.line)} k={k} furigana={prefs.furigana} answered={practice.answered}
        onAnswer={answerListen} onReplay={() => replayLine(practice.line)} onContinue={continuePractice} />
    ) : practice.kind === 'dictation' ? (
      <Dictation key={practice.line} cue={jp[practice.line]} tr={practiceTr(practice.line)} k={k} furigana={prefs.furigana}
        onReplay={() => replayLine(practice.line)} onContinue={continuePractice} onScore={scoreDictation} />
    ) : practice.kind === 'shadow' ? (
      <Shadowing phase={practice.phase} cue={jp[practice.line]} gapMs={Math.round((jp[practice.line].e - jp[practice.line].s) * prefs.shadowGap + 600)}
        mine={practice.mine} heard={practice.heard} score={practice.score}
        onPlayOriginal={() => replayLine(practice.line)} onContinue={continuePractice}
        onReplay={() => { setPractice({ kind: 'shadow', line: practice.line, phase: 'gap' }); seekLine(practice.line) }} />
    ) : ep && series ? (
      <StudyBreak lines={jp.slice(practice.from, practice.to + 1)} ep={ep} seriesId={series.id} k={k} onContinue={continuePractice} />
    ) : null
  )

  const modeOptions = (
    <select value={mode} onChange={(e) => setMode(e.target.value as WatchMode)} aria-label="Chế độ xem (M)" title={MODE_INFO[mode].hint}
      className="min-h-10 max-w-40 rounded-lg border border-border bg-surface px-1 text-sm hover:bg-surface-2">
      <optgroup label="Cách xem">
        {VIEW_MODES.map((m) => <option key={m} value={m}>{MODE_INFO[m].label}</option>)}
      </optgroup>
      <optgroup label="Luyện tập">
        {(['listen-check', 'dictation', 'shadowing', 'study'] as WatchMode[]).map((m) => <option key={m} value={m}>{MODE_INFO[m].label}</option>)}
      </optgroup>
    </select>
  )

  const controls = (
    <div className="grid gap-1 border-t border-border bg-surface px-2 py-1.5">
      <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} aria-label="Tua video"
        onChange={(e) => seek(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
      <div className="flex flex-wrap items-center gap-0.5">
        <IconBtn label="Lùi 3 giây (Shift+←)" onClick={() => seek(time - 3)}><span className="text-xs">−3s</span></IconBtn>
        <IconBtn label="Câu trước (A)" onClick={prevLine}>⏮</IconBtn>
        <IconBtn label={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'} onClick={togglePlay} className="text-lg">{playing ? '⏸' : '▶'}</IconBtn>
        <IconBtn label="Câu sau (D)" onClick={nextLine}>⏭</IconBtn>
        <IconBtn label="Nghe lại câu này (S)" onClick={repeatLine}>↺</IconBtn>
        <IconBtn label="Lặp câu này (L)" onClick={toggleLineLoop} active={!!loop?.line}>🔁</IconBtn>
        <IconBtn label="Lặp đoạn A-B (B)" onClick={cycleAB} active={(!!loop && !loop.line) || aPoint != null}>{aPoint != null ? 'A…' : 'A-B'}</IconBtn>
        <IconBtn label="Tự dừng sau mỗi câu (P)" onClick={() => setPrefs({ autoPause: !prefs.autoPause })} active={prefs.autoPause}><span className="text-xs">Tự dừng</span></IconBtn>
        <IconBtn label="Lưu câu này + tạo thẻ, kèm ảnh và âm thanh gốc (C)" onClick={() => saveCurrent()} disabled={!!busy}><span>★</span><span className="text-xs">Lưu câu</span></IconBtn>
        <span className="px-2 text-xs tabular-nums text-muted">{formatClock(time)} / {formatClock(duration)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-0.5">
          {modeOptions}
          <select value={prefs.rate} onChange={(e) => setPrefs({ rate: Number(e.target.value) })} aria-label="Tốc độ ([ ])"
            className="min-h-10 rounded-lg bg-surface px-1 text-sm hover:bg-surface-2">
            {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
          <IconBtn label={`Phụ đề tiếng Nhật: ${SUB_MODE_LABEL[prefs.subMode]} (H)`} onClick={cycleSubMode} active={prefs.subMode !== 'show'}>
            <span className="jp">字</span><span className="text-xs">{SUB_MODE_LABEL[prefs.subMode]}</span>
          </IconBtn>
          <IconBtn label="Furigana trên phụ đề (R)" onClick={() => setPrefs({ furigana: !prefs.furigana })} active={prefs.furigana}><span className="jp">ふ</span></IconBtn>
          <IconBtn label="Tô màu từ mới / đang học (G)" onClick={() => setPrefs({ highlight: !prefs.highlight })} active={prefs.highlight}><span className="text-xs">Tô màu</span></IconBtn>
          {tr.length > 0 && mode === 'assisted' && (
            <IconBtn label="Phụ đề dịch (T)" onClick={() => setPrefs({ showTranslation: !prefs.showTranslation })} active={prefs.showTranslation}><span className="text-xs">Dịch</span></IconBtn>
          )}
          <IconBtn label="Phụ đề sớm hơn 0,1 giây (Z)" onClick={() => changeOffset(-100)}>−</IconBtn>
          <span className="text-xs tabular-nums text-muted" title="Lệch phụ đề">{offset > 0 ? '+' : ''}{(offset / 1000).toFixed(1)}s</span>
          <IconBtn label="Phụ đề muộn hơn 0,1 giây (X)" onClick={() => changeOffset(100)}>+</IconBtn>
          <IconBtn label="Toàn màn hình (F)" onClick={toggleFullscreen}>⛶</IconBtn>
        </div>
      </div>
    </div>
  )

  const videoBox = (
    <div className={`relative grid place-items-center overflow-hidden bg-black ${theater ? 'min-h-0 flex-1' : 'aspect-video rounded-t-card'}`}>
      {media.state === 'ok' ? (
        <video
          ref={videoRef}
          src={media.url}
          className={`size-full object-contain transition-opacity ${hideVideo ? 'opacity-0' : ''}`}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => { setPlaying(false); save() }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const x = e.currentTarget
            setDuration(x.duration)
            x.playbackRate = live.current.prefs.rate
            x.preservesPitch = true
            if (startAt != null && startAt > 0) { x.currentTime = startAt; flash(`Mở ở ${formatClock(startAt)}`) }
            else if (ep && ep.position > 5 && !isNearEnd(ep.position, x.duration)) { x.currentTime = ep.position; flash(`Xem tiếp từ ${formatClock(ep.position)}`) }
            live.current.studyStart = Math.max(0, lastStartedIndex(jp, x.currentTime * 1000 - offset) + 1)
            if (ep && !ep.duration) void updateEpisode(ep.id, { duration: x.duration })
          }}
          onEnded={() => { setEnded(true); save() }}
          onError={() => setVideoError(`Trình duyệt không phát được file này. ${playabilityHint(media.name) ?? 'Thử đổi sang .mp4 (H.264 + AAC).'}`)}
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="grid max-w-md gap-3 p-6 text-center text-sm text-white">
          {media.state === 'loading' && <p>Đang mở video…</p>}
          {media.state === 'permission' && <>
            <p>Trình duyệt cần bạn cho phép mở lại file video trên máy.</p>
            <Button onClick={allowAccess}>Cho phép mở video</Button>
          </>}
          {media.state === 'missing' && <>
            <p>{media.reason}</p>
            {ep && <p className="text-xs opacity-80">Chọn file <b>{ep.fileName}</b> (hoặc file video khác của tập này).</p>}
            {ep && <Button onClick={chooseVideo}>Chọn file video</Button>}
          </>}
        </div>
      )}
      {hideVideo && media.state === 'ok' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-white/80">
          <div><div className="text-5xl" aria-hidden>🎧</div><p className="mt-2 text-sm">Chế độ chỉ nghe</p></div>
        </div>
      )}
      {media.state === 'ok' && subtitleOverlay}
      {practiceOverlay}
      {videoError && <p className="absolute inset-x-4 top-4 rounded-lg bg-bg/90 p-3 text-sm text-bad">{videoError}</p>}
      {ended && ep && (
        <div className="absolute right-4 top-4 grid max-w-xs gap-2 rounded-xl bg-bg/95 p-3 text-sm text-text shadow-card">
          <p className="font-medium">Hết tập 🎉</p>
          <Button variant="soft" onClick={() => onReview(ep.id)}>Ôn thẻ của tập này</Button>
          {nextEp && <>
            <Button variant="soft" onClick={() => onStudyEpisode(nextEp.id)}>Học trước từ vựng {episodeLabel(nextEp)}</Button>
            <Button onClick={() => onOpenEpisode(nextEp.id)}>Xem {episodeLabel(nextEp)} ▶</Button>
          </>}
        </div>
      )}
      {(toast || busy) && <p className="pointer-events-none absolute left-1/2 top-4 max-w-[90%] -translate-x-1/2 rounded-lg bg-bg/90 px-3 py-1.5 text-center text-sm text-text shadow-card">{busy ?? toast}</p>}
      {loop && <p className="pointer-events-none absolute left-4 top-4 rounded-md bg-primary px-2 py-0.5 text-xs text-on-primary">{loop.line ? 'Lặp câu' : 'Lặp A-B'}</p>}
      {mode !== 'assisted' && !loop && <p className="pointer-events-none absolute left-4 top-4 rounded-md bg-bg/80 px-2 py-0.5 text-xs text-text">{MODE_INFO[mode].label}</p>}
    </div>
  )

  const mineDialog = mining && videoRef.current && ep && series && (
    <MineDialog video={videoRef.current} target={mining} offset={offset} episode={ep} series={series}
      onClose={() => { setMining(null); live.current.activeKey = '' }} onSaved={() => setPanel('saved')} />
  )

  if (theater) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        {videoBox}
        {controls}
        {mineDialog}
      </div>
    )
  }

  const tabs: { id: Panel; label: string }[] = [
    { id: 'lines', label: 'Lời thoại' }, { id: 'vocab', label: 'Từ vựng' }, { id: 'saved', label: 'Câu đã lưu' },
    { id: 'explain', label: 'Giải thích' }, { id: 'notes', label: 'Ghi chú' },
  ]

  return (
    <div className="grid gap-4">
      {mineDialog}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onClose}>← Danh sách tập</Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
        {ep && (
          <Button variant={ep.studiedAt ? 'soft' : 'ghost'} onClick={async () => {
            const studiedAt = ep.studiedAt ? undefined : Date.now()
            await updateEpisode(ep.id, { studiedAt }); setEp({ ...ep, studiedAt })
          }}>{ep.studiedAt ? '✓ Đã học' : 'Đánh dấu đã học'}</Button>
        )}
        {prevEp && <Button variant="ghost" onClick={() => onOpenEpisode(prevEp.id)}>← Tập trước</Button>}
        {nextEp && <Button variant="soft" onClick={() => onOpenEpisode(nextEp.id)}>Tập sau →</Button>}
      </div>

      <div className={`grid gap-4 ${prefs.showTranscript ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {videoBox}
          {controls}
        </div>

        {prefs.showTranscript && (
          <Card className="flex max-h-[80dvh] flex-col gap-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <div role="tablist" aria-label="Bảng bên" className="flex flex-wrap gap-1">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" aria-selected={panel === t.id} onClick={() => setPanel(t.id)}
                    className={`min-h-9 rounded-lg px-2.5 text-sm transition ${panel === t.id ? 'bg-primary-soft font-medium text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>{t.label}</button>
                ))}
              </div>
              <IconBtn label="Ẩn bảng bên" onClick={() => setPrefs({ showTranscript: false })}>✕</IconBtn>
            </div>
            <div className="min-h-0 overflow-y-auto pr-1" ref={panel === 'lines' ? listRef : undefined}>
              {panel === 'vocab' && ep && series ? (
                <VocabPanel episode={ep} series={series} />
              ) : panel === 'saved' && ep && series ? (
                <SentencesPanel series={series} ep={ep} onSeek={(ms) => seek(ms / 1000)} onSaveCurrent={() => saveCurrent()} />
              ) : panel === 'explain' ? (
                <ExplainPanel cue={explainCue} series={series} />
              ) : panel === 'notes' && ep && series ? (
                <NotesPanel series={series} ep={ep} speakers={speakers} />
              ) : jp.length === 0 ? (
                <div className="grid gap-2 text-sm text-muted">
                  <p>Tập này chưa có phụ đề tiếng Nhật. Thêm file .srt / .ass / .vtt để tra từ và tính điểm hiểu.</p>
                  <Button variant="soft" onClick={addSubs}>Thêm file phụ đề</Button>
                  {isMkv && <Button variant="soft" onClick={readEmbedded} disabled={!!busy}>Đọc phụ đề nhúng trong video</Button>}
                </div>
              ) : hideTranscript ? (
                <div className="grid gap-2 text-sm text-muted">
                  <p>Lời thoại đang ẩn trong chế độ <b>{MODE_INFO[mode].label}</b> để bạn tập nghe.</p>
                  <Button variant="ghost" onClick={() => setShowSpoilers(true)}>Hiện lời thoại</Button>
                </div>
              ) : (
                <div className="relative">
                  {jp.map((c, i) => (
                    <div key={i} data-line={i}
                      className={`group flex gap-2 rounded-lg px-2 py-1 ${active.includes(i) ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}>
                      <button className="w-11 shrink-0 pt-1 text-left text-xs tabular-nums text-muted hover:text-primary"
                        onClick={() => seekLine(i)} title="Nhảy tới câu này">{formatClock((c.s + offset) / 1000)}</button>
                      <button className="jp min-w-0 flex-1 whitespace-pre-line text-left leading-relaxed" onClick={() => seekLine(i)}>
                        {c.n && <span className="mr-1 text-xs text-muted">{c.n}:</span>}{c.t}
                      </button>
                      <div className="flex shrink-0 flex-col self-start opacity-60 group-hover:opacity-100">
                        <button className="jp rounded-md px-1 text-muted hover:bg-surface hover:text-primary"
                          onClick={(e) => { v()?.pause(); openLookup(c.t.replace(/\n/g, ' '), { x: e.clientX, y: e.clientY }) }}
                          title="Tra từ trong câu" aria-label="Tra từ trong câu">辞</button>
                        <button className="rounded-md px-1 text-xs text-muted hover:bg-surface hover:text-primary"
                          onClick={() => { setExplainLine(i); setPanel('explain') }} title="Giải thích cách nói" aria-label="Giải thích cách nói">?</button>
                        <button className="rounded-md px-1 text-xs text-muted hover:bg-surface hover:text-primary"
                          onClick={() => saveCurrent(i)} title="Lưu câu này + tạo thẻ (ảnh + tiếng)" aria-label="Tạo thẻ từ câu này">★</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {!prefs.showTranscript && <Button variant="soft" onClick={() => setPrefs({ showTranscript: true })}>Hiện bảng lời thoại & từ vựng</Button>}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.hoverPause} onChange={(e) => setPrefs({ hoverPause: e.target.checked })} />
          Di chuột vào phụ đề thì tạm dừng
        </label>
        <label className="flex items-center gap-2">
          Cỡ phụ đề
          <input type="range" min={1} max={3} step={0.1} value={prefs.subSize} onChange={(e) => setPrefs({ subSize: Number(e.target.value) })} aria-label="Cỡ phụ đề" />
        </label>
        {mode === 'study' && (
          <label className="flex items-center gap-2">
            Mỗi đoạn
            <input type="number" min={5} max={100} className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1" value={prefs.studyChunk}
              onChange={(e) => setPrefs({ studyChunk: Math.max(5, Number(e.target.value) || 20) })} /> câu
          </label>
        )}
        {mode === 'shadowing' && (
          <>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={prefs.shadowRecord} onChange={(e) => setPrefs({ shadowRecord: e.target.checked })} />
              Ghi âm giọng tôi{canRecognizeSpeech() ? ' + chấm điểm (cần mạng)' : ''}
            </label>
            <label className="flex items-center gap-2">
              Khoảng lặng ×
              <input type="number" min={0.5} max={3} step={0.1} className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1" value={prefs.shadowGap}
                onChange={(e) => setPrefs({ shadowGap: Math.min(3, Math.max(0.5, Number(e.target.value) || 1.3)) })} />
            </label>
          </>
        )}
        <Button variant="ghost" onClick={addSubs}>Đổi / thêm phụ đề</Button>
        {isMkv && <Button variant="ghost" onClick={readEmbedded} disabled={!!busy}>Đọc phụ đề nhúng</Button>}
        {ep && <Button variant="ghost" onClick={() => onReview(ep.id)}>Ôn thẻ của tập này</Button>}
        {ep?.listening && (
          <span className="text-xs text-muted">Kiểm tra nghe: hiểu {ep.listening.yes} · một phần {ep.listening.partly} · không {ep.listening.no}</span>
        )}
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">Phím tắt</summary>
        <p className="mt-2 leading-relaxed">
          Space: phát/dừng (khi đang luyện tập: tiếp tục) · ← →: lùi/tới 5 giây · Shift+← →: lùi/tới 3 giây · A / D: câu trước / sau ·
          S: nghe lại câu · L: lặp câu · B: lặp đoạn A-B · P: tự dừng sau mỗi câu · C: lưu câu + tạo thẻ (ảnh + âm thanh gốc) ·
          M: đổi cách xem · H: hiện / mờ / ẩn phụ đề Nhật · R: furigana · G: tô màu từ · T: phụ đề dịch ·
          Z / X: phụ đề sớm / muộn 0,1 giây · [ ]: chậm / nhanh · F: toàn màn hình · 1 2 3: trả lời khi kiểm tra nghe
        </p>
        <p className="mt-1">Đây là phím mặc định. <a href="#/shortcuts" className="underline hover:text-text">Đổi phím tắt</a> · bấm ? để xem phím đang dùng.</p>
        <p className="mt-1">Màu phụ đề: <span className="underline decoration-primary decoration-2 underline-offset-4">gạch chân</span> = từ mới · <span className="text-warn">vàng</span> = đang học · thường = đã biết.</p>
      </details>
    </div>
  )
}

/** Phát âm thanh gốc của một câu đã lưu (dùng lại ở nơi khác). */
export { playClip }
