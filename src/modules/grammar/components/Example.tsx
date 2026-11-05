/**
 * CÂU VÍ DỤ: furigana (ẩn/hiện theo Cài đặt), tô màu phần ngữ pháp, bấm từng cụm để tra từ điển.
 * `blank` = true: thay phần {{ }} bằng ô trống (dùng trong bài luyện).
 */
import { openLookup } from '@/modules/dictionary/api'
import { SpeakButton } from '@/modules/review/CardFace'
import { chunkText, parseExample, plainText, type Chunk } from '../lib/parse'

function Pieces({ chunk, blank, fill }: { chunk: Chunk; blank?: boolean; fill?: string }) {
  let blankShown = false
  return (
    <>
      {chunk.map((p, i) => {
        if (p.hl && blank) {
          if (blankShown) return null
          blankShown = true
          return (
            <span key={i} className={`mx-0.5 inline-block min-w-12 rounded-md border-b-2 px-1 text-center ${fill ? 'border-primary text-primary' : 'border-muted text-transparent'}`}>
              {fill ?? '＿'}
            </span>
          )
        }
        const cls = p.hl ? 'font-semibold text-primary' : undefined
        return p.rt
          ? <ruby key={i} className={cls}>{p.text}<rt>{p.rt}</rt></ruby>
          : <span key={i} className={cls}>{p.text}</span>
      })}
    </>
  )
}

export function ExampleText({ src, blank, fill, lookup = true, className = '' }: {
  src: string; blank?: boolean; fill?: string; lookup?: boolean; className?: string
}) {
  const chunks = parseExample(src)
  return (
    <span className={`jp leading-loose ${className}`}>
      {chunks.map((ch, i) => lookup && !blank ? (
        <span key={i} role="button" tabIndex={0} title={chunkText(ch)}
          className="cursor-pointer rounded-sm transition-colors hover:bg-surface-2"
          onClick={(e) => openLookup(chunkText(ch), { x: e.clientX, y: e.clientY })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            openLookup(chunkText(ch), { x: r.left, y: r.bottom })
          }}>
          <Pieces chunk={ch} />
        </span>
      ) : <span key={i}><Pieces chunk={ch} blank={blank} fill={fill} /></span>)}
    </span>
  )
}

/** Một dòng ví dụ đầy đủ: câu Nhật + nút nghe + nghĩa tiếng Việt. */
export function ExampleRow({ src, vi, listenLabel }: { src: string; vi: string; listenLabel: string }) {
  return (
    <li className="flex items-start gap-2 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <ExampleText src={src} className="text-lg" />
        <p className="mt-0.5 text-sm text-muted">{vi}</p>
      </div>
      <SpeakButton text={plainText(src)} label={listenLabel} />
    </li>
  )
}
