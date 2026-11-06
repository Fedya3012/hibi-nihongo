/**
 * THƯ VIỆN TỪ TƯỢNG THANH & KHẨU NGỮ (/immersion/manga?view=sfx)
 * Tra, lọc, nghe, xem ngay khung tranh trong truyện của bạn có từ đó, lưu vào Ôn tập, luyện nhanh,
 * và ôn riêng nhóm từ này.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useDbQuery } from '@/core/db'
import { listAllNotes, normalizeSearch } from './notes'
import { SFX, SLANG, SFX_KIND_LABEL, SFX_TAG, SLANG_TAG, sfxForms, type Sfx, type SfxKind, type Slang } from './study/sfx-data'
import { mineSfx, mineSlang, panelOfBubble, reviewPathForTags } from './study/mining'
import { speakJa, useJaVoice } from './study/audio'
import type { MangaBubble } from './types'

type Tab = 'sfx' | 'slang'
type KindFilter = 'all' | SfxKind | 'seen'

/** Chữ tượng thanh vẽ kiểu manga: nét đậm, viền, nghiêng (minh họa cách nó hiện trong truyện). */
export function SfxArt({ text, kind }: { text: string; kind: SfxKind }) {
  const tilt = kind === 'sound' ? '-rotate-6' : kind === 'feeling' ? 'rotate-3' : '-rotate-2'
  const n = [...text].length
  const size = n > 5 ? 'text-lg' : n > 3 ? 'text-2xl' : 'text-4xl'
  return (
    <div aria-hidden className="grid h-24 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
      <span className={`jp ${size} ${tilt} whitespace-nowrap font-black tracking-tighter text-text`}
        style={{ WebkitTextStroke: '1px var(--color-surface)', textShadow: '3px 3px 0 var(--color-primary), -1px -1px 0 var(--color-primary)' }}>
        {text}
      </span>
    </div>
  )
}

