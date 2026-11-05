/**
 * HIỂN THỊ MỘT TỪ: chữ + furigana, pitch accent, nhãn JLPT/thông dụng, các nghĩa, Kanji trong từ.
 * compact = bản gọn cho popup.
 */
import { useState } from 'react'
import { useDbQuery } from '@/core/db'
import type { WordResult } from '../types'
import { posLabel, miscLabel } from '../labels'
import { getKanjiList } from '../lib/search'
import { addWordToReview, headword } from '../actions'
import { Furigana } from './Furigana'
import { PitchAccent } from './PitchAccent'
import { WordBadges } from './Badges'
import { KanjiInfo } from './KanjiInfo'
import { useDictPrefs } from '../prefs'

export function WordEntry({ r, compact = false, showKanji = true }: { r: WordResult; compact?: boolean; showKanji?: boolean }) {
  const d = r.data
  const { word, reading } = headword(d)
  const maxSenses = useDictPrefs((s) => s.popupSenses)
  const senses = compact ? d.s.slice(0, maxSenses) : d.s
  const mainReading = d.r.find((x) => x.t === reading) ?? d.r[0]
  const others = [
    ...(d.k ?? []).map((k) => k.t).filter((t) => t !== word),
    ...d.r.map((x) => x.t).filter((t) => t !== reading && t !== word),
  ]
  const { data: kanji } = useDbQuery(() => (showKanji ? getKanjiList(word) : Promise.resolve([])), [word, showKanji], ['packs'])
  const [added, setAdded] = useState<boolean | null>(null)

  return (
    <article className="space-y-2">
      <header className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <Furigana text={word} reading={word === reading ? undefined : reading} className={compact ? 'text-2xl' : 'text-3xl'} />
        {mainReading.a?.map((a) => <PitchAccent key={a} reading={mainReading.t} accent={a} />)}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <WordBadges d={d} />
        {r.reasons.length > 0 && (
          <span className="text-xs text-muted">
            Thể từ điển <span className="jp text-text">{r.matched}</span>, đã chia: {r.reasons.join(' → ')}
          </span>
        )}
      </div>

      <ol className="space-y-1.5">
        {senses.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="w-4 shrink-0 text-right text-muted">{i + 1}.</span>
            <div className="min-w-0">
              {(s.p?.length || s.m?.length || s.f?.length || s.d?.length) && (
                <div className="text-xs text-muted">
                  {[...(s.p ?? []).map(posLabel), ...[...(s.m ?? []), ...(s.f ?? []), ...(s.d ?? [])].map(miscLabel)].join(' · ')}
                </div>
              )}
              <span>{s.g.join('; ')}</span>
              {!compact && s.n && <span className="text-muted"> ({s.n})</span>}
              {!compact && (s.k?.length || s.r?.length) ? (
                <span className="jp text-xs text-muted"> — chỉ dùng với {[...(s.k ?? []), ...(s.r ?? [])].join('、')}</span>
              ) : null}
              {!compact && s.x?.length ? (
                <div className="text-xs text-muted">Xem thêm: <span className="jp">{s.x.map((x) => x.split('・')[0]).join('、')}</span></div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {compact && d.s.length > senses.length && <p className="text-xs text-muted">… còn {d.s.length - senses.length} nghĩa nữa</p>}
      {!compact && others.length > 0 && (
        <p className="text-sm text-muted">Cách viết/đọc khác: <span className="jp text-text">{others.join('、')}</span></p>
      )}

      {kanji && kanji.length > 0 && (
        <div className={compact ? 'border-t border-border pt-1' : 'space-y-3 border-t border-border pt-3'}>
          {kanji.map((k) => <KanjiInfo key={k.char} char={k.char} d={k.data} compact={compact} />)}
        </div>
      )}

      <button
        className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
        disabled={added !== null}
        onClick={async () => setAdded(await addWordToReview(r.id, d))}
      >
        {added === null ? '+ Thêm vào Ôn tập' : added ? '✓ Đã thêm vào Ôn tập' : 'Từ này đã có trong Ôn tập'}
      </button>
    </article>
  )
}
