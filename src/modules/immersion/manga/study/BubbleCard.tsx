/**
 * THẺ MỘT BONG BÓNG THOẠI: chữ bấm-để-tra, nghe, shadowing, ngữ pháp/văn hóa, lưu vào Ôn tập.
 * Mọi thay đổi tự lưu. Xóa có Hoàn tác.
 */
import { useEffect, useMemo, useState } from 'react'
import { JapaneseText } from '@/modules/dictionary'
import { Button } from '@/design/components/Button'
import { deleteNote, saveNote } from '../notes'
import { speakJa, stopSpeaking, useJaVoice, useRecorder } from './audio'
import { cropPanel, mineOcclusion, mineSentence, mineWords, recordLookup, shareBubble, sourceLabel, wordsOf, type WordInfo } from './mining'
import { SentenceAnalysis } from './Analysis'
import type { MangaBubble, MangaChapter, MangaSeries } from '../types'

export function BubbleCard({ bubble, series, chapter, pageBlob, editing: startEditing, onClose, onDeleted, rate, setRate }: {
  bubble: MangaBubble
  series?: MangaSeries
  chapter: MangaChapter
  pageBlob: () => Promise<Blob>
  editing?: boolean
  onClose: () => void
  onDeleted: (b: MangaBubble) => void
  rate: number
  setRate: (r: number) => void
}) {
  const [b, setB] = useState(bubble)
  const [editing, setEditing] = useState(startEditing || !bubble.text)
  const [furigana, setFurigana] = useState(true)
  const [msg, setMsg] = useState<string>()
  const [words, setWords] = useState<WordInfo[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [panelUrl, setPanelUrl] = useState<string>()
  const voice = useJaVoice()
  const rec = useRecorder()
  const characters = useMemo(() => series?.characters ?? [], [series])
  const voiceKind = characters.find((c) => c.name === b.speaker)?.voice ?? 'auto'
  const speak = (t: string) => void speakJa(t, rate, voiceKind)

  useEffect(() => { setB(bubble); setEditing(startEditing || !bubble.text); setWords(null); setMsg(undefined) }, [bubble.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), [])

  // Ảnh panel nhỏ để xem lại ngữ cảnh
  useEffect(() => {
    let u: string | undefined
    let alive = true
    pageBlob().then((pb) => cropPanel(pb, b.box)).then((c) => {
      if (c && alive) { u = URL.createObjectURL(c); setPanelUrl(u) }
    }, () => {})
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [b.id, b.box, pageBlob])

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((x) => (x === m ? undefined : x)), 2500) }
  const update = (patch: Partial<MangaBubble>) => {
    const next = { ...b, ...patch }
    setB(next)
    void saveNote(next) // tự lưu mỗi lần sửa
  }
  const source = sourceLabel(series, chapter, b.page)

  const mine = async () => {
    const panel = await pageBlob().then((pb) => cropPanel(pb, b.box)).catch(() => null)
    const added = await mineSentence(b, series, chapter, panel)
    update({ minedAt: Date.now() })
    flash(added ? '✓ Đã lưu câu (kèm ảnh khung tranh) vào Ôn tập' : 'Câu này đã có trong Ôn tập')
  }

  const mineHidden = async () => {
    const page = await pageBlob().catch(() => null)
    if (!page) { flash('Chưa đọc được ảnh trang.'); return }
    const added = await mineOcclusion(b, page, series, chapter)
    update({ minedAt: b.minedAt ?? Date.now() })
    flash(added ? '✓ Đã lưu thẻ che chữ: lúc ôn sẽ đoán câu trong ô bị che' : 'Thẻ che chữ của câu này đã có')
  }

  const openWords = async () => {
    if (words) { setWords(null); return }
    try {
      const w = await wordsOf(b.text)
      setWords(w)
      setPicked(new Set(w.filter((x) => x.id).map((x) => x.id!)))
    } catch {
      flash('Cần tải Từ điển trước (Học → Từ điển).')
    }
  }

  return (
    <div className="grid gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">
          Trang {b.page + 1}{b.speaker ? ` · ${b.speaker}` : ''}{b.minedAt ? ' · ★ đã lưu' : ''}
          {b.mark === 'good' ? ' · ⭐ câu hay' : b.mark === 'hard' ? ' · ⚠ câu khó' : ''}
        </span>
        <div className="ml-auto flex gap-1">
          <Small onClick={() => setEditing((v) => !v)} active={editing}>{editing ? 'Xong' : 'Sửa'}</Small>
          <Small onClick={onClose}>✕</Small>
        </div>
      </div>

      {editing ? (
        <div className="grid gap-2">
          <textarea autoFocus lang="ja" rows={3} value={b.text} placeholder="Gõ hoặc dán chữ trong bong bóng (sửa được lỗi OCR ở đây)"
            onChange={(e) => update({ text: e.target.value })}
            className="jp w-full rounded-xl border border-border bg-surface-2 p-2 text-base outline-none focus:border-primary" />
          <input value={b.translation ?? ''} onChange={(e) => update({ translation: e.target.value })} placeholder="Bạn hiểu câu này là… (không bắt buộc)"
            className="min-h-9 rounded-xl border border-border bg-surface-2 px-3 outline-none focus:border-primary" />
          <div className="grid grid-cols-2 gap-2">
            <input value={b.speaker ?? ''} onChange={(e) => update({ speaker: e.target.value })} placeholder="Nhân vật nói" list="manga-characters"
              className="min-h-9 rounded-xl border border-border bg-surface-2 px-3 outline-none focus:border-primary" />
            <datalist id="manga-characters">{characters.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            <input value={b.note ?? ''} onChange={(e) => update({ note: e.target.value })} placeholder="Ghi chú"
              className="min-h-9 rounded-xl border border-border bg-surface-2 px-3 outline-none focus:border-primary" />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" className="text-bad" onClick={async () => { await deleteNote(b.id); onDeleted(b) }}>Xóa bong bóng</Button>
            <Button onClick={() => setEditing(false)} disabled={!b.text.trim()}>Xong</Button>
          </div>
          {characters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted">Người nói:</span>
              {characters.map((c) => (
                <Small key={c.name} active={b.speaker === c.name} onClick={() => update({ speaker: b.speaker === c.name ? undefined : c.name })}>{c.name}</Small>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-surface-2 p-3 text-lg">
            <JapaneseText text={b.text} furigana={furigana}
              onLookup={(seg, res) => {
                const d = res[0]?.data
                void recordLookup({
                  word: seg.base || seg.surface, reading: seg.reading, chapterId: chapter.id, page: b.page, at: Date.now(),
                  meaning: d ? d.s.slice(0, 2).map((x) => x.g.slice(0, 2).join(', ')).join('; ') : '',
                })
              }} />
          </div>
          {b.translation && <p className="text-muted">“{b.translation}”</p>}
          {b.speaker && (
            <p className="text-xs text-muted">
              Nói: <b className="text-text">{b.speaker}</b>
              {characters.find((c) => c.name === b.speaker)?.styles.map((st) => <span key={st} className="ml-1 rounded bg-surface-2 px-1">{st}</span>)}
            </p>
          )}
          {b.note && <p className="text-xs text-muted">Ghi chú: {b.note}</p>}

          {/* Hành động: tối đa 1-2 chạm */}
          <div className="flex flex-wrap gap-1.5">
            <Button className="min-h-9 px-3" onClick={mine}>{b.minedAt ? '★ Lưu lại câu' : '☆ Lưu câu'}</Button>
            <Button variant="soft" className="min-h-9 px-3" onClick={openWords}>Lưu từ…</Button>
            <Button variant="soft" className="min-h-9 px-3" onClick={mineHidden} title="Thẻ ôn tập: ảnh khung tranh che mất bong bóng, bạn đoán câu">🙈 Che chữ</Button>
            <Button variant="soft" className="min-h-9 px-3" disabled={!voice} title={voice ? 'Nghe đọc' : 'Máy chưa có giọng tiếng Nhật'}
              onClick={() => speak(b.text)}>🔊 Nghe</Button>
            <Small onClick={() => setRate(rate === 1 ? 0.7 : rate === 0.7 ? 0.5 : 1)} title="Tốc độ đọc">{rate}×</Small>
            <Small onClick={() => setFurigana((v) => !v)} active={furigana} title="Furigana">ふ</Small>
            <Small onClick={() => update({ mark: b.mark === 'good' ? undefined : 'good' })} active={b.mark === 'good'} title="Đánh dấu câu hay">⭐</Small>
            <Small onClick={() => update({ mark: b.mark === 'hard' ? undefined : 'hard' })} active={b.mark === 'hard'} title="Đánh dấu câu khó">⚠</Small>
            <Small onClick={async () => { await navigator.clipboard?.writeText(b.text); flash('Đã chép câu') }} title="Chép câu">⧉</Small>
            <Small title="Chia sẻ câu kèm ảnh panel" onClick={async () => {
              const r = await shareBubble(b.text, await pageBlob().then((pb) => cropPanel(pb, b.box)).catch(() => null), source)
              flash(r === 'shared' ? 'Đã chia sẻ' : r === 'downloaded' ? 'Đã tải ảnh panel và chép câu' : 'Đã chép câu')
            }}>↗</Small>
          </div>

          {/* Shadowing */}
          {rec.supported && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border p-2">
              <span className="text-xs text-muted">Shadowing:</span>
              <Small onClick={() => speak(b.text)}>1. Nghe</Small>
              {rec.state === 'recording'
                ? <Small active onClick={rec.stop}>■ Dừng ghi</Small>
                : <Small onClick={() => void rec.start()}>2. 🎙 Nói theo</Small>}
              {rec.url && <audio src={rec.url} controls className="h-8 max-w-full" />}
              {rec.state === 'denied' && <span className="text-xs text-bad">Chưa được phép dùng micro.</span>}
            </div>
          )}

          {words && (
            <div className="grid gap-1.5 rounded-xl border border-border p-2">
              {words.length === 0 && <p className="text-muted">Không tách được từ nào.</p>}
              {words.map((w, i) => (
                <label key={w.id ?? `${w.base}-${i}`} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 size-4 accent-primary" disabled={!w.id} checked={!!w.id && picked.has(w.id)}
                    onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(w.id!); else n.delete(w.id!); return n })} />
                  <span className="min-w-0">
                    <span className="jp">{w.base}</span> <span className="text-muted">{w.reading !== w.base ? w.reading : ''}</span>
                    {w.jlpt && <span className="ml-1 rounded bg-primary-soft px-1 text-xs">N{w.jlpt}</span>}
                    <span className="block text-xs text-muted">{w.meaning || 'không có trong từ điển'}</span>
                  </span>
                </label>
              ))}
              {words.some((w) => w.id) && (
                <Button className="min-h-9" disabled={!picked.size} onClick={async () => {
                  const panel = await pageBlob().then((pb) => cropPanel(pb, b.box)).catch(() => null)
                  const n = await mineWords(words.filter((w) => w.id && picked.has(w.id)), { sentence: b.text, series, panel })
                  flash(`✓ Đã thêm ${n} từ mới vào Ôn tập (kèm câu và ảnh khung tranh)`)
                  setWords(null)
                }}>Lưu {picked.size} từ đã chọn</Button>
              )}
            </div>
          )}

          <SentenceAnalysis text={b.text} onSpeak={speak} />
        </>
      )}

      {panelUrl && !editing && (
        <img src={panelUrl} alt={`Panel trang ${b.page + 1}`} className="max-h-40 w-full rounded-xl border border-border object-contain" />
      )}
      {msg && <p role="status" className="text-xs text-good">{msg}</p>}
    </div>
  )
}

export function Small({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title}
      className={`min-h-9 rounded-lg px-2.5 text-sm transition ${active ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
      {children}
    </button>
  )
}
