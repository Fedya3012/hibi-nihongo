/**
 * ĐỌC TO bằng giọng tiếng Nhật có sẵn trong máy (Web Speech API), không cần mạng.
 * Windows chưa có giọng Nhật: Settings → Time & language → Speech → Add voices → 日本語.
 */
import { useSettings } from '@/core/settings'

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

export const canSpeak = () => !!synth

export function speak(text: string, rate = 0.85) {
  if (!synth || !useSettings.getState().sound) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  const ja = synth.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  const v = ja.find((x) => x.localService) ?? ja[0]
  if (v) u.voice = v
  u.rate = rate
  synth.speak(u)
}
