/**
 * TAB "THẺ": thêm thẻ (từng thẻ hoặc dán cả danh sách), tìm kiếm, sửa, tạm ẩn, chôn, học lại, xóa.
 * Mọi thao tác sửa/xóa/đổi trạng thái đều hoàn tác được (thanh "Hoàn tác" hiện ở dưới, hoặc Ctrl+Z).
 */
import { useEffect, useMemo, useState } from 'react'
import { useDbQuery } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import { formatInterval } from './fsrs'
import {
  addCards, allCards, buryCard, clearLeech, deleteCard, imageToDataUrl, isBuried, isLeech, resetCard,
  restoreSnapshot, setSuspended, unburyCard, updateCardContent, type CardSnapshot, type NewCardInput,
} from './store'
import { kindLabel } from './CardFace'
import { CardState, type CardKind, type SrsCard } from './types'

const inputCls = 'min-h-10 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary'

const selectCls = 'min-h-10 rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary'

const emptyForm = (deck = ''): NewCardInput => ({ deck, kind: 'vocab', front: '', reading: '', meaning: '', example: '', exampleMeaning: '', notes: '' })

/** Một thao tác có thể hoàn tác: tên thao tác + bản chụp thẻ trước khi đổi. */
interface UndoItem { label: string; snap: CardSnapshot }

