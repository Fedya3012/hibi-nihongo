#!/usr/bin/env node
/**
 * TẠO GÓI CÂU VÍ DỤ (`tatoeba-ja`) cho module Từ điển. Chạy trên máy tính, KHÔNG chạy trong app.
 * ==========================================================================================
 * Lấy câu tiếng Nhật kèm bản dịch từ Tatoeba (https://tatoeba.org, giấy phép CC BY 2.0 FR),
 * tách từ bằng Kuromoji để biết câu có những từ nào, nối mỗi từ với mục JMdict của gói `jmdict-en`,
 * rồi chọn vài câu hay nhất (ngắn, có bản dịch tiếng Việt thì ưu tiên) cho mỗi từ.
 *
 * CÁCH CHẠY (cần Node.js 22+, đã `npm install`):
 *   node src/modules/dictionary/tools/build-examples.mjs --download          # tải bản mới nhất từ Tatoeba
 *   node src/modules/dictionary/tools/build-examples.mjs --tatoeba ./tatoeba # dùng file đã tải sẵn
 *   node src/modules/dictionary/tools/build-examples.mjs --jiten SENTENCES   # dùng file SENTENCES của gói PyPI "jiten"
 *
 * Thư mục --tatoeba chứa các file xuất của Tatoeba (đã giải nén, tải ở https://tatoeba.org/vi/downloads):
 *   jpn_sentences.tsv        câu tiếng Nhật         (id \t jpn \t câu)
 *   eng_sentences.tsv        câu tiếng Anh          (id \t eng \t câu)
 *   vie_sentences.tsv        câu tiếng Việt         (id \t vie \t câu)   — không bắt buộc
 *   jpn-eng_links.tsv, jpn-vie_links.tsv  hoặc links.csv   cặp câu là bản dịch của nhau (id \t id)
 * File SENTENCES của "jiten" (bản sao Tatoeba 2021, chỉ có tiếng Anh): id \t câu Nhật \t câu Anh \t ...
 *
 * Kết quả: public/content/tatoeba-ja.v<N>.pack và một mục trong public/content/manifest.json.
 * Nội dung không đổi thì giữ nguyên phiên bản; có thay đổi thì tăng phiên bản và tạo bản vá.
 *
 * Mỗi mục trong gói (một câu):
 *   { id: '4704', kind: 'example', keys: ['1188270', …],   // keys = id JMdict của các từ được minh họa
 *     data: { t: '何してるの？',                            // câu tiếng Nhật
 *             r: [[0, 1, 'なに']],                           // furigana: [vị trí, số chữ, cách đọc]
 *             e: 'What are you doing?',                      // bản dịch tiếng Anh
 *             v: 'Bạn đang làm gì vậy?',                     // bản dịch tiếng Việt (nếu có)
 *             w: [['1188270', 0, 1, 0], …] } }               // [id từ, vị trí, độ dài trong câu, thứ hạng câu cho từ này]
 * Thứ hạng 0 = câu tốt nhất cho từ đó. App tra câu theo id từ: findByKey(id, { pack: 'tatoeba-ja' }).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const OUT = path.join(ROOT, 'public/content')
const PACK_ID = 'tatoeba-ja'
const PER_WORD = 5 // số câu tối đa cho mỗi từ
const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const log = (...a) => console.log('•', ...a)

// ---------------------------------------------------------------------------
// 1. Đọc câu và bản dịch
// ---------------------------------------------------------------------------
/** @type {Map<string, { t: string, e?: string, v?: string }>} */
const sentences = new Map()

function readTsv(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/\r$/, '').split('\t'))
}

