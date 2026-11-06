/**
 * GIẢI THÍCH KHẨU NGỮ TRONG CÂU THOẠI
 * Anime dùng rất nhiều cách nói rút gọn, thân mật mà sách giáo khoa ít dạy.
 * Mỗi luật: mẫu cần tìm → giải thích tiếng Việt → cách nói lịch sự / đầy đủ tương đương.
 * Luật viết tay, chỉ là gợi ý nhanh (không thay được ngữ pháp đầy đủ).
 */

export interface SpeechNote {
  /** Phần chữ khớp trong câu. */
  match: string
  title: string
  explain: string
  /** Cách nói lịch sự / chuẩn tương đương. */
  polite?: string
  kind: 'contraction' | 'ending' | 'pronoun' | 'rough' | 'dialect'
}

interface Rule {
  re: RegExp
  title: string
  explain: string
  polite?: string
  kind: SpeechNote['kind']
}

const RULES: Rule[] = [
  // ---- Rút gọn đuôi động từ ----
  { re: /[っんい]?ちゃ(?:う|った|って|います|いました)|じゃ(?:う|った|って)(?!ない)/, kind: 'contraction',
    title: '〜ちゃう / 〜じゃう = 〜てしまう', explain: 'Làm xong mất / lỡ làm (tiếc nuối, hoặc nhấn mạnh đã xong).', polite: '〜てしまいます' },
  { re: /(?:て|で)る(?:の|ん|よ|ね|な|から|けど|じゃ|$|[。、！？!?…])|(?:て|で)た(?:の|ん|よ|ね|$|[。、！？!?…])|(?:て|で)ない/, kind: 'contraction',
    title: '〜てる / 〜てた = 〜ている / 〜ていた', explain: 'Bỏ chữ い trong 〜ている: đang làm / đã ở trạng thái.', polite: '〜ています / 〜ていました' },
  { re: /(?:と|ど)(?:く|いた|いて|こう|かない)/, kind: 'contraction',
    title: '〜とく = 〜ておく', explain: 'Làm sẵn, làm trước để chuẩn bị.', polite: '〜ておきます' },
  { re: /なきゃ|なくちゃ|ないと(?![こ])/, kind: 'contraction',
    title: '〜なきゃ / 〜なくちゃ = 〜なければ(ならない)', explain: 'Phải làm (vế sau "ならない / いけない" bị lược).', polite: '〜なければなりません' },
  { re: /(?:ちゃ|じゃ)(?:だめ|ダメ|いけない|いかん)/, kind: 'contraction',
    title: '〜ちゃだめ = 〜てはだめ', explain: 'Không được làm.', polite: '〜てはいけません' },
  { re: /[えけせてねへめれげぜでべぺ]りゃ|[^っ]きゃ(?!ら)/, kind: 'contraction',
    title: '〜りゃ / 〜きゃ = 〜れば / 〜ければ', explain: 'Rút gọn thể điều kiện 〜ば (ví dụ すりゃ = すれば, なきゃ = なければ).', polite: '〜れば / 〜ければ' },
  { re: /って(?:んだ|の|ば)?(?:[。！？!?…]|$)|って(?:言|い)って|って(?:何|なに|誰|だれ|どう)/, kind: 'contraction',
    title: '〜って = と / という / は', explain: 'Trích dẫn ("nói là…", "nghe nói…") hoặc thay cho は khi nêu chủ đề.', polite: '〜と言っていました / 〜は' },
  { re: /んだ(?:よ|ね|けど|から|って|もん|ろ)?|んです|のだ/, kind: 'ending',
    title: '〜んだ = 〜のだ', explain: 'Giải thích lý do, nhấn mạnh cảm xúc ("là vì…", "chính là…").', polite: '〜んです / 〜のです' },
  { re: /じゃん/, kind: 'ending',
    title: '〜じゃん = 〜じゃないか', explain: 'Đúng không / còn gì (tìm sự đồng ý, rất thân mật).', polite: '〜ではないですか' },
  { re: /っけ/, kind: 'ending',
    title: '〜っけ', explain: 'Hỏi lại điều mình quên ("…nhỉ?", "là gì ấy nhỉ?").', polite: '〜でしたか' },
  { re: /っす|っスか?|ッス/, kind: 'ending',
    title: '〜っす = です', explain: 'です nói gọn, kiểu đàn em / thể thao, nửa lịch sự.', polite: 'です' },
  { re: /(?:ねえ|ねー|ねぇ)(?:よ|な|か|ん)?(?:[。、！？!?…]|$)/, kind: 'rough',
    title: '〜ねえ = 〜ない', explain: 'Âm "ai" biến thành "ee": cách nói thô, mạnh (thường nam). Ví dụ 知らねえ = 知らない.', polite: '〜ないです / 〜ません' },
  { re: /(?:すげ|うめ|うるせ|やべ|いて|つえ|ちげ|わり|やば)[えぇー]/, kind: 'rough',
    title: 'Biến âm "ai/oi" → "ee"', explain: 'すげえ = すごい, うめえ = うまい, うるせえ = うるさい, やべえ = やばい, いてえ = いたい, わりい = わるい.', polite: 'すごいです / おいしいです...' },
  { re: /(?:だ|よ|ぜ|ぞ)(?:[。！!…]|$)/, kind: 'ending',
    title: 'Trợ từ cuối câu ぜ / ぞ / だ', explain: 'ぜ, ぞ: nhấn mạnh, mạnh mẽ (thường nam). だ: khẳng định thẳng, thân mật.', polite: 'です / ますよ' },
  { re: /(?:わ|のよ|かしら|わよ|わね)(?:[。！!…？?]|$)/, kind: 'ending',
    title: 'Cách nói nữ tính わ / のよ / かしら', explain: 'Đuôi câu mềm mại, nữ tính (kiểu truyền thống). かしら = "không biết… nhỉ".', polite: '〜です / 〜でしょうか' },
  { re: /(?:かよ|のかよ|だろ|だろう)(?:[。！!…？?]|$)/, kind: 'rough',
    title: '〜かよ / 〜だろ', explain: 'かよ: hỏi vặn, bực bội. だろ: "đúng không / chứ gì" (thân mật).', polite: '〜ですか / 〜でしょう' },
  { re: /(?:の|ん)\?|の？|の(?:[。]|$)/, kind: 'ending',
    title: 'Câu hỏi bằng 〜の？', explain: 'Hỏi thân mật bằng の lên giọng (thay cho 〜ですか).', polite: '〜のですか / 〜ますか' },
  { re: /(?:ん|の)(?:じゃ|では)ない/, kind: 'ending',
    title: '〜んじゃない', explain: 'Lên giọng: "chẳng phải là… sao?" (phỏng đoán). Xuống giọng: cấm "đừng có…".', polite: '〜のではないでしょうか' },
  { re: /(?:か|が)な(?:[。？?…]|$)|かなあ/, kind: 'ending',
    title: '〜かな', explain: 'Tự hỏi, phân vân: "không biết… nhỉ".', polite: '〜でしょうか' },
  { re: /(?:もん|もの)(?:[。！!…]|$)|だもん/, kind: 'ending',
    title: '〜もん', explain: 'Biện minh kiểu nũng nịu, trẻ con: "vì… mà".', polite: '〜からです' },
  { re: /(?:おめえ|てめえ|てめぇ|貴様|きさま)/, kind: 'pronoun',
    title: 'Xưng hô thô: てめえ / 貴様 / おめえ', explain: 'Gọi đối phương "mày" với ý gây hấn. Chỉ nghe trong phim, đừng dùng ngoài đời.', polite: 'あなた / お名前 + さん' },
  { re: /お前|おまえ/, kind: 'pronoun',
    title: 'お前 (omae)', explain: '"Mày / cậu": thân mật hoặc trịch thượng, thường nam dùng với người ngang/dưới.', polite: 'あなた / 名前 + さん' },
  { re: /俺|オレ|おれ/, kind: 'pronoun',
    title: '俺 (ore)', explain: '"Tao / tớ": nam dùng, mạnh mẽ, thân mật.', polite: '私 (わたし) / 僕' },
  { re: /僕|ぼく/, kind: 'pronoun',
    title: '僕 (boku)', explain: '"Tôi / tớ": nam, nhẹ nhàng hơn 俺.', polite: '私 (わたし)' },
  { re: /あたし|うち(?=は|が|の|、)/, kind: 'pronoun',
    title: 'あたし / うち', explain: '"Tớ": nữ dùng, thân mật (うち hay gặp ở vùng Kansai).', polite: '私 (わたし)' },
  { re: /わし|拙者|わらわ|吾輩|我が?(?=は|が|の)/, kind: 'pronoun',
    title: 'Xưng hô "nhân vật": わし / 拙者 / 吾輩...', explain: 'わし: ông già. 拙者: samurai, ninja. わらわ: công chúa cổ. 吾輩: kiểu cách, kiêu ngạo.', polite: '私 (わたし)' },
  { re: /あんた/, kind: 'pronoun',
    title: 'あんた', explain: '"Anh / mày": あなた nói gọn, có thể suồng sã hoặc khó chịu.', polite: 'あなた / 名前 + さん' },
  { re: /(?:ちゃん|くん|君|さま|様|先輩|せんぱい|殿|どの)(?=[、。！？!?…]|$)/, kind: 'pronoun',
    title: 'Hậu tố gọi tên', explain: 'ちゃん: thân thương (bé gái, bạn thân). くん: bạn nam / cấp dưới. 様: rất kính trọng. 先輩: đàn anh/chị.', polite: '〜さん' },
  { re: /(?:へん|あかん|ほんま|せや|やん|おおきに|なんでやねん)/, kind: 'dialect',
    title: 'Giọng Kansai (関西弁)', explain: 'へん = ない, あかん = だめ, ほんま = 本当, せや = そうだ, やん = じゃん, おおきに = ありがとう.', polite: 'ない / だめです / 本当に' },
]

