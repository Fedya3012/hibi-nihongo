/**
 * CÂU VÍ DỤ: furigana (ẩn/hiện theo Cài đặt), tô màu phần ngữ pháp, bấm từng cụm để tra từ điển.
 * Cụm có từ mới / đang học được gạch chân theo Kho từ của tôi (module vocab), giống manga và anime.
 * `blank` = true: thay phần {{ }} bằng ô trống (dùng trong bài luyện).
 */
import { openLookup } from '@/modules/dictionary/api'
import { SpeakButton } from '@/modules/review/CardFace'
import { statusUnderline, useCharStatus, useVocabPrefs, worstStatus, type WordStatus } from '@/modules/vocab/api'
import { chunkText, parseExample, plainText, type Chunk } from '../lib/parse'

/** marks: trạng thái từng ký tự của cụm (Kho từ) để gạch chân từ mới / đang học; phần ngữ pháp không gạch. */
function Pieces({ chunk, blank, fill, marks }: { chunk: Chunk; blank?: boolean; fill?: string; marks?: (WordStatus | undefined)[] }) {
  const mode = useVocabPrefs((s) => s.highlight)
  let blankShown = false
  let pos = 0
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
        const from = pos
        pos += p.text.length
        const mark = !p.hl && marks ? statusUnderline(worstStatus(marks, from, pos), mode) : ''
        const cls = (p.hl ? 'font-semibold text-primary' : mark) || undefined
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
  const mode = useVocabPrefs((s) => s.highlight)
  // Tách từ cả câu một lần (chính xác hơn tách từng cụm), rồi chia trạng thái về từng cụm
  const marks = useCharStatus(chunks.map(chunkText).join(''), lookup && !blank && mode !== 'off')
  let offset = 0
  return (
    <span className={`jp leading-loose ${className}`}>
      {chunks.map((ch, i) => {
        const from = offset
        offset += chunkText(ch).length
        return lookup && !blank ? (
          <LookupChunk key={i} chunk={ch} marks={marks?.slice(from, offset)} />
        ) : <span key={i}><Pieces chunk={ch} blank={blank} fill={fill} /></span>
      })}
    </span>
  )
}

/** Một cụm bấm được để tra từ. */
function LookupChunk({ chunk, marks }: { chunk: Chunk; marks?: (WordStatus | undefined)[] }) {
  const text = chunkText(chunk)
  return (
    <span role="button" tabIndex={0} title={text}
      className="cursor-pointer rounded-sm transition-colors hover:bg-surface-2"
      onClick={(e) => openLookup(text, { x: e.clientX, y: e.clientY })}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        openLookup(text, { x: r.left, y: r.bottom })
      }}>
      <Pieces chunk={chunk} marks={marks} />
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
