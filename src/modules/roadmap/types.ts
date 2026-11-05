/** KIỂU DỮ LIỆU CỦA MODULE LỘ TRÌNH */

/** Các chặng của lộ trình, theo thứ tự học. 'kana' = nhập môn (bảng chữ cái). */
export const LEVELS = ['kana', 'n5', 'n4', 'n3', 'n2', 'n1'] as const
export type LevelId = (typeof LEVELS)[number]

/** Giáo trình chính người học dùng (để lộ trình gắn với số bài). */
export type Series = 'minna' | 'genki' | 'none'

/** Kết quả một lần làm bài kiểm tra xếp lớp. */
export interface PlacementResult {
  at: number
  /** Chặng nên bắt đầu. */
  start: LevelId
  /** Số câu đúng / số câu đã làm của từng phần (chỉ có phần đã làm tới). */
  scores: Partial<Record<LevelId, { right: number; total: number }>>
}

/**
 * Lựa chọn của người học, lưu trong kv "roadmap:state" (có trong file sao lưu).
 * Chưa có = chưa qua bước làm quen (onboarding).
 */
export interface RoadmapState {
  /** Bắt đầu từ chặng nào (theo bài xếp lớp hoặc tự chọn). Các chặng trước được coi là đã qua. */
  start: LevelId
  /** Mục tiêu (chặng cuối của lộ trình). */
  goal: LevelId
  series: Series
  placement?: PlacementResult
  createdAt: number
}

/** Một bước trong một chặng, kèm tiến độ đã tính sẵn. */
export interface Step {
  id: string
  kind: 'kana' | 'kanji' | 'grammar' | 'vocab' | 'textbook' | 'immersion'
  /** Tên bước (đã dịch). */
  title: string
  /** Dòng phụ: đã làm được gì. */
  detail: string
  /** 0–1. undefined = bước gợi ý, không tính tiến độ (vd đọc manga). */
  ratio?: number
  /** Nội dung chưa có trong app (vd ngữ pháp N3): hiện "sắp có", không tính tiến độ. */
  soon?: boolean
  /** Mở module tương ứng. */
  link: string
  /** Nút phụ (vd "Thêm sách vào kệ"). */
  action?: { label: string; run: () => Promise<unknown> }
}

export interface LevelPlan {
  id: LevelId
  steps: Step[]
  /** 0–1, trung bình các bước có tính tiến độ. */
  ratio: number
  done: boolean
  /** Trước chặng bắt đầu (đã qua theo bài xếp lớp / tự chọn). */
  skipped: boolean
}