export function SfxLibrary({ back, openReader }: { back: () => void; openReader: (chapterId: string, page?: number) => void }) {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'slang' ? 'slang' : 'sfx'
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [kind, setKind] = useState<KindFilter>('all')
  const [msg, setMsg] = useState<string>()
  const [quiz, setQuiz] = useState(false)
  const { data: notes = [] } = useDbQuery(listAllNotes, [], ['mangaNotes'])
  const bubbles = useMemo(() => notes.filter((n): n is MangaBubble => n.kind === 'bubble' && !!n.text.trim()), [notes])

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((x) => (x === m ? undefined : x)), 3000) }
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); n.delete('q'); return n }, { replace: true })

  // Bong bóng trong truyện của bạn có chứa từ đó
  const seenSfx = useMemo(() => {
    const m = new Map<Sfx, MangaBubble[]>()
    for (const s of SFX) {
      const forms = sfxForms(s)
      const hits = bubbles.filter((b) => forms.some((f) => b.text.includes(f)))
      if (hits.length) m.set(s, hits)
    }
    return m
  }, [bubbles])
  const seenSlang = useMemo(() => {
    const m = new Map<Slang, MangaBubble[]>()
    for (const s of SLANG) {
      const hits = bubbles.filter((b) => s.re.test(b.text))
      if (hits.length) m.set(s, hits)
    }
    return m
  }, [bubbles])

  const q = normalizeSearch(query.trim())
  const sfxList = SFX.filter((s) => (kind === 'all' || (kind === 'seen' ? seenSfx.has(s) : s.kind === kind))
    && (!q || normalizeSearch(`${s.w} ${(s.alt ?? []).join(' ')} ${s.vi} ${s.ex} ${s.exVi}`).includes(q)))
  const slangList = SLANG.filter((s) => (kind !== 'seen' || seenSlang.has(s))
    && (!q || normalizeSearch(`${s.w} ${s.vi} ${s.polite} ${s.ex} ${s.exVi}`).includes(q)))

  const saveAll = async () => {
    let n = 0
    if (tab === 'sfx') for (const s of sfxList) n += Number(await mineSfx(s))
    else for (const s of slangList) n += Number(await mineSlang(s))
    flash(n ? `✓ Đã thêm ${n} thẻ mới vào Ôn tập` : 'Các thẻ này đã có trong Ôn tập')
  }

  return (
    <div className="grid gap-5">
      <button onClick={back} className="w-fit text-sm text-muted hover:text-text">← Thư viện manga</button>
      <div>
        <h1 className="text-2xl font-bold">Từ tượng thanh & khẩu ngữ</h1>
        <p className="text-sm text-muted">
          Những chữ "ドキドキ", "ゴゴゴ", "～ちゃう", "マジ"… gặp khắp nơi trong manga nhưng ít có trong giáo trình.
          Chữ nào xuất hiện trong lời thoại bạn đã thêm sẽ có nhãn <b>Gặp trong truyện</b> kèm khung tranh.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Tab> label="Nhóm" value={tab} onChange={setTab}
          options={[{ value: 'sfx', label: `Tượng thanh (${SFX.length})` }, { value: 'slang', label: `Khẩu ngữ (${SLANG.length})` }]} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm từ tượng thanh, khẩu ngữ"
          placeholder={tab === 'sfx' ? 'Tìm: どきどき, tim đập, mưa…' : 'Tìm: ちゃう, じゃん, mày…'}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary sm:max-w-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tab === 'sfx' ? (
          <Segmented<KindFilter> label="Loại" value={kind} onChange={setKind}
            options={[{ value: 'all', label: 'Tất cả' }, { value: 'sound', label: 'Âm thanh' }, { value: 'state', label: 'Dáng vẻ' },
              { value: 'feeling', label: 'Cảm xúc' }, { value: 'seen', label: `Gặp trong truyện (${seenSfx.size})` }]} />
        ) : (
          <Segmented<KindFilter> label="Lọc" value={kind === 'seen' ? 'seen' : 'all'} onChange={setKind}
            options={[{ value: 'all', label: 'Tất cả' }, { value: 'seen', label: `Gặp trong truyện (${seenSlang.size})` }]} />
        )}
      </div>

      {/* Ôn riêng nhóm này */}
      <Card className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Lưu nhóm đang hiện vào Ôn tập (bộ thẻ "Manga: {tab === 'sfx' ? 'Từ tượng thanh' : 'Khẩu ngữ'}"), rồi ôn riêng nhóm này.
          Câu bạn lưu từ manga có chứa {tab === 'sfx' ? 'từ tượng thanh' : 'khẩu ngữ'} cũng được gắn vào nhóm.
        </p>
        <Button variant="soft" onClick={() => setQuiz((v) => !v)}>{quiz ? 'Đóng luyện nhanh' : '⚡ Luyện nhanh'}</Button>
        <Button variant="soft" onClick={saveAll}>☆ Lưu {tab === 'sfx' ? sfxList.length : slangList.length} thẻ</Button>
        <Link to={reviewPathForTags([tab === 'sfx' ? SFX_TAG : SLANG_TAG])}
          className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">Ôn nhóm này</Link>
        {msg && <p role="status" className="w-full text-xs text-good">{msg}</p>}
      </Card>

      {quiz && <QuickQuiz items={tab === 'sfx' ? sfxList.map((s) => ({ q: sfxForms(s)[0] ?? s.w, a: s.vi })) : slangList.map((s) => ({ q: s.w, a: s.vi }))} />}

      {tab === 'sfx' ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {sfxList.map((s) => <SfxRow key={s.w} s={s} seen={seenSfx.get(s)} openReader={openReader} flash={flash} />)}
          {!sfxList.length && <p className="text-sm text-muted">Không có từ nào khớp.</p>}
        </ul>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {slangList.map((s) => <SlangRow key={s.w} s={s} seen={seenSlang.get(s)} openReader={openReader} flash={flash} />)}
          {!slangList.length && <p className="text-sm text-muted">Không có cách nói nào khớp.</p>}
        </ul>
      )}
    </div>
  )
}

function SpeakBtn({ text }: { text: string }) {
  const voice = useJaVoice()
  if (!voice) return null
  return <button type="button" onClick={() => void speakJa(text)} aria-label="Nghe" title="Nghe" className="ml-1 text-muted hover:text-primary">🔊</button>
}

