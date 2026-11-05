/**
 * MỤC HỘI THOẠI / LUYỆN NGHE / ĐỌC HIỂU · VIẾT CỦA BÀI
 * Bạn dán đoạn văn từ sách (mỗi dòng một câu) và gắn file audio của bạn nếu có. Mỗi đoạn có trình phát:
 * - Furigana và bản dịch bật / tắt; bấm vào chữ để tra từ (popup Từ điển, thêm từ vào Ôn tập ở đó).
 * - Nghe từng câu hoặc cả đoạn, tốc độ 0.7–1.5x, tô sáng câu đang nghe.
 * - Shadowing: sau mỗi câu app dừng một lúc để bạn nói theo.
 * - Có audio: "Đồng bộ câu" (bấm khi mỗi câu bắt đầu) để nghe đúng từng câu. Chưa có audio: dùng giọng đọc của máy.
 * - Luyện nghe: mặc định ẩn chữ, nghe trước rồi mới xem.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { JapaneseText } from '@/modules/dictionary'
import { updateLesson } from '../store'
import { lessonDeck } from '../lib/learn'
import { PreStudyButton } from '@/modules/vocab/api'
import {
  addAudio, deleteTrack, formatTime, getAudio, isSynced, lineAt, lineRange, newTrack, parseTrackText, removeAudio,
  saveTrack, trackToText, tracksOf,
} from '../lib/tracks'
import { inputCls, useTx, type Key } from '../ui'
import type { Lesson, Textbook, Track, TrackSection as Sec } from '../types'

const SPEEDS = [0.7, 0.8, 0.9, 1, 1.2, 1.5]
const ADD_KEY: Record<Sec, Key> = { dialogue: 'trAddDialogue', listening: 'trAddListening', reading: 'trAddReading' }
const EMPTY_KEY: Record<Sec, Key> = { dialogue: 'trEmptyDialogue', listening: 'trEmptyListening', reading: 'trEmptyReading' }

export function TrackSection({ book, lesson, section }: { book: Textbook; lesson: Lesson; section: Sec }) {
  const t = useTx()
  const tracks = tracksOf(lesson, section)
  const [editing, setEditing] = useState<Track | null>(null)

  return (
    <div className="space-y-4">
      {tracks.length === 0 && !editing && (
        <Card className="space-y-2">
          <p className="text-muted">{t(EMPTY_KEY[section])}</p>
          <p className="text-sm text-muted">{t('trFormat')}</p>
        </Card>
      )}
      {tracks.map((tr) => editing?.id === tr.id
        ? <TrackEditor key={tr.id} book={book} lesson={lesson} track={tr} onDone={() => setEditing(null)} />
        : <TrackPlayer key={tr.id} book={book} lesson={lesson} track={tr} onEdit={() => setEditing(tr)} />)}
      {editing && !tracks.some((x) => x.id === editing.id) && (
        <TrackEditor book={book} lesson={lesson} track={editing} onDone={() => setEditing(null)} />
      )}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => setEditing(newTrack(section))}>{t(ADD_KEY[section])}</Button>
          {/* Học trước từ của mọi đoạn trong mục này (từ mới gặp nhiều nhất trước) */}
          {tracks.some((tr) => tr.lines.length > 0) && (
            <PreStudyButton variant="ghost" name={`${book.short} · ${lesson.number}`}
              lines={tracks.flatMap((tr) => tr.lines.map((l) => l.jp))}
              deck={lessonDeck(book, lesson.number)} tags={['textbook']} src="textbook" />
          )}
        </div>
      )}
      {section === 'reading' && <Writing book={book} lesson={lesson} />}
    </div>
  )
}

/* ---------------- Nhập / sửa một đoạn ---------------- */

function TrackEditor({ book, lesson, track, onDone }: { book: Textbook; lesson: Lesson; track: Track; onDone: () => void }) {
  const t = useTx()
  const [title, setTitle] = useState(track.title ?? '')
  const [text, setText] = useState(trackToText(track.lines))
  const [audio, setAudio] = useState<File | null>(null)
  const [dropAudio, setDropAudio] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const lines = parseTrackText(text)
  const isNew = !(lesson.tracks ?? []).some((x) => x.id === track.id)

  const save = async () => {
    setBusy(true)
    try {
      let audioId = track.audioId
      if ((audio || dropAudio) && audioId) { await removeAudio(audioId); audioId = undefined }
      if (audio) audioId = await addAudio(lesson.id, audio)
      // Giữ id câu cũ nếu chữ không đổi (để không mất gì gắn với câu)
      const old = new Map(track.lines.map((l) => [l.jp, l]))
      const merged = lines.map((l) => ({ ...l, id: old.get(l.jp)?.id ?? l.id }))
      await saveTrack(book.id, lesson.number, { ...track, title: title.trim() || undefined, lines: merged, audioId })
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <Card className="space-y-3">
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('trTitlePh')} />
      <textarea className={`${inputCls} jp min-h-48 py-2`} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={t('trTextPh')} aria-label={t('trText')} />
      <p className="text-sm text-muted">{t('trFormat')}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{t('trAudio')}</span>
          <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" className="text-sm"
            onChange={(e) => { setAudio(e.target.files?.[0] ?? null); setDropAudio(false) }} />
        </label>
        {track.audioId && !audio && !dropAudio && (
          <Button variant="ghost" className="!min-h-9" onClick={() => setDropAudio(true)}>{t('trAudioRemove')}</Button>
        )}
      </div>
      <p className="text-xs text-muted">{t('trAudioHint')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy || !lines.length} onClick={() => void save()}>{t('trSave', { n: lines.length })}</Button>
        <Button variant="ghost" onClick={onDone}>{t('cancel')}</Button>
        {!isNew && (confirmDel ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-sm">{t('trDeleteConfirm')}</span>
            <Button variant="soft" className="!text-bad" onClick={() => void deleteTrack(book.id, lesson.number, track).then(onDone)}>{t('delete')}</Button>
          </span>
        ) : <Button variant="ghost" className="ml-auto !text-bad" onClick={() => setConfirmDel(true)}>{t('delete')}</Button>)}
      </div>
    </Card>
  )
}

