/**
 * CÁCH ĐỌC SỐ, GIỜ, NGÀY THÁNG bằng hiragana, và tạo câu hỏi ngẫu nhiên.
 * App tự viết cách đọc (không đưa chữ số cho giọng máy đoán) nên giọng đọc luôn đúng
 * các chỗ biến âm: さんびゃく, ろっぴゃく, はっせん, いっぷん, よじ, ついたち, はつか...
 */

const DIGIT = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']

/** 1–9999: một nhóm 4 chữ số. big = đứng trước 万/億 (1000万 đọc là いっせんまん). */
function under10000(n: number, big = false): string {
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), t = Math.floor((n % 100) / 10), o = n % 10
  let s = ''
  if (th) s += th === 1 ? (big ? 'いっせん' : 'せん') : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : DIGIT[th] + 'せん'
  if (h) s += h === 1 ? 'ひゃく' : h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : DIGIT[h] + 'ひゃく'
  if (t) s += t === 1 ? 'じゅう' : DIGIT[t] + 'じゅう'
  if (o) s += DIGIT[o]
  return s
}

/** Đọc một số nguyên 0 → 9999億. Ví dụ 3600 → さんぜんろっぴゃく, 12000 → いちまんにせん. */
export function readNumber(n: number): string {
  if (n === 0) return 'ゼロ'
  const oku = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4), rest = n % 1e4
  let s = ''
  if (oku) s += (oku === 1 ? 'いち' : under10000(oku, true)) + 'おく'
  if (man) s += (man === 1 ? 'いち' : under10000(man, true)) + 'まん'
  if (rest) s += under10000(rest)
  return s
}

/** Số viết có dấu phân cách cho dễ đọc: 12,000 */
export const fmt = (n: number) => n.toLocaleString('en-US')

// ---------- Đơn vị đếm (trợ số từ) 1–10 ----------

export interface Counter { id: string; kanji: string; vi: string; read: (n: number) => string }

const regular = (suffix: string, special: Record<number, string> = {}) => (n: number) => special[n] ?? readNumber(n) + suffix

