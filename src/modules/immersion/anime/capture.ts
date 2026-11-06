/**
 * CẮT CẢNH ANIME CHO THẺ ÔN TẬP: ảnh khung hình + đoạn tiếng nói của một câu thoại.
 *
 * - Ảnh: vẽ khung hình đang hiện của <video> lên canvas → JPEG (cạnh dài ≤ 900px).
 * - Tiếng: phát lại đúng đoạn câu thoại ở tốc độ 1× và ghi bằng MediaRecorder.
 *   Không cần đọc/giải mã cả file video (file anime thường hơn 1 GB), nên nhanh và nhẹ máy.
 *   Chrome/Edge/bản Windows: lấy tiếng thẳng từ video (captureStream).
 *   Firefox/Safari: đi qua Web Audio (bạn vẫn nghe được tiếng như bình thường).
 * Tiếng được nén Opus/AAC ~48 kbps: câu 3 giây chỉ ~20 KB, nên lưu luôn trong thẻ và có trong sao lưu.
 */

/** Chụp khung hình đang hiện. Trả về null nếu video chưa có hình. */
export async function captureFrame(video: HTMLVideoElement, maxSide = 900): Promise<Blob | null> {
  const w = video.videoWidth, h = video.videoHeight
  if (!w || !h) return null
  try {
    const scale = Math.min(1, maxSide / Math.max(w, h))
    const c = document.createElement('canvas')
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)
    c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height)
    return await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85))
  } catch {
    return null
  }
}

export const canRecordAudio = () => typeof MediaRecorder !== 'undefined'

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream }

// Web Audio: mỗi thẻ <video> chỉ được nối vào AudioContext một lần, nên nhớ lại để dùng tiếp
const graphs = new WeakMap<HTMLVideoElement, { ctx: AudioContext; src: MediaElementAudioSourceNode }>()

/** Lấy luồng tiếng của video. Trả về hàm dọn dẹp để gọi khi ghi xong. */
function audioStream(video: HTMLVideoElement): { stream: MediaStream; done: () => void } | null {
  const v = video as CapturableVideo
  if (typeof v.captureStream === 'function') {
    const s = v.captureStream()
    return { stream: s, done: () => {} }
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  let g = graphs.get(video)
  if (!g) {
    const ctx = new AC()
    const src = ctx.createMediaElementSource(video)
    src.connect(ctx.destination) // vẫn phát ra loa như bình thường
    g = { ctx, src }
    graphs.set(video, g)
  }
  void g.ctx.resume()
  const dest = g.ctx.createMediaStreamDestination()
  g.src.connect(dest)
  const { src } = g
  return { stream: dest.stream, done: () => { try { src.disconnect(dest) } catch { /* đã ngắt */ } } }
}

function pickMime(): string | undefined {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return opts.find((m) => MediaRecorder.isTypeSupported?.(m))
}

const once = (el: HTMLMediaElement, ev: string, ms = 3000) =>
  new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, ms)
    el.addEventListener(ev, () => { window.clearTimeout(t); resolve() }, { once: true })
  })

export interface ClipResult {
  audio: Blob | null
  /** Ảnh chụp ở giữa câu (để hình khớp với câu thoại). */
  image: Blob | null
}

/**
 * Phát lại đoạn [start, end] (giây) và ghi tiếng + chụp ảnh giữa câu.
 * onProgress(0..1) để hiện thanh tiến độ. signal để hủy giữa chừng.
 * Sau khi xong, video dừng ở cuối câu, tốc độ phát trả về như cũ.
 */