function loadTatoeba(dir) {
  const f = (n) => path.join(dir, n)
  const lang = new Map() // id → { lang, text } cho câu Anh/Việt
  for (const [file, code] of [['eng_sentences.tsv', 'e'], ['vie_sentences.tsv', 'v']]) {
    if (!fs.existsSync(f(file))) { log(`Không có ${file}, bỏ qua`); continue }
    for (const [id, , text] of readTsv(f(file))) if (text) lang.set(id, { code, text })
  }
  for (const [id, , text] of readTsv(f('jpn_sentences.tsv'))) if (text) sentences.set(id, { t: text.trim() })
  const linkFiles = fs.readdirSync(dir).filter((n) => /links\.(tsv|csv)$/.test(n))
  for (const lf of linkFiles) {
    for (const [a, b] of readTsv(f(lf))) {
      const s = sentences.get(a)
      const tr = lang.get(b)
      if (s && tr && !s[tr.code]) s[tr.code] = tr.text.trim() // giữ bản dịch đầu tiên (thường là bản gốc)
    }
  }
  log(`Tatoeba: ${sentences.size} câu tiếng Nhật, đọc liên kết từ ${linkFiles.join(', ') || '(không có file)'}`)
}

function loadJiten(file) {
  for (const [id, jp, en] of readTsv(file)) {
    if (!id || !jp) continue
    sentences.set(id, { t: jp.trim(), e: en && en !== '-' ? en.trim() : undefined })
  }
  log(`jiten SENTENCES: ${sentences.size} câu`)
}

function download() {
  const dir = path.join(ROOT, '.dict-src/tatoeba')
  fs.mkdirSync(dir, { recursive: true })
  const base = 'https://downloads.tatoeba.org/exports/per_language'
  const files = [
    `${base}/jpn/jpn_sentences.tsv.bz2`, `${base}/eng/eng_sentences.tsv.bz2`, `${base}/vie/vie_sentences.tsv.bz2`,
    `${base}/jpn/jpn-eng_links.tsv.bz2`, `${base}/jpn/jpn-vie_links.tsv.bz2`,
  ]
  for (const url of files) {
    const name = path.basename(url)
    log(`Tải ${name}…`)
    execFileSync('curl', ['-fsSL', '-o', path.join(dir, name), url], { stdio: 'inherit' })
    execFileSync('bunzip2', ['-f', path.join(dir, name)], { stdio: 'inherit' }) // cần lệnh bunzip2 (có sẵn trên Linux/macOS)
  }
  return dir
}

if (args.includes('--download')) loadTatoeba(download())
else if (opt('--tatoeba')) loadTatoeba(path.resolve(opt('--tatoeba')))
else if (opt('--jiten')) loadJiten(path.resolve(opt('--jiten')))
else { console.error('Cần --download, --tatoeba <thư mục> hoặc --jiten <file SENTENCES>'); process.exit(1) }

// Chỉ giữ câu có bản dịch, độ dài vừa phải
for (const [id, s] of sentences) {
  const len = [...s.t].length
  if ((!s.e && !s.v) || len < 4 || len > 45) sentences.delete(id)
}
log(`Giữ ${sentences.size} câu có bản dịch, dài 4–45 chữ`)

