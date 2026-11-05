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
