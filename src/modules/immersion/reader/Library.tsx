/** THƯ VIỆN VĂN BẢN: đọc tiếp, danh sách văn bản đã thêm, nút thêm mới. */
import { useState } from 'react'
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { useDbQuery } from '@/core/db'
import { useT } from '@/core/i18n'
import { ProgressBar } from '../manga/ui'
import { AddDialog } from './AddDialog'
import { deleteDoc, listDocs } from './store'
import { S } from './strings'
import type { DocMeta, DocSource } from './types'

const SRC_KEY = { paste: 'srcPaste', url: 'srcUrl', txt: 'srcTxt', epub: 'srcEpub', clipboard: 'srcClipboard' } as const satisfies Record<DocSource, string>

export function Library({ openDoc }: { openDoc: (id: string) => void }) {
  const t = useT(S)
  const [adding, setAdding] = useState(false)
  const { data: docs } = useDbQuery(listDocs, [], ['kv'])
  const resume = docs?.find((d) => d.openedAt && !d.finishedAt)

  const remove = async (d: DocMeta) => {
    if (window.confirm(t('confirmDelete', { title: d.title }))) await deleteDoc(d.id)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted">{t('hint')}</p>
        </div>
        <Button onClick={() => setAdding(true)}>{t('add')}</Button>
      </div>

      {resume && (
        <Card className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{t('continue')}</p>
            <p className="jp truncate font-semibold">{resume.title}</p>
            <ProgressBar className="mt-2" value={(resume.page + 1) / Math.max(1, resume.pages)} />
          </div>
          <Button onClick={() => openDoc(resume.id)}>{t('continue')}</Button>
        </Card>
      )}

      {docs && docs.length === 0 && (
        <Card className="text-center">
          <div className="jp text-4xl text-primary" aria-hidden>読</div>
          <p className="mt-2 text-sm text-muted">{t('empty')}</p>
          <Button className="mt-4" onClick={() => setAdding(true)}>{t('add')}</Button>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {docs?.map((d) => (
          <Card key={d.id} className="flex flex-col gap-2 p-4">
            <button className="text-left outline-none focus-visible:underline" onClick={() => openDoc(d.id)}>
              <p className="jp line-clamp-2 font-semibold">{d.title}</p>
            </button>
            <p className="flex flex-wrap gap-x-2 text-xs text-muted">
              <span className="rounded bg-surface-2 px-1.5">{t(SRC_KEY[d.source])}</span>
              <span>{t('chars', { n: d.chars.toLocaleString() })}</span>
              <span>{d.finishedAt ? `✓ ${t('done')}` : t('pageOf', { i: d.page + 1, n: d.pages })}</span>
            </p>
            <ProgressBar value={d.finishedAt ? 1 : (d.page + (d.openedAt ? 1 : 0)) / Math.max(1, d.pages)} />
            <div className="mt-auto flex justify-between gap-2 pt-1">
              <Button variant="ghost" className="min-h-9 px-2 text-sm" onClick={() => remove(d)}>{t('delete')}</Button>
              <Button variant="soft" className="min-h-9 text-sm" onClick={() => openDoc(d.id)}>{d.openedAt ? t('continue') : t('open')}</Button>
            </div>
          </Card>
        ))}
      </div>

      {adding && <AddDialog onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); openDoc(id) }} />}
    </div>
  )
}
