/**
 * Tab "Ghi chú" của một cuốn sách: gom mọi ghi chú bạn viết, xếp theo bài:
 * ghi chú của bài, ghi chú của từng từ, ghi chú mẫu ngữ pháp, và ghi chú / tô sáng / đánh dấu trên file sách gốc.
 * Lọc bằng ô tìm, bấm để mở đúng chỗ, xuất cả cuốn ra Markdown.
 */
import { useEffect, useState } from 'react'
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { getGrammarPoints } from '@/modules/grammar/api'
import { lessonOfPage, listBookNotes } from './lib/files'
import { inputCls, useTx, type Key } from './ui'
import type { BookNote, Lesson, Textbook } from './types'

interface Row { key: string; kind: 'lesson' | 'word' | 'grammar' | 'page'; label?: string; quote?: string; color?: string; text: string; open: () => void }

const COLOR: Record<string, string> = { yellow: 'bg-warn/40', green: 'bg-good/30', red: 'bg-bad/30', gray: 'bg-muted/30' }

export function BookNotes({ book, lessons, onOpen, onRead }: {
  book: Textbook; lessons: Lesson[]; onOpen: (n: number, section?: string) => void; onRead: (fileId: string, page?: number) => void
}) {
  const t = useTx()
  const [q, setQ] = useState('')
  const [gNames, setGNames] = useState<Map<string, string>>(new Map())
  const { data: pageNotes } = useDbQuery(() => listBookNotes(book.id), [book.id], ['textbookNotes'])

  const gIds = lessons.flatMap((l) => Object.entries(l.grammarExtra ?? {}).filter(([, x]) => x.note?.trim()).map(([id]) => id))
  const gKey = gIds.join()
  useEffect(() => {
    if (gKey) void getGrammarPoints(gKey.split(',')).then((ps) => setGNames(new Map(ps.map((p) => [p.id, p.pattern]))))
  }, [gKey])

  // Gom theo bài (null = ghi chú trên sách chưa gắn bài nào)
  const groups = new Map<number | null, Row[]>()
  const add = (n: number | null, r: Row) => groups.set(n, [...(groups.get(n) ?? []), r])
  for (const l of lessons) {
    if (l.notes?.trim()) add(l.number, { key: `l:${l.id}`, kind: 'lesson', text: l.notes, open: () => onOpen(l.number) })
    for (const w of l.words) {
      if (w.note?.trim()) add(l.number, { key: `w:${w.id}`, kind: 'word', label: w.word, text: w.note, open: () => onOpen(l.number) })
    }
    for (const [id, x] of Object.entries(l.grammarExtra ?? {})) {
      if (x.note?.trim()) add(l.number, { key: `g:${l.id}:${id}`, kind: 'grammar', label: gNames.get(id) ?? id, text: x.note, open: () => onOpen(l.number, 'grammar') })
    }
  }
  for (const n of [...(pageNotes ?? [])].sort((a, b) => a.page - b.page)) {
    if (n.kind !== 'bookmark' && !n.text?.trim() && !n.quote?.trim()) continue
    add(lessonOfPage(book, n.fileId, n.page) ?? null, pageRow(n))
  }
  function pageRow(n: BookNote): Row {
    return {
      key: `n:${n.id}`, kind: 'page', label: `${n.kind === 'bookmark' ? '🔖 ' : ''}${t('nbPage', { n: n.page + 1 })}`,
      quote: n.quote, color: n.color, text: n.text ?? '', open: () => onRead(n.fileId, n.page),
    }
  }

  const needle = q.trim().toLowerCase()
  const match = (r: Row) => !needle || [r.text, r.quote, r.label].some((s) => s?.toLowerCase().includes(needle))
  const order = [...groups.keys()].sort((a, b) => (a ?? Infinity) - (b ?? Infinity))
  const shown = order.map((n) => [n, groups.get(n)!.filter(match)] as const).filter(([, rows]) => rows.length)
  const total = [...groups.values()].reduce((s, r) => s + r.length, 0)

  const exportMd = () => {
    const out = [`# ${book.title}: ghi chú`, '']
    for (const [n, rows] of shown) {
      out.push(n == null ? `## ${t('nbNoLesson')}` : `## ${t('lesson', { n })}`, '')
      for (const r of rows) {
        const head = r.kind === 'lesson' ? '' : `**${r.label}**${r.quote ? `: 「${r.quote.replace(/\s+/g, ' ')}」` : ''}`
        out.push(`- ${head}${head && r.text ? ' ' : ''}${r.text.replace(/\n/g, '\n  ')}`)
      }
      out.push('')
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/markdown' }))
    a.download = `${book.short} - ghi chú.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  if (!total) return <Card><p className="text-muted">{t('nbEmpty')}</p></Card>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputCls} !w-auto min-w-0 flex-1`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t('nbSearch')} aria-label={t('nbSearch')} />
        <span className="text-sm text-muted">{t('nbCount', { n: total })}</span>
        <Button variant="soft" onClick={exportMd}>{t('nbExport')}</Button>
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">{t('nbNoMatch')}</p>}
      {shown.map(([n, rows]) => (
        <Card key={n ?? 'none'} className="space-y-2">
          <h3 className="font-semibold">{n == null ? t('nbNoLesson') : t('lesson', { n })}</h3>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.key}>
                <button className="block w-full py-2 text-left text-sm hover:bg-surface-2" onClick={r.open}>
                  <span className="mb-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="rounded-full bg-surface-2 px-2 text-xs text-muted">{t(`nbKind_${r.kind}` as Key)}</span>
                    {r.label && <span className="jp font-medium">{r.label}</span>}
                  </span>
                  {r.quote && <span className={`jp mb-0.5 block rounded px-1 ${COLOR[r.color ?? 'yellow'] ?? COLOR.yellow}`}>「{r.quote}」</span>}
                  {r.text && <span className="block whitespace-pre-wrap">{r.text}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
