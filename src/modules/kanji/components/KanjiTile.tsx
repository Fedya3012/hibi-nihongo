/** Ô một chữ trong danh sách: chữ to, âm Hán Việt, nghĩa ngắn, dấu tiến độ. */
import type { KanjiData } from '@/modules/dictionary'
import { hanViet, shortMeaning } from '../lib/data'
import type { KanjiStat } from '../lib/progress'

export function KanjiTile({ char, d, stat, onClick }: { char: string; d?: KanjiData; stat?: KanjiStat; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-center rounded-xl border bg-surface p-2 text-center transition hover:border-primary ${
        stat?.best != null && stat.best >= 75 ? 'border-good' : 'border-border'}`}>
      {stat?.srs && <span className="absolute right-1.5 top-1 text-xs text-primary" title="Đã có trong Ôn tập">●</span>}
      <span className="jp text-3xl leading-tight">{char}</span>
      <span className="mt-0.5 text-[11px] font-semibold text-primary">{hanViet(d)}</span>
      <span className="line-clamp-1 w-full text-[11px] text-muted">{shortMeaning(char, d)}</span>
    </button>
  )
}
