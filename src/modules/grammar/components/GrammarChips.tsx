/**
 * DÃY NÚT MẪU NGỮ PHÁP — dùng được ở module khác (Giáo trình, trợ lý AI, manga…):
 *   import { GrammarChips } from '@/modules/grammar/api'
 *   <GrammarChips ids={['te-mo-ii', 'te-wa-ikemasen']} />
 * Bấm một nút để mở bài ngữ pháp đó. Mã không có trong dữ liệu thì bị bỏ qua.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GrammarPoint } from '../types'
import { loadGrammar } from '../lib/content'
import { grammarPath } from '../lib/paths'

export function GrammarChips({ ids, className = '' }: { ids: string[]; className?: string }) {
  const [points, setPoints] = useState<GrammarPoint[]>([])
  const key = ids.join(',')
  useEffect(() => {
    let alive = true
    loadGrammar().then(({ byId }) => alive && setPoints(key.split(',').flatMap((id) => byId.get(id) ?? [])))
    return () => { alive = false }
  }, [key])
  if (!points.length) return null
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {points.map((p) => (
        <Link key={p.id} to={grammarPath(p.id)} title={p.meaning}
          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm transition hover:border-primary">
          <span className="jp font-medium">{p.pattern}</span>
          <span className="ml-2 text-xs text-muted">N{p.level}</span>
        </Link>
      ))}
    </div>
  )
}
