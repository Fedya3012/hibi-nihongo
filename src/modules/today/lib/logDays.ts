/**
 * TỔNG LỊCH SỬ ÔN THEO NGÀY (có lưu sẵn)
 * --------------------------------------
 * Trang Hôm nay / Tiến độ cần biết mỗi ngày ôn bao nhiêu thẻ, bao nhiêu thẻ mới... từ ngày đầu tiên.
 * Trước đây mỗi lần mở trang là đọc lại TOÀN BỘ lịch sử ôn (sau một năm là vài chục nghìn dòng).
 *
 * Bây giờ: tổng của các ngày ĐÃ QUA được tính một lần rồi lưu sẵn (localStorage). Mỗi lần mở chỉ đọc
 * thêm các lượt ôn từ mốc đã lưu tới giờ (thường chỉ là hôm nay).
 *
 * Bản lưu sẵn bị bỏ và tính lại từ đầu khi:
 *   - đổi giờ bắt đầu ngày mới (dayStartHour), vì ranh giới các ngày đổi theo;
 *   - lịch sử TRƯỚC mốc đã lưu bị thay đổi (xóa thẻ kèm lịch sử, khôi phục sao lưu, nhập Anki có lịch sử cũ).
 *     Nhận ra bằng "dấu vân tay" gồm số lượt ôn trước mốc và tổng mã số (id) của chúng. Chỉ cần đọc mã số,
 *     không phải đọc cả dòng, nên vẫn nhanh.
 */
import { getAll, getAllByIndex, promisify, transaction } from '@/core/db'
import type { SrsCard, SrsLog } from '@/modules/review/api'
import { dayKey } from './days'

export interface LearnedCounts { vocab: number; kanji: number; grammar: number }

/** Số liệu ôn thẻ của một ngày. */
export interface LogDay {
  cards: number
  correct: number
  /** Tổng thời gian suy nghĩ (mỗi lượt tính tối đa 2 phút). */
  reviewMs: number
  newCards: number
  learned: LearnedCounts
}

/** Trạng thái đang cộng dồn: tổng theo ngày + những thẻ đã được tính là "thẻ mới" (chỉ tính một lần). */
export interface LogFold {
  days: Map<string, LogDay>
  learnedIds: Set<string>
}

interface Saved {
  v: 1
  startHour: number
  /** Mốc: đã cộng mọi lượt ôn có reviewedAt < upTo. */
  upTo: number
  count: number
  idSum: number
  days: Record<string, LogDay>
  learnedIds: string[]
}

const STORAGE_KEY = 'hibi-today-logdays'
const MAX_REVIEW_MS = 120_000

export const emptyLogDay = (): LogDay => ({ cards: 0, correct: 0, reviewMs: 0, newCards: 0, learned: { vocab: 0, kanji: 0, grammar: 0 } })
export const emptyFold = (): LogFold => ({ days: new Map(), learnedIds: new Set() })

/** Thẻ kana (do module Kana tạo) không tính là "từ vựng". */
const isKanaCard = (c: SrsCard) => c.source?.module === 'kana'

/**
 * Cộng các lượt ôn vào `fold` (sửa trực tiếp). `logs` phải xếp theo thời gian tăng dần
 * và đều mới hơn những lượt đã cộng trước đó.
 */
export function foldLogs(fold: LogFold, logs: SrsLog[], cardById: Map<string, SrsCard>, startHour: number): void {
  for (const l of logs) {
    const key = dayKey(l.reviewedAt, startHour)
    let d = fold.days.get(key)
    if (!d) { d = emptyLogDay(); fold.days.set(key, d) }
    d.cards++
    if (l.rating > 1) d.correct++
    d.reviewMs += Math.min(l.durationMs || 0, MAX_REVIEW_MS)
    if (l.stateBefore === 0 && !fold.learnedIds.has(l.cardId)) {
      fold.learnedIds.add(l.cardId)
      d.newCards++
      const card = cardById.get(l.cardId)
      if (card && !isKanaCard(card)) d.learned[card.kind]++
    }
  }
}

