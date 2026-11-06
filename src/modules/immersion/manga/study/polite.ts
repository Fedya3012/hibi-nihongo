/**
 * ĐỔI CÂU THÂN MẬT SANG CÁCH NÓI LỊCH SỰ (です/ます) — gợi ý tự động để so sánh.
 *
 * Cách làm: (1) thay các từ khẩu ngữ hay gặp (俺 → 私, マジで → 本当に, ～ちゃった → ～てしまった...),
 * (2) đổi đuôi mỗi câu: động từ thể thường → ます, だ → です, ない → ません, tính từ い + です.
 * Chỉ là gợi ý theo quy tắc nên câu phức tạp có thể chưa đúng hẳn; app luôn ghi rõ "gợi ý".
 */
import { tokenize } from '@/modules/dictionary'

/** Bước 1: từ / cụm khẩu ngữ → dạng chuẩn. Thứ tự quan trọng (cụm dài trước). */
const PHRASES: [RegExp, string][] = [
  [/俺様|オレ様/g, '私'], [/俺|オレ/g, '私'], [/あたし|アタシ/g, '私'], [/僕ちゃん/g, '私'],
  [/てめえ|てめぇ|テメェ|貴様|きさま|お前|おまえ|オマエ|あんた/g, 'あなた'],
  [/あいつ/g, 'あの人'], [/こいつ/g, 'この人'], [/そいつ/g, 'その人'],
  [/マジで/g, '本当に'], [/マジ[?？]/g, '本当ですか？'], [/めっちゃ|めちゃくちゃ|めちゃ|むっちゃ/g, 'とても'], [/すっごく|すごく/g, 'とても'],
  [/やっぱ(?!り)/g, 'やはり'], [/やっぱり/g, 'やはり'], [/ってか|てか/g, 'というか'],
  [/すげえ|すげぇ|すげー/g, 'すごい'], [/うるせえ|うるせぇ|うっせ[えぇー]?/g, 'うるさい'], [/いてえ|いてぇ/g, '痛い'],
  [/やべえ|やべぇ|やべー/g, '危ない'], [/うめえ|うめぇ/g, 'おいしい'], [/でけえ|でけぇ/g, '大きい'], [/知らねえ|知らねぇ|知らん/g, '知らない'],
  [/分からん|わからん/g, 'わからない'], [/いらん/g, 'いらない'], [/できん/g, 'できない'],
  [/ちゃった/g, 'てしまった'], [/じゃった/g, 'でしまった'], [/ちゃう/g, 'てしまう'], [/じゃう/g, 'でしまう'],
  [/なきゃ|なくちゃ/g, 'なければならない'], [/ちゃダメ|ちゃだめ|ちゃいけない/g, 'てはいけない'], [/じゃダメ|じゃだめ/g, 'ではいけない'],
  [/っす/g, 'です'], [/じゃん[?？]?/g, 'ではありませんか'], [/じゃない/g, 'ではない'], [/んだ(?=[よね。！!？?]|$)/g, 'のだ'],
  [/てる(?=[よねの。！!？?、]|$)/g, 'ている'], [/てない(?=[よねの。！!？?、]|$)/g, 'ていない'], [/てた(?=[よねの。！!？?、]|$)/g, 'ていた'], [/とく(?=[よね。！!？?]|$)/g, 'ておく'],
  [/あざっす|あざす|あざーす|サンキュー?/g, 'ありがとうございます'], [/おっす|オッス|ちーす|ちわっす/g, 'こんにちは'],
  [/わりい|わりぃ/g, 'すみません'], [/ごめん(?!な)/g, 'すみません'], [/ごめんな/g, 'すみません'],
  [/ふざけんな|ふざけるな/g, 'ふざけないでください'],
]

/** Động từ đuôi る nhưng chia nhóm 1 (godan), dễ nhầm với nhóm 2. */
const GODAN_RU = new Set(['帰る', '入る', '走る', '知る', '切る', '要る', '減る', '喋る', 'しゃべる', '滑る', '握る', '蹴る', '焦る', '限る', '参る', '散る', '照る', '練る', '湿る', '茂る', '遮る', '覆る', '翻る', '嘲る', '罵る', '甦る', '蘇る', 'かえる', 'はいる', 'はしる', 'しる'])
const U_TO_I: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' }

