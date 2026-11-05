#!/usr/bin/env node
/**
 * TẠO GÓI NGHĨA TIẾNG VIỆT (jmdict-vi) — chạy trên máy tính, KHÔNG chạy trong app
 * ==============================================================================
 * Ghép các nguồn nghĩa tiếng Việt vào đúng từng từ / từng nghĩa của gói jmdict-en đang có,
 * rồi ghi ra public/content/jmdict-vi.v<N>.pack và cập nhật manifest.json (chỉ sửa gói jmdict-vi).
 *
 * NGUỒN
 *  1. tools/vi/*.tsv — bản dịch nghĩa JMdict (tiếng Anh → tiếng Việt). Mỗi dòng:
 *       <id JMdict> TAB <số thứ tự nghĩa, từ 0> TAB <nghĩa tiếng Anh gốc> TAB <nghĩa tiếng Việt, cách nhau bằng "; ">
 *     Cột tiếng Anh dùng để phát hiện khi JMdict sửa nghĩa: nếu nghĩa tiếng Anh trong gói jmdict-en
 *     không còn giống, dòng dịch đó bị bỏ (cần dịch lại) và script in ra số dòng bị bỏ.
 *     Đây là bản phái sinh của JMdict nên dùng cùng giấy phép CC BY-SA 4.0.
 *  2. (tùy chọn) --wiktionary <file.jsonl>: các mục tiếng Nhật của Wiktionary tiếng Việt (CC BY-SA 4.0),
 *     bản trích của kaikki.org: https://kaikki.org/viwiktionary/Tiếng%20Nhật/index.html
 *     Chỉ gắn vào từ JMdict khi chữ viết khớp DUY NHẤT một từ (tránh gắn nhầm từ đồng âm).
 *
 * CÁCH CHẠY (Node.js 18+):
 *   node src/modules/dictionary/tools/build-vi-pack.mjs
 *   node src/modules/dictionary/tools/build-vi-pack.mjs --wiktionary ./kaikki-tieng-nhat.jsonl
 * Tùy chọn: --out <thư mục> (mặc định public/content), --no-patch.
 *
 * XUẤT DANH SÁCH CẦN DỊCH (để dịch thêm):
 *   node src/modules/dictionary/tools/build-vi-pack.mjs --export-todo <file.tsv> [--jlpt 3]
 *   → các nghĩa của từ JLPT (cấp >= --jlpt) chưa có tiếng Việt, cùng định dạng 4 cột (cột tiếng Việt để trống).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.resolve(HERE, '../../../..')
const OUT = path.resolve(opt('--out', path.join(ROOT, 'public/content')))
const VI_DIR = path.join(HERE, 'vi')
const MAKE_PATCH = !flag('--no-patch')
const log = (...m) => console.log('•', ...m)

const ID = 'jmdict-vi'
const TITLE = 'Nghĩa tiếng Việt (dịch từ JMdict)'
const LICENSE = 'Dịch từ JMdict © EDRDG, CC BY-SA 4.0 (bản phái sinh, cùng giấy phép) · Wiktionary tiếng Việt, CC BY-SA 4.0'

// ---------------------------------------------------------------------------
// Chuẩn hóa khóa tra cứu — PHẢI giống viKey/unaccent trong lib/search.ts
// ---------------------------------------------------------------------------
const viKey = (s) => s.normalize('NFC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[“”"'.,;:!?…]/g, ' ').replace(/\s+/g, ' ').trim()
const unaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC')

const readPack = (file) => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'))

function loadJmdict(manifest) {
  const m = manifest.packs.find((p) => p.id === 'jmdict-en')
  if (!m) throw new Error('Chưa có gói jmdict-en trong manifest. Chạy build-packs.mjs trước.')
  return readPack(path.join(OUT, path.basename(m.full.url))).items
}

/** Đọc mọi file tools/vi/*.tsv → Map id → Map(senseIndex → { en, vi[] }). */
function readTranslations() {
  const out = new Map()
  if (!fs.existsSync(VI_DIR)) return out
  for (const f of fs.readdirSync(VI_DIR).filter((f) => f.endsWith('.tsv')).sort()) {
    for (const line of fs.readFileSync(path.join(VI_DIR, f), 'utf8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue
      const [id, idx, en, vi] = line.split('\t')
      if (!vi?.trim()) continue
      if (!out.has(id)) out.set(id, new Map())
      out.get(id).set(Number(idx), { en, vi: vi.split(';').map((x) => x.trim()).filter(Boolean) })
    }
  }
  return out
}

/** Wiktionary tiếng Việt (kaikki.org): chữ viết → các nghĩa tiếng Việt. */
function readWiktionary(file) {
  const out = new Map()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code && e.lang_code !== 'ja') continue
    const word = e.word
    // Bỏ mục romaji, số, ký hiệu: chỉ lấy mục có chữ Nhật
    if (!word || !/[぀-ヿ㐀-鿿]/.test(word)) continue
    if (['romanization', 'character', 'punct', 'symbol'].includes(e.pos)) continue
    const glosses = (e.senses ?? []).flatMap((s) => s.glosses ?? []).map((g) => g.trim()).filter((g) => g && g.length <= 120)
    if (!glosses.length) continue
    out.set(word, [...new Set([...(out.get(word) ?? []), ...glosses])].slice(0, 6))
  }
  return out
}

