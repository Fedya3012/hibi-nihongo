#!/usr/bin/env node
/**
 * TẠO GÓI DỮ LIỆU TỪ ĐIỂN (chạy trên máy tính hoặc GitHub Actions, KHÔNG chạy trong app)
 * ===================================================================================
 * Đọc dữ liệu gốc (nguồn mở) rồi ghi ra 2 gói nội dung theo định dạng của `src/core/db`:
 *   - public/content/jmdict-en.v<N>.pack       (từ vựng: JMdict + pitch accent + JLPT + tần suất)
 *   - public/content/kanjidic.v<N>.pack        (Kanji: KANJIDIC2 + âm Hán Việt + JLPT mới)
 * và cập nhật public/content/manifest.json (chỉ sửa 2 gói này, giữ nguyên gói của module khác).
 * Nếu đã có bản cũ trong public/content thì tự tạo thêm bản vá (patch) để app chỉ tải phần thay đổi.
 *
 * CÁCH CHẠY (cần Node.js 22.5 trở lên):
 *   node src/modules/dictionary/tools/build-packs.mjs --download        # tự tải dữ liệu mới nhất
 *   node src/modules/dictionary/tools/build-packs.mjs --src ./du-lieu   # dùng file đã tải sẵn
 *
 * Trong thư mục --src, script tìm các file sau (thiếu file nào thì bỏ qua phần đó):
 *   JMdict_e.gz hoặc JMdict_e.xml   từ điển từ vựng gốc (EDRDG)        https://www.edrdg.org/
 *   kanjidic2.xml.gz / .xml         từ điển Kanji gốc (EDRDG)
 *   jamdict.db                      (thay thế khi không tải được 2 file trên) bản SQLite của gói
 *                                   PyPI "jamdict-data", chứa cùng dữ liệu JMdict/KANJIDIC2 của EDRDG
 *   accents.txt                     pitch accent (Kanjium, CC BY-SA 4.0)
 *   wikipedia_freq.txt              tần suất từ (Kanjium, CC BY-SA 4.0)
 *   jlpt/n1.csv … jlpt/n5.csv       danh sách JLPT của Jonathan Waller (tanos.co.uk, CC BY)
 *   kanji.json                      JLPT mới cho Kanji (davidluzgouveia/kanji-data, MIT; dữ liệu Waller)
 *
 * Tùy chọn khác: --out <thư mục> (mặc định public/content), --no-patch (không tạo bản vá).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// 0. Tham số dòng lệnh
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..')
const SRC = path.resolve(opt('--src', path.join(ROOT, '.dict-src')))
const OUT = path.resolve(opt('--out', path.join(ROOT, 'public/content')))
const MAKE_PATCH = !flag('--no-patch')

const log = (...m) => console.log('•', ...m)
const exists = (f) => fs.existsSync(path.join(SRC, f))
const readText = (f) => {
  const p = path.join(SRC, f)
  const buf = fs.readFileSync(p)
  return (p.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString('utf8')
}

// ---------------------------------------------------------------------------
// 1. Tải dữ liệu gốc (tùy chọn --download)
// ---------------------------------------------------------------------------
const SOURCES = [
  ['JMdict_e.gz', 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz'],
  ['kanjidic2.xml.gz', 'http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz'],
  ['accents.txt', 'https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt'],
  ['wikipedia_freq.txt', 'https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/wikipedia_freq.txt'],
  ['kanji.json', 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json'],
  ...[1, 2, 3, 4, 5].map((n) => [`jlpt/n${n}.csv`, `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n${n}.csv`]),
]

async function download() {
  fs.mkdirSync(path.join(SRC, 'jlpt'), { recursive: true })
  for (const [file, url] of SOURCES) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`mã ${res.status}`)
      fs.writeFileSync(path.join(SRC, file), Buffer.from(await res.arrayBuffer()))
      log('Đã tải', file)
    } catch (e) {
      console.warn('! Không tải được', file, '-', e.message)
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Bảng mã nhãn của JMdict
//    File XML gốc ghi nhãn dạng mã (&v1; &uk;...). jamdict.db ghi dạng mô tả tiếng Anh.
//    Ta luôn lưu MÃ (ngắn, ổn định), app tự dịch mã sang tiếng Việt (xem labels.ts).
// ---------------------------------------------------------------------------
const CODE_DESCRIPTIONS = {
  // Từ loại
  'adj-f': 'noun or verb acting prenominally', 'adj-i': 'adjective (keiyoushi)',
  'adj-ix': 'adjective (keiyoushi) - yoi/ii class', 'adj-kari': "'kari' adjective (archaic)",
  'adj-ku': "'ku' adjective (archaic)", 'adj-na': 'adjectival nouns or quasi-adjectives (keiyodoshi)',
  'adj-nari': 'archaic/formal form of na-adjective', 'adj-no': "nouns which may take the genitive case particle 'no'",
  'adj-pn': 'pre-noun adjectival (rentaishi)', 'adj-shiku': "'shiku' adjective (archaic)", 'adj-t': "'taru' adjective",
  adv: 'adverb (fukushi)', 'adv-to': "adverb taking the 'to' particle", aux: 'auxiliary', 'aux-adj': 'auxiliary adjective',
  'aux-v': 'auxiliary verb', conj: 'conjunction', cop: 'copula', ctr: 'counter', exp: 'expressions (phrases, clauses, etc.)',
  int: 'interjection (kandoushi)', n: 'noun (common) (futsuumeishi)', 'n-adv': 'adverbial noun (fukushitekimeishi)',
  'n-pr': 'proper noun', 'n-pref': 'noun, used as a prefix', 'n-suf': 'noun, used as a suffix',
  'n-t': 'noun (temporal) (jisoumeishi)', num: 'numeric', pn: 'pronoun', pref: 'prefix', prt: 'particle', suf: 'suffix',
  unc: 'unclassified', 'v-unspec': 'verb unspecified', v1: 'Ichidan verb', 'v1-s': 'Ichidan verb - kureru special class',
  v5aru: 'Godan verb - -aru special class', v5b: "Godan verb with 'bu' ending", v5g: "Godan verb with 'gu' ending",
  v5k: "Godan verb with 'ku' ending", 'v5k-s': 'Godan verb - Iku/Yuku special class', v5m: "Godan verb with 'mu' ending",
  v5n: "Godan verb with 'nu' ending", v5r: "Godan verb with 'ru' ending", 'v5r-i': "Godan verb with 'ru' ending (irregular verb)",
  v5s: "Godan verb with 'su' ending", v5t: "Godan verb with 'tsu' ending", v5u: "Godan verb with 'u' ending",
  'v5u-s': "Godan verb with 'u' ending (special class)", vi: 'intransitive verb', vk: 'Kuru verb - special class',
  vn: 'irregular nu verb', vr: 'irregular ru verb, plain form ends with -ri',
  vs: 'noun or participle which takes the aux. verb suru', 'vs-c': 'su verb - precursor to the modern suru',
  'vs-i': 'suru verb - included', 'vs-s': 'suru verb - special class', vt: 'transitive verb',
  vz: 'Ichidan verb - zuru verb (alternative form of -jiru verbs)',
  // Ghi chú cách dùng
  abbr: 'abbreviation', arch: 'archaism', chn: "children's language", col: 'colloquialism', dated: 'dated term',
  derog: 'derogatory', fam: 'familiar language', fem: 'female term or language', form: 'literary or formal term',
  hist: 'historical term', hon: 'honorific or respectful (sonkeigo) language', hum: 'humble (kenjougo) language',
  id: 'idiomatic expression', joc: 'jocular, humorous term', 'm-sl': 'manga slang', male: 'male term or language',
  'net-sl': 'Internet slang', obs: 'obsolete term', obsc: 'obscure term', 'on-mim': 'onomatopoeic or mimetic word',
  person: 'full name of a particular person', place: 'place name', poet: 'poetical term', pol: 'polite (teineigo) language',
  proverb: 'proverb', quote: 'quotation', rare: 'rare', sens: 'sensitive', sl: 'slang', uk: 'word usually written using kana alone',
  vulg: 'vulgar expression or word', work: 'work of art, literature, music, etc. name', yoji: 'yojijukugo',
  // Ghi chú chữ viết / cách đọc
  ateji: 'ateji (phonetic) reading', io: 'irregular okurigana usage', ik: 'word containing irregular kana usage',
  iK: 'word containing irregular kanji usage', oK: 'word containing out-dated kanji', ok: 'out-dated or obsolete kana usage',
  gikun: 'gikun (meaning as reading) or jukujikun (special kanji reading)',
  // Lĩnh vực
  Buddh: 'Buddhism', Christn: 'Christianity', Shinto: 'Shinto', anat: 'anatomy', archeol: 'archeology',
  archit: 'architecture, building', art: 'art, aesthetics', astron: 'astronomy', audvid: 'audio-visual', aviat: 'aviation',
  baseb: 'baseball', biochem: 'biochemistry', biol: 'biology', bot: 'botany', bus: 'business', chem: 'chemistry',
  comp: 'computing', cryst: 'crystallography', ecol: 'ecology', econ: 'economics', elec: 'electricity, elec. eng.',
  electr: 'electronics', engr: 'engineering', ent: 'entomology', finc: 'finance', food: 'food, cooking', genet: 'genetics',
  geol: 'geology', geom: 'geometry', gramm: 'grammar', hanaf: 'hanafuda', horse: 'horse-racing', law: 'law',
  ling: 'linguistics', logic: 'logic', mahj: 'mahjong', MA: 'martial arts', math: 'mathematics',
  mech: 'mechanical engineering', med: 'medicine', mil: 'military', music: 'music', ornith: 'ornithology',
  pharm: 'pharmacy', phil: 'philosophy', photo: 'photography', physics: 'physics', physiol: 'physiology',
  print: 'printing', psy: 'psychology, psychiatry', shogi: 'shogi', sports: 'sports', stat: 'statistics', sumo: 'sumo',
  telec: 'telecommunications', tradem: 'trademark', vidg: 'video game', zool: 'zoology',
  // Phương ngữ
  hob: 'Hokkaido-ben', ksb: 'Kansai-ben', ktb: 'Kantou-ben', kyb: 'Kyoto-ben', kyu: 'Kyuushuu-ben', nab: 'Nagano-ben',
  osb: 'Osaka-ben', rkb: 'Ryuukyuu-ben', tsb: 'Tosa-ben', thb: 'Touhoku-ben', tsug: 'Tsugaru-ben',
}
const DESC_TO_CODE = new Map(Object.entries(CODE_DESCRIPTIONS).map(([c, d]) => [d, c]))
/** Mô tả → mã. Động từ cổ (Nidan/Yodan) gom về v2/v4. Không biết thì giữ nguyên chữ. */
function toCode(desc) {
  if (DESC_TO_CODE.has(desc)) return DESC_TO_CODE.get(desc)
  if (/^Nidan verb/.test(desc)) return 'v2'
  if (/^Yodan verb/.test(desc)) return 'v4'
  return desc
}
/** Mã trong XML gốc: v2a-s, v4k... cũng gom về v2/v4 cho gọn. */
const normCode = (c) => (/^v2/.test(c) ? 'v2' : /^v4/.test(c) ? 'v4' : c)

