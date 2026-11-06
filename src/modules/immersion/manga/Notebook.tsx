/**
 * SỔ TAY CỦA MỘT BỘ MANGA: ghi chép tự do, nhân vật & cách nói đặc trưng, câu hay / câu khó,
 * ghi chú ghim và trang đã đánh dấu (theo chương). Mọi thứ tự lưu. Xuất được ra file Markdown.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { listSeriesNotes, readingOrder } from './notes'
import { updateSeries } from './store'
import { chapterLabel } from './naming'
import { findNotes } from './study/notes-data'
import { speakJa, VOICE_LABEL, useJaVoice } from './study/audio'
import { inputClass } from './ui'
import { SPEECH_STYLES, type MangaBookmark, type MangaBubble, type MangaChapter, type MangaCharacter, type MangaPin, type MangaSeries, type VoiceKind } from './types'

export function Notebook({ series, chapters, openReader }: {
  series: MangaSeries
  chapters: MangaChapter[]
  openReader: (chapterId: string, page?: number) => void
}) {
  const { data: notes = [] } = useDbQuery(() => listSeriesNotes(series.id), [series.id], ['mangaNotes'])
  const rtl = (series.prefs?.direction ?? 'rtl') === 'rtl'
  const order = useMemo(() => new Map(chapters.map((c, i) => [c.id, i])), [chapters])
  const byChapter = (a: { chapterId: string; page: number }, b: { chapterId: string; page: number }) =>
    (order.get(a.chapterId) ?? 0) - (order.get(b.chapterId) ?? 0) || a.page - b.page
  const bubbles = useMemo(() => {
    const list = notes.filter((n): n is MangaBubble => n.kind === 'bubble' && !!n.text.trim())
    return [...new Set(list.map((b) => b.chapterId))]
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .flatMap((cid) => readingOrder(list.filter((b) => b.chapterId === cid), rtl))
  }, [notes, order, rtl])
  const pins = notes.filter((n): n is MangaPin => n.kind === 'pin').sort(byChapter)
  const marks = notes.filter((n): n is MangaBookmark => n.kind === 'bookmark').sort(byChapter)
  const good = bubbles.filter((b) => b.mark === 'good')
  const hard = bubbles.filter((b) => b.mark === 'hard')
  const chapterName = (id: string) => { const c = chapters.find((x) => x.id === id); return c ? chapterLabel(c) : '' }

  const exportMd = () => {
    const lines = [`# Sổ tay: ${series.title}${series.titleJp ? ` (${series.titleJp})` : ''}`, '']
    if (series.notebook?.trim()) lines.push('## Ghi chép', '', series.notebook.trim(), '')
    if (series.characters?.length) {
      lines.push('## Nhân vật', '')
      for (const c of series.characters) lines.push(`- **${c.name}**${c.styles.length ? ` (${c.styles.join(', ')})` : ''}${c.note ? `: ${c.note}` : ''}`)
      lines.push('')
    }
    const sec = (title: string, list: MangaBubble[]) => {
      if (!list.length) return
      lines.push(`## ${title}`, '')
      for (const b of list) lines.push(`- ${b.text}${b.translation ? ` — ${b.translation}` : ''} _(${chapterName(b.chapterId)}, tr.${b.page + 1}${b.speaker ? `, ${b.speaker}` : ''})_${b.note ? `\n  - ${b.note}` : ''}`)
      lines.push('')
    }
    sec('Câu hay', good)
    sec('Câu khó', hard)
    const others = [...pins, ...marks].filter((n) => n.note.trim()).sort(byChapter)
    if (others.length) {
      lines.push('## Ghi chú theo trang', '')
      for (const n of others) lines.push(`- ${n.kind === 'pin' ? '📌' : '🔖'} ${chapterName(n.chapterId)}, tr.${n.page + 1}: ${n.note.trim()}`)
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }))
    a.download = `so-tay-${series.title.replace(/[\\/:*?"<>|]+/g, '-')}.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <div className="grid gap-5">
      <FreeNotes series={series} />
      <Characters series={series} bubbles={bubbles} openReader={openReader} chapterName={chapterName} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SentenceList title="⭐ Câu hay" empty="Bấm ⭐ trên thẻ bong bóng khi đọc để lưu câu hay vào đây." list={good} chapterName={chapterName} openReader={openReader} />
        <SentenceList title="⚠ Câu khó" empty="Bấm ⚠ trên thẻ bong bóng để đánh dấu câu cần xem lại." list={hard} chapterName={chapterName} openReader={openReader} />
      </div>

      <Card className="grid gap-2">
        <h2 className="font-semibold">📌 Ghi chú ghim & 🔖 trang đã đánh dấu</h2>
        {!pins.length && !marks.length && <p className="text-sm text-muted">Khi đọc, bấm 📌 rồi chạm vào khung tranh để ghi chú ngay tại chỗ, hoặc 🔖 để đánh dấu trang.</p>}
        <ul className="grid gap-1">
          {[...pins, ...marks].sort(byChapter).map((n) => (
            <li key={n.id}>
              <button onClick={() => openReader(n.chapterId, n.page)} className="w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2">
                <span className="text-xs text-muted">{n.kind === 'pin' ? '📌' : '🔖'} {chapterName(n.chapterId)} · trang {n.page + 1}</span>
                <span className="block truncate text-sm">{n.note || <i className="text-muted">(chưa ghi gì)</i>}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div><Button variant="soft" onClick={exportMd}>⬇ Xuất sổ tay (Markdown)</Button></div>
    </div>
  )
}

/** Ghi chép tự do, tự lưu sau khi ngừng gõ. */
function FreeNotes({ series }: { series: MangaSeries }) {
  const [v, setV] = useState(series.notebook ?? '')
  const [saved, setSaved] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => { setV(series.notebook ?? '') }, [series.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const change = (text: string) => {
    setV(text)
    setSaved(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void updateSeries(series.id, { notebook: text }).then(() => setSaved(true)) }, 600)
  }
  return (
    <Card className="grid gap-2">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Ghi chép của bạn</h2>
        <span className="ml-auto text-xs text-muted">{saved ? '✓ Đã lưu' : 'Đang lưu…'}</span>
      </div>
      <textarea rows={6} value={v} onChange={(e) => change(e.target.value)} onBlur={() => { window.clearTimeout(timer.current); void updateSeries(series.id, { notebook: v }).then(() => setSaved(true)) }}
        placeholder="Tóm tắt các chương, quan hệ nhân vật, từ hay gặp, điều muốn nhớ khi đọc dài tập…"
        className="w-full rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-primary" />
    </Card>
  )
}