const enText = (sense) => sense.g.join('; ')

function main() {
  const manifestPath = path.join(OUT, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const words = loadJmdict(manifest)
  const tr = readTranslations()

  // --- Xuất danh sách nghĩa chưa dịch ---
  const todo = opt('--export-todo')
  if (todo) {
    const minLevel = Number(opt('--jlpt', '1'))
    const lines = []
    const list = words.filter((w) => w.data.j && w.data.j >= minLevel)
      .sort((a, b) => b.data.j - a.data.j || (a.data.q ?? 1e9) - (b.data.q ?? 1e9))
    for (const w of list) {
      w.data.s.forEach((s, i) => {
        const t = tr.get(w.id)?.get(i)
        if (!t || t.en !== enText(s)) lines.push([w.id, i, enText(s), ''].join('\t'))
      })
    }
    fs.writeFileSync(todo, lines.join('\n') + '\n')
    log(`Đã ghi ${lines.length} nghĩa chưa dịch vào ${todo}`)
    return
  }

  const wik = opt('--wiktionary') ? readWiktionary(opt('--wiktionary')) : new Map()
  if (wik.size) log(`Wiktionary: ${wik.size} mục tiếng Nhật có nghĩa tiếng Việt`)

  // Chữ viết → các id JMdict (để gắn mục Wiktionary)
  const byForm = new Map()
  if (wik.size) {
    for (const w of words) {
      for (const f of [...(w.data.k ?? []), ...w.data.r]) {
        if (!byForm.has(f.t)) byForm.set(f.t, new Set())
        byForm.get(f.t).add(w.id)
      }
    }
  }
  const wikById = new Map()
  for (const [form, glosses] of wik) {
    const ids = byForm.get(form)
    if (ids?.size === 1) wikById.set([...ids][0], glosses)
  }

  let stale = 0, senses = 0
  const items = []
  for (const w of words) {
    const t = tr.get(w.id)
    const s = w.data.s.map((sense, i) => {
      const x = t?.get(i)
      if (!x) return []
      if (x.en !== enText(sense)) { stale++; return [] }
      senses++
      return x.vi
    })
    const hasS = s.some((x) => x.length)
    const wv = wikById.get(w.id)
    if (!hasS && !wv) continue
    const keys = new Set()
    for (const g of [...s.flat(), ...(wv ?? [])]) {
      const k = viKey(g)
      if (!k || k.length > 40) continue
      keys.add('vi:' + k)
      keys.add('va:' + unaccent(k))
    }
    const data = {}
    if (hasS) { while (!s[s.length - 1].length) s.pop(); data.s = s; data.m = 1 }
    if (wv) data.w = wv
    items.push({ id: w.id, kind: 'vi', keys: [...keys], data })
  }
  items.sort((a, b) => Number(a.id) - Number(b.id))
  log(`${items.length} từ có nghĩa tiếng Việt (${senses} nghĩa dịch, ${wikById.size} từ có nghĩa Wiktionary)`)
  if (stale) log(`${stale} nghĩa bị bỏ vì nghĩa tiếng Anh của JMdict đã đổi (cần dịch lại, xem --export-todo)`)

  writePack(manifest, {
    id: ID, title: TITLE, license: LICENSE, items,
    description: `Nghĩa tiếng Việt cho ${items.length.toLocaleString('vi-VN')} từ (ưu tiên từ JLPT), dịch máy từ nghĩa tiếng Anh, chưa có người duyệt`,
  })
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  log('Đã cập nhật', path.relative(ROOT, manifestPath))
}

// ---------------------------------------------------------------------------
// Ghi gói + bản vá (giống build-packs.mjs). Đuôi .pack, xem giải thích trong build-packs.mjs.
// ---------------------------------------------------------------------------
const EXT = '.pack'
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const gz = (obj) => zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 })

