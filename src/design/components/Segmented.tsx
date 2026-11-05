/** Nút chọn một trong nhiều (ví dụ: Theo hệ thống / Sáng / Tối) */
export function Segmented<T extends string>({
  value, options, onChange, label,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-lg px-3 text-sm transition ${
            value === o.value ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