// ---------------------------------------------------------------------------
// 2. Bảng tra JMdict: chữ viết/cách đọc → các mục từ
// ---------------------------------------------------------------------------
const readPack = (file) => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'))
const manifestPath = path.join(OUT, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const wordPackFile = path.join(OUT, path.basename(manifest.packs.find((p) => p.id === 'jmdict-en').full.url))
const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const isKanji = (c) => /[㐀-鿿豈-﫿々〆ヶ]/.test(c)

/** @type {Map<string, { id: string, kanji: boolean, d: any }[]>} */
const byForm = new Map()
const add = (form, entry) => { const l = byForm.get(form); if (l) l.push(entry); else byForm.set(form, [entry]) }
for (const it of readPack(wordPackFile).items) {
  const d = it.data
  for (const k of d.k ?? []) add(k.t, { id: it.id, kanji: true, d })
  for (const r of d.r) add(r.t, { id: it.id, kanji: false, d })
}
log(`JMdict: ${byForm.size} cách viết/đọc`)

const commonScore = (d) => (d.c ? 1000 : 0) + (d.j ? 300 : 0) + (d.q ? Math.max(0, 400 - Math.log2(d.q) * 25) : 0)
const usuallyKana = (d) => d.s.some((s) => s.m?.includes('uk'))

/**
 * Chọn mục JMdict khớp nhất với một từ trong câu.
 * base = thể từ điển (Kuromoji đoán), surface = chữ trong câu, reading = cách đọc của surface (hiragana).
 */
function pickEntry(base, surface, reading) {
  const cands = byForm.get(base)
  if (!cands) return undefined
  let best, bestScore = -Infinity
  for (const c of cands) {
    let s = commonScore(c.d)
    const readings = c.d.r.map((r) => r.t)
    if (reading) {
      if (surface === base && readings.includes(reading)) s += 3000
      else if (readings.some((r) => r.startsWith(reading) || reading.startsWith(r))) s += 2000
      else if (readings.some((r) => r[0] === reading[0])) s += 500
      else s -= 2000
    }
    // Chữ kana không được khớp với từ bình thường viết bằng Kanji: さかさま ≠ 様 (さま), のるかそるか ≠ 剃る
    if (!c.kanji && c.d.k?.length && !usuallyKana(c.d)) continue
    if (s > bestScore) { best = c; bestScore = s }
  }
  return bestScore > -500 ? best : undefined
}

// ---------------------------------------------------------------------------
// 3. Tách từ từng câu (Kuromoji, cùng từ điển IPADIC với app)
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url)
const kuromoji = require('kuromoji')
const tokenizer = await new Promise((res, rej) =>
  kuromoji.builder({ dicPath: path.join(ROOT, 'node_modules/kuromoji/dict') }).build((e, t) => (e ? rej(e) : res(t))))

// Từ loại được làm ví dụ (bỏ trợ từ, trợ động từ, dấu câu, tên riêng, số)
const CONTENT = new Set(['名詞', '動詞', '形容詞', '副詞', '連体詞', '接続詞', '感動詞'])
const SKIP_DETAIL = new Set(['非自立', '接尾', '数', '固有名詞'])
const ATTACH = (t) => t.pos === '助動詞' || (t.pos === '動詞' && (t.pos_detail_1 === '接尾' || t.pos_detail_1 === '非自立'))
  || (t.pos === '助詞' && t.pos_detail_1 === '接続助詞' && ['て', 'で', 'ば'].includes(t.surface_form))

/** Furigana cho câu: [vị trí, số chữ, cách đọc] cho từng cụm Kanji. */
function furigana(tokens) {
  const out = []
  let pos = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const surf = t.surface_form
    const len = surf.length
    if ([...surf].some(isKanji) && t.reading && t.reading !== '*') {
      // Tách phần kana ở đầu/cuối (食べ → た+べ): chỉ đặt furigana lên phần Kanji
      let read = kataToHira(t.reading)
      // IPADIC đôi khi tính cả okurigana của mảnh sau vào cách đọc: 或 (đọc ある) + る → chỉ giữ あ
      const next = kataToHira(tokens[i + 1]?.surface_form ?? '')
      for (let k = Math.min(next.length, read.length - 1); k > 0; k--) {
        if (isKanji(surf[len - 1]) && read.endsWith(next.slice(0, k)) && !kataToHira(surf).endsWith(next.slice(0, k))) {
          read = read.slice(0, -k)
          break
        }
      }
      let a = 0, b = len, ra = 0, rb = read.length
      while (a < b && !isKanji(surf[a]) && kataToHira(surf[a]) === read[ra]) { a++; ra++ }
      while (b > a && !isKanji(surf[b - 1]) && kataToHira(surf[b - 1]) === read[rb - 1]) { b--; rb-- }
      if (rb > ra) out.push([pos + a, b - a, read.slice(ra, rb)])
    }
    pos += len
  }
  return out
}

