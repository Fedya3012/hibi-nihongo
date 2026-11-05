/**
 * TRANG NGỮ PHÁP (module grammar) — đường dẫn /learn/grammar
 * Tab: Danh sách (theo cấp JLPT) · Luyện tập. Bấm một mẫu để mở bài.
 * Đường dẫn mở thẳng:
 *   /learn/grammar?lv=4                    danh sách N4
 *   /learn/grammar?p=te-mo-ii              bài 〜てもいいです
 *   /learn/grammar?tab=practice            luyện tập
 *   /learn/grammar?tab=practice&ids=a,b    luyện riêng vài mẫu (vd từ một bài giáo trình)
 * Nội dung: data/n5.ts, data/n4.ts. Hướng dẫn: README.md
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import type { GrammarPoint, JlptLevel } from './types'
import { loadGrammar, LEVELS } from './lib/content'
import { useGrammarState } from './lib/progress'
import { GrammarList } from './GrammarList'
import { GrammarDetail } from './GrammarDetail'
import { Practice } from './Practice'
import { S } from './strings'

type Tab = 'list' | 'practice'

export default function GrammarPage() {
  const t = useT(S)
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<{ list: GrammarPoint[]; byId: Map<string, GrammarPoint> } | null>(null)
  const state = useGrammarState()
  useEffect(() => { loadGrammar().then(setData) }, [])

  const tab: Tab = params.get('tab') === 'practice' ? 'practice' : 'list'
  const lvParam = Number(params.get('lv'))
  const pointId = params.get('p') ?? undefined
  const point = pointId ? data?.byId.get(pointId) : undefined
  const level: JlptLevel = point?.level
    ?? (LEVELS.some((l) => l.ready && l.level === lvParam) ? (lvParam as JlptLevel) : 5)
  const ids = params.get('ids')?.split(',').filter(Boolean)

  const go = useCallback((patch: Record<string, string | undefined>, push = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (next.get('tab') === 'list') next.delete('tab')
    if (next.get('lv') === '5') next.delete('lv')
    setParams(next, { replace: !push })
  }, [params, setParams])

  const open = useCallback((id: string) => {
    go({ tab: undefined, ids: undefined, p: id, lv: String(data?.byId.get(id)?.level ?? level) })
    window.scrollTo({ top: 0 })
  }, [go, data, level])

  // Mẫu trước / sau trong cùng cấp
  const sameLevel = data?.list.filter((p) => p.level === level) ?? []
  const idx = point ? sameLevel.indexOf(point) : -1

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')} <span className="jp ml-1 text-lg font-normal text-muted">文法</span></h1>
        <Segmented<Tab> label={t('tabLabel')} value={tab} onChange={(v) => go({ tab: v, p: undefined, ids: undefined })}
          options={[{ value: 'list', label: t('tabList') }, { value: 'practice', label: t('tabPractice') }]} />
      </div>

      {!data ? <p className="text-muted">{t('loading')}</p> : tab === 'practice' ? (
        <Practice key={ids?.join(',') ?? level} points={data.list} state={state} ids={ids} level={level}
          onOpen={open} onClearIds={() => go({ ids: undefined }, false)} />
      ) : point ? (
        <>
          <Button variant="ghost" className="mb-2" onClick={() => go({ p: undefined })}>{t('back')}</Button>
          <GrammarDetail key={point.id} point={point} byId={data.byId} state={state} onOpen={open}
            onPractice={() => go({ tab: 'practice', ids: point.id, p: undefined })}
            prev={idx > 0 ? sameLevel[idx - 1].id : undefined}
            next={idx >= 0 && idx < sameLevel.length - 1 ? sameLevel[idx + 1].id : undefined} />
        </>
      ) : (
        <GrammarList points={data.list} level={level} onLevel={(l) => go({ lv: String(l) }, false)} onOpen={open} state={state} />
      )}

      <p className="mt-8 text-xs text-muted">{t('credit')}</p>
    </div>
  )
}
