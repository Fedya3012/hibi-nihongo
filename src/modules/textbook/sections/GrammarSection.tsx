/**
 * MỤC NGỮ PHÁP CỦA BÀI
 * Nội dung (giải thích, cấu trúc, ví dụ, lưu ý) lấy thẳng từ module Ngữ pháp, không chép lại.
 * Phần riêng của bạn trong bài: ví dụ chép từ sách + ghi chú cho từng mẫu (lưu trong `lesson.grammarExtra`).
 * Cuối mục: bài luyện (điền, sắp xếp, chọn nghĩa) chỉ với các mẫu của bài.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { tagReviewCards } from '@/modules/review/api'
import {
  addGrammarCards, ExampleRow, GrammarPractice, grammarPath, listGrammarPoints, setGrammarLearned, useGrammarState,
  type GrammarPoint,
} from '@/modules/grammar/api'
import { updateLesson } from '../store'
import { lessonTag } from '../lib/learn'
import { isDefaultGrammar } from '../lib/grammar'
import { inputCls, useTx } from '../ui'
import type { GrammarExtra, Lesson, Textbook } from '../types'

export function GrammarSection({ book, lesson, ids }: { book: Textbook; lesson: Lesson; ids: string[] }) {
  const t = useTx()
  const navigate = useNavigate()
  const state = useGrammarState()
  const [editing, setEditing] = useState(false)
  const { data: all } = useDbQuery(() => listGrammarPoints(), [], [])
  const byId = useMemo(() => new Map((all ?? []).map((p) => [p.id, p])), [all])
  const points = ids.flatMap((id) => byId.get(id) ?? [])

  const saveIds = (next: string[] | undefined) =>
    updateLesson(book.id, lesson.number, (l) => ({ ...l, grammarIds: next }))

  if (!all) return null

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {!ids.length ? t(book.grammarBook ? 'gEmpty' : 'gEmptyCustom')
              : isDefaultGrammar(lesson) ? t('gSuggestNote') : t('gCustomized')}
          </p>
          <div className="flex gap-2">
            {!isDefaultGrammar(lesson) && book.grammarBook && (
              <Button variant="ghost" onClick={() => void saveIds(undefined)}>{t('gReset')}</Button>
            )}
            <Button variant="soft" onClick={() => setEditing(!editing)}>{editing ? t('gEditDone') : t('gEdit')}</Button>
          </div>
        </div>
        {editing && <PointPicker all={all} ids={ids} onChange={(next) => void saveIds(next)} removeLabel={t('gRemove')} />}
      </Card>

      {points.map((p) => (
        <PointCard key={p.id} book={book} lesson={lesson} point={p}
          learned={!!state?.progress[p.id]?.learned || !!state?.inReview.has(p.id)}
          stat={state?.progress[p.id]} onOpen={() => navigate(grammarPath(p.id))} />
      ))}

      {points.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t('gPractice')}</h2>
          <p className="mb-3 text-sm text-muted">{t('gPracticeHint')}</p>
          <GrammarPractice points={all} state={state} ids={ids} level={points[0].level}
            onOpen={(id) => navigate(grammarPath(id))} />
        </Card>
      )}
    </div>
  )
}

/** Thêm / bỏ mẫu của bài: tìm theo mẫu, nghĩa hoặc mã. */
function PointPicker({ all, ids, onChange, removeLabel }: {
  all: GrammarPoint[]; ids: string[]; onChange: (ids: string[]) => void; removeLabel: string
}) {
  const t = useTx()
  const [q, setQ] = useState('')
  const found = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return all.filter((p) => !ids.includes(p.id) &&
      (p.pattern.toLowerCase().includes(s) || p.meaning.toLowerCase().includes(s) || p.id.includes(s))).slice(0, 12)
  }, [all, ids, q])
  const byId = new Map(all.map((p) => [p.id, p]))
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <ul className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <li key={id} className="flex items-center gap-1 rounded-xl bg-surface-2 py-1 pl-3 pr-1 text-sm">
            <span className="jp">{byId.get(id)?.pattern ?? id}</span>
            <button aria-label={`${removeLabel} ${byId.get(id)?.pattern ?? id}`} onClick={() => onChange(ids.filter((x) => x !== id))}
              className="rounded-lg px-2 text-muted hover:text-bad">✕</button>
          </li>
        ))}
      </ul>
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('gSearch')} />
      {found.length > 0 && (
        <ul className="divide-y divide-border">
          {found.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="jp font-medium">{p.pattern}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">N{p.level} · {p.meaning}</span>
              <Button variant="soft" onClick={() => { onChange([...ids, p.id]); setQ('') }}>{t('gAdd')}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PointCard({ book, lesson, point: p, learned, stat, onOpen }: {
  book: Textbook; lesson: Lesson; point: GrammarPoint; learned: boolean
  stat?: { right?: number; wrong?: number }; onOpen: () => void
}) {
  const t = useTx()
  const [open, setOpen] = useState(false)
  const extra = lesson.grammarExtra?.[p.id] ?? {}
  const [own, setOwn] = useState(() => (extra.examples ?? []).map(([jp, vi]) => vi ? `${jp} | ${vi}` : jp).join('\n'))
  const [msg, setMsg] = useState('')

  const saveExtra = (patch: GrammarExtra) => updateLesson(book.id, lesson.number, (l) => {
    const next = { ...(l.grammarExtra?.[p.id] ?? {}), ...patch }
    const empty = !next.note?.trim() && !next.examples?.length
    const map = { ...(l.grammarExtra ?? {}) }
    if (empty) delete map[p.id]; else map[p.id] = next
    return { ...l, grammarExtra: map }
  })

  const saveOwn = () => {
    const examples = own.split('\n').map((s) => s.trim()).filter(Boolean)
      .map((s) => { const [jp, ...vi] = s.split(/\s*[|｜]\s*/); return [jp, vi.join(' | ')] as [string, string] })
    void saveExtra({ examples })
  }

  const toReview = async () => {
    const n = await addGrammarCards([p])
    await tagReviewCards([{ module: 'grammar', ref: p.id }], lessonTag(book, lesson.number))
    setMsg(t('learnGrammar', { n }))
  }

  return (
    <Card className="space-y-3">
      <button className="flex w-full items-start gap-3 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1">
          <div className="jp text-xl font-semibold">{p.pattern}</div>
          <div className="text-muted">{p.meaning}</div>
        </div>
        {learned && <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-sm text-good">{t('gLearned')}</span>}
        <span className="text-muted" aria-hidden>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="space-y-4">
          <section>
            <h3 className="mb-1 text-sm font-medium text-muted">{t('gForm')}</h3>
            <ul className="space-y-1">
              {p.form.map((f, i) => <li key={i} className="jp rounded-lg bg-surface-2 px-3 py-1.5">{f}</li>)}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-medium text-muted">{t('gExplain')}</h3>
            <p className="whitespace-pre-line">{p.explain}</p>
          </section>
          {p.notes && (
            <section>
              <h3 className="mb-1 text-sm font-medium text-muted">{t('gNotes')}</h3>
              <p className="whitespace-pre-line text-sm">{p.notes}</p>
            </section>
          )}
          {(extra.examples?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted">{t('gOwnExamples')}</h3>
              <ul>{extra.examples!.map(([jp, vi], i) => <ExampleRow key={i} src={jp} vi={vi} listenLabel={t('listen')} />)}</ul>
            </section>
          )}
          <section>
            <h3 className="text-sm font-medium text-muted">{t('gExamples')}</h3>
            <ul>{p.examples.map(([jp, vi], i) => <ExampleRow key={i} src={jp} vi={vi} listenLabel={t('listen')} />)}</ul>
          </section>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('gOwnEdit')}</span>
            <textarea className={`${inputCls} jp min-h-20 py-2`} value={own} placeholder={t('gOwnPh')}
              onChange={(e) => setOwn(e.target.value)} onBlur={saveOwn} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('gMyNote')}</span>
            <textarea className={`${inputCls} min-h-16 py-2`} defaultValue={extra.note ?? ''}
              onBlur={(e) => { if (e.target.value !== (extra.note ?? '')) void saveExtra({ note: e.target.value }) }} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={learned ? 'soft' : 'primary'} onClick={() => void setGrammarLearned(p.id, !learned)}>
              {learned ? t('gLearned') : t('gMarkLearned')}
            </Button>
            <Button variant="soft" onClick={() => void toReview()}>{t('gToReview')}</Button>
            <Button variant="ghost" onClick={onOpen}>{t('gOpen')}</Button>
            {(stat?.right || stat?.wrong) ? (
              <span className="ml-auto text-sm text-muted">{t('gWrongStat', { right: stat.right ?? 0, wrong: stat.wrong ?? 0 })}</span>
            ) : null}
          </div>
          {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
        </div>
      )}
    </Card>
  )
}
