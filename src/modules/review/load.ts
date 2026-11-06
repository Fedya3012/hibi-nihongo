/**
 * DÀN ĐỀU THẺ VÀ NGÀY HỌC NHẸ (load balancing + easy days, giống Anki 24.11)
 * -----------------------------------------------------------------------
 * FSRS hẹn một ngày "lý tưởng" cho thẻ. Ôn sớm/muộn vài ngày quanh đó gần như không ảnh hưởng trí nhớ
 * (khoảng rung, xem fuzzRange trong fsrs.ts). DueLoad đếm số thẻ đến hạn mỗi ngày rồi chọn trong khoảng đó
 * ngày ít thẻ nhất, nên không còn ngày 150 thẻ xen ngày 20 thẻ.
 * Ngày học nhẹ: thứ đặt "nhẹ" coi như đã có gấp đôi số thẻ; thứ đặt "tối thiểu" chỉ được chọn khi cả khoảng
 * đều là ngày tối thiểu. Thẻ mới mỗi ngày cũng giảm theo (newPerDayToday).
 */
import { DAY, type DayPicker } from './fsrs'
import { CardState, type EasyDay, type ReviewSettings, type SrsCard } from './types'

/** Hệ số tải theo mức của ngày. */
const WEIGHT: Record<EasyDay, number> = { normal: 1, reduced: 0.5, minimum: 0 }

/** Thứ trong tuần (0 = CN) của ngày học thứ `offset` kể từ ngày học bắt đầu lúc `todayStart`. */
export function weekdayOf(todayStart: number, offset: number): number {
  return new Date(todayStart + offset * DAY + 12 * 3_600_000).getDay()
}

/** Thẻ mới được học hôm nay, sau khi tính ngày học nhẹ. */
export function newPerDayToday(s: ReviewSettings, todayStart: number): number {
  const level = s.easyDays?.[weekdayOf(todayStart, 0)] ?? 'normal'
  return level === 'normal' ? s.newPerDay : level === 'reduced' ? Math.ceil(s.newPerDay / 2) : 0
}

/** Hash nhỏ, để chọn giữa các ngày ngang nhau mà vẫn cố định (nút xem trước hiện đúng số sẽ dùng). */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 2 ** 32
}

export class DueLoad {
  private counts = new Map<number, number>()

  constructor(
    cards: Iterable<SrsCard>,
    private todayStart: number,
    private easyDays: EasyDay[] = [],
  ) {
    for (const c of cards) this.add(c, 1)
  }

  /** Ngày học thứ mấy (0 = hôm nay) của một thời điểm. */
  offsetOf(ts: number): number {
    return Math.floor((ts - this.todayStart) / DAY)
  }

  private add(c: Pick<SrsCard, 'state' | 'due' | 'suspended'>, n: number) {
    if (c.suspended || c.state !== CardState.Review) return
    const d = this.offsetOf(c.due)
    if (d < 0) return
    this.counts.set(d, Math.max(0, (this.counts.get(d) ?? 0) + n))
  }

  count(offset: number): number {
    return this.counts.get(offset) ?? 0
  }

  /** Cập nhật sau khi thẻ đổi lịch (chấm, hoàn tác, dời ngày). */
  move(before: Pick<SrsCard, 'state' | 'due' | 'suspended'> | undefined, after: Pick<SrsCard, 'state' | 'due' | 'suspended'> | undefined) {
    if (before) this.add(before, -1)
    if (after) this.add(after, 1)
  }

  private level(offset: number): EasyDay {
    return this.easyDays[weekdayOf(this.todayStart, offset)] ?? 'normal'
  }

  /** Chọn ngày (số ngày kể từ hôm nay) trong [lo, hi]: ít thẻ nhất, tránh ngày học nhẹ, gần ngày lý tưởng. */
  pick(ideal: number, lo: number, hi: number, seed = ''): number {
    if (hi <= lo) return lo
    const usable = []
    for (let d = lo; d <= hi; d++) usable.push(d)
    // Có ngày không phải "tối thiểu" thì bỏ hết ngày tối thiểu
    const notMin = usable.filter((d) => this.level(d) !== 'minimum')
    const days = notMin.length ? notMin : usable
    let best = days[0]
    let bestCost = Infinity
    for (const d of days) {
      const w = WEIGHT[this.level(d)] || 1
      // Tải tính thêm 1 để ngày trống không luôn thắng tuyệt đối; lệch xa ngày lý tưởng bị phạt nhẹ
      const cost = ((this.count(d) + 1) / w) * (1 + 0.03 * Math.abs(d - ideal)) + hash(seed + d) * 1e-3
      if (cost < bestCost) { bestCost = cost; best = d }
    }
    return best
  }

  /** Hàm chọn ngày để truyền vào schedule() (fsrs.ts). */
  picker(): DayPicker {
    return (ideal, lo, hi, seed) => this.pick(ideal, lo, hi, seed)
  }
}