// Ưu tiên của JMdict: nhóm "thông dụng" giống Jisho.org (news1, ichi1, spec1/2, gai1)
const COMMON_PRI = new Set(['news1', 'ichi1', 'spec1', 'spec2', 'gai1'])

// ---------------------------------------------------------------------------
// 3. Đọc JMdict → danh sách mục chuẩn hóa
//    Mục chuẩn: { id, k:[{t,pri[],inf[]}], r:[{t,pri[],inf[],restr[],nokanji}], s:[...] }
// ---------------------------------------------------------------------------
const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const tagAll = (block, tag) => {
  const out = []
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g')
  let m
  while ((m = re.exec(block))) out.push(m[1])
  return out
}
const entityAll = (block, tag) => tagAll(block, tag).map((v) => normCode(v.trim().replace(/^&|;$/g, '')))

function readJmdictXml(xml) {
  const entries = []
  const re = /<entry>([\s\S]*?)<\/entry>/g
  let m
  while ((m = re.exec(xml))) {
    const e = m[1]
    const id = tagAll(e, 'ent_seq')[0].trim()
    const k = tagAll(e, 'k_ele').map((b) => ({
      t: decodeXml(tagAll(b, 'keb')[0]), pri: tagAll(b, 'ke_pri'), inf: entityAll(b, 'ke_inf'),
    }))
    const r = tagAll(e, 'r_ele').map((b) => ({
      t: decodeXml(tagAll(b, 'reb')[0]), pri: tagAll(b, 're_pri'), inf: entityAll(b, 're_inf'),
      restr: tagAll(b, 're_restr').map(decodeXml), nokanji: /<re_nokanji\s*\/?>/.test(b),
    }))
    // Chỉ lấy nghĩa tiếng Anh (gloss không có xml:lang hoặc xml:lang="eng")
    const s = tagAll(e, 'sense').map((b) => ({
      pos: entityAll(b, 'pos'), misc: entityAll(b, 'misc'), field: entityAll(b, 'field'), dial: entityAll(b, 'dial'),
      gloss: [...b.matchAll(/<gloss(\s[^>]*)?>([\s\S]*?)<\/gloss>/g)]
        .filter((g) => !g[1] || !/xml:lang="(?!eng)/.test(g[1])).map((g) => decodeXml(g[2])),
      xref: tagAll(b, 'xref').map(decodeXml), info: tagAll(b, 's_inf').map(decodeXml),
      stagk: tagAll(b, 'stagk').map(decodeXml), stagr: tagAll(b, 'stagr').map(decodeXml),
    }))
    entries.push({ id, k, r, s })
  }
  return entries
}

async function openSqlite(file) {
  const { DatabaseSync } = await import('node:sqlite')
  return new DatabaseSync(file, { readOnly: true })
}

/** Đọc JMdict từ jamdict.db (SQLite). Gom bảng con một lần cho nhanh. */
async function readJmdictJamdict(file) {
  const db = await openSqlite(file)
  const group = (sql, keyCol = 'k', valCol = 'v') => {
    const m = new Map()
    for (const row of db.prepare(sql).all()) {
      const key = row[keyCol]
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(row[valCol])
    }
    return m
  }
  const kanji = group('SELECT idseq AS k, ID AS id, text FROM Kanji ORDER BY ID', 'k', 'id')
  const kanjiText = new Map(db.prepare('SELECT ID, text FROM Kanji').all().map((r) => [r.ID, r.text]))
  const kana = group('SELECT idseq AS k, ID AS v FROM Kana ORDER BY ID')
  const kanaRow = new Map(db.prepare('SELECT ID, text, nokanji FROM Kana').all().map((r) => [r.ID, r]))
  const kjp = group('SELECT kid AS k, text AS v FROM KJP'), kji = group('SELECT kid AS k, text AS v FROM KJI')
  const knp = group('SELECT kid AS k, text AS v FROM KNP'), kni = group('SELECT kid AS k, text AS v FROM KNI')
  const knr = group('SELECT kid AS k, text AS v FROM KNR')
  const senses = group('SELECT idseq AS k, ID AS v FROM Sense ORDER BY ID')
  const sub = (t) => group(`SELECT sid AS k, text AS v FROM ${t} ORDER BY rowid`)
  const pos = sub('pos'), misc = sub('misc'), field = sub('field'), dial = sub('dialect'), xref = sub('xref')
  const info = sub('SenseInfo'), stagk = sub('stagk'), stagr = sub('stagr')
  const gloss = group("SELECT sid AS k, text AS v FROM SenseGloss WHERE lang = 'eng' OR lang = '' ORDER BY rowid")
  const g = (m, k) => m.get(k) ?? []

  const entries = []
  for (const { idseq } of db.prepare('SELECT idseq FROM Entry ORDER BY idseq').all()) {
    entries.push({
      id: String(idseq),
      k: g(kanji, idseq).map((kid) => ({ t: kanjiText.get(kid), pri: g(kjp, kid), inf: g(kji, kid).map(toCode) })),
      r: g(kana, idseq).map((rid) => ({
        t: kanaRow.get(rid).text, pri: g(knp, rid), inf: g(kni, rid).map(toCode),
        restr: g(knr, rid), nokanji: !!kanaRow.get(rid).nokanji,
      })),
      s: g(senses, idseq).map((sid) => ({
        pos: g(pos, sid).map(toCode), misc: g(misc, sid).map(toCode), field: g(field, sid).map(toCode),
        dial: g(dial, sid).map(toCode), gloss: g(gloss, sid), xref: g(xref, sid), info: g(info, sid),
        stagk: g(stagk, sid), stagr: g(stagr, sid),
      })),
    })
  }
  db.close()
  return entries
}

// ---------------------------------------------------------------------------
// 4. Dữ liệu bổ sung: pitch accent, tần suất, JLPT
// ---------------------------------------------------------------------------
const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

/** accents.txt: "từ<TAB>cách đọc<TAB>2" hoặc "0,2". Từ chỉ có kana thì cột 2 bỏ trống. */
function readAccents() {
  const map = new Map()
  if (!exists('accents.txt')) return map
  for (const line of readText('accents.txt').split('\n')) {
    const [word, readingRaw, acc] = line.trim().split('\t')
    if (!word || acc == null) continue
    const reading = readingRaw || word
    const nums = acc.split(',').map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x) && x >= 0)
    if (nums.length) map.set(`${word}\t${reading}`, nums)
  }
  return map
}