export const COUNTERS: Counter[] = [
  { id: 'tsu', kanji: 'つ', vi: 'cái (đồ vật chung)', read: (n) => ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお'][n] },
  { id: 'nin', kanji: '人', vi: 'người', read: regular('にん', { 1: 'ひとり', 2: 'ふたり', 4: 'よにん', 7: 'しちにん', 9: 'きゅうにん' }) },
  { id: 'hon', kanji: '本', vi: 'vật dài (bút, chai)', read: regular('ほん', { 1: 'いっぽん', 3: 'さんぼん', 6: 'ろっぽん', 8: 'はっぽん', 10: 'じゅっぽん' }) },
  { id: 'hiki', kanji: '匹', vi: 'con vật nhỏ', read: regular('ひき', { 1: 'いっぴき', 3: 'さんびき', 6: 'ろっぴき', 8: 'はっぴき', 10: 'じゅっぴき' }) },
  { id: 'hai', kanji: '杯', vi: 'cốc, chén', read: regular('はい', { 1: 'いっぱい', 3: 'さんばい', 6: 'ろっぱい', 8: 'はっぱい', 10: 'じゅっぱい' }) },
  { id: 'ko', kanji: '個', vi: 'cái (vật nhỏ, tròn)', read: regular('こ', { 1: 'いっこ', 6: 'ろっこ', 8: 'はっこ', 10: 'じゅっこ' }) },
  { id: 'mai', kanji: '枚', vi: 'tờ, vật mỏng', read: regular('まい') },
  { id: 'kai', kanji: '回', vi: 'lần', read: regular('かい', { 1: 'いっかい', 6: 'ろっかい', 8: 'はっかい', 10: 'じゅっかい' }) },
  { id: 'dai', kanji: '台', vi: 'máy, xe', read: regular('だい') },
  { id: 'sai', kanji: '歳', vi: 'tuổi', read: regular('さい', { 1: 'いっさい', 8: 'はっさい', 10: 'じゅっさい' }) },
]

// ---------- Giờ ----------

const HOUR: Record<number, string> = { 4: 'よじ', 7: 'しちじ', 9: 'くじ' }
export const readHour = (h: number) => HOUR[h] ?? readNumber(h) + 'じ'

const MIN_ONE = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん']

/** 1–59 phút: 1 いっぷん, 10 じゅっぷん, 15 じゅうごふん, 20 にじゅっぷん, 41 よんじゅういっぷん. */
export function readMinute(m: number): string {
  const t = Math.floor(m / 10), o = m % 10
  if (o === 0) return (t === 1 ? '' : DIGIT[t]) + 'じゅっぷん' // 10, 20, 30…: じゅう → じゅっぷん
  return (t === 0 ? '' : t === 1 ? 'じゅう' : DIGIT[t] + 'じゅう') + MIN_ONE[o]
}

// ---------- Ngày tháng ----------

const MONTH: Record<number, string> = { 4: 'しがつ', 7: 'しちがつ', 9: 'くがつ' }
export const readMonth = (m: number) => MONTH[m] ?? readNumber(m) + 'がつ'

const DAY_SPECIAL: Record<number, string> = {
  1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか',
  14: 'じゅうよっか', 17: 'じゅうしちにち', 19: 'じゅうくにち', 20: 'はつか', 24: 'にじゅうよっか', 27: 'にじゅうしちにち', 29: 'にじゅうくにち',
}
export const readDay = (d: number) => DAY_SPECIAL[d] ?? readNumber(d) + 'にち'

export const WEEKDAYS = [
  { kanji: '日曜日', read: 'にちようび', vi: 'Chủ nhật' },
  { kanji: '月曜日', read: 'げつようび', vi: 'Thứ hai' },
  { kanji: '火曜日', read: 'かようび', vi: 'Thứ ba' },
  { kanji: '水曜日', read: 'すいようび', vi: 'Thứ tư' },
  { kanji: '木曜日', read: 'もくようび', vi: 'Thứ năm' },
  { kanji: '金曜日', read: 'きんようび', vi: 'Thứ sáu' },
  { kanji: '土曜日', read: 'どようび', vi: 'Thứ bảy' },
]

// ---------- Câu hỏi ----------

/**
 * Một câu hỏi nghe: `say` là chữ đưa cho giọng máy đọc (hiragana), `shown` là đáp án hiện sau khi chấm.
 * `check(text, choice)` chấm câu trả lời (ô gõ + nút chọn nếu có).
 */
export interface DrillQ {
  key: string
  say: string
  shown: string
  /** Cách viết bằng chữ Nhật để hiện sau khi chấm, ví dụ 3本, 午後7時15分. */
  jp: string
  choices?: string[]
  check: (text: string, choice?: string) => boolean
}

/** Đổi số và dấu toàn khổ (gõ bằng bộ gõ tiếng Nhật) sang chữ thường: ７：１５ → 7:15 */
export const normalizeInput = (s: string) =>
  s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[：時]/g, ':').replace(/[／月]/g, '/').replace(/[，,、 　円¥分日]/g, '').trim()

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1])
const asInt = (s: string) => (/^\d+$/.test(s) ? Number(s) : NaN)

export type NumberLevel = 'small' | 'medium' | 'large' | 'price' | 'counter'

export function numberQuestion(level: NumberLevel): DrillQ {
  if (level === 'counter') {
    const c = pick(COUNTERS)
    const n = rnd(1, 10)
    const others = shuffle(COUNTERS.filter((x) => x.id !== c.id)).slice(0, 3)
    const choices = shuffle([c, ...others]).map((x) => x.kanji)
    return {
      key: `c${c.id}${n}`, say: c.read(n), shown: `${n} ${c.kanji} (${c.vi})`, jp: `${n}${c.kanji}`, choices,
      check: (t, ch) => asInt(normalizeInput(t)) === n && ch === c.kanji,
    }
  }
  let n: number
  if (level === 'small') n = rnd(0, 99)
  else if (level === 'medium') n = Math.random() < 0.5 ? rnd(100, 999) : rnd(1000, 9999)
  else if (level === 'large') n = Math.random() < 0.6 ? rnd(1, 99) * 1000 + rnd(0, 9) * 100 : rnd(1, 9) * 1e8 + rnd(0, 9999) * 1e4
  else n = pick([rnd(1, 99) * 10, rnd(1, 99) * 100, rnd(10, 999) * 100, rnd(1, 30) * 1000 + pick([0, 500, 800])])
  const yen = level === 'price'
  return {
    key: `n${n}`, say: readNumber(n) + (yen ? 'えん' : ''), shown: fmt(n) + (yen ? ' 円' : ''), jp: fmt(n) + (yen ? '円' : ''),
    check: (t) => asInt(normalizeInput(t)) === n,
  }
}

