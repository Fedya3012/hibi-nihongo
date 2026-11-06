/**
 * PHÁT ÂM THANH CHO BÀI NGHE
 *  - Giọng máy (Web Speech API, có sẵn trong Chrome/Edge/Windows, không cần mạng): đọc câu mẫu, số, giờ, ngày.
 *  - Tiếng gốc của anime: phát lại đúng đoạn [bắt đầu, kết thúc] của câu phụ đề từ file video của bạn.
 * Bài nghe luôn phát tiếng, kể cả khi tắt "Âm thanh" trong Cài đặt (bạn chủ động bấm Nghe).
 */
import { useEffect, useState } from 'react'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

function jaVoice(): SpeechSynthesisVoice | undefined {
  const ja = (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  return ja.find((v) => v.localService) ?? ja[0]
}

/** Hook: trình duyệt có đọc được không, và máy đã có giọng tiếng Nhật chưa (danh sách giọng tải chậm). */
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

/** Đọc bằng giọng máy. Promise xong khi đọc hết (hoặc bị dừng). */
export function speak(text: string, rate = 1): Promise<void> {
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

export function stopSpeech() { synth?.cancel() }

let clipToken = 0

/**
 * Phát đoạn [start, end] (giây) của video (đang ẩn), ở tốc độ `rate`. Thêm 0,15 giây hai đầu cho khỏi mất âm.
 * Gọi lại khi đang phát thì đoạn cũ dừng ngay.
 */
export async function playClip(video: HTMLVideoElement, start: number, end: number, rate = 1): Promise<void> {
  const my = ++clipToken
  stopSpeech()
  video.pause()
  const a = Math.max(0, start - 0.15), b = end + 0.15
  video.playbackRate = rate
  video.currentTime = a
  await new Promise<void>((res) => {
    const t = window.setTimeout(res, 3000)
    video.addEventListener('seeked', () => { window.clearTimeout(t); res() }, { once: true })
  })
  if (my !== clipToken) return
  try { await video.play() } catch { return }
  await new Promise<void>((res) => {
    const tick = () => {
      if (my !== clipToken || video.paused || video.ended || video.currentTime >= b) { res(); return }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  if (my === clipToken) video.pause()
}

export function stopClip(video?: HTMLVideoElement | null) {
  clipToken++
  video?.pause()
}
