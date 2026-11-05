/**
 * CÂU VÍ DỤ CỦA MỘT TỪ (gói tatoeba-ja): câu tiếng Nhật có furigana, từ đang tra được tô đậm,
 * bản dịch (tiếng Việt nếu có, không thì tiếng Anh), nút thêm từ + câu vào Ôn tập, và liên kết về Tatoeba.
 * compact = bản gọn cho popup (ít câu, không có nút tra từ trong câu).
 */
import { useState } from 'react'
import { useDbQuery } from '@/core/db'
import type { Example, WordData } from '../types'
import { exampleParts, getExamples, tatoebaUrl } from '../lib/examples'
import { addWordToReview } from '../actions'
import { openLookup } from '../api'

export function ExampleSentences({ wordId, d, compact = false }: { wordId: string; d: WordData; compact?: boolean }) {
  const { data: list } = useDbQuery(() => getExamples(wordId, compact ? 2 : 5), [wordId, compact], ['packs'])
  // Mỗi từ chỉ có một thẻ Ôn tập, nên sau khi thêm (bằng câu nào cũng vậy) các nút đều đổi trạng thái
  const [added, setAdded] = useState<{ id: string; ok: boolean } | null>(null)
  if (!list?.length) return null

  return (
    <section className={compact ? 'space-y-1.5 border-t border-border pt-2' : 'space-y-2 border-t border-border pt-3'}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Câu ví dụ</h3>
      <ul className="space-y-2">
        {list.map((ex) => (
          <li key={ex.id} className="space-y-0.5">
            <Sentence ex={ex} compact={compact} />
            <p className="text-sm text-muted">{ex.data.v ?? ex.data.e}</p>
            <div className="flex flex-wrap items-center gap-x-3 text-xs">
              {added === null ? (
                <button
                  className="font-medium text-primary hover:underline"
                  title="Tạo thẻ cho từ này, kèm câu ví dụ để luyện điền chỗ trống"
                  onClick={async () => setAdded({ id: ex.id, ok: await addWordToReview(wordId, d, ex) })}
                >
                  + Ôn tập với câu này
                </button>
              ) : added.id === ex.id && (
                <span className="font-medium text-primary">{added.ok ? '✓ Đã thêm vào Ôn tập' : 'Từ này đã có trong Ôn tập'}</span>
              )}
              {/* Ghi công nguồn theo giấy phép CC BY: liên kết tới câu gốc */}
              <a href={tatoebaUrl(ex.id)} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">
                Tatoeba #{ex.id}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Sentence({ ex, compact }: { ex: Example; compact: boolean }) {
  const parts = exampleParts(ex)
  const body = parts.map((p, i) => {
    const inner = p.rt ? <ruby>{p.text}<rt>{p.rt}</rt></ruby> : p.text
    return p.hit ? <b key={i} className="font-semibold text-primary">{inner}</b> : <span key={i}>{inner}</span>
  })
  if (compact) return <p className="jp text-base" lang="ja">{body}</p>
  // Trang Từ điển: bấm vào câu để tra các từ khác trong câu
  return (
    <p className="jp text-lg" lang="ja">
      <button
        className="text-left hover:underline decoration-border underline-offset-4"
        title="Bấm để tra các từ trong câu"
        onClick={(e) => openLookup(ex.data.t, { x: e.clientX, y: e.clientY + 12 })}
      >
        {body}
      </button>
    </p>
  )
}
