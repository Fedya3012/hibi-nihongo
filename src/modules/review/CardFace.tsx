/**
 * CÁC MẢNH HIỂN THỊ THẺ: chữ Nhật có furigana, câu ví dụ, phần đáp án đầy đủ.
 */
import { useEffect } from 'react'
import type { SrsCard } from './types'
import { useCardMedia } from './media'

const hasKanji = (s: string) => /[一-鿿々]/.test(s)

/** Cỡ chữ mặt trước theo độ dài: từ ngắn thì thật to, cả câu (thẻ từ manga) thì nhỏ lại cho vừa. */
export function frontSize(text: string): string {
  const n = [...text].length
  if (n <= 4) return 'text-5xl md:text-6xl'
  if (n <= 10) return 'text-4xl md:text-5xl'
  if (n <= 24) return 'text-2xl md:text-3xl'
  return 'text-xl md:text-2xl'
}

/** Đọc to bằng giọng tiếng Nhật có sẵn trong máy (Windows, Chrome, Edge đều có). */
export function speakJa(text: string) {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/\{\{|\}\}/g, ''))
  u.lang = 'ja-JP'
  u.rate = 0.9
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja'))
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
}

export function SpeakButton({ text, label = 'Nghe đọc' }: { text: string; label?: string }) {
  if (typeof speechSynthesis === 'undefined') return null
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); speakJa(text) }} aria-label={label} title={`${label} (phím R)`}
      className="inline-grid size-9 place-items-center rounded-full align-middle text-muted transition hover:bg-surface-2 hover:text-primary">
      🔊
    </button>
  )
}

let player: HTMLAudioElement | null = null
/** Phát tiếng nói gốc của thẻ (vd giọng nhân vật anime). */
export function playCardAudio(src: string) {
  if (typeof Audio === 'undefined') return
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  player?.pause()
  player = new Audio(src)
  void player.play().catch(() => {})
}

/** Nút nghe tiếng nói gốc. autoPlay = tự phát một lần khi hiện (lúc lật thẻ). */
export function CardAudio({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  useEffect(() => {
    if (autoPlay) playCardAudio(src)
    return () => player?.pause()
  }, [src, autoPlay])
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); playCardAudio(src) }} title="Nghe câu gốc (phím R)"
      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-sm text-text transition hover:text-primary">
      ▶ Nghe câu gốc
    </button>
  )
}

/** Ảnh minh họa của thẻ (vd panel manga). Bấm để xem to. */
export function CardImage({ src }: { src: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block">
      <img src={src} alt="Ảnh minh họa của thẻ" className="mx-auto max-h-44 rounded-xl md:max-h-72 border border-border object-contain" />
    </a>
  )
}

/** Mặt chữ Nhật. Từ vựng có Kanji thì gắn furigana (ẩn/hiện theo Cài đặt). */
export function Front({ card, withReading, className = '' }: { card: SrsCard; withReading: boolean; className?: string }) {
  if (withReading && card.kind === 'vocab' && card.reading && hasKanji(card.front)) {
    return (
      <span className={`jp ${className}`}>
        <ruby>{card.front}<rt>{card.reading}</rt></ruby>
      </span>
    )
  }
  return <span className={`jp ${className}`}>{card.front}</span>
}

/** Câu ví dụ: `blank` = true thì thay phần {{...}} bằng ô trống, ngược lại tô màu phần đó. */
export function Example({ text, blank }: { text: string; blank: boolean }) {
  const parts = text.split(/(\{\{.+?\}\})/g)
  return (
    <span className="jp">
      {parts.map((p, i) => {
        const m = p.match(/^\{\{(.+)\}\}$/)
        if (!m) return <span key={i}>{p}</span>
        return blank ? (
          <span key={i} className="mx-1 inline-block min-w-12 border-b-2 border-primary text-transparent select-none">
            {m[1].replace(/./g, '・')}
          </span>
        ) : (
          <span key={i} className="font-semibold text-primary">{m[1]}</span>
        )
      })}
    </span>
  )
}

const KIND_LABEL = { vocab: 'Từ vựng', kanji: 'Kanji', grammar: 'Ngữ pháp' } as const
export const kindLabel = (k: SrsCard['kind']) => KIND_LABEL[k]

/** Toàn bộ đáp án, hiện sau khi lật thẻ. */
export function AnswerDetails({ card: light }: { card: SrsCard }) {
  const card = useCardMedia(light) // ảnh/tiếng nằm ở bảng riêng, đọc khi lật thẻ
  return (
    <div className="space-y-3 text-center">
      <div>
        <Front card={card} withReading className={`${frontSize(card.front)} font-semibold`} />
        <SpeakButton text={card.front} />
        {card.reading && (card.kind !== 'vocab' || !hasKanji(card.front)) && (
          <p className="jp mt-1 text-muted">{card.reading}</p>
        )}
      </div>
      <p className="whitespace-pre-line text-xl font-medium">{card.meaning}</p>
      {card.image && <CardImage src={card.image} />}
      {card.audio && <CardAudio src={card.audio} autoPlay />}
      {card.example && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-left">
          <p className="text-lg"><Example text={card.example} blank={false} /> <SpeakButton text={card.example} label="Nghe câu ví dụ" /></p>
          {card.exampleMeaning && <p className="text-sm text-muted">{card.exampleMeaning}</p>}
        </div>
      )}
      {card.notes && <p className="whitespace-pre-line text-left text-sm text-muted">{card.notes}</p>}
    </div>
  )
}
