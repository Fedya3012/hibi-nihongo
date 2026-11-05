/** TAB CÀI ĐẶT ÔN TẬP: tỉ lệ nhớ mong muốn, số thẻ mới mỗi ngày, giờ bắt đầu ngày mới. */
import { useDbQuery } from '@/core/db'
import { Card } from '@/design/components/Card'
import { getSettings, saveSettings } from './store'

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-0">
      <div className="max-w-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {children}
    </div>
  )
}

const numCls = 'min-h-10 w-24 rounded-xl border border-border bg-surface px-3 text-right outline-none focus:border-primary'

export function SettingsTab() {
  const { data: s } = useDbQuery(getSettings, [], ['kv'])
  if (!s) return <p className="text-muted">Đang tải…</p>
  return (
    <Card>
      <Row label={`Tỉ lệ nhớ mong muốn: ${Math.round(s.retention * 100)}%`}
        hint="FSRS hẹn ngày ôn sao cho lúc đó bạn còn nhớ khoảng chừng này phần trăm. Cao hơn = ôn nhiều hơn nhưng chắc hơn. 90% là mức cân bằng.">
        <input type="range" min={0.8} max={0.97} step={0.01} value={s.retention} aria-label="Tỉ lệ nhớ mong muốn"
          onChange={(e) => void saveSettings({ retention: Number(e.target.value) })} className="w-48 accent-[var(--primary)]" />
      </Row>
      <Row label="Thẻ mới mỗi ngày" hint="Mỗi thẻ mới sẽ kéo theo vài lượt ôn trong những ngày sau. 10–20 là vừa với người bận.">
        <input type="number" min={0} max={200} value={s.newPerDay} className={numCls} aria-label="Thẻ mới mỗi ngày"
          onChange={(e) => void saveSettings({ newPerDay: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
      </Row>
      <Row label="Giờ bắt đầu ngày mới" hint="Ví dụ 4 giờ: học lúc 1 giờ sáng vẫn tính cho ngày hôm trước.">
        <input type="number" min={0} max={23} value={s.dayStartHour} className={numCls} aria-label="Giờ bắt đầu ngày mới"
          onChange={(e) => void saveSettings({ dayStartHour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} />
      </Row>
      <Row label="Thẻ khó nhớ (leech)" hint={`Quên từ ${s.leechThreshold} lần trở lên thì gắn nhãn “khó nhớ”. Lọc các thẻ này trong tab Thẻ để sửa lại cho dễ nhớ hơn.`}>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={3} max={30} value={s.leechThreshold} className={numCls} aria-label="Số lần quên"
            onChange={(e) => void saveSettings({ leechThreshold: Math.max(3, Math.min(30, Number(e.target.value) || 8)) })} />
          <select value={s.leechAction} aria-label="Khi gặp thẻ khó nhớ"
            onChange={(e) => void saveSettings({ leechAction: e.target.value as 'tag' | 'suspend' })}
            className="min-h-10 rounded-xl border border-border bg-surface px-2">
            <option value="tag">Chỉ gắn nhãn</option>
            <option value="suspend">Gắn nhãn và tạm ẩn</option>
          </select>
        </div>
      </Row>
      <Row label="Khoảng cách tối đa (ngày)" hint="Thẻ thuộc rất chắc cũng sẽ được ôn lại ít nhất sau chừng này ngày.">
        <input type="number" min={30} max={36500} value={s.maxInterval} className={numCls} aria-label="Khoảng cách tối đa"
          onChange={(e) => void saveSettings({ maxInterval: Math.max(30, Math.min(36500, Number(e.target.value) || 3650)) })} />
      </Row>
    </Card>
  )
}
