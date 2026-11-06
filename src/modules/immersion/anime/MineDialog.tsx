/**
 * TẠO THẺ TỪ MỘT CÂU THOẠI (sentence mining kiểu Anki + mpv/asbplayer)
 * Mở bằng phím C hoặc nút 📸 trong trình xem / bảng lời thoại.
 * - Tự phát lại câu đó một lần để ghi tiếng nói của nhân vật, và chụp ảnh cảnh phim giữa câu.
 * - Chọn từ muốn học trong câu (từ mới được chọn sẵn), và/hoặc lưu cả câu.
 * - Thẻ có ảnh + tiếng: lật thẻ là nghe lại đúng giọng nhân vật. Từ đã có thẻ thì gắn cảnh vào thẻ cũ.
 * - Câu luôn được lưu vào "Câu đã lưu" (kèm thời điểm, ảnh, tiếng, loại câu) và thẻ được gắn với tập phim,
 *   để ôn theo tập / mùa, thống kê, tìm kiếm và xuất Anki.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/design/components/Button'
import { shortMeaning } from '@/modules/dictionary'
import { addReviewCards, attachReviewMedia, type ReviewCardInput } from '@/modules/review/api'
import { wordsOf, type WordInfo } from '../manga/study/mining'
import { Modal, ProgressBar } from '../manga/ui'
import { useKnowledge, wordStatus } from './analysis'
import { canRecordAudio, recordClip, type ClipResult } from './capture'
import { animeDeck, makeSentence } from './cards'
import { episodeLabel } from './importer'
import { addLinks, linkKey, saveSentence, updateSentence } from './store'
import { formatClock } from './subtitles'
import { CATEGORY_LABEL, type AnimeEpisode, type AnimeSeries, type CardLink, type ClipCategory, type Cue } from './types'

export interface MineTarget {
  index: number
  cue: Cue
  /** Phụ đề dịch cùng lúc (nếu có), làm nghĩa của câu. */
  translation?: string
}

/** Câu ví dụ dạng điền chỗ trống: 水が{{飲みたい}}です。 */
const cloze = (line: string, surface: string) => (line.includes(surface) ? line.replace(surface, `{{${surface}}}`) : line)

