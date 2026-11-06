/**
 * ÂM THANH: đọc câu bằng giọng tiếng Nhật có sẵn trong máy (Web Speech API, không cần mạng),
 * và ghi âm giọng người học để luyện shadowing.
 * Windows: nếu không có giọng Nhật, cài trong Settings → Time & language → Speech → Add voices → 日本語.
 */
import { useEffect, useRef, useState } from 'react'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

function jaVoice(): SpeechSynthesisVoice | undefined {
  const ja = (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  return ja.find((v) => v.localService) ?? ja[0]
}

export const ttsSupported = () => !!synth

/** Hook: máy đã có giọng tiếng Nhật chưa (danh sách giọng tải chậm nên phải chờ). */
export function useJaVoice(): boolean {
  const [ok, setOk] = useState(() => !!jaVoice())
  useEffect(() => {
    if (!synth) return
    const up = () => setOk(!!jaVoice())
    synth.addEventListener('voiceschanged', up)
    const t = window.setTimeout(up, 800)
    return () => { synth.removeEventListener('voiceschanged', up); window.clearTimeout(t) }
  }, [])
  return ok
}

export type VoiceKind = 'auto' | 'male' | 'female' | 'child' | 'old'

export const VOICE_LABEL: Record<VoiceKind, string> = { auto: 'Mặc định', male: 'Nam', female: 'Nữ', child: 'Trẻ con', old: 'Người già' }

// Tên các giọng tiếng Nhật hay gặp trên Windows, Edge, Chrome, macOS, Android
const MALE = /male(?!.*female)|男|ichiro|keita|daichi|naoki|otoya|hattori|takumi|kenji|masaru/i
const FEMALE = /female|女|haruka|ayumi|sayaka|nanami|kyoko|mizuki|aoi|shiori|mayu|o-ren|ayane|kaori|hikari/i

/** Danh sách giọng tiếng Nhật trong máy, chia theo nam / nữ (đoán theo tên giọng). */
export function jaVoices(): { male: SpeechSynthesisVoice[]; female: SpeechSynthesisVoice[]; all: SpeechSynthesisVoice[] } {
  const all = (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  return { all, male: all.filter((v) => MALE.test(v.name) && !FEMALE.test(v.name)), female: all.filter((v) => FEMALE.test(v.name)) }
}

/**
 * Chọn giọng + cao độ cho một kiểu nhân vật. Máy không có giọng nam/nữ riêng thì đổi cao độ
 * (pitch) của giọng có sẵn: nam trầm hơn, trẻ con cao hơn.
 */
export function voiceFor(kind: VoiceKind): { voice?: SpeechSynthesisVoice; pitch: number; rateMul: number } {
  const { male, female } = jaVoices()
  const base = jaVoice()
  switch (kind) {
    case 'male': return male[0] ? { voice: male[0], pitch: 1, rateMul: 1 } : { voice: base, pitch: 0.6, rateMul: 0.95 }
    case 'female': return female[0] ? { voice: female[0], pitch: 1.1, rateMul: 1 } : { voice: base, pitch: 1.35, rateMul: 1 }
    case 'child': return { voice: female[0] ?? base, pitch: 1.8, rateMul: 1.05 }
    case 'old': return { voice: male[0] ?? base, pitch: 0.5, rateMul: 0.8 }
    default: return { voice: base, pitch: 1, rateMul: 1 }
  }
}

/** Đọc một câu. Trả về Promise xong khi đọc hết (dùng để tự phát câu tiếp theo). */
export function speakJa(text: string, rate = 1, kind: VoiceKind = 'auto'): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || !text.trim()) { resolve(); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    const { voice, pitch, rateMul } = voiceFor(kind)
    if (voice) u.voice = voice
    u.pitch = pitch
    u.rate = Math.min(2, rate * rateMul)
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
  })
}

export const stopSpeaking = () => synth?.cancel()

/** Ghi âm giọng mình để so với giọng mẫu (shadowing). Bản ghi chỉ nằm trong bộ nhớ, không lưu lại. */
export function useRecorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'denied'>('idle')
  const [url, setUrl] = useState<string>()
  const rec = useRef<MediaRecorder | null>(null)
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const r = new MediaRecorder(stream)
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })))
        setState('idle')
      }
      rec.current = r
      r.start()
      setState('recording')
    } catch {
      setState('denied')
    }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop()
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined'
  return { state, url, start, stop, supported }
}
