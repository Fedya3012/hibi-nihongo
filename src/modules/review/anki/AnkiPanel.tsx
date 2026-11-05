/**
 * GIAO DIỆN NHẬP / XUẤT ANKI (trong tab "Thẻ" của Ôn tập → "Anki")
 * - Nhập: chọn file .apkg → xem trước từng loại ghi chú, chỉnh trường nào vào ô nào → Nhập.
 * - Xuất: chọn bộ → tải về file .apkg mở được bằng Anki / AnkiDroid / AnkiMobile.
 * Phần đọc/ghi SQLite khá nặng (~1 MB) nên chỉ được tải khi bấm nút.
 */
import { useMemo, useState } from 'react'
import { getAll } from '@/core/db'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { kindLabel } from '../CardFace'
import { allCards } from '../store'
import type { CardKind, SrsCard, SrsLog } from '../types'
import { guessKind, guessMapping, mainCard, TARGET_LABEL, type Target } from './convert'
import type { AnkiPackage } from './read'
import { importAnki, previewNote, type ImportResult, type TypePlan } from './import'

const selectCls = 'min-h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary'
const inputCls = 'min-h-10 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary'
const TARGETS = Object.keys(TARGET_LABEL) as Target[]
const KINDS: CardKind[] = ['vocab', 'kanji', 'grammar']

export function AnkiPanel({ decks }: { decks: string[] }) {
  return (
    <div className="grid gap-4">
      <ImportSection />
      <ExportSection decks={decks} />
    </div>
  )
}

// ---------------- Nhập ----------------