export function CardsTab({ initialQuery = '' }: { initialQuery?: string }) {
  const { data: cards } = useDbQuery(allCards, [], ['srsCards'])
  const [mode, setMode] = useState<'list' | 'add' | 'import'>('list')
  const [editing, setEditing] = useState<SrsCard | null>(null)
  const [undoStack, setUndoStack] = useState<UndoItem[]>([])
  const decks = useMemo(() => [...new Set((cards ?? []).map((c) => c.deck))].sort(), [cards])

  /** Chạy một thao tác và ghi lại để hoàn tác. */
  const track = async (label: string, run: Promise<CardSnapshot | undefined>) => {
    const snap = await run
    if (snap) setUndoStack((s) => [...s.slice(-29), { label, snap }])
  }
  const undo = async () => {
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    await restoreSnapshot(last.snap)
    setUndoStack((s) => s.slice(0, -1))
  }
  // Ctrl+Z hoàn tác (trừ khi đang gõ trong ô nhập, để Ctrl+Z của ô nhập vẫn chạy bình thường)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        void undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const last = undoStack[undoStack.length - 1]
  const undoBar = last && (
    <div role="status" className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2 shadow-card md:bottom-4">
      <span className="min-w-0 flex-1 truncate text-sm">{last.label}</span>
      <Button variant="soft" className="min-h-9" onClick={() => void undo()}>↶ Hoàn tác</Button>
      <Button variant="ghost" className="min-h-9 px-2" aria-label="Đóng" onClick={() => setUndoStack([])}>✕</Button>
    </div>
  )

  if (editing) {
    return (
      <CardForm
        title="Sửa thẻ"
        initial={{ ...emptyForm(), ...editing }}
        decks={decks}
        onCancel={() => setEditing(null)}
        onSave={async (v) => { await track(`Đã sửa “${v.front}”`, updateCardContent(editing.id, v)); setEditing(null) }}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <Segmented label="Chế độ" value={mode} onChange={setMode}
        options={[{ value: 'list', label: 'Danh sách' }, { value: 'add', label: '+ Thêm thẻ' }, { value: 'import', label: 'Dán danh sách' }]} />
      {mode === 'add' && <AddCard decks={decks} />}
      {mode === 'import' && <ImportCards decks={decks} onDone={() => setMode('list')} />}
      {mode === 'list' && <CardList cards={cards ?? []} decks={decks} onEdit={setEditing} track={track} initialQuery={initialQuery} />}
      {undoBar}
    </div>
  )
}

function AddCard({ decks }: { decks: string[] }) {
  const [msg, setMsg] = useState('')
  const [key, setKey] = useState(0)
  const [lastDeck, setLastDeck] = useState(decks[0] ?? 'Thẻ của tôi')
  return (
    <>
      <CardForm
        key={key}
        title="Thêm thẻ mới"
        initial={emptyForm(lastDeck)}
        decks={decks}
        onSave={async (v) => {
          const n = await addCards([v])
          setMsg(n ? `Đã thêm “${v.front}”.` : 'Thẻ này đã có trong bộ.')
          setLastDeck(v.deck)
          setKey((k) => k + 1) // làm trống form để nhập thẻ tiếp
        }}
      />
      {msg && <p className="text-sm text-good">{msg}</p>}
    </>
  )
}

function CardForm({
  title, initial, decks, onSave, onCancel,
}: { title: string; initial: NewCardInput; decks: string[]; onSave: (v: NewCardInput) => Promise<void>; onCancel?: () => void }) {
  const [v, setV] = useState(initial)
  const set = (patch: Partial<NewCardInput>) => setV((s) => ({ ...s, ...patch }))
  const valid = v.front.trim() && v.meaning.trim() && v.deck.trim()
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => { e.preventDefault(); if (valid) void onSave(v) }}
      >
        <Field label="Loại thẻ" full>
          <Segmented<CardKind> label="Loại thẻ" value={v.kind} onChange={(kind) => set({ kind })}
            options={[{ value: 'vocab', label: 'Từ vựng' }, { value: 'kanji', label: 'Kanji' }, { value: 'grammar', label: 'Ngữ pháp' }]} />
        </Field>
        <Field label={v.kind === 'grammar' ? 'Mẫu ngữ pháp *' : v.kind === 'kanji' ? 'Chữ Kanji *' : 'Từ (tiếng Nhật) *'}>
          <input className={`jp ${inputCls}`} lang="ja" value={v.front} onChange={(e) => set({ front: e.target.value })}
            placeholder={v.kind === 'grammar' ? '〜たいです' : v.kind === 'kanji' ? '食' : '食べる'} />
        </Field>
        <Field label={v.kind === 'kanji' ? 'Âm On／Kun' : 'Cách đọc (kana)'}>
          <input className={`jp ${inputCls}`} lang="ja" value={v.reading ?? ''} onChange={(e) => set({ reading: e.target.value })}
            placeholder={v.kind === 'kanji' ? 'ショク／た(べる)' : 'たべる'} />
        </Field>
        <Field label="Nghĩa tiếng Việt *" full>
          <textarea rows={v.meaning.includes('\n') ? 3 : 1} className={`${inputCls} py-2`} value={v.meaning}
            onChange={(e) => set({ meaning: e.target.value })} placeholder="ăn" />
        </Field>
        <ImageField value={typeof v.image === 'string' ? v.image : undefined} onChange={(image) => set({ image })} />
        <Field label="Câu ví dụ" hint="Bọc phần muốn điền trong {{ }} để có câu hỏi điền chỗ trống, vd: パンを{{食べ}}ます。" full>
          <input className={`jp ${inputCls}`} lang="ja" value={v.example ?? ''} onChange={(e) => set({ example: e.target.value })} />
        </Field>
        <Field label="Nghĩa câu ví dụ" full>
          <input className={inputCls} value={v.exampleMeaning ?? ''} onChange={(e) => set({ exampleMeaning: e.target.value })} />
        </Field>
        <Field label="Ghi chú / mẹo nhớ" full>
          <textarea className={`${inputCls} min-h-20 py-2`} value={v.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <Field label="Bộ thẻ *" full>
          <input className={inputCls} list="review-decks" value={v.deck} onChange={(e) => set({ deck: e.target.value })} />
          <datalist id="review-decks">{decks.map((d) => <option key={d} value={d} />)}</datalist>
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={!valid}>Lưu</Button>
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>}
        </div>
      </form>
    </Card>
  )
}

/** Chọn ảnh từ máy, hoặc dán ảnh (Ctrl+V) vào ô. Ảnh được nén nhỏ trước khi lưu. */
function ImageField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [err, setErr] = useState('')
  const take = async (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    try { onChange(await imageToDataUrl(file)); setErr('') } catch { setErr('Không đọc được ảnh này.') }
  }
  return (
    <div className="grid gap-1 text-sm sm:col-span-2">
      <span className="font-medium">Ảnh minh họa</span>
      <div
        tabIndex={0}
        onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); void take(f) } }}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3 outline-none focus:border-primary"
      >
        {value ? (
          <>
            <img src={value} alt="Ảnh minh họa" className="max-h-32 rounded-lg border border-border" />
            <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>Bỏ ảnh</Button>
          </>
        ) : (
          <span className="text-muted">Bấm vào đây rồi Ctrl+V để dán ảnh chụp màn hình, hoặc</span>
        )}
        <label className="cursor-pointer rounded-lg bg-surface-2 px-3 py-2 hover:text-primary">
          Chọn ảnh…
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void take(e.target.files?.[0])} />
        </label>
      </div>
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  )
}

