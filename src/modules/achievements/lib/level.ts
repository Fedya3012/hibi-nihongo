/**
 * ĐIỂM KINH NGHIỆM (XP) VÀ CẤP ĐỘ
 * -------------------------------
 * XP = tổng điểm từ việc học thật (bảng XP_RULES) + điểm thưởng của huy hiệu đã đạt.
 * Cấp L lên L+1 cần 100 + 50×(L−1) XP: cấp đầu nhanh (100 XP ≈ một buổi học), càng lên càng chậm.
 *   Cấp 5 ≈ 700 XP · cấp 10 ≈ 2.700 · cấp 20 ≈ 10.400 · cấp 40 ≈ 41.000 · cấp 60 ≈ 91.000
 * Chú cáo đổi "hạng" theo cấp và mọc thêm đuôi, tới 9 đuôi (九尾) ở cấp 60.
 */
import { TIER_XP, tierName, type BadgeState } from './badges'
import type { Snapshot } from './snapshot'

/** XP cho mỗi đơn vị. Khóa cũng là khóa chữ `x_<key>` trong strings.ts. */
export const XP_RULES = {
  minute: 1, // mỗi phút học (đồng hồ của Hôm nay)
  review: 1, // mỗi lượt ôn thẻ
  kana: 2, // mỗi chữ kana đã thuộc
  vocab: 5, // mỗi từ vựng học mới
  kanji: 8, // mỗi chữ Kanji
  grammar: 15, // mỗi mẫu ngữ pháp
  goal: 20, // mỗi ngày đạt mục tiêu
  manga: 30, // mỗi chương manga đọc xong
  anime: 30, // mỗi tập anime xem xong
  lesson: 50, // mỗi bài giáo trình xong
  exam: 30, // mỗi lần làm đề thi thử
  examPass: 100, // thêm khi đỗ
} as const
export type XpKey = keyof typeof XP_RULES | 'badges'

export interface XpPart { key: XpKey; count: number; xp: number }

export function xpParts(s: Snapshot, badges: BadgeState[]): XpPart[] {
  const counts: Record<keyof typeof XP_RULES, number> = {
    minute: Math.floor(s.minutes), review: s.reviews, kana: s.kana, vocab: s.vocab, kanji: s.kanji,
    grammar: s.grammar, goal: s.goalDays, manga: s.mangaDone, anime: s.animeDone, lesson: s.lessonsDone,
    exam: s.examsTaken, examPass: s.examsPassed,
  }
  const parts: XpPart[] = (Object.keys(XP_RULES) as (keyof typeof XP_RULES)[])
    .map((key) => ({ key, count: counts[key], xp: counts[key] * XP_RULES[key] }))
  let badgeXp = 0
  let tiers = 0
  for (const b of badges) {
    for (let i = 0; i < b.earned; i++) { badgeXp += TIER_XP[tierName(b.def, i)]; tiers++ }
  }
  parts.push({ key: 'badges', count: tiers, xp: badgeXp })
  return parts
}

/** XP cần để từ cấp L lên L+1. */
export const xpForNext = (level: number) => 100 + 50 * (level - 1)

/** Tổng XP cần để đạt cấp L (cấp 1 = 0 XP). */
export const xpAtLevel = (level: number) => 100 * (level - 1) + 25 * (level - 1) * (level - 2)

export interface LevelInfo {
  level: number
  xp: number
  /** XP đã có trong cấp hiện tại / XP cần để lên cấp. */
  into: number
  need: number
  pct: number
}

export function levelOf(xp: number): LevelInfo {
  let level = 1
  while (xp >= xpAtLevel(level + 1)) level++
  const into = xp - xpAtLevel(level)
  const need = xpForNext(level)
  return { level, xp, into, need, pct: into / need }
}

/** Hạng của chú cáo. Khóa chữ `r_<id>` trong strings.ts. */
export interface Rank { id: string; minLevel: number; jp: string; tails: number }
export const RANKS: Rank[] = [
  { id: 'kit', minLevel: 1, jp: '子狐', tails: 1 },
  { id: 'young', minLevel: 5, jp: '若狐', tails: 2 },
  { id: 'travel', minLevel: 10, jp: '旅狐', tails: 3 },
  { id: 'scholar', minLevel: 15, jp: '学狐', tails: 4 },
  { id: 'silver', minLevel: 20, jp: '銀狐', tails: 5 },
  { id: 'gold', minLevel: 30, jp: '金狐', tails: 6 },
  { id: 'sky', minLevel: 40, jp: '天狐', tails: 7 },
  { id: 'sage', minLevel: 50, jp: '仙狐', tails: 8 },
  { id: 'nine', minLevel: 60, jp: '九尾', tails: 9 },
]

export function rankOf(level: number): { rank: Rank; next?: Rank } {
  let i = 0
  while (i + 1 < RANKS.length && level >= RANKS[i + 1].minLevel) i++
  return { rank: RANKS[i], next: RANKS[i + 1] }
}
