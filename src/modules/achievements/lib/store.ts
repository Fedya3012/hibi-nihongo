/**
 * LƯU TRÊN MÁY (kho kv, nên tự có trong file sao lưu):
 *   "achievements:state" → {
 *       at:      { "streak:0": lúc đạt, ... }  ngày đạt từng bậc huy hiệu (để hiện "đạt ngày…" và "Mới")
 *       seenAt:  lần cuối mở trang Thành tích (huy hiệu đạt sau lúc này có nhãn "Mới")
 *       level:   cấp đã báo gần nhất (để chỉ báo "Lên cấp" một lần)
 *     }
 * Bản thân XP, cấp và huy hiệu luôn được TÍNH LẠI từ dữ liệu học (xem snapshot.ts), ở đây chỉ nhớ "ngày đạt".
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import { badgeStates, earnedKeys, type BadgeState } from './badges'
import { levelOf, xpParts, type LevelInfo, type XpPart } from './level'
import { getSnapshot, SNAPSHOT_STORES, type Snapshot } from './snapshot'

const KEY = 'achievements:state'

export interface AchState {
  at: Record<string, number>
  seenAt: number
  level: number
}

export const getAchState = () => kvGet<AchState | null>(KEY, null)

export async function markSeen() {
  const s = await getAchState()
  if (s) await kvSet(KEY, { ...s, seenAt: Date.now() })
}

export interface Progress {
  snapshot: Snapshot
  badges: BadgeState[]
  parts: XpPart[]
  level: LevelInfo
}

export async function getProgress(): Promise<Progress> {
  const snapshot = await getSnapshot()
  const badges = badgeStates(snapshot)
  const parts = xpParts(snapshot, badges)
  const level = levelOf(parts.reduce((s, p) => s + p.xp, 0))
  return { snapshot, badges, parts, level }
}

export interface SyncResult {
  progress: Progress
  state: AchState
  /** Bậc huy hiệu mới đạt kể từ lần trước (khóa "id:bậc"). */
  fresh: string[]
  /** Cấp mới nếu vừa lên cấp. */
  levelUp?: number
  /** Cấp đã lưu trước lần tính này. */
  prevLevel: number
}

/**
 * So số liệu hiện tại với những gì đã lưu, ghi ngày đạt cho bậc mới.
 * Lần đầu chạy (chưa có gì lưu): ghi hết những bậc đã đạt nhưng KHÔNG báo, để người đã học lâu
 * không bị hàng chục thông báo cùng lúc.
 */
export async function syncAchievements(now = Date.now()): Promise<SyncResult> {
  const progress = await getProgress()
  const saved = await getAchState()
  const keys = earnedKeys(progress.badges)
  if (!saved) {
    const state: AchState = { at: Object.fromEntries(keys.map((k) => [k, now])), seenAt: now, level: progress.level.level }
    await kvSet(KEY, state)
    return { progress, state, fresh: [], prevLevel: state.level }
  }
  const fresh = keys.filter((k) => !saved.at[k])
  const levelUp = progress.level.level > saved.level ? progress.level.level : undefined
  if (!fresh.length && !levelUp && progress.level.level === saved.level) return { progress, state: saved, fresh, prevLevel: saved.level }
  const state: AchState = {
    ...saved,
    at: { ...saved.at, ...Object.fromEntries(fresh.map((k) => [k, now])) },
    // Cấp có thể giảm (xóa thẻ, khôi phục bản sao lưu cũ): nhớ cấp hiện tại để lần lên lại vẫn được báo
    level: progress.level.level,
  }
  await kvSet(KEY, state)
  return { progress, state, fresh, levelUp, prevLevel: saved.level }
}

/** Hook React: tiến độ + ngày đạt. Tự cập nhật khi học thêm. */
export function useAchievements() {
  return useDbQuery(async () => {
    const [progress, state] = await Promise.all([getProgress(), getAchState()])
    return { progress, state }
  }, [], [...SNAPSHOT_STORES])
}
