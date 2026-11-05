/** Mấy mảnh giao diện nhỏ dùng chung trong module manga. */
import { useEffect, useState, type ReactNode } from 'react'
import { getThumb } from './store'

/** Ảnh bìa nhỏ của một chương. */
export function Cover({ chapterId, className = '', alt = '' }: { chapterId?: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!chapterId) return
    let u: string | undefined
    let alive = true
    getThumb(chapterId).then((b) => {
      if (b && alive) { u = URL.createObjectURL(b); setUrl(u) }
    }, () => {})
    return () => { alive = false; if (u) URL.revokeObjectURL(u); setUrl(undefined) }
  }, [chapterId])
  return (
    <div className={`overflow-hidden bg-surface-2 ${className}`}>
      {url
        ? <img src={url} alt={alt} className="size-full object-cover" draggable={false} />
        : <div className="jp grid size-full place-items-center text-3xl text-muted" aria-hidden>漫</div>}
    </div>
  )
}

/** Hộp thoại đơn giản (Esc hoặc bấm nền để đóng). */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[90dvh] w-full flex-col rounded-card border border-border bg-surface shadow-card ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label="Đóng">✕</button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  )
}

export const inputClass = 'min-h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary'
