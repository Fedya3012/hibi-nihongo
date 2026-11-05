/** Thẻ (card) cơ bản: bo góc mềm, bóng nhẹ. Dùng cho mọi khối nội dung. */
import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-5 shadow-card ${className}`}
      {...props}
    />
  )
}
