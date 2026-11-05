/**
 * TRANG CHI TIẾT MỘT CHỮ KANJI
 * Thứ tự nét · âm Hán Việt, On/Kun · bộ thủ và thành phần · câu chuyện ghi nhớ (có sẵn + tự viết)
 * · từ ví dụ (bấm để tra) · câu ví dụ · thêm vào Ôn tập · luyện viết.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { openLookup } from '@/modules/dictionary/api'
import { RADICALS, radicalNumberOf } from './data/radicals'
import { formatKun, plainSentence, useKanjiFull } from './lib/data'
import { addKanjiCards, saveNote, useKanjiProgress, useNotes } from './lib/progress'
import { canSpeak, speak } from './lib/speech'
import { RubyText } from './components/Ruby'
import { StrokeOrder } from './components/StrokeOrder'

export function KanjiDetail({ char, onOpen, onRadical, onWrite, prev, next }: {
  char: string
  onOpen: (c: string) => void
  onRadical: (n: number) => void
  onWrite: () => void
  prev?: string
  next?: string
}) {
  const { data: k, loading } = useKanjiFull(char)
  const progress = useKanjiProgress()
  const [added, setAdded] = useState<number | null>(null)
  useEffect(() => setAdded(null), [char])

  // Phím ← → để chuyển chữ (trừ khi đang gõ trong ô ghi chú)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('textarea, input')) return
      if (e.key === 'ArrowLeft' && prev) onOpen(prev)
      if (e.key === 'ArrowRight' && next) onOpen(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onOpen])

  if (loading && !k) return <p className="text-muted">Đang tải…</p>
  const d = k?.dic
  const st = k?.study
  const story = k?.story
  const stat = progress?.[char]
  const rad = d?.rad ? RADICALS[d.rad] : undefined
  const firstReading = d?.kun?.[0]?.replace(/[.-]/g, '') ?? d?.on?.[0]

  return (
    <div className="space-y-4">
      {/* Đầu trang */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="jp grid size-24 shrink-0 place-items-center rounded-2xl bg-surface-2 text-6xl">{char}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            {d?.hv?.length ? <span className="text-xl font-bold text-primary" title="Âm Hán Việt">{d.hv.join(', ').toUpperCase()}</span> : null}
            <span className="text-lg">{story?.v ?? d?.m?.slice(0, 3).join(', ')}</span>
          </div>
          {story && d?.m && <p className="text-sm text-muted">Tiếng Anh: {d.m.slice(0, 4).join(', ')}</p>}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {d?.j && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold">JLPT N{d.j}</span>}
            {d?.s && <span className="rounded-full bg-surface-2 px-2 py-0.5">{d.s} nét</span>}
            {d?.g && <span className="rounded-full bg-surface-2 px-2 py-0.5">{d.g <= 6 ? `Lớp ${d.g} (tiểu học)` : d.g === 8 ? 'Trung học' : 'Dùng cho tên'}</span>}
            {d?.f && <span className="rounded-full bg-surface-2 px-2 py-0.5" title="Thứ hạng trong 2.500 Kanji hay gặp trên báo">Thông dụng #{d.f}</span>}
            {stat?.best != null && <span className="rounded-full bg-surface-2 px-2 py-0.5">Viết tốt nhất: {stat.best} điểm</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSpeak() && firstReading && <Button variant="ghost" onClick={() => speak(firstReading)} aria-label="Nghe đọc">🔊</Button>}
          <Button variant="soft" onClick={onWrite}>Luyện viết</Button>
          <Button disabled={added !== null || stat?.srs} onClick={async () => setAdded(await addKanjiCards([char]))}>
            {stat?.srs || added === 0 ? '✓ Đã có trong Ôn tập' : added ? '✓ Đã thêm' : '+ Ôn tập'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        {/* Thứ tự nét */}
        <Card className="flex flex-col items-center gap-3">
          <h2 className="self-start text-sm font-semibold text-muted">Thứ tự nét</h2>
          {st?.p.length ? <StrokeOrder char={char} strokes={st.p} components={st.c} /> : (
            <p className="text-sm text-muted">Chưa có dữ liệu nét cho chữ này.</p>
          )}
        </Card>

        <div className="space-y-4">
          {/* Cách đọc */}
          <Card className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">Cách đọc</h2>
            <Reading label="Âm On" hint="cách đọc gốc Hán, thường dùng trong từ ghép" list={d?.on} />
            <Reading label="Âm Kun" hint="cách đọc thuần Nhật, phần trong ngoặc là okurigana" list={d?.kun?.map(formatKun)} />
          </Card>

          {/* Bộ thủ và thành phần */}
          <Card className="space-y-3">
            <h2 className="text-sm font-semibold text-muted">Bộ thủ và thành phần</h2>
            {rad && (
              <button onClick={() => onRadical(d!.rad!)} className="flex items-center gap-3 rounded-xl bg-primary-soft px-3 py-2 text-left hover:opacity-90">
                <span className="jp text-3xl">{rad[0]}</span>
                <span className="text-sm">
                  <span className="font-semibold">Bộ {rad[1]}</span> (số {d!.rad}) · {rad[2]}
                  {rad[3] && <span className="jp text-muted"> · dạng khác: {[...rad[3]].join(' ')}</span>}
                  <span className="block text-xs text-muted">Xem các chữ cùng bộ ›</span>
                </span>
              </button>
            )}
            {st?.c && st.c.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {st.c.filter((c) => !c.d).map((c, i) => {
                  const n = radicalNumberOf(c.e)
                  return (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="text-muted">+</span>}
                      <button onClick={() => (n ? onRadical(n) : onOpen(c.e))}
                        className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 hover:border-primary">
                        <span className="jp text-2xl">{c.e}</span>
                        <span className="text-xs text-muted">{n ? `${RADICALS[n][1]} · ${RADICALS[n][2]}` : 'thành phần'}</span>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </Card>

          <StoryCard char={char} story={story?.s} />
        </div>
      </div>

      {/* Ví dụ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {st?.w && st.w.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-muted">Từ có chữ {char} <span className="font-normal">(bấm để tra)</span></h2>
            <ul className="divide-y divide-border">
              {st.w.map(([id, w, r, g, j]) => (
                <li key={id}>
                  <button onClick={(e) => openLookup(w, { x: e.clientX, y: e.clientY })}
                    className="flex w-full items-baseline gap-3 py-2 text-left hover:text-primary">
                    <ruby className="jp text-lg">{w}<rt>{r}</rt></ruby>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">{g}</span>
                    {j && <span className="shrink-0 text-xs text-muted">N{j}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {story?.ex && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-muted">Câu ví dụ</h2>
            <ul className="space-y-3">
              {story.ex.map(([jp, vi]) => (
                <li key={jp} className="flex items-start gap-2">
                  {canSpeak() && (
                    <button className="mt-1 text-muted hover:text-primary" aria-label="Nghe câu" onClick={() => speak(plainSentence(jp))}>🔊</button>
                  )}
                  <div>
                    <RubyText text={jp} className="text-lg" />
                    <p className="text-sm text-muted">{vi}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={!prev} onClick={() => prev && onOpen(prev)}>‹ {prev ?? ''}</Button>
        <Button variant="ghost" disabled={!next} onClick={() => next && onOpen(next)}>{next ?? ''} ›</Button>
      </div>
    </div>
  )
}

function Reading({ label, hint, list }: { label: string; hint: string; list?: string[] }) {
  if (!list?.length) return null
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="w-16 shrink-0 text-sm text-muted" title={hint}>{label}</span>
      <span className="jp text-lg">{list.join('、')}</span>
    </p>
  )
}

/** Câu chuyện ghi nhớ: bản có sẵn + ô để tự viết câu chuyện của mình (lưu trên máy). */
function StoryCard({ char, story }: { char: string; story?: string }) {
  const notes = useNotes()
  const mine = notes?.[char] ?? ''
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(mine)
  useEffect(() => { setText(mine); setEditing(false) }, [char, mine])

  return (
    <Card className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">Câu chuyện ghi nhớ</h2>
      {story && <p className="leading-relaxed">{story}</p>}
      {!story && !mine && !editing && (
        <p className="text-sm text-muted">Chưa có câu chuyện cho chữ này. Tự nghĩ một câu chuyện ngắn từ các thành phần sẽ giúp nhớ lâu hơn.</p>
      )}
      {editing ? (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus
            placeholder="Ví dụ: Người (亻) dựa vào cây (木) để nghỉ…"
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <Button onClick={async () => { await saveNote(char, text); setEditing(false) }}>Lưu</Button>
            <Button variant="ghost" onClick={() => { setText(mine); setEditing(false) }}>Hủy</Button>
          </div>
        </div>
      ) : (
        <>
          {mine && <p className="rounded-xl bg-surface-2 p-3 text-sm"><span className="font-semibold">Của bạn: </span>{mine}</p>}
          <button className="text-sm font-medium text-primary hover:underline" onClick={() => setEditing(true)}>
            {mine ? 'Sửa câu chuyện của bạn' : '+ Viết câu chuyện của bạn'}
          </button>
        </>
      )}
    </Card>
  )
}
