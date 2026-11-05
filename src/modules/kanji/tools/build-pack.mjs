#!/usr/bin/env node
/**
 * TẠO GÓI DỮ LIỆU KANJI (`kanji-study`) cho module Kanji.
 * Chạy trên máy tính (không nằm trong app). Cần Node.js 20+.
 *
 *   node src/modules/kanji/tools/build-pack.mjs --kanjivg <thư mục KanjiVG>
 *
 * <thư mục KanjiVG> là thư mục chứa thư mục con `kanji/` với các file 098df.svg...
 * Lấy từ https://github.com/KanjiVG/kanjivg (Releases → kanjivg-*-main.zip) hoặc gói PyPI `kanjivg`
 * (file .whl là file zip, giải nén ra là có thư mục kanji/).
 *
 * Script đọc thêm 2 gói của module Từ điển ở public/content/ (kanjidic, jmdict-en) để:
 *  - biết chữ nào thuộc JLPT / Jōyō, bộ thủ của từng chữ (danh sách học),
 *  - chọn các từ ví dụ thông dụng có chứa chữ đó.
 *
 * Kết quả: public/content/kanji-study.v<N>.pack và một mục trong public/content/manifest.json.
 * Nội dung không đổi thì giữ nguyên phiên bản; có thay đổi thì tăng phiên bản và tạo bản vá.
 *
 * Mỗi mục trong gói:
 *   { id: '食', kind: 'kanji', keys: ['食'], data: {
 *       p: ['M52.75,10.5c…', …],          // các nét theo thứ tự viết (đường SVG, khung 109×109)
 *       c: [{ e: '人', s: [0,1], r: 1 }, …], // thành phần cấp 1: chữ, chỉ số các nét, r=1 nếu là bộ thủ
 *       w: [['1358280','食べる','たべる','to eat', 5], …] } }  // từ ví dụ: id JMdict, chữ, đọc, nghĩa, JLPT
 *   { id: '_index', kind: 'index', data: { jlpt: { 5: '一二三…', … }, rad: { 1: '一丁七…', … } } }
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const OUT = path.join(ROOT, 'public/content')
const PACK_ID = 'kanji-study'
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
const log = (...a) => console.log('•', ...a)

const kvgDir = arg('--kanjivg')
if (!kvgDir) { console.error('Thiếu --kanjivg <thư mục KanjiVG>'); process.exit(1) }

const readPack = (file) => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'))
const manifestPath = path.join(OUT, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const packFile = (id) => path.join(OUT, path.basename(manifest.packs.find((p) => p.id === id).full.url))

// ---------------------------------------------------------------------------
// 1. Danh sách chữ cần học: có cấp JLPT hoặc thuộc Jōyō (lớp 1–8)
// ---------------------------------------------------------------------------
const kanjidic = readPack(packFile('kanjidic')).items
const kd = new Map(kanjidic.map((i) => [i.id, i.data]))
const study = kanjidic.filter((i) => i.data.j || (i.data.g && i.data.g <= 8))
log(`Danh sách học: ${study.length} chữ`)

// ---------------------------------------------------------------------------
// 2. Đọc nét và thành phần từ KanjiVG
// ---------------------------------------------------------------------------
/** Đọc một file SVG KanjiVG thành { p: nét, c: thành phần cấp 1 }. */
function parseKvg(xml) {
  const paths = []
  const stack = [] // các nhóm <g> đang mở: { e, r, strokes: [] , depth }
  const groups = []
  const re = /<g\b([^>]*?)(\/?)>|<\/g>|<path\b([^>]*?)\/?>/g
  let m
  let inStrokes = false
  while ((m = re.exec(xml))) {
    if (m[0].startsWith('</g')) {
      const g = stack.pop()
      if (g?.id?.startsWith('kvg:StrokePaths')) inStrokes = false
      continue
    }
    if (m[0].startsWith('<g')) {
      const attrs = m[1]
      const id = /\bid="([^"]*)"/.exec(attrs)?.[1]
      const e = /kvg:element="([^"]*)"/.exec(attrs)?.[1]
      const rad = /kvg:radical="([^"]*)"/.exec(attrs)?.[1]
      const g = { id, e, r: rad === 'general' || rad === 'tradit' ? 1 : 0, strokes: [], depth: stack.length }
      if (id?.startsWith('kvg:StrokePaths')) inStrokes = true
      if (m[2] !== '/') stack.push(g)
      if (inStrokes) groups.push(g)
      continue
    }
    if (!inStrokes) continue
    const d = /\sd="([^"]*)"/.exec(' ' + m[3])?.[1]
    if (!d) continue
    const idx = paths.length
    paths.push(d.replace(/\s+/g, ' ').trim())
    for (const g of stack) g.strokes.push(idx)
  }
  // Cấp 0 = StrokePaths, cấp 1 = cả chữ, cấp 2 = thành phần lớn (ví dụ 亻 và 木 trong 休)
  const top = new Map()
  for (const g of groups) {
    if (g.depth !== 2 || !g.e || !g.strokes.length) continue
    const old = top.get(g.e) // chữ bị tách đôi (kvg:part), ví dụ 衣 trong 哀: gộp lại
    if (old) { old.s.push(...g.strokes); old.r ||= g.r } else top.set(g.e, { e: g.e, s: [...g.strokes], r: g.r })
  }
  const c = [...top.values()].map((x) => (x.r ? x : { e: x.e, s: x.s }))
  // Bộ thủ nằm sâu hơn một cấp (d = 1): vẫn ghi lại để tô màu bộ thủ trên hình chữ
  for (const g of groups) {
    if (g.depth > 2 && g.r && g.e && !c.some((x) => x.e === g.e)) c.push({ e: g.e, s: [...g.strokes], r: 1, d: 1 })
  }
  return { p: paths, c }
}