function Field({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`grid gap-1 text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

/**
 * Dán danh sách: mỗi dòng một thẻ, các cột cách nhau bằng Tab (copy từ Excel/Google Sheets) hoặc dấu |
 *   từ | cách đọc | nghĩa | câu ví dụ | nghĩa câu ví dụ
 */
function ImportCards({ decks, onDone }: { decks: string[]; onDone: () => void }) {
  const [text, setText] = useState('')
  const [deck, setDeck] = useState(decks[0] ?? 'Thẻ của tôi')
  const [kind, setKind] = useState<CardKind>('vocab')
  const [msg, setMsg] = useState('')
  const rows = text
    .split('\n')
    .map((l) => l.split(l.includes('\t') ? '\t' : '|').map((x) => x.trim()))
    .filter((r) => r[0] && r[2])
  return (
    <Card className="grid gap-3">
      <h2 className="font-semibold">Dán danh sách thẻ</h2>
      <p className="text-sm text-muted">
        Mỗi dòng một thẻ, các cột cách nhau bằng phím Tab (copy thẳng từ Excel / Google Sheets) hoặc dấu |:
        <br /><span className="jp">từ | cách đọc | nghĩa | câu ví dụ | nghĩa câu ví dụ</span> (2 cột cuối không bắt buộc)
      </p>
      <textarea className={`jp ${inputCls} min-h-40 py-2`} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'食べる | たべる | ăn\n飲む | のむ | uống'} />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<CardKind> label="Loại thẻ" value={kind} onChange={setKind}
          options={[{ value: 'vocab', label: 'Từ vựng' }, { value: 'kanji', label: 'Kanji' }, { value: 'grammar', label: 'Ngữ pháp' }]} />
        <input className={`${inputCls} max-w-60`} list="review-decks-imp" value={deck} onChange={(e) => setDeck(e.target.value)} aria-label="Bộ thẻ" />
        <datalist id="review-decks-imp">{decks.map((d) => <option key={d} value={d} />)}</datalist>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={!rows.length || !deck.trim()} onClick={async () => {
          const n = await addCards(rows.map(([front, reading, meaning, example, exampleMeaning]) => ({
            deck, kind, front, reading, meaning, example, exampleMeaning,
          })))
          setMsg(`Đã thêm ${n} thẻ${rows.length - n ? `, bỏ qua ${rows.length - n} thẻ trùng` : ''}.`)
          setText('')
          if (n) setTimeout(onDone, 1200)
        }}>Thêm {rows.length || ''} thẻ</Button>
        {msg && <span className="text-sm text-good">{msg}</span>}
      </div>
    </Card>
  )
}

const STATE_LABEL = ['Mới', 'Đang học', 'Đã thuộc', 'Học lại'] as const

type Filter = 'all' | 'new' | 'learning' | 'review' | 'leech' | 'suspended' | 'buried' | 'image'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Mọi trạng thái' },
  { value: 'new', label: 'Chưa học' },
  { value: 'learning', label: 'Đang học' },
  { value: 'review', label: 'Đã thuộc' },
  { value: 'leech', label: 'Khó nhớ (leech)' },
  { value: 'suspended', label: 'Tạm ẩn' },
  { value: 'buried', label: 'Đang chôn' },
  { value: 'image', label: 'Có ảnh' },
]

function matchFilter(c: SrsCard, f: Filter, now: number) {
  switch (f) {
    case 'all': return true
    case 'new': return c.state === CardState.New
    case 'learning': return c.state === CardState.Learning || c.state === CardState.Relearning
    case 'review': return c.state === CardState.Review
    case 'leech': return isLeech(c)
    case 'suspended': return !!c.suspended
    case 'buried': return isBuried(c, now)
    case 'image': return !!c.image
  }
}

function CardList({
  cards, decks, onEdit, track, initialQuery,
}: {
  cards: SrsCard[]; decks: string[]; onEdit: (c: SrsCard) => void
  track: (label: string, run: Promise<CardSnapshot | undefined>) => Promise<void>; initialQuery: string
}) {
  const [q, setQ] = useState(initialQuery)
  const [deck, setDeck] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null) // thẻ đang mở thêm thao tác
  const [limit, setLimit] = useState(50)
  useEffect(() => setQ(initialQuery), [initialQuery])
  const now = Date.now()
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return cards
      .filter((c) => (!deck || c.deck === deck) && matchFilter(c, filter, now)
        && (!s || [c.front, c.reading, c.meaning, ...(c.tags ?? [])].some((x) => x?.toLowerCase().includes(s))))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [cards, q, deck, filter])

  const small = 'min-h-9 px-2'
  return (
    <Card className="!p-0">
      <div className="flex flex-wrap gap-2 p-4">
        <input className={`${inputCls} min-w-48 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo chữ, cách đọc, nghĩa, nhãn…" aria-label="Tìm thẻ" />
        <select className={selectCls} value={deck} onChange={(e) => setDeck(e.target.value)} aria-label="Lọc theo bộ">
          <option value="">Tất cả bộ</option>
          {decks.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className={selectCls} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Lọc theo trạng thái">
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {filter === 'leech' && list.length > 0 && (
        <p className="px-4 pb-3 text-sm text-muted">
          Thẻ khó nhớ là thẻ bạn quên đi quên lại. Thử bấm Sửa để thêm mẹo nhớ, ảnh hoặc câu ví dụ, rồi chọn “Bỏ nhãn khó nhớ”.
        </p>
      )}
      {list.length === 0 && <p className="px-4 pb-4 text-muted">Không có thẻ nào.</p>}
      <ul>
        {list.slice(0, limit).map((c) => {
          const buried = isBuried(c, now)
          return (
            <li key={c.id} className={`border-t border-border px-4 py-3 ${c.suspended ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {c.image && <img src={c.image} alt="" className="size-12 shrink-0 rounded-lg border border-border object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="jp text-lg font-medium">{c.front}</span>
                    {c.reading && <span className="jp ml-2 text-sm text-muted">{c.reading}</span>}
                  </p>
                  <p className="truncate text-sm">{c.meaning}</p>
                  <p className="text-xs text-muted">
                    {kindLabel(c.kind)} · {c.deck} · {c.suspended ? 'Tạm ẩn' : buried ? 'Đang chôn đến mai' : STATE_LABEL[c.state]}
                    {c.state !== CardState.New && !c.suspended && !buried && ` · ôn ${c.due <= now ? 'ngay' : `sau ${formatInterval(c.due - now)}`}`}
                    {c.lapses > 0 && ` · quên ${c.lapses} lần`}
                    {isLeech(c) && <span className="text-bad"> · khó nhớ</span>}
                  </p>
                </div>
                <div className="flex gap-1 text-sm">
                  <Button variant="ghost" className={small} onClick={() => onEdit(c)}>Sửa</Button>
                  <Button variant="ghost" className={small}
                    onClick={() => void track(c.suspended ? `Đã bỏ ẩn “${c.front}”` : `Đã tạm ẩn “${c.front}”`, setSuspended(c.id, !c.suspended))}>
                    {c.suspended ? 'Bỏ ẩn' : 'Ẩn'}
                  </Button>
                  <Button variant="ghost" className={small} onClick={() => void track(`Đã xóa “${c.front}”`, deleteCard(c.id))}>Xóa</Button>
                  <Button variant="ghost" className={small} aria-expanded={open === c.id} aria-label="Thêm thao tác"
                    onClick={() => setOpen(open === c.id ? null : c.id)}>⋯</Button>
                </div>
              </div>
              {open === c.id && (
                <div className="mt-2 flex flex-wrap gap-1 text-sm">
                  {buried ? (
                    <Button variant="soft" className={small} onClick={() => void track(`Đã bỏ chôn “${c.front}”`, unburyCard(c.id))}>Bỏ chôn</Button>
                  ) : (
                    <Button variant="soft" className={small} onClick={() => void track(`Đã chôn “${c.front}” đến mai`, buryCard(c.id))}>Chôn đến mai</Button>
                  )}
                  {c.state !== CardState.New && (
                    <Button variant="soft" className={small} onClick={() => void track(`Đã cho “${c.front}” học lại từ đầu`, resetCard(c.id))}>Học lại từ đầu</Button>
                  )}
                  {isLeech(c) && (
                    <Button variant="soft" className={small} onClick={() => void track(`Đã bỏ nhãn khó nhớ của “${c.front}”`, clearLeech(c.id))}>Bỏ nhãn khó nhớ</Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {list.length > limit && (
        <div className="border-t border-border p-3 text-center">
          <Button variant="ghost" onClick={() => setLimit((l) => l + 100)}>Xem thêm ({list.length - limit})</Button>
        </div>
      )}
    </Card>
  )
}
