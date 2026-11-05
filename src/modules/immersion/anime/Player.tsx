/**
 * TRÌNH XEM ANIME
 * - Video + phụ đề tiếng Nhật vẽ đè lên video, mỗi từ bấm/di chuột để tra (popup Từ điển).
 * - Di chuột vào phụ đề → video tạm dừng, rời chuột → chạy tiếp (tắt được).
 * - Lời thoại bên cạnh: bấm dòng để nhảy tới, dòng đang nói được tô sáng.
 * - Shadowing: lặp câu, lặp đoạn A-B, tự dừng sau mỗi câu, giảm tốc độ.
 * - Nhớ chỗ đang xem (Smart Resume), chỉnh lệch phụ đề, sang tập tiếp theo.
 * - Tạo thẻ ôn tập từ câu đang nói, kèm ảnh cảnh phim + tiếng nhân vật (phím C, xem MineDialog).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { JapaneseText } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { episodeLabel } from './importer'
import { makeMedia, openMedia, pickFiles, playabilityHint } from './media'
import {
  getEpisode, getMedia, getPlayerPrefs, getSeries, getSubs, isNearEnd, listEpisodes,
  putMedia, putSubs, savePlayerPrefs, saveProgress, updateEpisode,
} from './store'
import { activeCues, formatClock, lastStartedIndex, looksJapanese, readSubtitleFile } from './subtitles'
import { DEFAULT_PLAYER_PREFS, type AnimeEpisode, type AnimeSeries, type Cue, type PlayerPrefs, type SubMode } from './types'
import { VocabPanel } from './VocabPanel'
import { MineDialog, type MineTarget } from './MineDialog'

type MediaState =
  | { state: 'loading' }
  | { state: 'ok'; url: string; name: string }
  | { state: 'permission' }
  | { state: 'missing'; reason: string }

const RATES = [0.5, 0.75, 0.85, 1, 1.25, 1.5]
const SUB_MODES: SubMode[] = ['show', 'blur', 'hide']
const SUB_MODE_LABEL: Record<SubMode, string> = { show: 'Hiện', blur: 'Mờ', hide: 'Ẩn' }

function IconBtn({ label, onClick, active, children, className = '' }: {
  label: string; onClick: () => void; active?: boolean; children: ReactNode; className?: string
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-0.5 rounded-lg px-2 text-sm transition ${active ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-2'} ${className}`}>
      {children}
    </button>
  )
}

export function Player({ episodeId, onClose, onOpenEpisode }: {
  episodeId: string
  onClose: () => void
  onOpenEpisode: (id: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
  const [panel, setPanel] = useState<'lines' | 'vocab'>('lines')
  const [toast, setToast] = useState<string>()
  const [videoError, setVideoError] = useState<string>()
  const [mining, setMining] = useState<MineTarget | null>(null)

  // Giá trị mới nhất cho vòng lặp requestAnimationFrame (không gây vẽ lại)
  const live = useRef({ jp, tr, offset, loop, prefs, pauseAt: null as number | null, activeKey: '', trKey: '', mining: false })
  live.current.jp = jp; live.current.tr = tr; live.current.offset = offset; live.current.loop = loop; live.current.prefs = prefs
  live.current.mining = !!mining

  // ---------- Tải dữ liệu tập ----------
  useEffect(() => {
    let alive = true
    setMedia({ state: 'loading' }); setEnded(false); setLoop(null); setAPoint(null); setVideoError(undefined)
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
      if (r.state === 'ok') setMedia({ state: 'ok', url: URL.createObjectURL(r.file), name: r.name })
      else setMedia(r)
    })()
    return () => { alive = false }
  }, [episodeId])

  // Thu hồi URL video cũ khi đổi file / đóng trình xem
  useEffect(() => () => { if (media.state === 'ok') URL.revokeObjectURL(media.url) }, [media])

  const setPrefs = useCallback((patch: Partial<PlayerPrefs>) => {
    setPrefsState((p) => { const n = { ...p, ...patch }; void savePlayerPrefs(n); return n })
  }, [])

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = prefs.rate }, [prefs.rate, media])

  // Thông báo ngắn trên video (ví dụ "Tốc độ 0.75×"), tự ẩn sau 1,4 giây
  const toastTimer = useRef<number | undefined>(undefined)
  const flash = useCallback((m: string) => {
    setToast(m)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(undefined), 1400)
  }, [])

  // ---------- Lưu chỗ đang xem ----------
  const save = useCallback(() => {
    const v = videoRef.current
    if (!v || !ep || !v.duration || v.currentTime < 1) return
    void saveProgress(ep.id, v.currentTime, v.duration)
  }, [ep])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(save, 5000)
    return () => window.clearInterval(id)
  }, [playing, save])

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

  // ---------- Vòng lặp theo dõi thời gian (60 lần/giây khi đang phát) ----------
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v) {
        const L = live.current
        const ms = v.currentTime * 1000 - L.offset
        const act = activeCues(L.jp, ms)
        const key = act.join(',')
        if (key !== L.activeKey) {
          L.activeKey = key
          setActive(act)
          // Shadowing: hẹn dừng ở cuối câu vừa bắt đầu
          if (L.prefs.autoPause && act.length) L.pauseAt = Math.max(...act.map((i) => L.jp[i].e)) + L.offset
        }
        const actTr = activeCues(L.tr, ms)
        const trKey = actTr.join(',')
        if (trKey !== L.trKey) { L.trKey = trKey; setActiveTr(actTr) }
        // Đang ghi câu cho thẻ: không lặp / tự dừng, để ghi trọn câu
        if (!v.paused && !L.mining) {
          const now = v.currentTime * 1000
          if (L.loop && v.currentTime >= L.loop.b) v.currentTime = L.loop.a
          else if (L.prefs.autoPause && !L.loop && L.pauseAt != null && now >= L.pauseAt) {
            L.pauseAt = null
            v.pause()
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
  const togglePlay = () => { const x = v(); if (!x) return; if (x.paused) play(); else x.pause() }
  const seek = (sec: number) => { const x = v(); if (x) { x.currentTime = Math.max(0, Math.min(sec, x.duration || sec)); setTime(x.currentTime) } }
  const nowMs = () => (v()?.currentTime ?? 0) * 1000 - offset

  /** Dòng "hiện tại": dòng đang hiện, hoặc dòng vừa nói xong gần nhất. */
  const currentLine = () => (active.length ? active[0] : lastStartedIndex(jp, nowMs()))
  const seekLine = (i: number, autoplay = true) => {
    if (i < 0 || i >= jp.length) return
    live.current.pauseAt = null
    live.current.activeKey = '' // để "tự dừng" hẹn lại cuối câu này
    seek((jp[i].s + offset) / 1000 + 0.001)
    if (autoplay) play()
  }
  const prevLine = () => {
    const cur = lastStartedIndex(jp, nowMs())
    if (cur < 0) return
    // Đang ở giữa câu → về câu trước; đang ở khoảng lặng sau câu → về chính câu đó
    seekLine(nowMs() < jp[cur].e ? cur - 1 : cur)
  }
  const nextLine = () => seekLine(lastStartedIndex(jp, nowMs()) + 1)
  const repeatLine = () => seekLine(currentLine())

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
    if (aPoint == null) { setLoop(null); setAPoint(t); flash(`Điểm A: ${formatClock(t)}. Bấm lần nữa để chọn điểm B`); return }
    if (t <= aPoint + 0.3) { flash('Điểm B phải sau điểm A'); return }
    setLoop({ a: aPoint, b: t }); setAPoint(null); seek(aPoint); play()
    flash(`Lặp ${formatClock(aPoint)} → ${formatClock(t)}`)
  }

  /** Mở hộp tạo thẻ cho dòng i (mặc định: dòng hiện tại). */
  const openMine = (i = currentLine()) => {
    if (i < 0 || i >= jp.length || !v()) { flash('Chưa có câu thoại nào để tạo thẻ'); return }
    const c = jp[i]
    const mid = (c.s + c.e) / 2
    const translation = activeCues(tr, mid).map((j) => tr[j].t).join(' ').replace(/\n/g, ' ').trim() || undefined
    v()?.pause()
    setMining({ index: i, cue: c, translation })
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

  // ---------- Phím tắt ----------
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  keys.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('input, select, textarea, [contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return
    if (live.current.mining) return // hộp tạo thẻ đang mở
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const actions: Record<string, () => void> = {
      ' ': togglePlay, k: togglePlay,
      ArrowLeft: () => seek((v()?.currentTime ?? 0) - 5), ArrowRight: () => seek((v()?.currentTime ?? 0) + 5),
      a: prevLine, d: nextLine, s: repeatLine, l: toggleLineLoop, b: cycleAB,
      p: () => { setPrefs({ autoPause: !prefs.autoPause }); flash(prefs.autoPause ? 'Tắt tự dừng sau mỗi câu' : 'Bật tự dừng sau mỗi câu') },
      h: cycleSubMode,
      t: () => { if (tr.length) setPrefs({ showTranslation: !prefs.showTranslation }) },
      r: () => setPrefs({ furigana: !prefs.furigana }),
      z: () => changeOffset(-100), x: () => changeOffset(100),
      '[': () => changeRate(-1), ']': () => changeRate(1),
      f: toggleFullscreen,
      c: () => openMine(),
    }
    const fn = actions[k]
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
    // Chạy tiếp khi chuột không còn trên phụ đề lẫn popup tra từ
    window.clearInterval(resumeTimer.current)
    resumeTimer.current = window.setInterval(() => {
      const overPopup = document.querySelector('[role="dialog"]:hover')
      if (overPopup || subBoxRef.current?.matches(':hover')) return
      window.clearInterval(resumeTimer.current)
      if (hoverPaused.current) { hoverPaused.current = false; play() }
    }, 300)
  }
  // Bấm vào một từ = muốn đọc kỹ → không tự chạy tiếp nữa
  const onSubClick = () => { hoverPaused.current = false; window.clearInterval(resumeTimer.current) }
  useEffect(() => () => window.clearInterval(resumeTimer.current), [])

  // ---------- Video bị thiếu / cần quyền ----------
  const allowAccess = async () => {
    const r = await openMedia(await getMedia(episodeId), true)
    if (r.state === 'ok') setMedia({ state: 'ok', url: URL.createObjectURL(r.file), name: r.name })
    else setMedia(r)
  }
  const chooseVideo = async () => {
    const [picked] = await pickFiles('video', false)
    if (!picked || !ep) return
    const m = makeMedia(ep.id, picked, false)
    if (m) await putMedia(m)
    if (picked.file.name !== ep.fileName) await updateEpisode(ep.id, { fileName: picked.file.name, size: picked.file.size })
    setMedia({ state: 'ok', url: URL.createObjectURL(picked.file), name: picked.file.name })
  }
  const addSubs = async () => {
    const files = await pickFiles('subs', true)
    if (!ep || !files.length) return
    for (const { file } of files) {
      const cues = await readSubtitleFile(file).catch(() => [] as Cue[])
      if (!cues.length) { flash(`Không đọc được ${file.name}`); continue }
      const track = looksJapanese(cues) ? 'jp' : 'tr'
      await putSubs({ episodeId: ep.id, track, fileName: file.name, cues })
      const patch = track === 'jp' ? { subFile: file.name, subOffset: 0, stats: undefined } : { trFile: file.name }
      await updateEpisode(ep.id, patch)
      setEp((x) => (x ? { ...x, ...patch } : x))
      if (track === 'jp') { setJp(cues); setOffset(0) } else { setTr(cues); setPrefs({ showTranslation: true }) }
      flash(track === 'jp' ? `Đã thêm phụ đề tiếng Nhật (${cues.length} dòng)` : 'Đã thêm phụ đề dịch')
    }
  }

  const idx = siblings.findIndex((s) => s.id === episodeId)
  const nextEp = idx >= 0 ? siblings[idx + 1] : undefined
  const prevEp = idx > 0 ? siblings[idx - 1] : undefined

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

  const transcript = useMemo(() => jp.map((c, i) => ({ c, i })), [jp])

  if (!ep && media.state !== 'missing') return <p className="text-muted">Đang mở…</p>

  const title = ep ? `${series?.title ?? ''} · ${episodeLabel(ep)}` : ''
  const subSize = `${prefs.subSize}rem`

  const subtitleOverlay = (
    <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex flex-col items-center gap-1 px-4 text-center">
      {prefs.subMode !== 'hide' && active.length > 0 && (
        <div ref={subBoxRef} onPointerEnter={onSubEnter} onPointerLeave={onSubLeave} onClickCapture={onSubClick}
          className={`pointer-events-auto max-w-[95%] rounded-xl bg-bg/85 px-3 py-1 text-text shadow-card transition ${prefs.subMode === 'blur' ? 'blur-md hover:blur-none' : ''}`}
          style={{ fontSize: subSize, lineHeight: prefs.furigana ? 2.1 : 1.6 }}>
          {active.map((i) => jp[i].t.split('\n').map((line, j) => (
            <div key={`${i}-${j}`}><JapaneseText text={line} furigana={prefs.furigana} /></div>
          )))}
        </div>
      )}
      {prefs.showTranslation && activeTr.length > 0 && (
        <div className="max-w-[95%] rounded-lg bg-bg/75 px-3 py-0.5 text-text" style={{ fontSize: `calc(${subSize} * 0.6)` }}>
          {activeTr.map((i) => <div key={i} className="whitespace-pre-line">{tr[i].t}</div>)}
        </div>
      )}
    </div>
  )

  const controls = (
    <div className="grid gap-1 border-t border-border bg-surface px-2 py-1.5">
      <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} aria-label="Tua video"
        onChange={(e) => seek(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
      <div className="flex flex-wrap items-center gap-0.5">
        <IconBtn label="Câu trước (A)" onClick={prevLine}>⏮</IconBtn>
        <IconBtn label={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'} onClick={togglePlay} className="text-lg">{playing ? '⏸' : '▶'}</IconBtn>
        <IconBtn label="Câu sau (D)" onClick={nextLine}>⏭</IconBtn>
        <IconBtn label="Nghe lại câu này (S)" onClick={repeatLine}>↺</IconBtn>
        <IconBtn label="Lặp câu này (L)" onClick={toggleLineLoop} active={!!loop?.line}>🔁</IconBtn>
        <IconBtn label="Lặp đoạn A-B (B)" onClick={cycleAB} active={!!loop && !loop.line || aPoint != null}>
          {aPoint != null ? 'A…' : 'A-B'}
        </IconBtn>
        <IconBtn label="Tạo thẻ từ câu này, kèm ảnh và tiếng (C)" onClick={() => openMine()}>📸</IconBtn>
        <IconBtn label="Shadowing: tự dừng sau mỗi câu (P)" onClick={() => setPrefs({ autoPause: !prefs.autoPause })} active={prefs.autoPause}>
          <span className="text-xs">Tự dừng</span>
        </IconBtn>
        <span className="px-2 text-xs tabular-nums text-muted">{formatClock(time)} / {formatClock(duration)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-0.5">
          <select value={prefs.rate} onChange={(e) => setPrefs({ rate: Number(e.target.value) })} aria-label="Tốc độ ([ ])"
            className="min-h-10 rounded-lg bg-surface px-1 text-sm hover:bg-surface-2">
            {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
          <IconBtn label={`Phụ đề tiếng Nhật: ${SUB_MODE_LABEL[prefs.subMode]} (H)`} onClick={cycleSubMode} active={prefs.subMode !== 'show'}>
            <span className="jp">字</span><span className="ml-0.5 text-xs">{SUB_MODE_LABEL[prefs.subMode]}</span>
          </IconBtn>
          <IconBtn label="Furigana trên phụ đề (R)" onClick={() => setPrefs({ furigana: !prefs.furigana })} active={prefs.furigana}><span className="jp">ふ</span></IconBtn>
          {tr.length > 0 && (
            <IconBtn label="Phụ đề dịch (T)" onClick={() => setPrefs({ showTranslation: !prefs.showTranslation })} active={prefs.showTranslation}>
              <span className="text-xs">Dịch</span>
            </IconBtn>
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
          className="size-full object-contain"
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => { setPlaying(false); save() }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const x = e.currentTarget
            setDuration(x.duration)
            x.playbackRate = live.current.prefs.rate
            if (ep && ep.position > 5 && !isNearEnd(ep.position, x.duration)) { x.currentTime = ep.position; flash(`Xem tiếp từ ${formatClock(ep.position)}`) }
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
      {media.state === 'ok' && subtitleOverlay}
      {videoError && <p className="absolute inset-x-4 top-4 rounded-lg bg-bg/90 p-3 text-sm text-bad">{videoError}</p>}
      {ended && nextEp && (
        <div className="absolute right-4 top-4 rounded-xl bg-bg/90 p-3 text-sm shadow-card">
          <p className="mb-2">Hết tập. Xem tiếp?</p>
          <Button onClick={() => onOpenEpisode(nextEp.id)}>{episodeLabel(nextEp)} ▶</Button>
        </div>
      )}
      {toast && <p className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-bg/90 px-3 py-1.5 text-sm text-text shadow-card">{toast}</p>}
      {loop && <p className="pointer-events-none absolute left-4 top-4 rounded-md bg-primary px-2 py-0.5 text-xs text-on-primary">{loop.line ? 'Lặp câu' : 'Lặp A-B'}</p>}
    </div>
  )

  const mineDialog = mining && videoRef.current && ep && (
    <MineDialog video={videoRef.current} target={mining} offset={offset} episodeId={ep.id}
      seriesTitle={series?.title ?? ''} episodeName={episodeLabel(ep)} onClose={() => setMining(null)} />
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

  return (
    <div className="grid gap-4">
      {mineDialog}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onClose}>← Danh sách tập</Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
        {prevEp && <Button variant="ghost" onClick={() => onOpenEpisode(prevEp.id)}>← Tập trước</Button>}
        {nextEp && <Button variant="soft" onClick={() => onOpenEpisode(nextEp.id)}>Tập sau →</Button>}
      </div>

      <div className={`grid gap-4 ${prefs.showTranscript ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {videoBox}
          {controls}
        </div>

        {prefs.showTranscript && (
          <Card className="flex max-h-[75dvh] flex-col gap-3 p-3">
            <div className="flex items-center justify-between gap-2">
              <Segmented label="Bảng bên" value={panel} onChange={setPanel}
                options={[{ value: 'lines', label: 'Lời thoại' }, { value: 'vocab', label: 'Từ vựng' }]} />
              <IconBtn label="Ẩn bảng bên" onClick={() => setPrefs({ showTranscript: false })}>✕</IconBtn>
            </div>
            {panel === 'vocab' && ep ? (
              <VocabPanel episode={ep} seriesTitle={series?.title ?? ''} className="min-h-0 overflow-y-auto pr-1" />
            ) : jp.length === 0 ? (
              <div className="grid gap-2 text-sm text-muted">
                <p>Tập này chưa có phụ đề tiếng Nhật. Thêm file .srt / .ass / .vtt để tra từ và tính điểm hiểu.</p>
                <Button variant="soft" onClick={addSubs}>Thêm phụ đề</Button>
              </div>
            ) : (
              <div ref={listRef} className="relative min-h-0 overflow-y-auto pr-1">
                {transcript.map(({ c, i }) => (
                  <div key={i} data-line={i}
                    className={`group flex gap-2 rounded-lg px-2 py-1 ${active.includes(i) ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}>
                    <button className="w-11 shrink-0 pt-1 text-left text-xs tabular-nums text-muted hover:text-primary"
                      onClick={() => seekLine(i)} title="Nhảy tới câu này">{formatClock((c.s + offset) / 1000)}</button>
                    <button className="jp min-w-0 flex-1 whitespace-pre-line text-left leading-relaxed" onClick={() => seekLine(i)}>{c.t}</button>
                    <button className="jp shrink-0 self-start rounded-md px-1 text-muted opacity-60 hover:bg-surface hover:text-primary group-hover:opacity-100"
                      onClick={(e) => { v()?.pause(); openLookup(c.t.replace(/\n/g, ' '), { x: e.clientX, y: e.clientY }) }}
                      title="Tra từ trong câu" aria-label="Tra từ trong câu">辞</button>
                    <button className="shrink-0 self-start rounded-md px-1 text-muted opacity-60 hover:bg-surface hover:text-primary group-hover:opacity-100"
                      onClick={() => openMine(i)} title="Tạo thẻ từ câu này (ảnh + tiếng)" aria-label="Tạo thẻ từ câu này">📸</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!prefs.showTranscript && <Button variant="soft" onClick={() => setPrefs({ showTranscript: true })}>Hiện lời thoại & từ vựng</Button>}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.hoverPause} onChange={(e) => setPrefs({ hoverPause: e.target.checked })} />
          Di chuột vào phụ đề thì tạm dừng
        </label>
        <label className="flex items-center gap-2">
          Cỡ phụ đề
          <input type="range" min={1} max={3} step={0.1} value={prefs.subSize} onChange={(e) => setPrefs({ subSize: Number(e.target.value) })} aria-label="Cỡ phụ đề" />
        </label>
        <Button variant="ghost" onClick={addSubs}>Đổi / thêm phụ đề</Button>
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">Phím tắt</summary>
        <p className="mt-2 leading-relaxed">
          Space: phát/dừng · ← →: tua 5 giây · A / D: câu trước / sau · S: nghe lại câu · L: lặp câu · B: lặp đoạn A-B ·
          P: tự dừng sau mỗi câu (shadowing) · H: hiện / mờ / ẩn phụ đề · R: furigana · T: phụ đề dịch ·
          Z / X: phụ đề sớm / muộn 0,1 giây · [ ]: chậm / nhanh · F: toàn màn hình ·
          C: tạo thẻ ôn tập từ câu đang nói (kèm ảnh cảnh phim và tiếng nhân vật)
        </p>
      </details>
    </div>
  )
}