/** wikipedia_freq.txt: xếp theo tần suất giảm dần → thứ hạng = số dòng. */
function readFrequency() {
  const map = new Map()
  if (!exists('wikipedia_freq.txt')) return map
  let rank = 0
  for (const line of readText('wikipedia_freq.txt').split('\n')) {
    if (!line || line.startsWith('#')) continue
    const word = line.split('\t')[0]
    rank++
    if (word && !map.has(word)) map.set(word, rank)
  }
  return map
}

/** CSV đơn giản có ngoặc kép. */
function parseCsv(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    const cells = []
    let cur = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === ',') { cells.push(cur); cur = '' } else cur += ch
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

/** Danh sách JLPT của Waller: trả về Map "chữ viết\tcách đọc" → cấp N (5 = dễ nhất). */
function readJlptWords() {
  const map = new Map()
  for (const n of [5, 4, 3, 2, 1]) {
    const f = `jlpt/n${n}.csv`
    if (!exists(f)) continue
    for (const [expr, reading] of parseCsv(readText(f)).slice(1)) {
      if (!expr) continue
      // Một dòng có thể ghi nhiều cách viết: "一緒; 一緒に"
      for (const e of expr.split(/[;；、]/).map((x) => x.trim()).filter(Boolean)) {
        const key = `${e}\t${kataToHira(reading || e)}`
        if (!map.has(key)) map.set(key, n) // giữ cấp dễ nhất nếu trùng
      }
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// 5. Chuyển mục JMdict → mục gói (dữ liệu gọn, kiểu WordData trong src/modules/dictionary/types.ts)
// ---------------------------------------------------------------------------
const nfOf = (pri) => {
  const nf = pri.find((p) => /^nf\d+$/.test(p))
  return nf ? parseInt(nf.slice(2), 10) : undefined
}
const stripGloss = (g) => g.toLowerCase().replace(/\([^)]*\)/g, '').replace(/^to /, '').replace(/^(a|an|the) /, '').trim()

function buildWordItems(entries, accents, freq, jlpt) {
  const items = []
  let withJlpt = 0, withPitch = 0
  for (const e of entries) {
    const k = e.k.map((x) => clean({ t: x.t, c: x.pri.some((p) => COMMON_PRI.has(p)) ? 1 : undefined, i: x.inf }))
    const r = e.r.map((x) => {
      // Pitch accent: khớp (chữ viết, cách đọc); từ chỉ có kana thì khớp (kana, kana)
      const writings = x.nokanji ? [] : x.restr.length ? x.restr : e.k.map((kk) => kk.t)
      let a
      for (const w of [...writings, x.t]) {
        a = accents.get(`${w}\t${x.t}`)
        if (a) break
      }
      if (a) withPitch++
      return clean({
        t: x.t, c: x.pri.some((p) => COMMON_PRI.has(p)) ? 1 : undefined, i: x.inf,
        o: x.restr, n: x.nokanji ? 1 : undefined, a,
      })
    })
    const s = e.s.map((x) => clean({
      p: x.pos, g: x.gloss, m: x.misc, f: x.field, d: x.dial, x: x.xref, n: x.info.join('; ') || undefined,
      k: x.stagk, r: x.stagr,
    })).filter((x) => x.g && x.g.length)
    if (!s.length) continue

    const allPri = [...e.k, ...e.r].flatMap((x) => x.pri)
    const common = allPri.some((p) => COMMON_PRI.has(p))
    const nfs = [...e.k, ...e.r].map((x) => nfOf(x.pri)).filter((x) => x != null)
    // Tần suất: thứ hạng tốt nhất trong các cách viết
    let q
    for (const w of [...e.k.map((x) => x.t), ...e.r.map((x) => x.t)]) {
      const rank = freq.get(w)
      if (rank && (!q || rank < q)) q = rank
    }
    // JLPT: khớp (chữ viết, cách đọc) bất kỳ; từ không có kanji khớp (kana, kana)
    let j
    for (const kk of e.k.length ? e.k : e.r) {
      for (const rr of e.r) {
        const lv = jlpt.get(`${kk.t}\t${kataToHira(rr.t)}`)
        if (lv && (!j || lv > j)) j = lv
      }
    }
    if (j) withJlpt++

    // Khóa tra cứu: mọi cách viết + mọi cách đọc. Từ thông dụng/JLPT có thêm khóa tiếng Anh "en:..."
    const keys = new Set([...e.k.map((x) => x.t), ...e.r.map((x) => x.t)])
    if (common || j) {
      for (const sense of s.slice(0, 2)) {
        for (const gl of sense.g.slice(0, 3)) {
          const w = stripGloss(gl)
          if (w && w.length <= 40) keys.add('en:' + w)
        }
      }
    }
    items.push({
      id: e.id, kind: 'word', keys: [...keys],
      data: clean({ k: k.length ? k : undefined, r, s, c: common ? 1 : undefined, nf: nfs.length ? Math.min(...nfs) : undefined, q, j }),
    })
  }
  log(`Từ vựng: ${items.length} mục, ${withPitch} cách đọc có pitch accent, ${withJlpt} từ có cấp JLPT`)
  return items
}

/** Bỏ trường rỗng để file nhỏ hơn. */
function clean(o) {
  for (const key of Object.keys(o)) {
    const v = o[key]
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) delete o[key]
  }
  return o
}

// ---------------------------------------------------------------------------
// 6. KANJIDIC2
//    Mục chuẩn: { c: chữ, s: số nét, g: lớp, f: tần suất, jo: JLPT cũ, j: JLPT mới, on[], kun[], na[], m[], hv[], rad }
// ---------------------------------------------------------------------------
function readKanjidicXml(xml) {
  const out = []
  for (const m of xml.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
    const b = m[1]
    const readings = [...b.matchAll(/<reading r_type="([^"]+)"[^>]*>([^<]*)<\/reading>/g)]
    const rt = (t) => readings.filter((x) => x[1] === t).map((x) => x[2])
    const num = (tag) => { const v = tagAll(b, tag)[0]; return v ? parseInt(v, 10) : undefined }
    out.push({
      c: tagAll(b, 'literal')[0], s: num('stroke_count'), g: num('grade'), f: num('freq'), jo: num('jlpt'),
      on: rt('ja_on'), kun: rt('ja_kun'), hv: rt('vietnam'), na: tagAll(b, 'nanori'),
      m: [...b.matchAll(/<meaning>([^<]*)<\/meaning>/g)].map((x) => decodeXml(x[1])),
      rad: (b.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/) || [])[1],
    })
  }
  return out
}

