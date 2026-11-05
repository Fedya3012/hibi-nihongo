/**
 * CHẤM ĐIỂM THEO THANG JLPT
 * JLPT thật dùng "điểm quy đổi" (equating) chứ không đếm câu đúng; app không có dữ liệu đó, nên quy đổi
 * tuyến tính: tỉ lệ đúng của một nhóm × điểm tối đa của nhóm. Đỗ khi tổng ≥ điểm đỗ VÀ không nhóm nào
 * dưới điểm liệt — đúng luật của JLPT. Nhóm không có câu nào (thiếu nội dung) được bỏ qua khi xét liệt.
 */
import type { ExamResult, ExamSession, GroupScore, PartId } from '../types'
import { FORMATS } from '../data/format'

export function scoreSession(s: ExamSession): ExamResult {
  const f = FORMATS[s.level]
  const parts: ExamResult['parts'] = {}
  s.sections.forEach((sec, i) => sec.questions.forEach((q, j) => {
    const p = (parts[q.part] ??= { right: 0, total: 0 })
    p.total++
    if (s.answers[i][j] === q.answer) p.right++
  }))

  const groups: GroupScore[] = f.groups.map((g) => {
    let right = 0, total = 0
    for (const id of g.parts) { right += parts[id as PartId]?.right ?? 0; total += parts[id as PartId]?.total ?? 0 }
    return { id: g.id, max: g.max, min: g.min, right, total, score: total ? Math.round((right / total) * g.max) : 0 }
  })
  // Nhóm thiếu câu: quy theo tỉ lệ các nhóm còn lại để tổng điểm vẫn trên thang chuẩn
  const counted = groups.filter((g) => g.total > 0)
  const maxAll = groups.reduce((a, g) => a + g.max, 0)
  const raw = counted.reduce((a, g) => a + g.score, 0)
  const maxCounted = counted.reduce((a, g) => a + g.max, 0)
  const total = maxCounted ? Math.round((raw / maxCounted) * maxAll) : 0
  const passed = total >= f.pass && counted.every((g) => g.score >= g.min)

  return {
    id: s.id, level: s.level, mode: s.mode, at: Date.now(), total, max: maxAll, passMark: f.pass, passed, groups, parts,
    used: s.used.reduce((a, b) => a + b, 0), allowed: s.sections.reduce((a, x) => a + x.seconds, 0),
  }
}
