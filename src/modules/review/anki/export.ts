/**
 * XUẤT THẺ RA GÓI ANKI (.apkg)
 * ----------------------------
 * Tạo file .apkg kiểu "collection.anki2" (schema 11). Đây là kiểu mọi phiên bản Anki
 * (máy tính, AnkiDroid, AnkiMobile) đều nhập được.
 *
 * Mỗi thẻ của app thành một ghi chú loại "Hibi Nihongo" với các trường
 * Front / Reading / Meaning / Example / ExampleMeaning / Notes / Image / Kind.
 * Nhập lại file này vào app thì mọi ô khớp đúng như cũ.
 */
import { zipSync, strToU8 } from 'fflate'
import { DAY } from '../fsrs'
import { CardState, type SrsCard, type SrsLog } from '../types'
import { getSql } from './sqlite'
import { difficultyToFactor, HIBI_FIELDS, HIBI_NOTE_TYPE } from './convert'

export interface ExportOptions {
  includeProgress: boolean
  includeImages: boolean
}

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null,
  dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null,
  dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null,
  tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null,
  usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null,
  factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null,
  lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`

const CSS = `.card { font-family: "Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif; font-size: 22px; text-align: center; color: black; background: white; }
.front { font-size: 48px; }
.reading { color: #888; font-size: 20px; }
.example { font-size: 20px; margin-top: 12px; }
.example u { color: #a86f0c; text-decoration: none; font-weight: bold; }
.small { color: #888; font-size: 16px; }
img { max-width: 100%; max-height: 320px; }`

const QFMT = '<div class="front">{{Front}}</div>'
const AFMT = `{{FrontSide}}
<hr id="answer">
{{#Reading}}<div class="reading">{{Reading}}</div>{{/Reading}}
<div class="meaning">{{Meaning}}</div>
{{#Image}}<div>{{Image}}</div>{{/Image}}
{{#Example}}<div class="example">{{Example}}</div>{{/Example}}
{{#ExampleMeaning}}<div class="small">{{ExampleMeaning}}</div>{{/ExampleMeaning}}
{{#Notes}}<div class="small">{{Notes}}</div>{{/Notes}}`

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

/** Mã kiểm tra của Anki: 8 chữ số hex đầu của SHA-1 trường sắp xếp. */
async function checksum(s: string): Promise<number> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)))
  return ((hash[0] << 24) | (hash[1] << 16) | (hash[2] << 8) | hash[3]) >>> 0
}

function dataUrlToBytes(url: string): { bytes: Uint8Array; ext: string } | null {
  const m = url.match(/^data:image\/([a-z0-9.+-]+);base64,(.*)$/i)
  if (!m) return null
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, ext: m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase().replace('svg+xml', 'svg') }
}

/** Mã guid ngẫu nhiên kiểu Anki (10 ký tự). */
function guidFrom(id: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < id.length; i++) {
    h1 = Math.imul(h1 ^ id.charCodeAt(i), 16777619)
    h2 = Math.imul(h2 ^ id.charCodeAt(i), 2246822519)
  }
  return `hibi${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`.slice(0, 16)
}

export async function exportApkg(cards: SrsCard[], logs: SrsLog[], opts: ExportOptions): Promise<Blob> {
  const SQL = await getSql()
  const db = new SQL.Database()
  db.exec(SCHEMA)
  const now = Date.now()
  const nowSec = Math.floor(now / 1000)

  // Mốc ngày 0 của bộ sưu tập: nửa đêm trước thẻ cũ nhất (ngày đến hạn được đếm từ đây)
  const first = Math.min(now, ...cards.map((c) => Math.min(c.createdAt, c.due, c.lastReview ?? now)))
  const crtDate = new Date(first)
  crtDate.setHours(0, 0, 0, 0)
  const crtMs = crtDate.getTime() - DAY
  const dayNo = (ms: number) => Math.max(0, Math.floor((ms - crtMs) / DAY))

  // Bộ thẻ: mỗi tên bộ một id. Bộ id 1 "Default" bắt buộc phải có.
  const deckIds = new Map<string, number>()
  const deckJson: Record<string, unknown> = { 1: deckObj(1, 'Default', nowSec) }
  ;[...new Set(cards.map((c) => c.deck))].forEach((name, i) => {
    const id = now + i + 1
    deckIds.set(name, id)
    deckJson[id] = deckObj(id, name, nowSec)
  })

  const modelId = 1730000000000 // id cố định: xuất nhiều lần, Anki nhận ra cùng một loại ghi chú
  const model = {
    id: modelId, name: HIBI_NOTE_TYPE, type: 0, mod: nowSec, usn: -1, sortf: 0, did: 1,
    tmpls: [{ name: 'Nhận diện', ord: 0, qfmt: QFMT, afmt: AFMT, did: null, bqfmt: '', bafmt: '' }],
    flds: HIBI_FIELDS.map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] })),
    css: CSS, latexPre: '', latexPost: '', latexsvg: false, req: [[0, 'any', [0]]], tags: [], vers: [],
  }
  const conf = {
    activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true,
    curModel: modelId, nextPos: cards.length + 1, sortType: 'noteFld', sortBackwards: false, addToCur: true,
  }
  db.run('INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)', [
    Math.floor(crtMs / 1000), now, now, JSON.stringify(conf), JSON.stringify({ [modelId]: model }),
    JSON.stringify(deckJson), JSON.stringify({ 1: DECK_CONF }), '{}',
  ])

  const media: Record<string, string> = {}
  const files: Record<string, Uint8Array> = {}
  const cardIds = new Map<string, number>()
  const insNote = db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, \'\')')
  const insCard = db.prepare('INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)')
  db.exec('BEGIN')
  let pos = 0
  for (const [i, c] of cards.entries()) {
    const id = now + i // id của ghi chú và thẻ là mốc thời gian (ms), phải khác nhau
    cardIds.set(c.id, id)
    let imageHtml = ''
    if (opts.includeImages && c.image) {
      const img = dataUrlToBytes(c.image)
      if (img) {
        const n = String(Object.keys(files).length)
        const name = `hibi-${c.id.slice(0, 12)}.${img.ext}`
        files[n] = img.bytes
        media[n] = name
        imageHtml = `<img src="${name}">`
      }
    }
    const example = c.example ? esc(c.example).replace(/\{\{(.+?)\}\}/g, '<u>$1</u>') : ''
    const fields = [esc(c.front), esc(c.reading), esc(c.meaning), example, esc(c.exampleMeaning), esc(c.notes), imageHtml, c.kind]
    const tags = (c.tags ?? []).map((t) => t.replace(/\s+/g, '_')).filter((t) => t !== 'anki')
    const guid = c.source?.module === 'anki' ? c.source.ref : guidFrom(c.id)
    insNote.run([id, guid, modelId, nowSec, tags.length ? ` ${tags.join(' ')} ` : '', fields.join('\x1f'), c.front, await checksum(c.front)])

    // Lịch ôn theo kiểu Anki
    let type = 0, queue = 0, due = ++pos, ivl = 0, factor = 0, left = 0, data = '{}'
    const progress = opts.includeProgress && c.state !== CardState.New
    if (progress) {
      ivl = Math.max(1, Math.round(c.lastReview ? (c.due - c.lastReview) / DAY : c.stability))
      factor = difficultyToFactor(c.difficulty)
      data = JSON.stringify({ s: Math.max(0.01, +c.stability.toFixed(4)), d: Math.min(10, Math.max(1, +c.difficulty.toFixed(4))) })
      if (c.state === CardState.Review) { type = 2; queue = 2; due = dayNo(c.due) }
      else { type = c.state === CardState.Relearning ? 3 : 1; queue = 1; due = Math.floor(c.due / 1000); left = 1001 }
    }
    if (c.suspended) queue = -1
    insCard.run([id, id, deckIds.get(c.deck)!, nowSec, type, queue, due, ivl, factor,
      progress ? c.reps : 0, progress ? c.lapses : 0, left, data])
  }
  insNote.free()
  insCard.free()

  // Lịch sử ôn (để thống kê trong Anki đúng như trong app)
  if (opts.includeProgress) {
    const insLog = db.prepare('INSERT INTO revlog VALUES (?, ?, -1, ?, ?, ?, ?, ?, ?)')
    const used = new Set<number>()
    for (const l of logs) {
      const cid = cardIds.get(l.cardId)
      if (!cid) continue
      let id = Math.round(l.reviewedAt)
      while (used.has(id)) id++
      used.add(id)
      const ivlOf = (days: number) => (days >= 1 ? Math.round(days) : -Math.round(days * 86400))
      const type = l.stateBefore === CardState.Review ? 1 : l.stateBefore === CardState.Relearning ? 2 : 0
      insLog.run([id, cid, l.rating, ivlOf(l.scheduledDays), ivlOf(l.elapsedDays), 2500, Math.round(l.durationMs), type])
    }
    insLog.free()
  }
  db.exec('COMMIT')

  const bytes = db.export()
  db.close()
  const zip = zipSync({ 'collection.anki2': bytes, media: strToU8(JSON.stringify(media)), ...files }, { level: 6 })
  return new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' })
}

function deckObj(id: number, name: string, mod: number) {
  return {
    id, name, mod, usn: -1, desc: '', dyn: 0, conf: 1, collapsed: false, browserCollapsed: false,
    extendNew: 0, extendRev: 0, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0],
  }
}

/** Cấu hình ôn mặc định của Anki (bắt buộc phải có trong file). */
const DECK_CONF = {
  id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
  new: { bury: false, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20 },
  rev: { bury: false, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
  lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
}
