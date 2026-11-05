/**
 * PHÁT ÂM KANA bằng giọng đọc có sẵn trong máy (Web Speech API).
 * - Website (Chrome/Edge): thường có sẵn giọng tiếng Nhật.
 * - Windows: cần cài gói giọng Nhật trong Settings → Time & language → Speech (xem hướng dẫn trong app).
 * Không cần mạng, không cần file âm thanh đi kèm app.
 */
import { useEffect, useState } from 'react'
import { useSettings } from '@/core/settings'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = synth?.getVoices() ?? []
  const ja = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  // Ưu tiên giọng chạy trên máy (offline), rồi mới tới giọng online
  return ja.find((v) => v.localService) ?? ja[0]
}

/** Hook: máy có giọng tiếng Nhật không. Danh sách giọng có thể tải chậm, nên theo dõi sự kiện. */
export function useJapaneseVoice(): { supported: boolean; ready: boolean } {
  const [ready, setReady] = useState(() => !!japaneseVoice())
  useEffect(() => {
    if (!synth) return
    const update = () => setReady(!!japaneseVoice())
    update()
    synth.addEventListener('voiceschanged', update)
    // Một số trình duyệt không bắn sự kiện: kiểm tra lại sau một lúc
    const t = window.setTimeout(update, 800)
    return () => { synth.removeEventListener('voiceschanged', update); window.clearTimeout(t) }
  }, [])
  return { supported: !!synth, ready }
}

/** Đọc một chữ. force = đọc kể cả khi tắt âm thanh trong Cài đặt (dùng cho bài nghe). */
export function speak(text: string, { rate = 0.8, force = false } = {}) {
  if (!synth) return
  if (!force && !useSettings.getState().sound) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  const v = japaneseVoice()
  if (v) u.voice = v
  u.rate = rate
  synth.speak(u)
}
