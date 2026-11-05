/**
 * BẢNG CHIA: tìm một từ (trong danh sách có sẵn, hoặc trong Từ điển nếu đã tải) → mọi thể của nó.
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design/components/Button'
import { Card } from '@/design/components/Card'
import { useLang, useT } from '@/core/i18n'
import { Furigana, searchWords, shortMeaning, useDictPacks } from '@/modules/dictionary'
import { makeQuery, matchFields } from '@/modules/search/normalize'
import type { ConjWord } from './types'
import { WORDS, wordKey } from './data/words'
import { FORMS, CLASS_LABEL, formApplies } from './lib/forms'
import { conjugate } from './lib/conjugate'
import { fromDictionary } from './lib/explain'
import { useFormName } from './Practice'
import { S } from './strings'

export function TableView({ selected, onSelect, onPractice }: {
  selected?: ConjWord; onSelect: (w: ConjWord | undefined) => void; onPractice: (w: ConjWord) => void
}) {
  const t = useT(S)
  const [q, setQ] = useState('')
  const [dictHits, setDictHits] = useState<ConjWord[] | null>(null)
  const dict = useDictPacks()

  const hits = useMemo(() => {
    if (!q.trim()) return WORDS
    const query = makeQuery(q)
    return WORDS.map((w) => ({ w, s: matchFields(query, w.w, w.r, w.m) }))
      .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.w)
  }, [q])

  useEffect(() => { setDictHits(null) }, [q])

  const lookup = async () => {
    const res = await searchWords(q, 10)
    const out: ConjWord[] = []
    for (const r of res) {
      const w = fromDictionary(r.data)
      if (!w || out.some((x) => wordKey(x) === wordKey(w))) continue
      w.m = await shortMeaning(r.id, r.data, 2, 2)
      out.push(w)
      if (out.length >= 6) break
    }
    setDictHits(out)
  }

  if (selected) return <WordTable w={selected} onBack={() => onSelect(undefined)} onPractice={() => onPractice(selected)} />

  return (
    <Card className="mx-auto grid max-w-3xl gap-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tableSearch')} aria-label={t('tableSearch')}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && q.trim() && dict.ready) void lookup() }}
        className="jp min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary" />
      <p className="text-sm text-muted">{t('tableHint')}</p>
      <div className="flex flex-wrap gap-2">
        {[...(dictHits ?? []), ...hits].slice(0, 120).map((w, k) => (
          <button key={wordKey(w) + k} onClick={() => onSelect(w)}
            className="rounded-xl border border-border px-3 py-1.5 text-left transition hover:border-primary">
            <span className="jp font-medium">{w.w}</span> <span className="text-sm text-muted">{w.m}</span>
            {k < (dictHits?.length ?? 0) && <span className="ml-1 rounded bg-surface-2 px-1 text-xs text-muted">{t('fromDict')}</span>}
          </button>
        ))}
      </div>
      {q.trim() && (
        dict.ready ? (
          dictHits === null ? <Button variant="soft" className="justify-self-start" onClick={() => void lookup()}>{t('tableDict')}</Button>
            : dictHits.length === 0 && <p className="text-sm text-muted">{t('tableNotFound')}</p>
        ) : hits.length === 0 && <p className="text-sm text-muted">{t('tableNoDict')}</p>
      )}
    </Card>
  )
}

function WordTable({ w, onBack, onPractice }: { w: ConjWord; onBack: () => void; onPractice: () => void }) {
  const t = useT(S)
  const lang = useLang()
  const fname = useFormName()
  const rows = FORMS.filter((f) => formApplies(w, f)).map((f) => ({ f, res: conjugate(w, f.id)! }))
  return (
    <Card className="mx-auto grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack} aria-label={t('tabTable')}>‹</Button>
        <Furigana text={w.w} reading={w.r} className="text-3xl font-bold" />
        <span className="text-muted">{w.m}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{CLASS_LABEL[w.c][lang]}</span>
        <Button variant="soft" className="ml-auto" onClick={onPractice}>{t('practiceWord')}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">{t('form')}</th>
              <th className="py-2 pr-3 font-medium">{t('answer')}</th>
              <th className="py-2 font-medium">{t('rule')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ f, res }) => {
              const alts = [...new Set(res.alt.filter((a) => !/[㐀-鿿]/.test(a)))]
              return (
                <tr key={f.id} className="border-b border-border align-top last:border-0">
                  <td className="py-2 pr-3">{fname(f, w).name}</td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    <Furigana text={res.w} reading={res.r} className="text-lg" />
                    {alts.length > 0 && <div className="jp text-xs text-muted">{alts.join('、')}</div>}
                  </td>
                  <td className="jp py-2 text-muted">{res.rule}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
