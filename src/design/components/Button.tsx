/** Nút bấm. variant: 'primary' (màu chủ đạo) | 'soft' (nền nhạt) | 'ghost' (chỉ chữ) */
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'soft' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  soft: 'bg-primary-soft text-text hover:opacity-90',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