const strokeData = new Map()
const kanjiDir = path.join(kvgDir, 'kanji')
for (const f of fs.readdirSync(kanjiDir)) {
  const m = /^([0-9a-f]{5})\.svg$/.exec(f) // bỏ qua biến thể (…-Kaisho.svg)
  if (!m) continue
  const ch = String.fromCodePoint(parseInt(m[1], 16))
  if (!kd.has(ch)) continue // chỉ lấy chữ Kanji (bỏ kana, ký hiệu)
  strokeData.set(ch, parseKvg(fs.readFileSync(path.join(kanjiDir, f), 'utf8')))
}
log(`KanjiVG: ${strokeData.size} chữ có dữ liệu nét`)

// ---------------------------------------------------------------------------
// 3. Từ ví dụ từ JMdict: từ thông dụng chứa chữ, ưu tiên JLPT dễ và tần suất cao
// ---------------------------------------------------------------------------
const words = readPack(packFile('jmdict-en')).items
const score = (d) => (d.c ? 1000 : 0) + (d.j ? 300 + d.j * 40 : 0) + (d.q ? Math.max(0, 400 - Math.log2(d.q) * 25) : 0) + (d.nf ? 100 - d.nf : 0)
const studySet = new Set(study.map((s) => s.id))
const byKanji = new Map()
for (const it of words) {
  const d = it.data
  if (!d.k?.length || !(d.c || d.j)) continue
  if (d.s[0]?.m?.includes('uk')) continue // thường viết kana: không hợp làm ví dụ Kanji
  const form = d.k.find((k) => k.c) ?? d.k[0]
  if (form.i?.length || form.t.length > 5) continue
  const reading = (d.r.find((r) => r.c && (!r.o || r.o.includes(form.t))) ?? d.r[0]).t
  const gloss = d.s[0].g.slice(0, 2).join(', ')
  const s = score(d) - form.t.length * 30
  for (const ch of new Set(form.t)) {
    if (!studySet.has(ch)) continue
    let list = byKanji.get(ch)
    if (!list) byKanji.set(ch, (list = []))
    list.push({ s, row: d.j ? [it.id, form.t, reading, gloss, d.j] : [it.id, form.t, reading, gloss] })
  }
}