async function readKanjidicJamdict(file) {
  const db = await openSqlite(file)
  const byCid = (sql) => {
    const m = new Map()
    for (const r of db.prepare(sql).all()) {
      if (!m.has(r.cid)) m.set(r.cid, [])
      m.get(r.cid).push(r)
    }
    return m
  }
  const readings = byCid('SELECT g.cid AS cid, r.r_type AS t, r.value AS v FROM reading r JOIN rm_group g ON r.gid = g.ID ORDER BY r.rowid')
  const meanings = byCid("SELECT g.cid AS cid, m.value AS v FROM meaning m JOIN rm_group g ON m.gid = g.ID WHERE m.m_lang = '' ORDER BY m.rowid")
  const nanori = byCid('SELECT cid, value AS v FROM nanori ORDER BY rowid')
  const radical = byCid("SELECT cid, value AS v FROM radical WHERE rad_type = 'classical'")
  const out = []
  for (const c of db.prepare('SELECT * FROM character ORDER BY ID').all()) {
    const rd = readings.get(c.ID) ?? []
    const rt = (t) => rd.filter((x) => x.t === t).map((x) => x.v)
    const int = (v) => (v ? parseInt(v, 10) : undefined)
    out.push({
      c: c.literal, s: c.stroke_count ?? undefined, g: int(c.grade), f: int(c.freq), jo: int(c.jlpt),
      on: rt('ja_on'), kun: rt('ja_kun'), hv: rt('vietnam'), na: (nanori.get(c.ID) ?? []).map((x) => x.v),
      m: (meanings.get(c.ID) ?? []).map((x) => x.v), rad: (radical.get(c.ID) ?? [])[0]?.v,
    })
  }
  db.close()
  return out
}