export async function recordClip(
  video: HTMLVideoElement, start: number, end: number,
  opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<ClipResult> {
  const a = Math.max(0, start), b = Math.min(end, video.duration || end)
  const mid = (a + b) / 2
  const rate = video.playbackRate
  const out: ClipResult = { audio: null, image: null }

  video.pause()
  video.currentTime = a
  await once(video, 'seeked')
  if (opts.signal?.aborted) return out

  const src = canRecordAudio() ? audioStream(video) : null
  let rec: MediaRecorder | null = null
  const chunks: Blob[] = []
  let stopped: Promise<void> = Promise.resolve()
  // captureStream chỉ có track tiếng sau khi video bắt đầu phát → tạo recorder ngay khi có track
  const startRec = () => {
    const t = src?.stream.getAudioTracks() ?? []
    if (!t.length || rec) return
    const mime = pickMime()
    const r = new MediaRecorder(new MediaStream(t), { ...(mime && { mimeType: mime }), audioBitsPerSecond: 48000 })
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    stopped = new Promise<void>((resolve) => { r.onstop = () => resolve() })
    r.start()
    rec = r
  }
  src?.stream.addEventListener('addtrack', startRec)
  startRec()

  video.playbackRate = 1
  try {
    await video.play()
  } catch {
    src?.done()
    video.playbackRate = rate
    out.image = await captureFrame(video)
    return out
  }
  startRec()

  let shot: Promise<Blob | null> | null = null
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (opts.signal?.aborted || video.paused || video.ended || video.currentTime >= b) { resolve(); return }
      opts.onProgress?.(Math.min(1, (video.currentTime - a) / Math.max(0.1, b - a)))
      if (!shot && video.currentTime >= mid) shot = captureFrame(video)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  video.pause()
  src?.stream.removeEventListener('addtrack', startRec)
  const r = rec as MediaRecorder | null
  if (r && r.state !== 'inactive') {
    r.stop()
    await Promise.race([stopped, new Promise((res) => setTimeout(res, 1500))])
  }
  src?.done()
  video.playbackRate = rate
  opts.onProgress?.(1)

  out.audio = chunks.length ? new Blob(chunks, { type: r?.mimeType || chunks[0].type || 'audio/webm' }) : null
  // Ảnh chụp giữa câu; câu quá ngắn chưa kịp chụp thì chụp khung hình hiện tại
  out.image = (shot ? await shot : null) ?? (await captureFrame(video))
  return out
}

// ================= Luyện nghe / shadowing (ghi âm giọng bạn, nhận diện giọng nói) =================
/** Ghi âm giọng người dùng bằng micro trong `ms` mili giây (luyện shadowing). */
export async function recordMic(ms: number, signal?: AbortSignal): Promise<Blob | undefined> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return undefined
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    const mime = pickMime()
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise<void>((res) => { rec.onstop = () => res() })
    rec.start()
    await new Promise<void>((res) => {
      const t = window.setTimeout(res, ms)
      signal?.addEventListener('abort', () => { window.clearTimeout(t); res() })
    })
    rec.stop()
    await stopped
    return new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
  } finally {
    stream.getTracks().forEach((t) => t.stop())
  }
}

/** Phát một đoạn âm thanh (Blob). Trả về hàm dừng. */
export function playBlob(b: Blob, onEnd?: () => void): () => void {
  const url = URL.createObjectURL(b)
  const a = new Audio(url)
  const cleanup = () => { URL.revokeObjectURL(url); onEnd?.() }
  a.onended = cleanup
  a.onerror = cleanup
  void a.play().catch(cleanup)
  return () => { a.pause(); cleanup() }
}

// ---------- Nhận diện giọng nói (tùy chọn) ----------

type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: unknown) => void) | null; onend: (() => void) | null
  start: () => void; stop: () => void
}
type RecognitionCtor = new () => Recognition

const getRecognition = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** Trình duyệt có nhận diện giọng nói tiếng Nhật không (Chrome/Edge; thường cần mạng). */
export const canRecognizeSpeech = () => typeof window !== 'undefined' && !!getRecognition()

/** Nghe người dùng nói trong tối đa `ms` mili giây, trả về chữ nhận được (tiếng Nhật). */
export function recognizeJapanese(ms: number): Promise<string> {
  const Ctor = getRecognition()
  if (!Ctor) return Promise.reject(new Error('Trình duyệt không hỗ trợ nhận diện giọng nói'))
  return new Promise((resolve, reject) => {
    const r = new Ctor()
    r.lang = 'ja-JP'
    r.interimResults = false
    r.maxAlternatives = 1
    let text = ''
    r.onresult = (e) => { text = Array.from(e.results).map((x) => x[0].transcript).join('') }
    r.onerror = (e) => reject(new Error(String((e as { error?: string }).error ?? 'lỗi nhận diện')))
    r.onend = () => resolve(text)
    r.start()
    window.setTimeout(() => r.stop(), ms)
  })
}
