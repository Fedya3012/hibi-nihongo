/** Khung chỉnh mục tiêu ngày, cách tính streak và số lần đóng băng mỗi tháng. */
import { Card } from '@/design/components/Card'
import { Button } from '@/design/components/Button'
import { Segmented } from '@/design/components/Segmented'
import { saveTodaySettings, type GoalType, type StreakRule, type TodaySettings } from '../lib/store'

const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60]
const CARD_PRESETS = [10, 20, 30, 50, 100, 150]

export function GoalSettings({ settings, onClose }: { settings: TodaySettings; onClose: () => void }) {
  const save = (p: Partial<TodaySettings>) => void saveTodaySettings(p)
  const isMin = settings.goalType === 'minutes'
  const value = isMin ? settings.goalMinutes : settings.goalCards
  const presets = isMin ? MINUTE_PRESETS : CARD_PRESETS
  return (
    <Card className="md:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Mục tiêu & streak</h2>
        <Button variant="ghost" onClick={onClose}>Xong</Button>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-3">
        <section>
          <p className="mb-2 text-sm font-medium">Mục tiêu mỗi ngày tính theo</p>
          <Segmented<GoalType> label="Loại mục tiêu" value={settings.goalType} onChange={(goalType) => save({ goalType })}
            options={[{ value: 'minutes', label: 'Số phút học' }, { value: 'cards', label: 'Số thẻ ôn' }]} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p} onClick={() => save(isMin ? { goalMinutes: p } : { goalCards: p })}
                className={`min-h-9 rounded-lg px-3 text-sm ${p === value ? 'bg-primary text-on-primary' : 'bg-surface-2 hover:text-text text-muted'}`}>
                {p}
              </button>
            ))}
            <label className="flex items-center gap-1.5 text-sm text-muted">
              hoặc
              <input type="number" min={1} max={isMin ? 600 : 2000} value={value}
                onChange={(e) => {
                  const n = Math.max(1, Math.round(Number(e.target.value) || 1))
                  save(isMin ? { goalMinutes: n } : { goalCards: n })
                }}
                className="min-h-9 w-20 rounded-lg border border-border bg-surface px-2 text-text" />
              {isMin ? 'phút' : 'thẻ'}
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            {isMin
              ? 'Số phút được đếm tự động khi bạn ở các trang học (ôn tập, manga, anime, kana, kanji, từ điển…) và đang thao tác hoặc đang phát video.'
              : 'Mỗi lần chấm một thẻ trong Ôn tập được tính là 1 thẻ.'}
          </p>
        </section>

        <section>
          <p className="mb-2 text-sm font-medium">Một ngày được tính vào streak khi</p>
          <Segmented<StreakRule> label="Cách tính streak" value={settings.streakRule} onChange={(streakRule) => save({ streakRule })}
            options={[{ value: 'any', label: 'Có học' }, { value: 'goal', label: 'Đạt mục tiêu' }]} />
          <p className="mt-2 text-xs text-muted">
            {settings.streakRule === 'any'
              ? 'Học ít nhất 1 phút hoặc ôn ít nhất 1 thẻ là giữ được streak.'
              : 'Phải đạt đủ mục tiêu ngày mới giữ được streak.'}
          </p>
        </section>

        <section>
          <p className="mb-2 text-sm font-medium">Đóng băng streak mỗi tháng</p>
          <Segmented<string> label="Số lần đóng băng" value={String(settings.freezesPerMonth)}
            onChange={(v) => save({ freezesPerMonth: Number(v) })}
            options={[{ value: '0', label: 'Tắt' }, { value: '1', label: '1 lần' }, { value: '2', label: '2 lần' }]} />
          <p className="mt-2 text-xs text-muted">
            Lỡ nghỉ một ngày? App tự dùng một lần đóng băng ❄ để streak không bị mất. Hết lượt trong tháng thì nghỉ sẽ mất streak.
          </p>
        </section>
      </div>
    </Card>
  )
}