/** @type {Map<string, { sid: string, start: number, len: number, q: number }[]>} id từ → các câu */
const byWord = new Map()
const analysed = new Map() // sid → { r, w: Map<id, [start,len]> }
let n = 0
for (const [sid, s] of sentences) {
  if (++n % 20000 === 0) log(`Đã tách ${n}/${sentences.size} câu…`)
  const tokens = tokenizer.tokenize(s.t)
  // Câu có chữ lạ (Kuromoji không biết cách đọc) thì furigana có thể sai: bỏ qua
  if (tokens.some((t) => [...t.surface_form].some(isKanji) && (!t.reading || t.reading === '*'))) continue
  const words = new Map()
  let pos = 0
  let rare = 0 // số từ hiếm / không có trong từ điển
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const start = pos
    let len = t.surface_form.length
    pos += len
    if (!CONTENT.has(t.pos) || SKIP_DETAIL.has(t.pos_detail_1)) continue
    // Một chữ kana đứng riêng thường là tách sai (ミス|っ → ス), bỏ qua
    if (t.surface_form.length === 1 && !isKanji(t.surface_form)) continue
    // Gộp đuôi chia vào động từ/tính từ để tô đậm cả cụm 食べさせられた
    if (t.pos === '動詞' || t.pos === '形容詞') {
      while (i + 1 < tokens.length && ATTACH(tokens[i + 1])) { len += tokens[++i].surface_form.length; pos = start + len }
    }
    const base = t.basic_form && t.basic_form !== '*' ? t.basic_form : t.surface_form
    const e = pickEntry(base, t.surface_form, t.reading && t.reading !== '*' ? kataToHira(t.reading) : '')
    if (!e) { rare++; continue }
    if (!e.d.c && !e.d.j) rare++
    if (words.has(e.id)) continue
    words.set(e.id, [start, len])
  }
  if (!words.size) continue
  // Điểm câu (càng nhỏ càng tốt): dài khoảng 16 chữ, ít từ hiếm (dễ hiểu cho người học), có tiếng Việt
  const L = [...s.t].length
  const q = Math.abs(L - 16) + rare * 6 + (s.v ? -8 : 0) + (s.e ? 0 : 4)
  analysed.set(sid, { r: furigana(tokens), w: words })
  for (const [id, [start, len]] of words) {
    const l = byWord.get(id)
    const row = { sid, start, len, q }
    if (l) l.push(row); else byWord.set(id, [row])
  }
}
log(`Đã tách xong. ${byWord.size} từ có câu ví dụ`)

// ---------------------------------------------------------------------------
// 4. Chọn PER_WORD câu tốt nhất cho mỗi từ, gom thành các mục của gói
// ---------------------------------------------------------------------------
const chosen = new Map() // sid → [[id, start, len, rank], …]
for (const [id, rows] of byWord) {
  rows.sort((a, b) => a.q - b.q || Number(a.sid) - Number(b.sid))
  const seenText = new Set()
  let rank = 0
  for (const r of rows) {
    if (rank >= PER_WORD) break
    const text = sentences.get(r.sid).t
    if (seenText.has(text)) continue // câu trùng chữ (Tatoeba có vài câu lặp)
    seenText.add(text)
    const l = chosen.get(r.sid) ?? []
    l.push([id, r.start, r.len, rank++])
    chosen.set(r.sid, l)
  }
}
const items = []
for (const [sid, w] of chosen) {
  const s = sentences.get(sid)
  const data = { t: s.t }
  const r = analysed.get(sid).r
  if (r.length) data.r = r
  if (s.e) data.e = s.e
  if (s.v) data.v = s.v
  w.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  data.w = w
  items.push({ id: sid, kind: 'example', keys: w.map((x) => x[0]), data })
}
items.sort((a, b) => Number(a.id) - Number(b.id))
log(`Gói có ${items.length} câu, ${[...chosen.values()].reduce((s, w) => s + w.length, 0)} liên kết từ–câu`)

// ---------------------------------------------------------------------------
// 5. Ghi gói + manifest (giống tools/build-packs.mjs)
// ---------------------------------------------------------------------------
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const gz = (obj) => zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 })
const vi = items.filter((i) => i.data.v).length
const title = 'Câu ví dụ (Tatoeba)'
const description = `${items.length.toLocaleString('vi-VN')} câu ví dụ có furigana và bản dịch${vi ? ` (${vi.toLocaleString('vi-VN')} câu có tiếng Việt)` : ' tiếng Anh'}, gắn với từng từ trong từ điển`
const license = 'Câu ví dụ: Tatoeba (tatoeba.org), CC BY 2.0 FR'

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
