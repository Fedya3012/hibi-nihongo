/** Công tắc bật/tắt (giống trang Cài đặt). */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${on ? 'bg-primary' : 'border border-border bg-surface-2'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-surface shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}