/* ---------------- Giọng đọc của máy (khi chưa có audio) ---------------- */

function speak(text: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') { resolve(); return }
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = rate
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace('_', '-').startsWith('ja'))
    if (v) u.voice = v
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ---------------- Trình phát một đoạn ---------------- */

function TrackPlayer({ book, lesson, track, onEdit }: { book: Textbook; lesson: Lesson; track: Track; onEdit: () => void }) {
  const t = useTx()
  const listening = track.section === 'listening'
  const [furigana, setFurigana] = useState(true)
  const [showVi, setShowVi] = useState(!listening)
  const [hideText, setHideText] = useState(listening)
  const [speed, setSpeed] = useState(1)
  const [shadow, setShadow] = useState(false)
  const [cur, setCur] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [yourTurn, setYourTurn] = useState(false)
  const [sync, setSync] = useState<number | null>(null) // đang đồng bộ: câu kế tiếp cần bấm
  const [stamps, setStamps] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const run = useRef(0) // tăng mỗi lần bấm phát / dừng để hủy vòng phát cũ
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  const { data: audio } = useDbQuery(async () => (track.audioId ? (await getAudio(track.audioId)) ?? null : null), [track.audioId], ['textbookMedia'])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!audio) { setUrl(undefined); return }
    const u = URL.createObjectURL(audio.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [audio])

  const lines = track.lines
  const synced = !!url && isSynced(lines)
  const el = () => audioRef.current

  useEffect(() => { if (el()) el()!.playbackRate = speed }, [speed, url])
  useEffect(() => () => { run.current++; if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() }, [])
  useEffect(() => { if (cur >= 0) rowRefs.current[cur]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [cur])

  const stop = useCallback(() => {
    run.current++
    el()?.pause()
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    setPlaying(false); setYourTurn(false)
  }, [])

  /** Phát audio từ `from` tới `to` (giây); xong thì resolve. Hủy được bằng stop(). */
  const playRange = (from: number, to: number, id: number) => new Promise<void>((resolve) => {
    const a = el()
    if (!a) { resolve(); return }
    a.currentTime = from
    a.playbackRate = speed
    void a.play()
    const tick = () => {
      if (run.current !== id) { resolve(); return }
      setCur(lineAt(lines, a.currentTime))
      if (a.currentTime >= to - 0.03 || a.ended) { a.pause(); resolve(); return }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  /** Phát câu i (audio đã đồng bộ, hoặc giọng máy). Trả về thời lượng (giây). */
  const sayLine = async (i: number, id: number) => {
    setCur(i)
    const started = performance.now()
    const range = synced ? lineRange(lines, i, el()?.duration || Infinity) : null
    if (range) await playRange(range[0], range[1], id)
    else await speak(lines[i].jp, speed * 0.9)
    return (performance.now() - started) / 1000
  }

  const playFrom = async (start: number, only = false) => {
    stop()
    const id = run.current
    setPlaying(true)
    for (let i = start; i < lines.length; i++) {
      if (run.current !== id) return
      const dur = await sayLine(i, id)
      if (run.current !== id) return
      if (shadow) {
        setYourTurn(true)
        await sleep(Math.max(1200, dur * 1200))
        setYourTurn(false)
      }
      if (only) break
    }
    if (run.current === id) { setPlaying(false); setCur(-1) }
  }

  /** Audio chưa đồng bộ: phát cả file liền một mạch. */
  const playWhole = () => {
    stop()
    const a = el()
    if (!a) return
    const id = run.current
    setPlaying(true)
    a.playbackRate = speed
    void a.play()
    const tick = () => {
      if (run.current !== id) return
      if (a.paused || a.ended) { setPlaying(false); return }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /* ----- Đồng bộ: phát từ đầu, bấm khi mỗi câu bắt đầu ----- */
  const startSync = () => {
    stop()
    const a = el()
    if (!a) return
    setStamps([]); setSync(0); setCur(-1)
    a.currentTime = 0
    a.playbackRate = speed
    void a.play()
  }
  const stamp = useCallback(() => {
    const a = el()
    if (sync == null || !a) return
    const next = [...stamps, Math.max(0, a.currentTime - 0.15)]
    setStamps(next); setCur(sync)
    if (sync + 1 >= lines.length) {
      a.pause(); setSync(null)
      void saveTrack(book.id, lesson.number, { ...track, lines: lines.map((l, i) => ({ ...l, t: Number(next[i].toFixed(2)) })) })
    } else setSync(sync + 1)
  }, [sync, stamps, lines, book.id, lesson.number, track])
  useEffect(() => {
    if (sync == null) return
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); stamp() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sync, stamp])
  const cancelSync = () => { el()?.pause(); setSync(null); setCur(-1) }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-semibold">{track.title || t('trUntitled')}</h3>
        <Button variant="ghost" className="!min-h-9" onClick={onEdit}>{t('trEdit')}</Button>
      </div>

      {/* Điều khiển */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {playing
          ? <Button className="!min-h-9" onClick={stop}>⏸ {t('trStop')}</Button>
          : <Button className="!min-h-9" disabled={sync != null || !lines.length}
              onClick={() => (url && !synced ? playWhole() : void playFrom(cur > 0 ? cur : 0))}>▶ {t('trPlayAll')}</Button>}
        <label className="flex items-center gap-1">
          <span className="text-muted">{t('trSpeed')}</span>
          <select className={`${inputCls} !min-h-9 !w-auto`} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>
        </label>
        <Toggle on={shadow} onChange={setShadow} label={t('trShadow')} />
        <Toggle on={furigana} onChange={setFurigana} label={t('trFurigana')} />
        <Toggle on={showVi} onChange={setShowVi} label={t('trTranslation')} />
        {listening && <Toggle on={!hideText} onChange={(v) => setHideText(!v)} label={t('trShowText')} />}
      </div>

      {url && (
        <div className="space-y-2">
          <audio ref={audioRef} src={url} controls={!synced || sync != null} className="w-full"
            onPlay={() => { if (sync == null && !synced) setPlaying(true) }} onPause={() => { if (sync == null && !synced) setPlaying(false) }} />
          {sync != null ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft p-3">
              <span className="min-w-0 flex-1 text-sm">{t('trSyncNow', { n: sync + 1, total: lines.length })}</span>
              <Button onClick={stamp}>{t('trSyncTap')}</Button>
              <Button variant="ghost" onClick={cancelSync}>{t('cancel')}</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{synced ? t('trSynced') : t('trNotSynced')}</span>
              <Button variant="ghost" className="!min-h-9" onClick={startSync}>{synced ? t('trResync') : t('trSync')}</Button>
            </div>
          )}
        </div>
      )}
      {yourTurn && <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium" role="status">🎙 {t('trYourTurn')}</p>}

      {/* Các câu */}
      <ol className="space-y-1">
        {lines.map((l, i) => (
          <li key={l.id} ref={(r) => { rowRefs.current[i] = r }}
            className={`flex items-start gap-2 rounded-xl px-2 py-2 transition ${cur === i ? 'bg-primary-soft' : ''}`}>
            <button aria-label={`${t('listen')} ${i + 1}`} title={t('listen')} disabled={sync != null}
              onClick={() => void playFrom(i, true)}
              className="mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-primary disabled:opacity-40">▶</button>
            <div className="min-w-0 flex-1">
              {l.speaker && <span className="jp mr-2 text-sm font-semibold text-primary">{l.speaker}</span>}
              {hideText && cur !== i
                ? <span className="select-none text-muted blur-sm" aria-hidden>{l.jp}</span>
                : <JapaneseText text={l.jp} furigana={furigana} className="jp text-lg leading-loose" />}
              {showVi && l.vi && <p className="text-sm text-muted">{l.vi}</p>}
            </div>
            {l.t != null && <span className="mt-2 shrink-0 text-xs tabular-nums text-muted">{formatTime(l.t)}</span>}
          </li>
        ))}
      </ol>
      {!url && <p className="text-xs text-muted">{t('trTtsHint')}</p>}
    </Card>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button aria-pressed={on} onClick={() => onChange(!on)}
      className={`min-h-9 rounded-xl px-3 transition ${on ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2'}`}>
      {on ? '✓ ' : ''}{label}
    </button>
  )
}

/* ---------------- Bài viết của bạn (Đọc hiểu · Viết) ---------------- */

function Writing({ book, lesson }: { book: Textbook; lesson: Lesson }) {
  const t = useTx()
  const [text, setText] = useState(lesson.writing ?? '')
  return (
    <Card className="space-y-2">
      <h3 className="text-lg font-semibold">{t('trWriting')}</h3>
      <p className="text-sm text-muted">{t('trWritingHint')}</p>
      <textarea className={`${inputCls} jp min-h-40 py-2`} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={t('trWritingPh')}
        onBlur={() => { if (text !== (lesson.writing ?? '')) void updateLesson(book.id, lesson.number, (l) => ({ ...l, writing: text })) }} />
      <p className="text-right text-xs text-muted">{t('trChars', { n: [...text.replace(/\s/g, '')].length })}</p>
    </Card>
  )
}

