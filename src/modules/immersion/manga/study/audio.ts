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

/** Đọc một câu. Trả về Promise xong khi đọc hết (dùng để tự phát câu tiếp theo). */
export function speakJa(text: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || !text.trim()) { resolve(); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    const v = jaVoice()
    if (v) u.voice = v
    u.rate = rate
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
