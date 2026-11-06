/**
 * GIỌNG ĐỌC CHO TRUYỆN (Web Speech API: có sẵn trong Chrome/Edge và Windows, không cần mạng).
 * Đọc từng câu một để tô sáng câu đang đọc. Gọi speak() mới thì câu cũ dừng ngay.
 */
import { useEffect, useState } from 'react'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

function jaVoice(): SpeechSynthesisVoice | undefined {
  const ja = (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  return ja.find((v) => v.localService) ?? ja[0]
}

/** Trình duyệt có đọc được không, và máy đã có giọng tiếng Nhật chưa (danh sách giọng tải chậm). */
export function useJaVoice(): { supported: boolean; ready: boolean } {
  const [ready, setReady] = useState(() => !!jaVoice())
  useEffect(() => {
    if (!synth) return
    const up = () => setReady(!!jaVoice())
    up()
    synth.addEventListener('voiceschanged', up)
    const t = window.setTimeout(up, 800)
    return () => { synth.removeEventListener('voiceschanged', up); window.clearTimeout(t) }
  }, [])
  return { supported: !!synth, ready }
}

/** Bỏ phần "Tên：" ở đầu câu thoại để giọng máy không đọc tên người nói. */
export const speakable = (s: string) => s.replace(/^[^「」：:]{1,8}[：:]\s*/, '')

/** Đọc một câu. Promise xong khi đọc hết (true) hoặc bị dừng / lỗi (false). */
export function speak(text: string, rate = 1): Promise<boolean> {
  return new Promise((resolve) => {
    if (!synth || !text.trim()) { resolve(false); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.lang = 'ja-JP'
    const v = jaVoice()
    if (v) u.voice = v
    u.rate = rate
    u.onend = () => resolve(true)
    u.onerror = () => resolve(false)
    synth.speak(u)
  })
}

export function stopSpeech() { synth?.cancel() }
