/** Hiện một phím tắt như một phím bàn phím nhỏ (vd "Ctrl K", "⌘K", "←"). */
import { formatCombo } from './keymap'

export function Kbd({ combo, className = '' }: { combo: string; className?: string }) {
  return <kbd className={`inline-flex min-w-7 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-xs ${className}`}>{formatCombo(combo)}</kbd>
}
