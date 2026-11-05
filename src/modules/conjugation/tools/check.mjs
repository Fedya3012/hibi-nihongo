/**
 * KIỂM TRA BẢNG CHIA (chạy trên máy tính, không nằm trong app)
 *   node src/modules/conjugation/tools/check.mjs          kiểm tra
 *   node src/modules/conjugation/tools/check.mjs 書く      in bảng chia một từ
 * Với mọi từ × mọi thể: chia xuôi (lib/conjugate.ts), rồi đưa đáp án qua bộ chia ngược của Từ điển
 * (dictionary/lib/deinflect.ts). Đáp án phải quay về đúng thể từ điển, đúng loại từ.
 * Cần Node 22.18+ (chạy thẳng file .ts).
 */
import { WORDS } from '../data/words.ts'
import { FORMS } from '../lib/forms.ts'
import { conjugate } from '../lib/conjugate.ts'
import { deinflect, T } from '../../dictionary/lib/deinflect.ts'

const TYPE = { v5: T.V5, v1: T.V1, vs: T.VS, vk: T.VK, i: T.ADJ }
const applies = (w, f) => !w.no?.includes(f.id) && ((w.c === 'i' || w.c === 'na') ? f.adj : f.verb)

/** Chia ngược `form` có ra `dict` (đúng loại) không. Tính từ -な: phần sau từ gốc là đuôi cố định. */
function backTo(form, dict, w) {
  if (w.c === 'na') return form.startsWith(dict)
  if (dict === 'ある' && /^な(い|かった)$/.test(form)) return true // ngoại lệ: phủ định của ある là ない
  // する ghép (勉強する): bộ chia ngược chỉ biết する → kiểm tra phần đuôi
  if (w.c === 'vs' && dict !== 'する') return backTo(form.slice(dict.length - 2), 'する', { ...w, r: 'する' })
  if (w.c === 'vs' && form.endsWith('できる')) return true // khả năng của する là động từ khác
  // Bộ chia ngược không xử lý です / ありません (không phải đuôi chia) → bỏ trước khi kiểm tra
  form = form.replace(/くありませんでした$/, 'くなかった').replace(/くありません$/, 'くない').replace(/です$/, '')
  // いい chia theo よい: chia ngược ra よい
  if (w.c === 'i' && dict.endsWith('いい')) dict = dict.slice(0, -2) + 'よい'
  return deinflect(form).some((c) => c.word === dict && (c.type & TYPE[w.c]))
}

const only = process.argv[2]
let bad = 0, n = 0
for (const w of WORDS) {
  if (only && w.w !== only && w.r !== only) continue
  for (const f of FORMS) {
    const res = conjugate(w, f.id)
    if (!applies(w, f)) { if (res) { console.log('THỪA', w.w, f.id); bad++ } continue }
    if (!res) { console.log('THIẾU', w.w, f.id); bad++; continue }
    n++
    if (only) console.log(f.id.padEnd(13), res.w.padEnd(12), res.r.padEnd(14), res.alt.join(' ').padEnd(30), res.rule)
    for (const [form, dict] of [[res.r, w.r], [res.w, w.w], ...res.alt.map((a) => [a, /[㐀-鿿]/.test(a) ? w.w : w.r])]) {
      if (!backTo(form, dict, w)) { console.log('SAI', w.w, f.id, form, '↛', dict); bad++ }
    }
  }
}
console.log(`${n} dạng chia, ${bad} lỗi`)
process.exit(bad ? 1 : 0)