function ImportSection() {
  const [pkg, setPkg] = useState<AnkiPackage | null>(null)
  const [plans, setPlans] = useState<Map<number, TypePlan>>(new Map())
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [keepProgress, setKeepProgress] = useState(true)
  const [keepSuspended, setKeepSuspended] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)
  const [ownDeck, setOwnDeck] = useState(false)
  const [deckName, setDeckName] = useState('')

  const open = async (file?: File | null) => {
    if (!file) return
    setError(''); setResult(null); setPkg(null); setBusy('Đang đọc file…')
    try {
      const { readApkg } = await import('./read')
      const p = await readApkg(file)
      if (!p.notes.length) throw new Error('Gói này không có thẻ nào.')
      const next = new Map<number, TypePlan>()
      for (const nt of p.noteTypes.values()) {
        const sample = p.notes.find((n) => n.typeId === nt.id)
        if (!sample) continue
        next.set(nt.id, { include: true, kind: guessKind(nt.name, p.decks.get(mainCard(sample).deckId)), mapping: guessMapping(nt) })
      }
      setPlans(next)
      setPkg(p)
      setDeckName(file.name.replace(/\.(apkg|colpkg)$/i, ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file này.')
    } finally {
      setBusy('')
    }
  }

  const total = pkg ? pkg.notes.filter((n) => plans.get(n.typeId)?.include).length : 0

  const run = async () => {
    if (!pkg) return
    setError(''); setBusy('Đang nhập…')
    try {
      const r = await importAnki(pkg, {
        plans, keepProgress, keepSuspended, includeImages, deckName: ownDeck ? deckName : undefined,
      }, (done, all) => setBusy(`Đang nhập ${done.toLocaleString('vi-VN')}/${all.toLocaleString('vi-VN')}…`))
      setResult(r)
      setPkg(null)
    } catch (e) {
      setError(e instanceof Error ? `Lỗi khi nhập: ${e.message}` : 'Lỗi khi nhập.')
    } finally {
      setBusy('')
    }
  }

  const deckNames = useMemo(() => {
    if (!pkg) return []
    const used = new Set(pkg.notes.map((n) => mainCard(n).deckId))
    return [...used].map((id) => pkg.decks.get(id) ?? 'Anki').sort()
  }, [pkg])

  return (
    <Card className="grid gap-3">
      <h2 className="font-semibold">Nhập bộ thẻ Anki</h2>
      <p className="text-sm text-muted">
        Trong Anki chọn <b>Tệp → Xuất…</b> (File → Export), kiểu <b>“Gói bộ thẻ Anki (.apkg)”</b>, đánh dấu “Kèm thông tin lịch ôn” (Include scheduling information)
        nếu muốn giữ tiến độ. Bộ thẻ tải trên AnkiWeb cũng dùng được. Thẻ đã có (cùng bộ, cùng chữ) sẽ không bị thêm trùng.
      </p>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary-soft px-4 py-2 font-medium hover:opacity-90">
        📦 Chọn file .apkg…
        <input type="file" accept=".apkg,.colpkg" className="sr-only" disabled={!!busy}
          onChange={(e) => { void open(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {busy && <p role="status" className="text-sm text-muted">{busy}</p>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {result && (
        <p role="status" className="text-sm text-good">
          Đã nhập {result.added.toLocaleString('vi-VN')} thẻ{result.images ? ` (${result.images} ảnh)` : ''}.
          {result.duplicates > 0 && ` Bỏ qua ${result.duplicates} thẻ đã có.`}
          {result.empty > 0 && ` Bỏ qua ${result.empty} ghi chú thiếu chữ hoặc nghĩa (thử đổi cách ghép trường).`}
        </p>
      )}

      {pkg && !busy && (
        <div className="grid gap-4">
          <p className="text-sm">
            <b>{pkg.fileName}</b>: {pkg.notes.length.toLocaleString('vi-VN')} ghi chú
            {deckNames.length > 0 && <> trong {deckNames.length} bộ ({deckNames.slice(0, 4).join(', ')}{deckNames.length > 4 ? '…' : ''})</>}
            {pkg.mediaNames.size > 0 && `, ${pkg.mediaNames.size} file media`}.
          </p>

          {[...plans.entries()].map(([id, plan]) => (
            <TypePlanEditor key={id} pkg={pkg} typeId={id} plan={plan}
              onChange={(p) => setPlans((m) => new Map(m).set(id, p))} />
          ))}

          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-medium">Tùy chọn</legend>
            <Check checked={keepProgress} onChange={setKeepProgress}
              label="Giữ tiến độ học từ Anki (hạn ôn, độ thuộc, số lần quên). Bỏ chọn = học lại từ đầu." />
            <Check checked={keepSuspended} onChange={setKeepSuspended} label="Giữ thẻ đang tạm ẩn trong Anki ở trạng thái tạm ẩn" />
            <Check checked={includeImages} onChange={setIncludeImages} label="Nhập kèm ảnh (âm thanh chưa hỗ trợ, app đọc bằng giọng máy)" />
            <Check checked={ownDeck} onChange={setOwnDeck} label="Gộp tất cả vào một bộ (bỏ chọn = giữ tên bộ như trong Anki)" />
            {ownDeck && <input className={`${inputCls} max-w-80`} value={deckName} onChange={(e) => setDeckName(e.target.value)} aria-label="Tên bộ" />}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!total || (ownDeck && !deckName.trim())} onClick={() => void run()}>
              Nhập {total.toLocaleString('vi-VN')} thẻ
            </Button>
            <Button variant="ghost" onClick={() => setPkg(null)}>Hủy</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function TypePlanEditor({ pkg, typeId, plan, onChange }: { pkg: AnkiPackage; typeId: number; plan: TypePlan; onChange: (p: TypePlan) => void }) {
  const nt = pkg.noteTypes.get(typeId)!
  const notes = useMemo(() => pkg.notes.filter((n) => n.typeId === typeId), [pkg, typeId])
  const [sampleIdx, setSampleIdx] = useState(0)
  const sample = notes[sampleIdx % notes.length]
  // Xem trước một ghi chú với cách ghép trường hiện tại
  const preview = useMemo(() => previewNote(pkg, sample, plan), [pkg, sample, plan])

  const setTarget = (i: number, t: Target) => onChange({ ...plan, mapping: plan.mapping.map((x, j) => (j === i ? t : x)) })

  return (
    <div className={`rounded-xl border border-border p-3 ${plan.include ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 basis-full items-center gap-2 font-medium sm:basis-0 sm:flex-1">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={plan.include}
            onChange={(e) => onChange({ ...plan, include: e.target.checked })} />
          <span className="min-w-0 break-words">Loại ghi chú “{nt.name}”</span>
          <span className="shrink-0 text-sm font-normal text-muted">{notes.length.toLocaleString('vi-VN')} ghi chú</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Loại thẻ
          <select className={selectCls} value={plan.kind} onChange={(e) => onChange({ ...plan, kind: e.target.value as CardKind })}>
            {KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        </label>
      </div>

      {plan.include && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="grid content-start gap-1.5 text-sm">
            <p className="text-muted">Trường trong Anki → ô của thẻ</p>
            {nt.fields.map((f, i) => (
              <label key={i} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate" title={f}>{f}</span>
                <span className="text-muted">→</span>
                <select className={`${selectCls} w-36 sm:w-44`} value={plan.mapping[i] ?? 'skip'} onChange={(e) => setTarget(i, e.target.value as Target)}>
                  {TARGETS.filter((t) => t !== 'cloze' || nt.cloze).map((t) => <option key={t} value={t}>{TARGET_LABEL[t]}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-muted">Xem trước</span>
              {notes.length > 1 && (
                <Button variant="ghost" className="min-h-8 px-2 text-sm" onClick={() => setSampleIdx((i) => i + 1)}>Thẻ khác ↻</Button>
              )}
            </div>
            <div className="grid gap-1">
                <p><span className="jp text-2xl font-semibold">{preview.front || <span className="text-bad">(trống)</span>}</span>
                  {preview.reading && <span className="jp ml-2 text-muted">{preview.reading}</span>}</p>
                <p className="whitespace-pre-line">{preview.meaning || <span className="text-bad">(chưa có nghĩa, thẻ sẽ bị bỏ qua)</span>}</p>
                {preview.example && <p className="jp text-muted">{preview.example}</p>}
                {preview.exampleMeaning && <p className="text-muted">{preview.exampleMeaning}</p>}
                {preview.notes && <p className="line-clamp-3 whitespace-pre-line text-xs text-muted">{preview.notes}</p>}
                {preview.imageName && <p className="text-xs text-muted">🖼 {preview.imageName}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

// ---------------- Xuất ----------------

function ExportSection({ decks }: { decks: string[] }) {
  const [deck, setDeck] = useState('')
  const [includeProgress, setIncludeProgress] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true); setMsg('')
    try {
      const cards = (await allCards()).filter((c: SrsCard) => !deck || c.deck === deck)
      const ids = new Set(cards.map((c) => c.id))
      const logs = includeProgress ? (await getAll<SrsLog>('srsLogs')).filter((l) => ids.has(l.cardId)) : []
      const { exportApkg } = await import('./export')
      const blob = await exportApkg(cards, logs, { includeProgress, includeImages })
      const safe = (deck || 'tat-ca').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `hibi-${safe}-${new Date().toISOString().slice(0, 10)}.apkg`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
      setMsg(`Đã xuất ${cards.length.toLocaleString('vi-VN')} thẻ. Mở file vừa tải bằng Anki để nhập.`)
    } catch (e) {
      setMsg(e instanceof Error ? `Lỗi khi xuất: ${e.message}` : 'Lỗi khi xuất.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="grid gap-3">
      <h2 className="font-semibold">Xuất ra Anki</h2>
      <p className="text-sm text-muted">
        Tạo file .apkg mở được bằng Anki (máy tính), AnkiDroid và AnkiMobile. Nhập lại file này vào app cũng được.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select className={selectCls} value={deck} onChange={(e) => setDeck(e.target.value)} aria-label="Bộ cần xuất">
          <option value="">Tất cả bộ</option>
          {decks.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid gap-2 text-sm">
        <Check checked={includeProgress} onChange={setIncludeProgress} label="Kèm tiến độ học (hạn ôn, độ thuộc, lịch sử ôn)" />
        <Check checked={includeImages} onChange={setIncludeImages} label="Kèm ảnh của thẻ" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || !decks.length} onClick={() => void run()}>{busy ? 'Đang tạo file…' : '⬇ Tải file .apkg'}</Button>
        {msg && <span role="status" className="text-sm text-good">{msg}</span>}
      </div>
    </Card>
  )
}
