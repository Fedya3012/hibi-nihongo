/** Hiện chữ có furigana: <ruby>食<rt>た</rt></ruby>べる. Ẩn/hiện furigana theo Cài đặt (CSS chung). */
import { furiganaParts } from '../lib/kana'

export function Furigana({ text, reading, className = '' }: { text: string; reading?: string; className?: string }) {
  const parts = furiganaParts(text, reading ?? '')
  return (
    <span className={`jp ${className}`}>
      {parts.map((p, i) => (p.rt ? <ruby key={i}>{p.text}<rt>{p.rt}</rt></ruby> : <span key={i}>{p.text}</span>))}
    </span>
  )
}