const byTime = (a: SrsLog, b: SrsLog) => a.reviewedAt - b.reviewedAt

function cloneFold(s: Saved): LogFold {
  const days = new Map<string, LogDay>()
  for (const [k, d] of Object.entries(s.days)) days.set(k, { ...d, learned: { ...d.learned } })
  return { days, learnedIds: new Set(s.learnedIds) }
}

// ----- Nơi lưu: bộ nhớ (trong phiên) + localStorage (giữ qua lần mở sau) -----

let memory: Saved | null = null

function readSaved(): Saved | null {
  if (memory) return memory
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    const s = raw ? (JSON.parse(raw) as Saved) : null
    if (s && s.v === 1) memory = s
  } catch { /* hỏng hoặc không đọc được: tính lại */ }
  return memory
}

function writeSaved(s: Saved) {
  memory = s
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* đầy/không có: chỉ giữ trong phiên */ }
}

/** Xóa bản lưu sẵn (dùng trong test, hoặc khi muốn ép tính lại). */
export function clearLogDaysCache() {
  memory = null
  try { globalThis.localStorage?.removeItem(STORAGE_KEY) } catch { /* bỏ qua */ }
}

/** Dấu vân tay của các lượt ôn trước mốc `upTo`: số lượng + tổng id (chỉ đọc khóa, không đọc dòng). */
async function fingerprint(upTo: number): Promise<{ count: number; idSum: number }> {
  const keys = await transaction('srsLogs', 'readonly', (tx) =>
    promisify(tx.objectStore('srsLogs').index('by_time').getAllKeys(IDBKeyRange.upperBound(upTo, true))))
  let idSum = 0
  for (const k of keys) idSum += Number(k)
  return { count: keys.length, idSum }
}

/**
 * Tổng lượt ôn theo ngày, từ ngày đầu tới bây giờ. `todayStart` là lúc bắt đầu ngày học hôm nay:
 * mọi ngày trước mốc này được lưu sẵn cho lần sau.
 */
export async function loadLogDays(
  startHour: number, todayStart: number, cardById: Map<string, SrsCard>,
): Promise<Map<string, LogDay>> {
  let saved = readSaved()
  if (saved && (saved.startHour !== startHour || saved.upTo > todayStart)) saved = null
  if (saved) {
    const fp = await fingerprint(saved.upTo)
    if (fp.count !== saved.count || fp.idSum !== saved.idSum) saved = null
  }

  const logs = saved
    ? await getAllByIndex<SrsLog>('srsLogs', 'by_time', IDBKeyRange.lowerBound(saved.upTo))
    : await getAll<SrsLog>('srsLogs')
  logs.sort(byTime)
  const cut = logs.findIndex((l) => l.reviewedAt >= todayStart)
  const before = cut < 0 ? logs : logs.slice(0, cut)
  const recent = cut < 0 ? [] : logs.slice(cut)

  // 1. Các ngày đã qua: cộng tiếp vào bản lưu sẵn, rồi lưu lại nếu có gì mới
  const fold = saved ? cloneFold(saved) : emptyFold()
  foldLogs(fold, before, cardById, startHour)
  if (!saved || before.length || saved.upTo !== todayStart) {
    let { count, idSum } = saved ?? { count: 0, idSum: 0 }
    for (const l of before) { count++; idSum += l.id ?? 0 }
    writeSaved({
      v: 1, startHour, upTo: todayStart, count, idSum,
      days: Object.fromEntries(fold.days), learnedIds: [...fold.learnedIds],
    })
    // writeSaved giữ tham chiếu tới fold.days; tách ra để phần "hôm nay" bên dưới không sửa vào bản lưu
    const copy = cloneFold(memory!)
    fold.days = copy.days
    fold.learnedIds = copy.learnedIds
  }

  // 2. Hôm nay: luôn đọc mới
  foldLogs(fold, recent, cardById, startHour)
  return fold.days
}
