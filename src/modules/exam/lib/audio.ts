/**
 * ĐỌC BÀI NGHE bằng giọng tiếng Nhật có sẵn trong máy (Web Speech API), không cần file âm thanh.
 * Hội thoại có 2 người: nếu máy có từ 2 giọng Nhật trở lên thì mỗi người một giọng (đoán nam/nữ theo tên giọng);
 * nếu chỉ có 1 giọng thì đổi cao độ (nam trầm, nữ cao) cho dễ phân biệt.
 */
type Who = 'M' | 'F' | 'N' // N = người dẫn (đọc tình huống, câu hỏi)

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
const MALE = /male(?!.*female)|otoya|ichiro|keita|daichi|naoki|takumi|hattori|男/i
const FEMALE = /female|kyoko|haruka|ayumi|sayaka|nanami|mizuki|aoi|shiori|mayu|o-ren|女/i

function voices() {
  const ja = (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  const local = ja.filter((v) => v.localService)
  const list = local.length ? local : ja
  const male = list.find((v) => MALE.test(v.name))
  const female = list.find((v) => FEMALE.test(v.name))
  const first = list[0]
  const other = list.find((v) => v !== first)
  return {
    N: female ?? first,
    F: female ?? first,
    M: male ?? (other && other !== (female ?? first) ? other : first),
    distinct: !!(male && female) || !!other,
  }
}

let token = 0

/** Đọc lần lượt các câu. Trả về Promise xong khi đọc hết (hoặc bị dừng). */
export function playScript(parts: { who: Who; text: string }[], rate = 0.95): Promise<void> {
  if (!synth) return Promise.resolve()
  synth.cancel()
  const my = ++token
  const v = voices()
  return new Promise((resolve) => {
    let i = 0
    const next = () => {
      if (my !== token || i >= parts.length) { resolve(); return }
      const p = parts[i++]
      const u = new SpeechSynthesisUtterance(p.text)
      u.lang = 'ja-JP'
      const voice = v[p.who]
      if (voice) u.voice = voice
      u.rate = rate
      // Cùng một giọng: đổi cao độ để phân biệt người nói
      u.pitch = v.distinct ? 1 : p.who === 'M' ? 0.7 : p.who === 'F' ? 1.35 : 1
      u.onend = () => window.setTimeout(next, p.who === 'N' ? 700 : 350)
      u.onerror = () => next()
      synth.speak(u)
    }
    next()
  })
}

export function stopAudio() {
  token++
  synth?.cancel()
}