/** Tìm các cách nói đặc biệt trong một câu (mỗi luật báo tối đa một lần). */
export function analyzeSpeech(line: string): SpeechNote[] {
  const text = line.replace(/\s+/g, '')
  const out: SpeechNote[] = []
  for (const r of RULES) {
    const m = text.match(r.re)
    if (m && m[0]) out.push({ match: m[0], title: r.title, explain: r.explain, polite: r.polite, kind: r.kind })
  }
  return out
}

/** Câu có cách nói khẩu ngữ / rút gọn không (để gợi ý phân loại khi lưu câu). */
export const isCasual = (line: string) => analyzeSpeech(line).some((n) => n.kind === 'contraction' || n.kind === 'rough' || n.kind === 'dialect')

/** Từ láy kiểu ドキドキ, わくわく, ぺこぺこ thường là từ tượng thanh / tượng hình. */
export const looksOnomatopoeia = (w: string) => /^([぀-ヿー]{2})\1$/.test(w) || /^[぀-ヿ]{1,3}っ[぀-ヿ]り$/.test(w)

export const KIND_LABEL: Record<SpeechNote['kind'], string> = {
  contraction: 'Rút gọn', ending: 'Đuôi câu', pronoun: 'Xưng hô', rough: 'Nói thô / mạnh', dialect: 'Phương ngữ',
}
