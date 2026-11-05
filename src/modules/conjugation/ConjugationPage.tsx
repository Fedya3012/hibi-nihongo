/**
 * TRANG LUYỆN CHIA (module conjugation) — đường dẫn /learn/conjugation
 * Tab: Luyện tập · Bảng chia.
 * Đường dẫn mở thẳng:
 *   /learn/conjugation?tab=table            bảng chia
 *   /learn/conjugation?tab=table&w=書く     bảng chia của 書く (từ trong danh sách có sẵn)
 *   /learn/conjugation?w=書く               luyện riêng từ 書く
 * Hướng dẫn: README.md
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import type { ConjWord } from './types'
import { WORDS } from './data/words'
import { Practice } from './Practice'
import { TableView } from './TableView'
import { S } from './strings'

type Tab = 'practice' | 'table'

export default function ConjugationPage() {
  const t = useT(S)
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'table' ? 'table' : 'practice'
  const wParam = params.get('w')
  // Từ tra trong Từ điển không có trong WORDS → giữ trong state (không ghi được lên đường dẫn)
  const [extra, setExtra] = useState<ConjWord | undefined>()
  const word = wParam ? (WORDS.find((w) => w.w === wParam || w.r === wParam) ?? (extra?.w === wParam ? extra : undefined)) : undefined

  const go = (next: { tab?: Tab; w?: ConjWord }) => {
    const p = new URLSearchParams()
    if (next.tab === 'table') p.set('tab', 'table')
    if (next.w) {
      p.set('w', next.w.w)
      if (!WORDS.includes(next.w)) setExtra(next.w)
    }
    setParams(p)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted">{t('subtitle')}</p>
        </div>
        <Segmented<Tab> label={t('tabLabel')} value={tab} onChange={(v) => go({ tab: v })}
          options={[{ value: 'practice', label: t('tabPractice') }, { value: 'table', label: t('tabTable') }]} />
      </div>
      {tab === 'practice'
        ? <Practice key={word?.w ?? ''} focus={word} onClearFocus={() => go({})} />
        : <TableView selected={word} onSelect={(w) => go({ tab: 'table', w })} onPractice={(w) => go({ w })} />}
    </div>
  )
}
