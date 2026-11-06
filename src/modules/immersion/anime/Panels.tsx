/**
 * CÁC BẢNG BÊN CẠNH TRÌNH XEM: Câu đã lưu · Giải thích câu · Ghi chú
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { hasJapanese, tokenize } from '@/modules/dictionary'
import { openLookup } from '@/modules/dictionary/api'
import { addSentenceCard, addWordCards, wordsInSentence } from './cards'
import { KIND_LABEL, analyzeSpeech, looksOnomatopoeia } from './colloquial'
import { glossOf, guessWordCategory, lookupWord } from './dict'
import { playBlob } from './capture'
import { deleteSentence, getClip, listSentences, updateEpisode, updateSentence, updateSeries } from './store'
import { formatClock } from './subtitles'
import { CATEGORY_LABEL, type AnimeEpisode, type AnimeSeries, type ClipCategory, type Cue, type SavedSentence } from './types'
import { inputClass } from '../manga/ui'

// ---------------------------------------------------------------- Câu đã lưu

export function ClipImage({ id }: { id: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined, alive = true
    getClip(id).then((c) => { if (c?.image && alive) { u = URL.createObjectURL(c.image); setUrl(u) } })
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [id])
  return url ? <img src={url} alt="Cảnh phim" className="w-full rounded-lg border border-border" /> : null
}

export async function playClip(id: string): Promise<boolean> {
  const c = await getClip(id)
  if (!c?.audio) return false
  playBlob(c.audio)
  return true
}

function SentenceItem({ x, series, ep, onSeek }: { x: SavedSentence; series: AnimeSeries; ep: AnimeEpisode; onSeek: (ms: number) => void }) {
  const [open, setOpen] = useState(false)
  const [words, setWords] = useState<{ w: string; s: string; pos: string }[]>()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string>()
  const [note, setNote] = useState(x.note ?? '')
  const [tr, setTr] = useState(x.translation ?? '')

  useEffect(() => { if (open && !words) void wordsInSentence(x.text).then(setWords) }, [open, words, x.text])

  return (
    <li className="grid gap-2 rounded-xl border border-border p-2 text-sm">
      <div className="flex items-start gap-2">
        <button className="w-11 shrink-0 pt-1 text-left text-xs tabular-nums text-muted hover:text-primary" onClick={() => onSeek(x.s)}>{formatClock(x.s / 1000)}</button>
        <button className="jp min-w-0 flex-1 text-left leading-relaxed" onClick={() => setOpen((o) => !o)}>
          {x.speaker && <span className="mr-1 text-xs text-muted">{x.speaker}:</span>}{x.text}
          {x.translation && <span className="block font-sans text-xs text-muted">{x.translation}</span>}
        </button>
        {x.hasAudio && <button className="shrink-0 rounded-md px-1 text-muted hover:text-primary" onClick={() => playClip(x.id)} aria-label="Nghe âm thanh gốc" title="Nghe âm thanh gốc">🔊</button>}
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="rounded bg-surface-2 px-1.5 py-0.5">{CATEGORY_LABEL[x.category]}</span>
        {x.carded && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-good">✓ có thẻ</span>}
        {!x.hasAudio && <span className="text-muted">chưa có âm thanh</span>}
      </div>
      {open && (
        <div className="grid gap-2 border-t border-border pt-2">
          {x.hasImage && <ClipImage id={x.id} />}
          <label className="grid gap-1 text-xs text-muted">Loại câu
            <select className={inputClass} value={x.category} onChange={(e) => updateSentence(x.id, { category: e.target.value as ClipCategory })}>
              {(Object.keys(CATEGORY_LABEL) as ClipCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">Nghĩa / bản dịch
            <input className={inputClass} value={tr} onChange={(e) => setTr(e.target.value)} onBlur={() => updateSentence(x.id, { translation: tr.trim() || undefined })} placeholder="Tự dịch câu này (không bắt buộc)" />
          </label>
          <label className="grid gap-1 text-xs text-muted">Ghi chú
            <textarea className={`${inputClass} min-h-16 py-2`} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => updateSentence(x.id, { note: note.trim() || undefined })} placeholder="Ngữ cảnh, cảm xúc nhân vật, ngữ pháp…" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-9 text-sm" onClick={async () => {
              const ok = await addSentenceCard(series, ep, { ...x, translation: tr.trim() || x.translation, note: note.trim() || x.note })
              setMsg(ok ? 'Đã tạo thẻ câu (kèm ảnh cảnh phim).' : 'Câu này đã có thẻ.')
            }}>+ Thẻ cả câu</Button>
            <Button variant="ghost" className="min-h-9 text-sm" onClick={() => deleteSentence(x.id)}>Xóa</Button>
          </div>
          {words && words.length > 0 && (
            <div className="grid gap-1">
              <p className="text-xs text-muted">Hoặc chọn từ để tạo thẻ từ vựng (câu này làm ví dụ):</p>
              <div className="flex flex-wrap gap-1">
                {words.map((w) => (
                  <button key={w.w} aria-pressed={picked.has(w.w)} onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(w.w)) n.delete(w.w); else n.add(w.w); return n })}
                    className={`jp rounded-md border px-2 py-0.5 ${picked.has(w.w) ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2'}`}>{w.w}</button>
                ))}
              </div>
              {picked.size > 0 && (
                <Button variant="soft" className="min-h-9 justify-self-start text-sm" onClick={async () => {
                  const r = await addWordCards(series, ep, { ...x, translation: tr.trim() || x.translation }, words.filter((w) => picked.has(w.w)))
                  setMsg(`Đã thêm ${r.added} thẻ từ.${r.dup ? ` ${r.dup} từ đã có thẻ.` : ''}`)
                  setPicked(new Set())
                }}>+ Thêm {picked.size} thẻ từ</Button>
              )}
            </div>
          )}
          {msg && <p className="text-xs text-good">{msg}</p>}
        </div>
      )}
    </li>
  )
}

export function SentencesPanel({ series, ep, onSeek, onSaveCurrent }: {
  series: AnimeSeries; ep: AnimeEpisode; onSeek: (ms: number) => void; onSaveCurrent: () => void
}) {
  const { data: list = [] } = useDbQuery(() => listSentences(ep.id), [ep.id], ['animeSentences'])
  const sorted = useMemo(() => [...list].sort((a, b) => a.s - b.s), [list])
  return (
    <div className="grid content-start gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{list.length} câu đã lưu trong tập này</p>
        <Button variant="soft" className="min-h-9 text-sm" onClick={onSaveCurrent}>★ Lưu câu đang nói (C)</Button>
      </div>
      {!list.length && <p className="text-sm text-muted">Bấm ★ hoặc phím C khi nghe một câu hay: app lưu câu, thời điểm, ảnh cảnh phim và âm thanh gốc.</p>}
      <ul className="grid gap-2">
        {sorted.map((x) => <SentenceItem key={x.id} x={x} series={series} ep={ep} onSeek={onSeek} />)}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- Giải thích câu

interface WordNote { w: string; kind: 'interjection' | 'onomatopoeia' | 'style'; gloss: string; tag: string }

export function ExplainPanel({ cue, series }: { cue?: Cue; series?: AnimeSeries }) {
  const [words, setWords] = useState<WordNote[]>([])
  const text = cue?.t.replace(/\n/g, ' ') ?? ''
  const notes = useMemo(() => (text ? analyzeSpeech(text) : []), [text])

  useEffect(() => {
    let alive = true
    setWords([])
    if (!text) return
    ;(async () => {
      const segs = await tokenize(text).catch(() => [])
      const out: WordNote[] = []
      const seen = new Set<string>()
      for (const seg of segs) {
        const w = seg.base || seg.surface
        if (!hasJapanese(w) || seen.has(w)) continue
        seen.add(w)
        const r = await lookupWord(w)
        const cat = guessWordCategory(r, seg.pos)
        const gloss = r ? glossOf(r) : ''
        if (cat === 'interjection') out.push({ w, kind: 'interjection', gloss, tag: 'Cảm thán' })
        else if (cat === 'onomatopoeia' || looksOnomatopoeia(w)) out.push({ w, kind: 'onomatopoeia', gloss, tag: 'Tượng thanh / tượng hình' })
        else if (cat !== 'normal') out.push({ w, kind: 'style', gloss, tag: CATEGORY_LABEL[cat] })
      }
      if (alive) setWords(out)
    })()
    return () => { alive = false }
  }, [text])

  if (!cue) return <p className="text-sm text-muted">Chưa có câu nào đang nói. Phát video hoặc bấm một dòng trong Lời thoại.</p>
  const character = cue.n ? series?.characters?.find((c) => c.name === cue.n) : undefined

  return (
    <div className="grid content-start gap-3 text-sm">
      <p className="jp text-lg leading-relaxed">{cue.n && <span className="mr-1 text-sm text-muted">{cue.n}:</span>}{text}</p>
      {character?.note && <p className="rounded-lg bg-surface-2 p-2 text-xs"><b>{character.name}:</b> {character.note}</p>}
      {notes.length === 0 && words.length === 0 && <p className="text-muted">Câu này không có cách nói rút gọn hay khẩu ngữ đặc biệt mà app nhận ra.</p>}
      {notes.map((n, i) => (
        <div key={i} className="grid gap-1 rounded-xl border border-border p-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded bg-primary-soft px-1.5 text-xs">{KIND_LABEL[n.kind]}</span>
            <b className="jp">{n.title}</b>
          </div>
          <p>{n.explain}</p>
          {n.polite && <p className="text-xs text-muted">Cách nói lịch sự / đầy đủ: <span className="jp text-text">{n.polite}</span></p>}
          <p className="text-xs text-muted">Trong câu: <span className="jp">{n.match}</span></p>
        </div>
      ))}
      {words.map((w) => (
        <div key={w.w} className="flex items-start gap-2 rounded-xl border border-border p-2">
          <button className="jp text-lg hover:text-primary" onClick={(e) => openLookup(w.w, { x: e.clientX, y: e.clientY })}>{w.w}</button>
          <div className="min-w-0 flex-1">
            <span className="rounded bg-surface-2 px-1.5 text-xs">{w.tag}</span>
            <p className="mt-0.5">{w.gloss || '(không có trong từ điển)'}</p>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Giải thích do app tự nhận diện theo luật viết sẵn, chỉ để tham khảo.</p>
    </div>
  )
}

// ---------------------------------------------------------------- Ghi chú tập + nhân vật

export function NotesPanel({ series, ep, speakers }: { series: AnimeSeries; ep: AnimeEpisode; speakers: string[] }) {
  const [epNote, setEpNote] = useState(ep.note ?? '')
  return (
    <div className="grid content-start gap-3 text-sm">
      <label className="grid gap-1">
        <span className="font-medium">Ghi chú tập này</span>
        <textarea className={`${inputClass} min-h-24 py-2`} value={epNote} onChange={(e) => setEpNote(e.target.value)}
          onBlur={() => updateEpisode(ep.id, { note: epNote.trim() || undefined })} placeholder="Nội dung chính, mẫu câu hay, điều muốn nhớ…" />
      </label>
      <CharacterNotes series={series} speakers={speakers} />
    </div>
  )
}

/** Ghi chú nhân vật của cả bộ (cách xưng hô, đuôi câu, giọng nói). */
export function CharacterNotes({ series, speakers = [] }: { series: AnimeSeries; speakers?: string[] }) {
  const [chars, setChars] = useState(series.characters ?? [])
  const [newName, setNewName] = useState('')
  const saveChars = (c: typeof chars) => { setChars(c); void updateSeries(series.id, { characters: c }) }
  const missing = speakers.filter((n) => !chars.some((c) => c.name === n))

  return (
      <div className="grid gap-2 text-sm">
        <span className="font-medium">Nhân vật ({series.title})</span>
        <p className="text-xs text-muted">Ghi đặc điểm giọng nói, cách xưng hô (俺, 僕, あたし…), đuôi câu hay dùng. Hiện cạnh câu thoại của nhân vật trong tab Giải thích.</p>
        {chars.map((c, i) => (
          <div key={c.name} className="grid gap-1 rounded-xl border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <b className="jp">{c.name}</b>
              <button className="text-xs text-muted hover:text-bad" onClick={() => saveChars(chars.filter((_, k) => k !== i))}>Xóa</button>
            </div>
            <textarea className={`${inputClass} min-h-14 py-2`} defaultValue={c.note}
              onBlur={(e) => saveChars(chars.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} placeholder="Ví dụ: xưng 俺, hay nói 〜だぜ, nói nhanh và thô" />
          </div>
        ))}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { saveChars([...chars, { name: newName.trim(), note: '' }]); setNewName('') } }}>
          <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên nhân vật" aria-label="Tên nhân vật" />
          <Button type="submit" variant="soft" className="min-h-10">Thêm</Button>
        </form>
        {missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
            Nhân vật có trong phụ đề:
            {missing.slice(0, 12).map((n) => (
              <button key={n} className="jp rounded-md border border-border px-1.5 hover:bg-surface-2" onClick={() => saveChars([...chars, { name: n, note: '' }])}>+ {n}</button>
            ))}
          </div>
        )}
      </div>
  )
}