/** Thân ます của động từ thể từ điển: 食べる → 食べ, 行く → 行き, する → し, 来る → 来. */
export function masuStem(base: string): string | null {
  if (base === 'する') return 'し'
  if (base.endsWith('する')) return base.slice(0, -2) + 'し'
  if (base === 'くる' || base === '来る') return base === '来る' ? '来' : 'き'
  if (base === 'いる' || base === 'ある') return base === 'いる' ? 'い' : 'あり'
  const last = base.slice(-1)
  if (!(last in U_TO_I)) return null
  if (last === 'る' && !GODAN_RU.has(base)) {
    const prev = base.slice(-2, -1)
    // Đứng trước る là âm i / e (hoặc là Kanji, ví dụ 見る, 寝る) → nhóm 2
    if (/[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]/.test(prev) || /[一-鿿]/.test(prev)) return base.slice(0, -1)
  }
  return base.slice(0, -1) + U_TO_I[last]
}

const E_ROW: Record<string, string> = { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' }

/** Thể て: 行く → 行って, 飲む → 飲んで, 食べる → 食べて. */
export function teForm(base: string): string | null {
  if (base === '行く' || base === 'いく') return base.slice(0, -1) + 'って'
  const stem = masuStem(base)
  if (!stem) return null
  if (base.endsWith('する') || base === 'くる' || base === '来る' || stem === base.slice(0, -1)) return stem + 'て' // する, くる, nhóm 2
  const last = base.slice(-1)
  const head = base.slice(0, -1)
  if ('うつる'.includes(last)) return head + 'って'
  if ('むぶぬ'.includes(last)) return head + 'んで'
  if (last === 'く') return head + 'いて'
  if (last === 'ぐ') return head + 'いで'
  if (last === 'す') return head + 'して'
  return null
}

/** Có phải thể mệnh lệnh (行け, 見ろ, 来い, しろ) của động từ này không. */
function isImperative(surf: string, base: string): boolean {
  if (base === '来る' || base === 'くる') return /^(来い|こい)$/.test(surf)
  if (base.endsWith('する')) return surf === base.slice(0, -2) + 'しろ' || surf === base.slice(0, -2) + 'せよ'
  const stem = masuStem(base)
  if (!stem) return false
  if (stem === base.slice(0, -1) && base.endsWith('る')) return surf === stem + 'ろ' || surf === stem + 'よ'
  return surf === base.slice(0, -1) + (E_ROW[base.slice(-1)] ?? '')
}

const END_PARTICLE = /^(よ|ね|ぞ|ぜ|さ|な|わ|よね|ぞ|って|か|の)$/
const PUNCT = /^[。！!？?…、,〜ー～]+$/

/** Đổi đuôi một câu đơn (không có dấu câu ở giữa). */
async function politeClause(clause: string): Promise<string> {
  if (!clause.trim()) return clause
  const segs = await tokenize(clause)
  let end = segs.length - 1
  while (end >= 0 && (PUNCT.test(segs[end].surface) || (END_PARTICLE.test(segs[end].surface) && segs[end].pos !== '名詞'))) end--
  if (end < 0) return clause
  const s = segs[end]
  const before = clause.slice(0, s.start)
  let tailParticles = clause.slice(s.end).replace(/^(ぞ|ぜ|さ)/, 'よ').replace(/^な(?=[!！。]|$)/, 'ね').replace(/^わ/, 'よ')
  // "の？" hỏi thân mật → "のですか？"
  if (/^の[?？]/.test(tailParticles)) tailParticles = tailParticles.replace(/^の/, 'のですか').replace(/^のですか[?？]/, 'のですか？')
  const surf = s.surface
  const tail = s.parts.slice(1).map((p) => p.surface).join('')
  // Từ tượng thanh / thán từ đứng riêng (シーン, ゴゴゴ...): giữ nguyên
  if (segs.length === 1 && /^[ァ-ヶー゠-ヿ]+$/.test(surf)) return clause
  // Danh từ + する (ドキドキする, 勉強した): tách viết thường gặp
  const suru = surf.match(/^(.*)(する|した|しない|しなかった|している|していた|しよう|しろ|せよ)$/)
  if (suru && s.pos !== '動詞') {
    const m: Record<string, string> = { する: 'します', した: 'しました', しない: 'しません', しなかった: 'しませんでした', している: 'しています', していた: 'していました', しよう: 'しましょう', しろ: 'してください', せよ: 'してください' }
    return before + suru[1] + m[suru[2]] + tailParticles
  }
  // Thể て cuối câu = nhờ / bảo (静かにして → 静かにしてください)
  if (s.pos === '動詞' && /[てで]$/.test(surf) && surf === teForm(s.base)) return before + surf + 'ください' + tailParticles.replace(/^ね/, '')
  if (s.pos === '動詞') {
    if (/ます|ました|ません/.test(surf)) return clause
    // ～ている / ～ておく / ～てしまう...: đổi động từ phụ ở cuối
    const auxMatch = surf.match(/^(.*[てで])(いる|いた|いない|おく|おいた|しまう|しまった|みる|みた|くれる|くれた|あげる|もらう|もらった)$/)
    if (auxMatch) {
      const map: Record<string, string> = { いる: 'います', いた: 'いました', いない: 'いません', おく: 'おきます', おいた: 'おきました', しまう: 'しまいます', しまった: 'しまいました', みる: 'みます', みた: 'みました', くれる: 'くれます', くれた: 'くれました', あげる: 'あげます', もらう: 'もらいます', もらった: 'もらいました' }
      return before + auxMatch[1] + map[auxMatch[2]] + tailParticles
    }
    const stem = masuStem(s.base)
    if (!stem) return clause
    let ending: string | null = null
    if (surf === s.base) ending = 'ます'
    else if (/(た|だ)$/.test(surf) && !/(なかっ)/.test(tail) && !/たい$/.test(surf)) ending = 'ました'
    else if (/なかった$/.test(surf)) ending = 'ませんでした'
    else if (/ない$/.test(surf)) ending = 'ません'
    else if (/たい$/.test(surf)) return before + surf + 'です' + tailParticles
    else if (surf !== s.base && /([おこごそとのぼぽもろ]う|よう)$/.test(surf)) ending = 'ましょう'
    else if (isImperative(surf, s.base)) { const te = teForm(s.base); return te ? before + te + 'ください' + tailParticles : clause }
    if (!ending) return clause
    return before + stem + ending + tailParticles
  }
  if (s.pos === '形容詞') {
    if (/ない$/.test(surf) && surf !== 'ない') return before + surf.replace(/ない$/, 'ないです') + tailParticles
    return before + surf + 'です' + tailParticles
  }
  if (s.pos === '助動詞') {
    if (surf === 'だ') return before + 'です' + tailParticles
    if (surf === 'だった') return before + 'でした' + tailParticles
    if (surf === 'ない') return before + 'ません' + tailParticles
    if (surf === 'なかった') return before + 'ませんでした' + tailParticles
    if (/^(です|ます|ました|でした|ません)$/.test(surf)) return clause
    return clause
  }
  if (s.pos === '名詞' || s.pos === '代名詞') return before + surf + 'です' + tailParticles
  return clause
}

/** Gợi ý câu lịch sự tương đương. Trả về null nếu câu đã lịch sự sẵn hoặc không đổi được gì. */
export async function politeVersion(text: string): Promise<string | null> {
  if (!text.trim()) return null
  const original = text.replace(/\s+/g, '')
  let t = original
  for (const [re, to] of PHRASES) t = t.replace(re, to)
  // Tách thành từng câu theo dấu câu (giữ dấu câu)
  const pieces = t.split(/([。！!？?…]+)/)
  const out: string[] = []
  for (let i = 0; i < pieces.length; i += 2) {
    const clause = pieces[i]
    const punct = pieces[i + 1] ?? ''
    try {
      // Câu hỏi thân mật "～の？" → "～のですか？" (giữ động từ thể thường trước の)
      if (/の$/.test(clause) && /^[？?]/.test(punct)) { out.push(`${clause}ですか`, punct); continue }
      let pc = await politeClause(clause)
      // Câu hỏi: ～です？ / ～ます？ → ～ですか？ / ～ますか？
      if (/^[？?]/.test(punct) && /(です|ます|ました|でした|ません)$/.test(pc)) pc += 'か'
      out.push(pc, punct)
    } catch {
      out.push(clause, punct)
    }
  }
  const res = out.join('').replace(/ですです/g, 'です').replace(/のだ(?=[よね。！!？?]|$)/g, 'のです')
  return res === original ? null : res
}