// ---------------------------------------------------------------------------
// 4. Ghép mục + chỉ mục JLPT / bộ thủ
// ---------------------------------------------------------------------------
const items = []
for (const [ch, sd] of strokeData) {
  const data = { p: sd.p }
  if (sd.c.length) data.c = sd.c
  const w = byKanji.get(ch)
  if (w) data.w = w.sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.row)
  items.push({ id: ch, kind: 'kanji', keys: [ch], data })
}
// Thứ tự trong mỗi nhóm: lớp học ở Nhật (chữ dễ trước), rồi tần suất
const order = (a, b) => (a.data.g ?? 9) - (b.data.g ?? 9) || (a.data.f ?? 9999) - (b.data.f ?? 9999)
const sorted = [...study].sort(order)
const jlpt = {}
const rad = {}
for (const k of sorted) {
  if (k.data.j) jlpt[k.data.j] = (jlpt[k.data.j] ?? '') + k.id
  if (k.data.rad) rad[k.data.rad] = (rad[k.data.rad] ?? '') + k.id
}
const extra = sorted.filter((k) => !k.data.j).map((k) => k.id).join('')
items.push({ id: '_index', kind: 'index', data: { jlpt, rad, joyo: extra } })
items.sort((a, b) => (a.id < b.id ? -1 : 1))

// ---------------------------------------------------------------------------
// 5. Ghi gói + manifest (giống tools/build-packs.mjs của module Từ điển)
// ---------------------------------------------------------------------------
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const gz = (obj) => zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 })
const title = 'Nét viết & từ ví dụ Kanji'
const description = 'Thứ tự nét (KanjiVG) cho hơn 6.000 Kanji, thành phần/bộ thủ, từ ví dụ thông dụng, danh sách JLPT'
const license = 'KanjiVG © Ulrich Apel, CC BY-SA 3.0 · Từ ví dụ: JMdict © EDRDG, CC BY-SA 4.0'

// Đọc lại manifest ngay trước khi ghi: module khác có thể vừa thêm gói của họ
const fresh = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const old = fresh.packs.find((p) => p.id === PACK_ID)
const contentHash = sha256(Buffer.from(JSON.stringify(items)))
if (old && old.contentHash === contentHash) {
  log(`${PACK_ID}: không có gì thay đổi, giữ phiên bản ${old.version}`)
  process.exit(0)
}
const version = (old?.version ?? 0) + 1
const fullName = `${PACK_ID}.v${version}.pack` // KHÔNG dùng .json.gz (xem README module Từ điển)
const fullBuf = gz({ format: 1, type: 'full', pack: PACK_ID, version, title, license, items })
fs.writeFileSync(path.join(OUT, fullName), fullBuf)
const entry = { id: PACK_ID, title, description, license, version, contentHash,
  full: { url: fullName, size: fullBuf.length, sha256: sha256(fullBuf) } }

const oldFile = old && path.join(OUT, path.basename(old.full.url))
if (oldFile && fs.existsSync(oldFile)) {
  const oldPack = readPack(oldFile)
  const before = new Map(oldPack.items.map((it) => [it.id, JSON.stringify(it)]))
  const after = new Set(items.map((it) => it.id))
  const upsert = items.filter((it) => before.get(it.id) !== JSON.stringify(it))
  const del = [...before.keys()].filter((k) => !after.has(k))
  const patchName = `${PACK_ID}.${old.version}-${version}.pack`
  const patchBuf = gz({ format: 1, type: 'patch', pack: PACK_ID, from: old.version, to: version, upsert, delete: del })
  if (patchBuf.length < fullBuf.length * 0.6) {
    fs.writeFileSync(path.join(OUT, patchName), patchBuf)
    entry.patches = [{ from: old.version, to: version, url: patchName, size: patchBuf.length, sha256: sha256(patchBuf) }]
  }
  for (const p of old.patches ?? []) fs.rmSync(path.join(OUT, path.basename(p.url)), { force: true })
  if (path.basename(oldFile) !== fullName) fs.rmSync(oldFile, { force: true })
}
fresh.packs = [...fresh.packs.filter((p) => p.id !== PACK_ID), entry]
fs.writeFileSync(manifestPath, JSON.stringify(fresh, null, 2) + '\n')
log(`${PACK_ID}: phiên bản ${version}, ${items.length} mục, ${(fullBuf.length / 1048576).toFixed(2)} MB → ${fullName}`)