function writePack(manifest, { id, title, description, license, items }) {
  const old = manifest.packs.find((p) => p.id === id)
  const oldFile = old && path.join(OUT, path.basename(old.full.url))
  const oldPack = oldFile && fs.existsSync(oldFile) ? readPack(oldFile) : null

  const contentHash = sha256(Buffer.from(JSON.stringify(items)))
  if (old && old.contentHash === contentHash) {
    log(`${id}: không có gì thay đổi, giữ phiên bản ${old.version}`)
    return
  }
  const version = (old?.version ?? 0) + 1
  const fullName = `${id}.v${version}${EXT}`
  const fullBuf = gz({ format: 1, type: 'full', pack: id, version, title, license, items })
  fs.writeFileSync(path.join(OUT, fullName), fullBuf)
  const entry = {
    id, title, description, license, version, contentHash,
    full: { url: fullName, size: fullBuf.length, sha256: sha256(fullBuf) },
    patches: [],
  }
  if (MAKE_PATCH && oldPack && oldPack.version === old.version) {
    const before = new Map(oldPack.items.map((it) => [it.id, JSON.stringify(it)]))
    const after = new Set(items.map((it) => it.id))
    const upsert = items.filter((it) => before.get(it.id) !== JSON.stringify(it))
    const del = [...before.keys()].filter((k) => !after.has(k))
    const patchName = `${id}.${old.version}-${version}${EXT}`
    const patchBuf = gz({ format: 1, type: 'patch', pack: id, from: old.version, to: version, upsert, delete: del })
    if (patchBuf.length < fullBuf.length * 0.6) {
      fs.writeFileSync(path.join(OUT, patchName), patchBuf)
      entry.patches.push({ from: old.version, to: version, url: patchName, size: patchBuf.length, sha256: sha256(patchBuf) })
      log(`${id}: bản vá ${old.version}→${version}: ${upsert.length} mục sửa/thêm, ${del.length} mục xóa`)
    }
  }
  for (const p of old?.patches ?? []) fs.rmSync(path.join(OUT, path.basename(p.url)), { force: true })
  if (oldFile && path.basename(oldFile) !== fullName) fs.rmSync(oldFile, { force: true })
  if (!entry.patches.length) delete entry.patches

  // Giữ nguyên vị trí trong manifest nếu đã có, không thì thêm vào cuối
  const i = manifest.packs.findIndex((p) => p.id === id)
  if (i >= 0) manifest.packs[i] = entry
  else manifest.packs.push(entry)
  log(`${id}: phiên bản ${version}, ${(fullBuf.length / 1024).toFixed(0)} KB → ${fullName}`)
}

main()