/** Khung tranh trong truyện của bạn có chứa từ (tải ảnh khi mở). */
function SeenPanels({ hits, openReader }: { hits: MangaBubble[]; openReader: (chapterId: string, page?: number) => void }) {
  const [urls, setUrls] = useState<{ b: MangaBubble; url?: string }[]>([])
  useEffect(() => {
    let alive = true
    const made: string[] = []
    Promise.all(hits.slice(0, 3).map(async (b) => {
      const blob = await panelOfBubble(b)
      const url = blob ? URL.createObjectURL(blob) : undefined
      if (url) made.push(url)
      return { b, url }
    })).then((r) => alive && setUrls(r))
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)) }
  }, [hits])
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-muted">Trong truyện của bạn ({hits.length} câu)</p>
      <div className="flex gap-2 overflow-x-auto">
        {urls.map(({ b, url }) => (
          <button key={b.id} onClick={() => openReader(b.chapterId, b.page)} className="w-36 shrink-0 text-left" title="Mở trang này">
            {url ? <img src={url} alt={b.text} className="h-28 w-36 rounded-lg border border-border object-cover" />
              : <div className="grid h-28 w-36 place-items-center rounded-lg border border-border text-xs text-muted">Chưa có ảnh</div>}
            <span className="jp mt-1 block truncate text-xs">{b.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SfxRow({ s, seen, openReader, flash }: { s: Sfx; seen?: MangaBubble[]; openReader: (id: string, p?: number) => void; flash: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const form = sfxForms(s)[0] ?? s.w
  return (
    <li className="grid gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex gap-3">
        <SfxArt text={form} kind={s.kind} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1">
            <span className="jp text-lg font-semibold">{s.w}</span><SpeakBtn text={form} />
            {seen && <span className="rounded bg-primary-soft px-1.5 text-xs">Gặp trong truyện</span>}
          </p>
          <p className="text-xs text-muted">{SFX_KIND_LABEL[s.kind]}{s.alt?.length ? ` · ${s.alt.join('、')}` : ''}</p>
          <p className="mt-1 text-sm">{s.vi}</p>
        </div>
      </div>
      <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
        <span className="jp text-base">{s.ex}</span><SpeakBtn text={s.ex} />
        <span className="block text-muted">{s.exVi}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" className="min-h-9" onClick={async () => {
          const panel = seen ? await panelOfBubble(seen[0]) : null
          flash((await mineSfx(s, panel)) ? `✓ Đã lưu ${s.w}${panel ? ' (kèm khung tranh của bạn)' : ''}` : `${s.w} đã có trong Ôn tập`)
        }}>☆ Lưu vào Ôn tập</Button>
        {seen && <Button variant="ghost" className="min-h-9" onClick={() => setOpen((v) => !v)}>{open ? 'Ẩn khung tranh' : 'Xem khung tranh'}</Button>}
      </div>
      {open && seen && <SeenPanels hits={seen} openReader={openReader} />}
    </li>
  )
}

function SlangRow({ s, seen, openReader, flash }: { s: Slang; seen?: MangaBubble[]; openReader: (id: string, p?: number) => void; flash: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="grid gap-2 rounded-card border border-border bg-surface p-4">
      <p className="flex flex-wrap items-center gap-1">
        <span className="jp text-lg font-semibold">{s.w}</span>
        {seen && <span className="rounded bg-primary-soft px-1.5 text-xs">Gặp trong truyện</span>}
      </p>
      <p className="text-sm">{s.vi}</p>
      <div className="grid gap-1 rounded-xl bg-surface-2 px-3 py-2 text-sm">
        <p><span className="text-xs text-muted">Manga nói: </span><span className="jp text-base">{s.ex}</span><SpeakBtn text={s.ex} /></p>
        <p className="text-muted">{s.exVi}</p>
        <p><span className="text-xs text-muted">Lịch sự / chuẩn: </span><span className="jp">{s.polite}</span></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" className="min-h-9" onClick={async () => flash((await mineSlang(s)) ? `✓ Đã lưu ${s.w}` : `${s.w} đã có trong Ôn tập`)}>☆ Lưu vào Ôn tập</Button>
        {seen && <Button variant="ghost" className="min-h-9" onClick={() => setOpen((v) => !v)}>{open ? 'Ẩn khung tranh' : 'Xem trong truyện'}</Button>}
      </div>
      {open && seen && <SeenPanels hits={seen} openReader={openReader} />}
    </li>
  )
}

/** Luyện nhanh: nhìn chữ, chọn nghĩa đúng trong 4 lựa chọn. */
function QuickQuiz({ items }: { items: { q: string; a: string }[] }) {
  const make = () => {
    if (items.length < 4) return null
    const pick = items[Math.floor(Math.random() * items.length)]
    const others = items.filter((x) => x.a !== pick.a).sort(() => Math.random() - 0.5).slice(0, 3)
    return { pick, options: [...others, pick].sort(() => Math.random() - 0.5) }
  }
  const [round, setRound] = useState(make)
  const [chosen, setChosen] = useState<string>()
  const [score, setScore] = useState({ ok: 0, all: 0 })
  if (!round) return <Card className="text-sm text-muted">Cần ít nhất 4 mục trong bộ lọc để luyện.</Card>
  return (
    <Card className="grid gap-3">
      <p className="text-xs text-muted">Chữ này nghĩa là gì? · đúng {score.ok}/{score.all}</p>
      <p className="jp text-center text-4xl font-bold">{round.pick.q}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {round.options.map((o) => {
          const st = chosen && (o.a === round.pick.a ? 'border-good text-good' : o.a === chosen ? 'border-bad text-bad' : 'opacity-60')
          return (
            <button key={o.q} disabled={!!chosen} onClick={() => { setChosen(o.a); setScore((s) => ({ ok: s.ok + Number(o.a === round.pick.a), all: s.all + 1 })) }}
              className={`min-h-12 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-surface-2 ${st || ''}`}>{o.a}</button>
          )
        })}
      </div>
      {chosen && <Button onClick={() => { setChosen(undefined); setRound(make()) }}>Câu tiếp →</Button>}
    </Card>
  )
}