/** Đọc giờ:phút. ampm = có 午前/午後 → đáp án theo giờ 24 (午後7時 = 19:00). */
export function timeQuestion(ampm: boolean): DrillQ {
  // Có 午前/午後 thì bỏ 12 giờ (午前12時 dễ gây nhầm giữa 0 giờ và 12 giờ)
  const h12 = rnd(1, ampm ? 11 : 12)
  const m = pick([0, 0, 30, rnd(1, 59), rnd(1, 59), rnd(1, 59), 5 * rnd(1, 11)])
  const pm = ampm && Math.random() < 0.5
  const half = m === 30 && Math.random() < 0.5
  const say = (ampm ? (pm ? 'ごご' : 'ごぜん') : '') + readHour(h12) + (m === 0 ? '' : half ? 'はん' : readMinute(m))
  // Giờ 24: 午前12時 = 0 giờ, 午後12時 = 12 giờ trưa
  const h24 = ampm ? (pm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12) : h12
  const mm = String(m).padStart(2, '0')
  const jp = (ampm ? (pm ? '午後' : '午前') : '') + `${h12}時` + (m === 0 ? '' : half ? '半' : `${m}分`)
  return {
    key: `t${say}`, say, jp, shown: `${h24}:${mm}`,
    check: (t) => {
      const s = normalizeInput(t)
      const mt = s.match(/^(\d{1,2}):?(\d{2})?$/) ?? s.match(/^(\d{1,2})(\d{2})$/)
      if (!mt) return false
      const hh = Number(mt[1]), mi = Number(mt[2] ?? 0)
      if (mi !== m) return false
      // Không có 午前/午後: 7 giờ hay 19 giờ đều đúng
      return ampm ? hh === h24 || (h24 === 0 && hh === 24) : hh % 12 === h12 % 12
    },
  }
}

/** Ngày tháng (năm nay), tùy chọn kèm thứ trong tuần (chọn bằng nút). */
export function dateQuestion(withWeekday: boolean): DrillQ {
  const mo = rnd(1, 12)
  // Ưu tiên ngày có cách đọc đặc biệt (1–10, 14, 20, 24) vì đó là chỗ hay sai
  const special = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24]
  const maxDay = new Date(new Date().getFullYear(), mo, 0).getDate()
  const d = Math.random() < 0.6 ? pick(special) : rnd(1, maxDay)
  const wd = withWeekday ? rnd(0, 6) : -1
  const w = WEEKDAYS[wd]
  return {
    key: `d${mo}-${d}-${wd}`,
    say: readMonth(mo) + readDay(d) + (w ? '、' + w.read : ''),
    jp: `${mo}月${d}日` + (w ? `（${w.kanji[0]}）` : ''),
    shown: `${mo}/${d}` + (w ? ` · ${w.vi}` : ''),
    choices: withWeekday ? WEEKDAYS.map((x) => x.kanji) : undefined,
    check: (t, ch) => {
      // Nhập "tháng/ngày" theo kiểu Nhật: 5/20 = ngày 20 tháng 5
      const mt = normalizeInput(t).match(/^(\d{1,2})\/(\d{1,2})$/)
      if (!mt || Number(mt[1]) !== mo || Number(mt[2]) !== d) return false
      return !w || ch === w.kanji
    },
  }
}
