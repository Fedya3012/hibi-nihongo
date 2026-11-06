/**
 * DANH SÁCH HUY HIỆU
 * ------------------
 * Mỗi huy hiệu đo một con số (metric) và có 1–4 bậc: Đồng → Bạc → Vàng → Kim cương.
 * Huy hiệu chỉ có 1 bậc là huy hiệu "đặc biệt" (làm một lần là có).
 * Tên và mô tả (3 ngôn ngữ) nằm trong strings.ts, khóa `b_<id>` và `d_<id>`.
 *
 * Thêm huy hiệu mới: thêm một dòng vào BADGES + hai câu `b_<id>`, `d_<id>` trong strings.ts.
 * Không đổi `id` của huy hiệu đã có: thời điểm đạt được lưu theo id (đổi là mất ngày đạt).
 */
import { ALL_KANA } from '@/modules/kana/data'
import type { Snapshot } from './snapshot'

export type BadgeGroup = 'habit' | 'study' | 'immersion' | 'challenge'
export const GROUPS: BadgeGroup[] = ['habit', 'study', 'immersion', 'challenge']

export interface BadgeDef {
  id: string
  /** Biểu tượng: emoji hoặc một chữ Hán. */
  icon: string
  group: BadgeGroup
  metric: (s: Snapshot) => number
  /** Mốc của từng bậc, tăng dần. */
  tiers: number[]
  /** Cách hiện con số của mốc (mặc định là chính con số). */
  fmt?: (n: number) => string
}

const level = (n: number) => `N${6 - n}`

export const BADGES: BadgeDef[] = [
  // Thói quen
  { id: 'first', icon: '🌱', group: 'habit', metric: (s) => s.activeDays, tiers: [1] },
  { id: 'streak', icon: '🔥', group: 'habit', metric: (s) => s.streakBest, tiers: [7, 30, 100, 365] },
  { id: 'hours', icon: '⏳', group: 'habit', metric: (s) => Math.floor(s.minutes / 60), tiers: [1, 10, 50, 200] },
  { id: 'goal', icon: '🎯', group: 'habit', metric: (s) => s.goalDays, tiers: [1, 10, 50, 200] },
  { id: 'goalRun', icon: '📅', group: 'habit', metric: (s) => s.goalRun, tiers: [7, 30] },
  // Học
  { id: 'reviews', icon: '🃏', group: 'study', metric: (s) => s.reviews, tiers: [100, 1000, 5000, 20000] },
  { id: 'kana', icon: 'あ', group: 'study', metric: (s) => s.kana, tiers: [46, ALL_KANA.length] },
  { id: 'vocab', icon: '語', group: 'study', metric: (s) => s.vocab, tiers: [50, 300, 1000, 3000] },
  { id: 'kanji', icon: '漢', group: 'study', metric: (s) => s.kanji, tiers: [25, 100, 500, 1000] },
  { id: 'grammar', icon: '文', group: 'study', metric: (s) => s.grammar, tiers: [10, 50, 150, 300] },
  { id: 'known', icon: '🧠', group: 'study', metric: (s) => s.knownWords, tiers: [100, 500, 2000, 5000] },
  // Đọc, xem, giáo trình, thi thử
  { id: 'manga', icon: '📚', group: 'immersion', metric: (s) => s.mangaDone, tiers: [1, 10, 50, 200] },
  { id: 'anime', icon: '🎬', group: 'immersion', metric: (s) => s.animeDone, tiers: [1, 12, 50, 200] },
  { id: 'lessons', icon: '🏫', group: 'immersion', metric: (s) => s.lessonsDone, tiers: [1, 10, 25, 50] },
  { id: 'exam', icon: '📝', group: 'immersion', metric: (s) => s.examsPassed, tiers: [1, 5, 20] },
  { id: 'examLevel', icon: '🎓', group: 'immersion', metric: (s) => s.examBest, tiers: [1, 3, 5], fmt: level },
  // Thử thách (làm một lần là có)
  { id: 'marathon', icon: '🏃', group: 'challenge', metric: (s) => Math.floor(s.bestDayMin), tiers: [60, 120, 240] },
  { id: 'perfect', icon: '💯', group: 'challenge', metric: (s) => s.perfectDays, tiers: [1] },
  { id: 'night', icon: '🦉', group: 'challenge', metric: (s) => s.nightSessions, tiers: [1] },
  { id: 'morning', icon: '🐦', group: 'challenge', metric: (s) => s.morningSessions, tiers: [1] },
  { id: 'allRound', icon: '🌈', group: 'challenge', metric: (s) => s.categories, tiers: [6] },
]

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]))

/** Tên bậc: 0 Đồng, 1 Bạc, 2 Vàng, 3 Kim cương. Huy hiệu 1 bậc dùng tên "Đặc biệt". */
export type TierName = 'bronze' | 'silver' | 'gold' | 'diamond' | 'special'
export function tierName(b: BadgeDef, i: number): TierName {
  if (b.tiers.length === 1) return 'special'
  return (['bronze', 'silver', 'gold', 'diamond'] as const)[Math.min(i, 3)]
}

/** XP thưởng khi đạt mỗi bậc. */
export const TIER_XP: Record<TierName, number> = { bronze: 20, silver: 50, gold: 100, diamond: 200, special: 30 }

export interface BadgeState {
  def: BadgeDef
  value: number
  /** Số bậc đã đạt (0 = chưa có). */
  earned: number
  /** Mốc tiếp theo (undefined = đã đạt bậc cao nhất). */
  next?: number
  /** Tiến độ tới mốc tiếp theo, 0..1. */
  pct: number
}

export function badgeStates(s: Snapshot): BadgeState[] {
  return BADGES.map((def) => {
    const value = def.metric(s)
    const earned = def.tiers.filter((t) => value >= t).length
    const next = def.tiers[earned]
    const from = earned ? def.tiers[earned - 1] : 0
    const pct = next === undefined ? 1 : Math.max(0, Math.min(1, (value - from) / (next - from)))
    return { def, value, earned, next, pct }
  })
}

/** Khóa của một bậc đã đạt, dùng để lưu ngày đạt: "streak:0", "streak:1"... */
export const tierKey = (id: string, i: number) => `${id}:${i}`

export function earnedKeys(states: BadgeState[]): string[] {
  return states.flatMap((st) => Array.from({ length: st.earned }, (_, i) => tierKey(st.def.id, i)))
}

export const fmtTier = (b: BadgeDef, n: number) => (b.fmt ? b.fmt(n) : n.toLocaleString())
