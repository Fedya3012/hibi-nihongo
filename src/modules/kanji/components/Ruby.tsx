/** Câu tiếng Nhật có furigana dạng "{漢字|かんじ}" → <ruby> (tự ẩn/hiện theo Cài đặt furigana). */
import { parseFurigana } from '../lib/data'

export function RubyText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`jp ${className}`}>
      {parseFurigana(text).map(([t, r], i) => (r ? <ruby key={i}>{t}<rt>{r}</rt></ruby> : <span key={i}>{t}</span>))}
    </span>
  )
}
