/**
 * TRANG KANJI (module kanji) — đường dẫn /learn/kanji
 * Tab: Danh sách JLPT · Theo cấp (kiểu WaniKani) · Bộ thủ · Luyện viết. Bấm một chữ để mở trang chi tiết.
 * Đường dẫn mở thẳng:
 *   /learn/kanji?lv=4            danh sách N4
 *   /learn/kanji?k=食            chi tiết chữ 食
 *   /learn/kanji?tab=radicals&r=9  các chữ thuộc bộ Nhân (亻)
 *   /learn/kanji?tab=write&k=食  luyện viết chữ 食
 *   /learn/kanji?tab=levels      học theo cấp: bộ thủ → Kanji → từ vựng, mở khóa dần
 * Dữ liệu: gói `kanjidic` (module Từ điển) + gói `kanji-study` (module này), xem README.md.
 */
import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/design/components/Segmented'
import { Button } from '@/design/components/Button'
import { useKanjiPacks } from './lib/data'
import { KanjiSetup } from './components/KanjiSetup'
import { JlptList, LEVELS, RadicalList, type Level } from './KanjiBrowser'
import { KanjiDetail } from './KanjiDetail'
import { WriteTab } from './WriteTab'
import { LevelsTab } from './levels/LevelsTab'

type Tab = 'list' | 'levels' | 'radicals' | 'write'

export default function KanjiPage() {
  const [params, setParams] = useSearchParams()
  const packs = useKanjiPacks()
  const tab: Tab = (['list', 'levels', 'radicals', 'write'] as Tab[]).find((t) => t === params.get('tab')) ?? 'list'
  const lvParam = params.get('lv') as Level | null
  const level: Level = LEVELS.some((l) => l.value === lvParam) ? lvParam! : '5'
  const char = params.get('k') ?? undefined
  const radical = Number(params.get('r')) || undefined
  // Danh sách đang xem, để nút ‹ › trong trang chi tiết đi tới chữ trước/sau
  const listRef = useRef('')

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

  const openDetail = useCallback((c: string, list?: string) => {
    if (list) listRef.current = list
    go({ tab: tab === 'write' ? undefined : tab, k: c })
  }, [go, tab])

  const showDetail = !!char && tab !== 'write'
  const list = [...listRef.current]
  const i = char ? list.indexOf(char) : -1

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kanji <span className="jp ml-1 text-lg font-normal text-muted">漢字</span></h1>
        <Segmented<Tab> label="Mục" value={tab} onChange={(t) => go({ tab: t, k: t === 'write' ? char : undefined, r: undefined })}
          options={[{ value: 'list', label: 'JLPT' }, { value: 'levels', label: 'Theo cấp' }, { value: 'radicals', label: 'Bộ thủ' }, { value: 'write', label: 'Luyện viết' }]} />
      </div>

      <KanjiSetup />

      {packs.ready && (
        showDetail ? (
          <>
            <Button variant="ghost" className="mb-2" onClick={() => go({ k: undefined })}>
              ‹ {tab === 'radicals' && radical ? 'Về bộ thủ' : 'Về danh sách'}
            </Button>
            <KanjiDetail key={char} char={char!}
              onOpen={(c) => go({ k: c }, false)}
              onRadical={(n) => go({ tab: 'radicals', r: String(n), k: undefined })}
              onWrite={() => go({ tab: 'write', k: char })}
              prev={i > 0 ? list[i - 1] : undefined}
              next={i >= 0 && i < list.length - 1 ? list[i + 1] : undefined} />
          </>
        ) : tab === 'list' ? (
          <JlptList level={level} onLevel={(l) => go({ lv: l }, false)} onOpen={openDetail} />
        ) : tab === 'levels' ? (
          <LevelsTab onOpen={openDetail} onRadical={(n) => go({ tab: 'radicals', r: String(n) })} />
        ) : tab === 'radicals' ? (
          <RadicalList radical={radical} onRadical={(n) => go({ r: n ? String(n) : undefined })} onOpen={openDetail} />
        ) : (
          <WriteTab char={char} level={level === 'joyo' ? '5' : level}
            onChar={(c) => go({ k: c }, false)} onLevel={(l) => go({ lv: l, k: undefined }, false)}
            onDetail={(c) => go({ tab: undefined, k: c })} />
        )
      )}

      <p className="mt-8 text-xs text-muted">
        Thứ tự nét: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className="underline">KanjiVG</a> © Ulrich Apel, CC BY-SA 3.0.
        Âm đọc, nghĩa, từ ví dụ: KANJIDIC2 và JMdict © EDRDG, CC BY-SA 4.0. Câu chuyện ghi nhớ và câu ví dụ: Hibi Nihongo tự soạn.
      </p>
    </div>
  )
}