function buildKanjiItems(chars) {
  // JLPT mới (N5–N1) cho Kanji, dữ liệu của Waller qua kanji-data (chỉ lấy trường jlpt_new)
  let newJlpt = {}
  if (exists('kanji.json')) {
    const kd = JSON.parse(readText('kanji.json'))
    for (const [ch, v] of Object.entries(kd)) if (v && v.jlpt_new) newJlpt[ch] = v.jlpt_new
  }
  const items = chars.map((x) => ({
    id: x.c, kind: 'kanji', keys: [x.c],
    data: clean({
      s: x.s, g: x.g, f: x.f, j: newJlpt[x.c], jo: x.jo, on: x.on, kun: x.kun, na: x.na, m: x.m,
      hv: x.hv.map((h) => h.charAt(0).toUpperCase() + h.slice(1).toLowerCase()),
      rad: x.rad ? parseInt(x.rad, 10) : undefined,
    }),
  }))
  log(`Kanji: ${items.length} chữ, ${items.filter((i) => i.data.hv).length} chữ có âm Hán Việt`)
  return items
}

// ---------------------------------------------------------------------------
// 7. Ghi gói + bản vá + manifest
// ---------------------------------------------------------------------------
/**
 * Đuôi file gói: nội dung vẫn là JSON nén gzip (app tự nhận ra qua 2 byte đầu),
 * nhưng KHÔNG đặt đuôi .json.gz: nhiều máy chủ (kể cả `vite preview`) thấy .gz sẽ gửi kèm
 * "Content-Encoding: gzip", trình duyệt tự giải nén → mã kiểm tra sha256 không khớp → báo "file hỏng".
 */
