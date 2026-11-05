/** Đọc kết quả làm bài của một câu (tách riêng để phần tiến độ không phải tải cả phần bài tập). */
import type { ExStat } from '../types'

/** Câu đang "hay sai": đã sai ít nhất một lần và số lần sai ≥ số lần đúng. */
export const isWeakItem = (s?: ExStat) => !!s && s.wrong > 0 && s.wrong >= s.right

/** Lần làm gần nhất đúng không (dữ liệu cũ chưa có lastOk: đúng nhiều hơn sai). */
export const lastOk = (s?: ExStat) => !!s && (s.lastOk ?? s.right > s.wrong)
