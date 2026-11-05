/** Nhãn nhỏ: Thông dụng, JLPT N5, tần suất. */
import type { WordData } from '../types'

export function Badge({ children, tone = 'soft', title }: { children: React.ReactNode; tone?: 'soft' | 'primary' | 'plain'; title?: string }) {
  const cls = {
    soft: 'bg-primary-soft text-text',
    primary: 'bg-primary text-on-primary',
    plain: 'border border-border text-muted',
  }[tone]
  return <span title={title} className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

export function WordBadges({ d }: { d: WordData }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {d.c && <Badge tone="soft" title="Có trong danh sách từ thông dụng của JMdict">Thông dụng</Badge>}
      {d.j && <Badge tone="primary" title="Cấp JLPT theo danh sách của Jonathan Waller">JLPT N{d.j}</Badge>}
      {d.q && (
        <Badge tone="plain" title="Thứ hạng tần suất trên Wikipedia tiếng Nhật (số càng nhỏ càng hay gặp)">
          Tần suất #{d.q.toLocaleString('vi-VN')}
        </Badge>
      )}
    </span>
  )
}
