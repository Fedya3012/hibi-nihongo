#!/usr/bin/env node
/**
 * TẠO DỮ LIỆU TRA KANJI THEO BỘ THỦ (src/modules/kanji/data/radk.json)
 * Chạy trên máy tính (không nằm trong app). Cần Node.js 20+.
 *
 *   node src/modules/kanji/tools/build-radk.mjs --radkfile <đường dẫn radkfile hoặc radkfile.gz>
 *
 * RADKFILE (© EDRDG, CC BY-SA 3.0) là file dùng cho kiểu tra "chọn nhiều bộ phận" của WWWJDIC/Jisho:
 * mỗi bộ phận (253 bộ) đi kèm danh sách mọi chữ có chứa nó. Lấy ở
 * https://www.edrdg.org/krad/kradinf.html hoặc trong gói PyPI `jamdict` (jamdict/data/radkfile.gz).
 * File gốc mã hóa EUC-JP; script tự đổi sang UTF-8.
 *
 * Script đọc thêm gói `kanjidic` ở public/content/ để biết số nét và độ thông dụng của từng chữ
 * (kết quả tra được xếp theo số nét, chữ hay gặp trước).
 *
 * Kết quả (JSON, app tải khi mở mục Tra chữ):
 *   { k: '一丁七…',          // mọi chữ, xếp theo số nét rồi độ thông dụng
 *     s: [1, 2, 2, …],        // số nét của từng chữ trong k
 *     r: [['一', 1, [0, 1, …]], …] } // bộ phận: chữ hiển thị, số nét, chỉ số các chữ (trong k) chứa nó,
 *                                     // (và ghi chú vị trí nếu hai bộ trông giống nhau, ví dụ 阝)
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
const src = arg('--radkfile')
if (!src) { console.error('Thiếu --radkfile <đường dẫn>'); process.exit(1) }

let raw = fs.readFileSync(src)
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)
const text = new TextDecoder('euc-jp').decode(raw)

// RADKFILE dùng chữ "đại diện" cho các bộ chỉ có dạng biến thể (ví dụ 化 = bộ 亻 đứng bên trái).
// Đổi sang chữ người học quen nhìn thấy.
const DISPLAY = {
  '化': '亻', '个': '𠆢', '并': '丷', '刈': '刂', '込': '辶', '尚': '⺌', '忙': '忄', '扎': '扌',
  '汁': '氵', '犯': '犭', '艾': '艹', '邦': '阝', '阡': '阝', '老': '耂', '杰': '灬', '礼': '礻',
  '疔': '疒', '禹': '禸', '初': '衤', '買': '罒', '乞': '𠂉', '滴': '啇', '｜': '丨', 'ノ': '丿',
}
// Hai bộ 阝 trông giống nhau: ghi thêm vị trí để phân biệt
const HINT = { '邦': 'bên phải', '阡': 'bên trái' }

const radicals = [] // [chữ hiển thị, số nét, Set chữ]
let cur = null
for (const line of text.split('\n')) {
  if (!line || line.startsWith('#')) continue
  if (line.startsWith('$')) {
    const [, ch, strokes] = line.split(/\s+/)
    cur = [DISPLAY[ch] ?? ch, Number(strokes), new Set(), HINT[ch]]
    radicals.push(cur)
  } else if (cur) {
    for (const c of line.trim()) cur[2].add(c)
  }
}

// Số nét + độ thông dụng từ gói kanjidic
let kd = fs.readFileSync(path.join(ROOT, 'public/content/kanjidic.v1.pack'))
if (kd[0] === 0x1f && kd[1] === 0x8b) kd = zlib.gunzipSync(kd)
const dic = new Map(JSON.parse(kd.toString('utf8')).items.map((it) => [it.id, it.data]))

const all = [...new Set(radicals.flatMap((r) => [...r[2]]))]
const rank = (c) => {
  const d = dic.get(c) ?? {}
  // chữ có trong JLPT / bảng tần suất đứng trước, chữ hiếm đứng sau
  return (d.f ?? (d.j ? 2500 + (6 - d.j) * 100 : 9000))
}
const strokes = (c) => dic.get(c)?.s ?? 30
all.sort((a, b) => strokes(a) - strokes(b) || rank(a) - rank(b) || a.localeCompare(b))
const index = new Map(all.map((c, i) => [c, i]))

const out = {
  k: all.join(''),
  s: all.map(strokes),
  r: radicals.map(([ch, n, set, hint]) => {
    const r = [ch, n, [...set].map((c) => index.get(c)).sort((a, b) => a - b)]
    return hint ? [...r, hint] : r
  }),
}
const file = path.join(ROOT, 'src/modules/kanji/data/radk.json')
fs.writeFileSync(file, JSON.stringify(out))
console.log(`• ${radicals.length} bộ phận, ${all.length} chữ → ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)
