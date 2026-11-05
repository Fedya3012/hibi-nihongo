/**
 * MỞ FILE VIDEO
 *
 * Video anime rất nặng (vài trăm MB mỗi tập), nên mặc định app KHÔNG chép video vào kho:
 *  - Chrome, Edge và bản Windows: app nhớ "tay cầm" (FileSystemFileHandle) trỏ tới file trên máy.
 *    Lần sau mở lại, trình duyệt có thể hỏi "Cho phép xem file?" một lần.
 *  - Trình duyệt khác (Firefox, Safari): mỗi lần xem bạn chọn lại file (app tự nhận đúng tập theo tên),
 *    hoặc tick "Chép video vào app" khi nhập để không phải chọn lại (tốn dung lượng bằng file gốc).
 */
import type { AnimeMedia } from './types'
import { SUB_EXT, VIDEO_EXT } from './subtitles'

/** Các hàm của File System Access API chưa có trong bộ kiểu chuẩn của TypeScript. */
type PermissionMode = { mode: 'read' }
interface HandleWithPermission extends FileSystemFileHandle {
  queryPermission?: (d: PermissionMode) => Promise<PermissionState>
  requestPermission?: (d: PermissionMode) => Promise<PermissionState>
}
type PickerWindow = Window & {
  showOpenFilePicker?: (opts: {
    multiple?: boolean
    types?: { description: string; accept: Record<string, string[]> }[]
    excludeAcceptAllOption?: boolean
  }) => Promise<FileSystemFileHandle[]>
}

/** Trình duyệt có nhớ được file trên máy không (Chrome, Edge, WebView2 của bản Windows). */
export const canRememberFiles = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window

export interface PickedFile {
  file: File
  handle?: FileSystemFileHandle
}

const dotExt = (list: string[]) => list.map((e) => '.' + e)
export const VIDEO_ACCEPT = dotExt(VIDEO_EXT).join(',') + ',video/*'
export const SUB_ACCEPT = dotExt(SUB_EXT).join(',')

/** Hộp chọn file kiểu cũ (<input type="file">), dùng khi không có showOpenFilePicker hoặc người dùng hủy. */
function pickWithInput(accept: string, multiple: boolean): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => resolve([...(input.files ?? [])].map((file) => ({ file })))
    input.oncancel = () => resolve([])
    input.click()
  })
}

/**
 * Chọn file video và/hoặc phụ đề. Có showOpenFilePicker thì lấy kèm tay cầm file để lần sau mở lại
 * không cần chọn. Phải gọi trong sự kiện bấm nút (trình duyệt yêu cầu).
 */
export async function pickFiles(kind: 'video' | 'subs' | 'both', multiple = true): Promise<PickedFile[]> {
  const exts = kind === 'video' ? VIDEO_EXT : kind === 'subs' ? SUB_EXT : [...VIDEO_EXT, ...SUB_EXT]
  const w = window as PickerWindow
  if (w.showOpenFilePicker) {
    try {
      const handles = await w.showOpenFilePicker({
        multiple,
        types: [{
          description: kind === 'subs' ? 'Phụ đề' : 'Video và phụ đề',
          // MIME giả "application/octet-stream" để chấp nhận mọi đuôi trong danh sách
          accept: { 'application/octet-stream': dotExt(exts) },
        }],
      })
      return Promise.all(handles.map(async (h) => ({ file: await h.getFile(), handle: h })))
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return [] // người dùng bấm Hủy
      // Lỗi khác (ví dụ khung nhúng không cho phép) → dùng hộp chọn kiểu cũ
    }
  }
  return pickWithInput(kind === 'video' ? VIDEO_ACCEPT : kind === 'subs' ? SUB_ACCEPT : `${VIDEO_ACCEPT},${SUB_ACCEPT}`, multiple)
}

/** Lấy file từ kéo thả. Chrome/Edge cho kèm tay cầm file (phải gọi ngay trong sự kiện drop). */
export async function filesFromDrop(dt: DataTransfer): Promise<PickedFile[]> {
  type ItemWithHandle = DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }
  const items = [...dt.items].filter((it) => it.kind === 'file') as ItemWithHandle[]
  // Gọi đồng loạt TRƯỚC mọi await, vì sau đó trình duyệt xóa dữ liệu kéo thả
  const files = items.map((it) => it.getAsFile())
  const handles = items.map((it) => it.getAsFileSystemHandle?.().catch(() => null) ?? Promise.resolve(null))
  const out: PickedFile[] = []
  for (let i = 0; i < items.length; i++) {
    const h = await handles[i]
    const f = files[i]
    if (h && h.kind === 'file') out.push({ file: f ?? await (h as FileSystemFileHandle).getFile(), handle: h as FileSystemFileHandle })
    else if (f) out.push({ file: f })
  }
  return out
}

export type OpenResult =
  | { state: 'ok'; file: Blob; name: string }
  | { state: 'permission' } // cần người dùng bấm "Cho phép"
  | { state: 'missing'; reason: string } // chưa gắn video, hoặc file đã bị xóa/đổi chỗ

/** Mở video đã gắn với một tập. ask = true: được phép hiện hộp hỏi quyền (chỉ khi người dùng vừa bấm nút). */
export async function openMedia(media: AnimeMedia | undefined, ask = false): Promise<OpenResult> {
  if (!media) return { state: 'missing', reason: 'Tập này chưa gắn file video trên máy này.' }
  if (media.kind === 'blob' && media.blob) return { state: 'ok', file: media.blob, name: media.name }
  const h = media.handle as HandleWithPermission | undefined
  if (!h) return { state: 'missing', reason: 'Không tìm thấy file video.' }
  try {
    let perm: PermissionState = (await h.queryPermission?.({ mode: 'read' })) ?? 'granted'
    if (perm !== 'granted' && ask) perm = (await h.requestPermission?.({ mode: 'read' })) ?? 'denied'
    if (perm !== 'granted') return { state: 'permission' }
    return { state: 'ok', file: await h.getFile(), name: media.name }
  } catch (e) {
    const name = (e as DOMException)?.name
    if (name === 'NotFoundError') return { state: 'missing', reason: `Không thấy file "${media.name}" nữa (đã xóa, đổi tên hoặc chuyển chỗ?).` }
    if (name === 'SecurityError' || name === 'NotAllowedError') return { state: 'permission' }
    return { state: 'missing', reason: `Không mở được file "${media.name}".` }
  }
}

/** Tạo bản ghi video cho một tập từ file vừa chọn. copy = chép cả file vào kho của app. */
export function makeMedia(episodeId: string, picked: PickedFile, copy: boolean): AnimeMedia | undefined {
  const { file, handle } = picked
  if (copy) return { episodeId, kind: 'blob', blob: file, name: file.name, size: file.size }
  if (handle) return { episodeId, kind: 'handle', handle, name: file.name, size: file.size }
  return undefined // không nhớ được: lần sau chọn lại file
}

/** Trình duyệt có phát được định dạng này không (đoán trước, chỉ để cảnh báo). */
export function playabilityHint(name: string): string | undefined {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  if (ext === 'avi') return 'File .avi thường không phát được trong trình duyệt. Nên đổi sang .mp4.'
  if (ext === 'mkv') return 'File .mkv phát được trên Chrome/Edge nếu video là H.264 hoặc HEVC. Phụ đề nằm sẵn trong file .mkv chưa đọc được: hãy dùng file phụ đề rời.'
  return undefined
}