const EXT = '.pack'
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const gz = (obj) => zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 })

function writePack(manifest, { id, title, description, license, items }) {
  const old = manifest.packs.find((p) => p.id === id)
  const oldFile = old && path.join(OUT, path.basename(old.full.url))
  let oldPack = null
  if (oldFile && fs.existsSync(oldFile)) oldPack = JSON.parse(zlib.gunzipSync(fs.readFileSync(oldFile)).toString('utf8'))

  // Nội dung không đổi → giữ nguyên phiên bản
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

  // Bản vá từ phiên bản trước (chỉ giữ 1 bản vá gần nhất để thư mục gọn)
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
  // Xóa file cũ không còn dùng
  for (const p of old?.patches ?? []) fs.rmSync(path.join(OUT, path.basename(p.url)), { force: true })
  if (oldFile && path.basename(oldFile) !== fullName) fs.rmSync(oldFile, { force: true })
  if (!entry.patches.length) delete entry.patches

  manifest.packs = [...manifest.packs.filter((p) => p.id !== id), entry]
  log(`${id}: phiên bản ${version}, ${(fullBuf.length / 1048576).toFixed(1)} MB → ${fullName}`)
}

async function main() {
  if (flag('--download')) await download()
  fs.mkdirSync(OUT, { recursive: true })
  const manifestPath = path.join(OUT, 'manifest.json')
  // Đọc lại manifest ngay trước khi ghi: module khác có thể có gói riêng trong đó
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { format: 1, packs: [] }

  let entries = null
  if (exists('JMdict_e.gz') || exists('JMdict_e.xml')) {
    log('Đọc JMdict (XML gốc)…')
    entries = readJmdictXml(readText(exists('JMdict_e.gz') ? 'JMdict_e.gz' : 'JMdict_e.xml'))
  } else if (exists('jamdict.db')) {
    log('Đọc JMdict (jamdict.db)…')
    entries = await readJmdictJamdict(path.join(SRC, 'jamdict.db'))
  }
  let chars = null
  if (exists('kanjidic2.xml.gz') || exists('kanjidic2.xml')) {
    log('Đọc KANJIDIC2 (XML gốc)…')
    chars = readKanjidicXml(readText(exists('kanjidic2.xml.gz') ? 'kanjidic2.xml.gz' : 'kanjidic2.xml'))
  } else if (exists('jamdict.db')) {
    log('Đọc KANJIDIC2 (jamdict.db)…')
    chars = await readKanjidicJamdict(path.join(SRC, 'jamdict.db'))
  }
  if (!entries && !chars) {
    console.error(`Không tìm thấy dữ liệu gốc trong ${SRC}. Chạy lại với --download hoặc --src <thư mục>.`)
    process.exit(1)
  }

  if (entries) {
    const items = buildWordItems(entries, readAccents(), readFrequency(), readJlptWords())
    writePack(manifest, {
      id: 'jmdict-en', title: 'Từ điển từ vựng (JMdict)',
      description: 'Khoảng 190.000 từ, nghĩa tiếng Anh, kèm pitch accent, cấp JLPT và độ thông dụng',
      license: 'JMdict © EDRDG, CC BY-SA 4.0 · Pitch accent & tần suất: Kanjium (CC BY-SA 4.0) · JLPT: Jonathan Waller (CC BY)',
      items,
    })
  }
  if (chars) {
    writePack(manifest, {
      id: 'kanjidic', title: 'Từ điển Kanji (KANJIDIC2)',
      description: 'Hơn 13.000 Kanji: âm On/Kun, âm Hán Việt, số nét, nghĩa, cấp JLPT',
      license: 'KANJIDIC2 © EDRDG, CC BY-SA 4.0 · JLPT: Jonathan Waller (CC BY)',
      items: buildKanjiItems(chars),
    })
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  log('Đã cập nhật', path.relative(ROOT, manifestPath))
}

main().catch((e) => { console.error(e); process.exit(1) })
