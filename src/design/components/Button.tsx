/**
 * Nút bấm. variant: 'primary' (màu chủ đạo) | 'soft' (nền nhạt) | 'ghost' (chỉ chữ)
 *
 * Nút dẫn sang trang khác thì dùng <ButtonLink to="/review">, KHÔNG bọc <Button> trong <Link>:
 * bọc như vậy tạo ra hai thứ bấm được lồng nhau, phím Tab phải đi qua hai lần và trình đọc
 * màn hình đọc sai.
 */
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'soft' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  soft: 'bg-primary-soft text-text hover:opacity-90',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
}

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />
}

/** Trông như nút, nhưng là đường dẫn (mở trang khác). */
export function ButtonLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={`${base} ${styles[variant]} ${className}`} {...props} />
}