function SentenceList({ title, empty, list, chapterName, openReader }: {
  title: string; empty: string; list: MangaBubble[]; chapterName: (id: string) => string; openReader: (id: string, p?: number) => void
}) {
  return (
    <Card className="grid gap-2">
      <h2 className="font-semibold">{title} <span className="text-sm font-normal text-muted">{list.length || ''}</span></h2>
      {!list.length && <p className="text-sm text-muted">{empty}</p>}
      <ul className="grid gap-1">
        {list.map((b) => (
          <li key={b.id}>
            <button onClick={() => openReader(b.chapterId, b.page)} className="w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2">
              <span className="jp block">{b.text}</span>
              <span className="text-xs text-muted">{b.translation ? `“${b.translation}” · ` : ''}{chapterName(b.chapterId)} · tr.{b.page + 1}{b.speaker ? ` · ${b.speaker}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Nhân vật: tách lời thoại theo người nói, ghi chú cách nói, giọng đọc. */
function Characters({ series, bubbles, openReader, chapterName }: {
  series: MangaSeries; bubbles: MangaBubble[]; openReader: (id: string, p?: number) => void; chapterName: (id: string) => string
}) {
  const chars = series.characters ?? []
  const [name, setName] = useState('')
  const [open, setOpen] = useState<string>()
  // Tên người nói đã gõ trong bong bóng nhưng chưa có trong danh sách nhân vật
  const unknown = [...new Set(bubbles.map((b) => b.speaker?.trim()).filter((x): x is string => !!x))].filter((n) => !chars.some((c) => c.name === n))
  const save = (list: MangaCharacter[]) => updateSeries(series.id, { characters: list })
  const add = (n: string) => {
    const t = n.trim()
    if (!t || chars.some((c) => c.name === t)) return
    void save([...chars, { name: t, styles: [], voice: 'auto' }])
    setName('')
  }
  const patch = (n: string, p: Partial<MangaCharacter>) => save(chars.map((c) => (c.name === n ? { ...c, ...p } : c)))
  return (
    <Card className="grid gap-3">
      <div>
        <h2 className="font-semibold">Nhân vật & cách nói</h2>
        <p className="text-sm text-muted">Thêm nhân vật để chọn nhanh "người nói" trên bong bóng, xem riêng lời thoại của từng người, ghi chú kiểu nói và chọn giọng đọc.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(name)}
          placeholder="Tên nhân vật, ví dụ Allen" aria-label="Tên nhân vật mới" className={`${inputClass} max-w-xs`} />
        <Button variant="soft" onClick={() => add(name)} disabled={!name.trim()}>+ Thêm</Button>
        {unknown.map((n) => <Button key={n} variant="ghost" onClick={() => add(n)}>+ {n}</Button>)}
      </div>
      <ul className="grid gap-2">
        {chars.map((c) => (
          <CharacterRow key={c.name} c={c} lines={bubbles.filter((b) => b.speaker === c.name)} open={open === c.name}
            toggle={() => setOpen(open === c.name ? undefined : c.name)} patch={(p) => patch(c.name, p)}
            remove={() => save(chars.filter((x) => x.name !== c.name))} openReader={openReader} chapterName={chapterName} />
        ))}
      </ul>
    </Card>
  )
}

function CharacterRow({ c, lines, open, toggle, patch, remove, openReader, chapterName }: {
  c: MangaCharacter; lines: MangaBubble[]; open: boolean; toggle: () => void; patch: (p: Partial<MangaCharacter>) => void
  remove: () => void; openReader: (id: string, p?: number) => void; chapterName: (id: string) => string
}) {
  const voice = useJaVoice()
  const [note, setNote] = useState(c.note ?? '')
  // Kiểu nói app tự nhận ra từ các câu của nhân vật này
  const detected = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of lines) for (const n of findNotes(b.text)) if (n.group === 'style') m.set(n.label, (m.get(n.label) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [lines])
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggle} className="text-left font-semibold hover:text-primary">{open ? '▾' : '▸'} {c.name}</button>
        <span className="text-xs text-muted">{lines.length} câu</span>
        {c.styles.map((s) => <span key={s} className="rounded bg-surface-2 px-1.5 text-xs">{s}</span>)}
        <span className="ml-auto text-xs text-muted">Giọng: {VOICE_LABEL[c.voice]}</span>
      </div>
      {open && (
        <div className="mt-3 grid gap-3 text-sm">
          <div className="flex flex-wrap gap-1">
            {SPEECH_STYLES.map((s) => {
              const on = c.styles.includes(s)
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => patch({ styles: on ? c.styles.filter((x) => x !== s) : [...c.styles, s] })}
                  className={`min-h-8 rounded-full border px-2.5 text-xs ${on ? 'border-primary bg-primary-soft' : 'border-border text-muted hover:text-text'}`}>{s}</button>
              )
            })}
          </div>
          {detected.length > 0 && (
            <p className="text-xs text-muted">App nhận ra trong lời thoại: {detected.map(([l, n]) => `${l} (${n})`).join(' · ')}</p>
          )}
          <textarea rows={2} value={note} onChange={(e) => { setNote(e.target.value); patch({ note: e.target.value }) }}
            placeholder="Ghi chú cách nói: hay dùng 俺, cuối câu ～ぜ, nói trống không với người lớn…"
            className="w-full rounded-lg border border-border bg-surface-2 p-2 outline-none focus:border-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Giọng đọc:</span>
            {(Object.keys(VOICE_LABEL) as VoiceKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={c.voice === k} onClick={() => patch({ voice: k })}
                className={`min-h-8 rounded-full border px-2.5 text-xs ${c.voice === k ? 'border-primary bg-primary-soft' : 'border-border text-muted'}`}>{VOICE_LABEL[k]}</button>
            ))}
            {voice && <button type="button" className="text-xs text-primary underline" onClick={() => void speakJa(lines[0]?.text ?? 'こんにちは、よろしく！', 1, c.voice)}>Nghe thử</button>}
          </div>
          {lines.length > 0 && (
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {lines.map((b) => (
                <li key={b.id}>
                  <button onClick={() => openReader(b.chapterId, b.page)} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                    <span className="jp">{b.text}</span>
                    <span className="block text-xs text-muted">{chapterName(b.chapterId)} · tr.{b.page + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div><Button variant="ghost" className="text-bad" onClick={remove}>Xóa nhân vật</Button></div>
        </div>
      )}
    </li>
  )
}
