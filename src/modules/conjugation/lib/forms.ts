/**
 * CÁC THỂ ĐƯỢC LUYỆN
 * ------------------
 * Thứ tự trong mảng = thứ tự hiện trên màn hình và trong Bảng chia.
 * `lv`: cấp JLPT thường học thể này (5 = N5, 4 = N4). `verb`/`adj`: dùng cho động từ / tính từ.
 * `jp`: tên/dạng tiếng Nhật hiện cạnh tên (động từ); `jpAdj`: dạng cho tính từ.
 */
import type { ConjWord, FormId } from '../types'

export interface FormInfo {
  id: FormId
  lv: 5 | 4
  vi: string
  en: string
  ja: string
  jp: string
  jpAdj?: string
  verb: boolean
  adj: boolean
}

export const FORMS: FormInfo[] = [
  { id: 'masu', lv: 5, vi: 'Lịch sự', en: 'Polite', ja: '丁寧形', jp: '〜ます', verb: true, adj: false },
  { id: 'masen', lv: 5, vi: 'Phủ định lịch sự', en: 'Polite negative', ja: '丁寧・否定', jp: '〜ません', jpAdj: '〜くないです／〜じゃありません', verb: true, adj: true },
  { id: 'mashita', lv: 5, vi: 'Quá khứ lịch sự', en: 'Polite past', ja: '丁寧・過去', jp: '〜ました', jpAdj: '〜かったです／〜でした', verb: true, adj: true },
  { id: 'masendeshita', lv: 5, vi: 'Quá khứ phủ định lịch sự', en: 'Polite past negative', ja: '丁寧・過去否定', jp: '〜ませんでした', jpAdj: '〜くなかったです／〜じゃありませんでした', verb: true, adj: true },
  { id: 'mashou', lv: 5, vi: 'Rủ rê', en: 'Let’s…', ja: '勧誘', jp: '〜ましょう', verb: true, adj: false },
  { id: 'nai', lv: 5, vi: 'Phủ định (thể ない)', en: 'Negative (nai)', ja: 'ない形', jp: '〜ない', jpAdj: '〜くない／〜じゃない', verb: true, adj: true },
  { id: 'ta', lv: 5, vi: 'Quá khứ (thể た)', en: 'Past (ta)', ja: 'た形', jp: '〜た', jpAdj: '〜かった／〜だった', verb: true, adj: true },
  { id: 'nakatta', lv: 5, vi: 'Quá khứ phủ định', en: 'Past negative', ja: 'なかった形', jp: '〜なかった', jpAdj: '〜くなかった／〜じゃなかった', verb: true, adj: true },
  { id: 'te', lv: 5, vi: 'Thể て', en: 'Te-form', ja: 'て形', jp: '〜て', jpAdj: '〜くて／〜で', verb: true, adj: true },
  { id: 'tai', lv: 5, vi: 'Muốn', en: 'Want to (tai)', ja: 'たい形', jp: '〜たい', verb: true, adj: false },
  { id: 'adv', lv: 5, vi: 'Trạng từ', en: 'Adverb', ja: '連用形（副詞）', jp: '', jpAdj: '〜く／〜に', verb: false, adj: true },
  { id: 'pot', lv: 4, vi: 'Khả năng', en: 'Potential', ja: '可能形', jp: '〜える／〜られる', verb: true, adj: false },
  { id: 'vol', lv: 4, vi: 'Ý chí', en: 'Volitional', ja: '意向形', jp: '〜おう／〜よう', verb: true, adj: false },
  { id: 'ba', lv: 4, vi: 'Điều kiện ば', en: 'Conditional (ba)', ja: '仮定形', jp: '〜ば', jpAdj: '〜ければ／〜なら', verb: true, adj: true },
  { id: 'tara', lv: 4, vi: 'Điều kiện たら', en: 'Conditional (tara)', ja: 'たら形', jp: '〜たら', jpAdj: '〜かったら／〜だったら', verb: true, adj: true },
  { id: 'imp', lv: 4, vi: 'Mệnh lệnh', en: 'Imperative', ja: '命令形', jp: '〜え／〜ろ', verb: true, adj: false },
  { id: 'pass', lv: 4, vi: 'Bị động', en: 'Passive', ja: '受身形', jp: '〜れる／〜られる', verb: true, adj: false },
  { id: 'caus', lv: 4, vi: 'Sai khiến', en: 'Causative', ja: '使役形', jp: '〜せる／〜させる', verb: true, adj: false },
]

export const FORM_BY_ID = new Map(FORMS.map((f) => [f.id, f]))

export const isAdj = (w: ConjWord) => w.c === 'i' || w.c === 'na'

/** Thể này có dùng được với từ này không. */
export function formApplies(w: ConjWord, f: FormInfo): boolean {
  if (w.no?.includes(f.id)) return false
  return isAdj(w) ? f.adj : f.verb
}

/** Dạng tiếng Nhật hiện cạnh tên thể, theo loại từ. */
export const formJp = (f: FormInfo, w?: ConjWord) => (w && isAdj(w) ? f.jpAdj ?? f.jp : f.jp)

/** Nhóm từ theo cách người Việt học (Minna): Nhóm 1/2/3, tính từ -い/-な. */
export const CLASS_LABEL: Record<ConjWord['c'], { vi: string; en: string; ja: string }> = {
  v5: { vi: 'Động từ nhóm 1', en: 'Group 1 verb (godan)', ja: 'Ⅰグループ（五段）' },
  v1: { vi: 'Động từ nhóm 2', en: 'Group 2 verb (ichidan)', ja: 'Ⅱグループ（一段）' },
  vs: { vi: 'Động từ nhóm 3 (する)', en: 'Group 3 verb (suru)', ja: 'Ⅲグループ（する）' },
  vk: { vi: 'Động từ nhóm 3 (来る)', en: 'Group 3 verb (kuru)', ja: 'Ⅲグループ（来る）' },
  i: { vi: 'Tính từ -い', en: 'i-adjective', ja: 'い形容詞' },
  na: { vi: 'Tính từ -な', en: 'na-adjective', ja: 'な形容詞' },
}