export function MineDialog({ video, target, offset, episode, series, onClose, onSaved }: {
  video: HTMLVideoElement
  target: MineTarget
  offset: number // ms, lệch phụ đề
  episode: AnimeEpisode
  series: AnimeSeries
  onClose: () => void
  /** Gọi sau khi câu đã được lưu (vd. để mở tab "Câu đã lưu"). */
  onSaved?: () => void
}) {
  const line = target.cue.t.replace(/\n/g, ' ')
  const seriesTitle = series.title
  const episodeName = episodeLabel(episode)
  const draft = useMemo(() => makeSentence(series, episode, target.cue, offset, target.translation), [series, episode, target, offset])
  const [category, setCategory] = useState<ClipCategory>(draft.category)
  const [clip, setClip] = useState<ClipResult>()
  const [progress, setProgress] = useState(0)
  const [take, setTake] = useState(0) // bấm "Ghi lại" → tăng để ghi lần nữa
  const [words, setWords] = useState<WordInfo[]>()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [sentence, setSentence] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const k = useKnowledge()
  const preset = useRef(false)

  // Ghi tiếng + chụp ảnh của câu
  useEffect(() => {
    const ctl = new AbortController()
    setClip(undefined); setProgress(0)
    const start = (target.cue.s + offset) / 1000 - 0.15
    const end = (target.cue.e + offset) / 1000 + 0.25
    recordClip(video, start, end, { onProgress: setProgress, signal: ctl.signal })
      .then((r) => { if (!ctl.signal.aborted) setClip(r) })
      .catch(() => { if (!ctl.signal.aborted) setClip({ audio: null, image: null }) })
    return () => { ctl.abort(); video.pause() }
  }, [video, target, offset, take])

  // Tách từ trong câu
  useEffect(() => {
    let alive = true
    wordsOf(line).then((w) => alive && setWords(w), () => alive && setWords([]))
    return () => { alive = false }
  }, [line])

  // Chọn sẵn các từ mới (chưa có thẻ, chưa đánh dấu Đã biết)
  useEffect(() => {
    if (preset.current || !words || !k) return
    preset.current = true
    const fresh = words.filter((w) => w.id && wordStatus({ w: w.base, s: w.surface }, k) === 'new')
    setPicked(new Set(fresh.map((w) => w.id!)))
    if (!words.some((w) => w.id)) setSentence(true)
  }, [words, k])

  const imageUrl = useMemo(() => (clip?.image ? URL.createObjectURL(clip.image) : undefined), [clip])
  const audioUrl = useMemo(() => (clip?.audio ? URL.createObjectURL(clip.audio) : undefined), [clip])
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const count = picked.size + (sentence ? 1 : 0)

  const save = async () => {
    if (!clip || !words) return
    setBusy(true); setMsg(undefined)
    try {
      const deck = animeDeck(series)
      const where = `${[seriesTitle, episodeName].filter(Boolean).join(' · ')} · ${formatClock((target.cue.s + offset) / 1000)}${draft.speaker ? ` · ${draft.speaker}` : ''}`
      const media = { image: clip.image ?? undefined, audio: clip.audio ?? undefined }
      const tags = ['anime', ...(seriesTitle ? [seriesTitle] : []), ...(category !== 'normal' ? [CATEGORY_LABEL[category]] : [])]
      // 1. Lưu câu (luôn lưu, kể cả khi không tạo thẻ nào)
      const x = { ...draft, category, savedAt: Date.now() }
      await saveSentence(x, media.image || media.audio ? { id: x.id, ...media } : undefined)
      const links: CardLink[] = []
      const link = (source: { module: string; ref: string }, cat?: ClipCategory) =>
        links.push({ key: linkKey(source), seriesId: series.id, episodeId: episode.id, sentenceId: x.id, category: cat, addedAt: Date.now() })
      let added = 0, attached = 0
      for (const w of words) {
        if (!w.id || !w.data || !picked.has(w.id)) continue
        const input: ReviewCardInput = {
          deck, kind: 'vocab', front: w.base, reading: w.reading && w.reading !== w.base ? w.reading : undefined,
          meaning: await shortMeaning(w.id, w.data).catch(() => w.meaning),
          example: cloze(line, w.surface), exampleMeaning: target.translation, notes: where,
          tags: [...tags, ...(w.jlpt ? [`N${w.jlpt}`] : [])],
          // Cùng nguồn với nút "Thêm vào ôn tập" của Từ điển → không tạo trùng
          source: { module: 'dictionary', ref: w.id }, ...media,
        }
        if (await addReviewCards([input])) added++
        else if (media.image || media.audio) attached += await attachReviewMedia(input.source!, media)
        link(input.source!)
      }
      if (sentence) {
        const gloss = words.filter((w) => w.meaning).slice(0, 6).map((w) => `${w.base}（${w.reading}）: ${w.meaning}`).join('\n')
        const input: ReviewCardInput = {
          deck, kind: 'vocab', front: line,
          meaning: target.translation?.trim() || gloss || '(chưa có nghĩa: sửa thẻ để thêm)',
          notes: [where, target.translation ? gloss : ''].filter(Boolean).join('\n'),
          tags: [...tags, 'câu'], source: { module: 'anime', ref: 's:' + x.id }, ...media,
        }
        if (await addReviewCards([input])) added++
        else attached += await attachReviewMedia(input.source!, media)
        link(input.source!, category)
        await updateSentence(x.id, { carded: true })
      }
      await addLinks(links)
      onSaved?.()
      setMsg(`Đã lưu câu${added ? ` và thêm ${added} thẻ vào bộ "${deck}"` : ''}.${attached ? ` Gắn cảnh phim vào ${attached} thẻ đã có.` : ''}`)
      setPicked(new Set()); setSentence(false)
    } catch (e) {
      setMsg(`Lỗi: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Lưu câu và tạo thẻ" onClose={onClose} wide>
      <div className="grid gap-4">
        <p className="jp text-lg leading-relaxed">{line}</p>
        {target.translation && <p className="-mt-3 text-sm text-muted">{target.translation}</p>}

        <div className="grid gap-2 rounded-xl bg-surface-2 p-3">
          {!clip ? (
            <>
              <p className="text-sm text-muted">{canRecordAudio() ? 'Đang phát lại câu để ghi tiếng và chụp ảnh…' : 'Đang chụp ảnh cảnh phim…'}</p>
              <ProgressBar value={progress} />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {imageUrl ? <img src={imageUrl} alt="Cảnh phim" className="max-h-40 rounded-lg border border-border object-contain" />
                : <p className="text-sm text-muted">Không chụp được ảnh.</p>}
              <div className="grid gap-2">
                {audioUrl ? <audio src={audioUrl} controls className="h-10 max-w-64" />
                  : <p className="text-sm text-muted">{canRecordAudio() ? 'Không ghi được tiếng (trình duyệt chặn).' : 'Trình duyệt này không ghi được tiếng.'} Thẻ vẫn có ảnh.</p>}
                <Button variant="ghost" onClick={() => setTake((t) => t + 1)}>↺ Ghi lại</Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-1">
          <p className="text-sm font-medium">Chọn từ muốn học</p>
          {!words ? <p className="text-sm text-muted">Đang tách từ…</p> : words.length === 0 ? (
            <p className="text-sm text-muted">Không tách được từ (cần tải Từ điển trước). Vẫn lưu được cả câu.</p>
          ) : (
            <ul className="grid gap-1">
              {words.map((w, i) => (
                <li key={w.id ?? `${w.base}-${i}`}>
                  <label className={`flex items-start gap-2 rounded-lg px-2 py-1 ${w.id ? 'cursor-pointer hover:bg-surface-2' : 'opacity-60'} ${w.id && picked.has(w.id) ? 'bg-primary-soft' : ''}`}>
                    <input type="checkbox" className="mt-1.5" disabled={!w.id} checked={!!w.id && picked.has(w.id)} onChange={() => w.id && toggle(w.id)} />
                    <span className="jp min-w-16 text-lg">{w.base}</span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">
                      {w.reading && w.reading !== w.base && <span className="jp mr-1 text-muted">{w.reading}</span>}
                      {w.meaning || <span className="text-muted">(không có trong từ điển)</span>}
                      {k && w.id && wordStatus({ w: w.base, s: w.surface }, k) !== 'new' && <span className="ml-2 text-xs text-good">đã có</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-1 flex items-center gap-2 px-2 text-sm">
            <input type="checkbox" checked={sentence} onChange={(e) => setSentence(e.target.checked)} />
            Lưu cả câu thành một thẻ
          </label>
          <label className="mt-1 flex flex-wrap items-center gap-2 px-2 text-sm">
            Loại câu
            <select className="min-h-9 rounded-lg border border-border bg-surface-2 px-2" value={category} onChange={(e) => setCategory(e.target.value as ClipCategory)}>
              {(Object.keys(CATEGORY_LABEL) as ClipCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
        </div>

        {msg && <p className="text-sm text-good">{msg}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy || !clip || !words}>
            {busy ? 'Đang lưu…' : count ? `+ Lưu câu và ${count} thẻ (kèm ảnh${clip?.audio ? ' và tiếng' : ''})` : '+ Chỉ lưu câu'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Modal>
  )
}
