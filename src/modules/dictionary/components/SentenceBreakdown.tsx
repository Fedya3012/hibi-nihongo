/** BẢNG PHÂN TÍCH CÂU: mỗi từ một dòng: chữ, thể từ điển, cách đọc, từ loại, nghĩa ngắn. */
import { useEffect, useState } from 'react'
import type { Segment } from '../types'
import { tokenize } from '../tokenizer'
import { kuromojiPosLabel } from '../labels'
import { lookupAt, preferBase, searchWords } from '../lib/search'
import { hasJapanese } from '../lib/kana'
import { Furigana } from './Furigana'

interface Row { seg: Segment; meaning: string }

export function SentenceBreakdown({ text }: { text: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let alive = true
    setRows(null); setError(undefined)
    tokenize(text).then(async (segs) => {
      const out: Row[] = []
      for (const seg of segs) {
        if (!hasJapanese(seg.surface)) continue
        let res = preferBase(await lookupAt(text, seg.start, [...seg.surface].length).catch(() => []), seg.base)
        if (!res.length) res = await searchWords(seg.base, 1).catch(() => [])
        // Trợ từ: ưu tiên nghĩa trợ từ (に là trợ từ, không phải "hai" 二)
        if (seg.pos === '助詞' || seg.pos === '助動詞') {
          const want = seg.pos === '助詞' ? ['prt'] : ['aux-v', 'cop', 'aux']
          res = [...res.filter((r) => r.data.s.some((s) => s.p?.some((p) => want.includes(p)))), ...res]
        }
        out.push({ seg, meaning: res[0]?.data.s[0]?.g.slice(0, 2).join(', ') ?? '' })
      }
      if (alive) setRows(out)
    }, (e: Error) => alive && setError(e.message))
    return () => { alive = false }
  }, [text])

  if (error) return <p className="text-sm text-bad">Không tách được câu: {error}</p>
  if (!rows) return <p className="text-sm text-muted">Đang phân tích…</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Từ</th>
            <th className="py-2 pr-3 font-medium">Thể từ điển</th>
            <th className="py-2 pr-3 font-medium">Từ loại</th>
            <th className="py-2 font-medium">Nghĩa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ seg, meaning }) => (
            <tr key={seg.start} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 text-lg"><Furigana text={seg.surface} reading={seg.reading} /></td>
              <td className="jp py-2 pr-3">
                {seg.base}
                {seg.parts.length > 1 && <div className="text-xs text-muted">{seg.parts.map((p) => p.surface).join(' + ')}</div>}
              </td>
              <td className="py-2 pr-3 text-muted">{kuromojiPosLabel(seg.pos, seg.posDetail)}</td>
              <td className="py-2">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
