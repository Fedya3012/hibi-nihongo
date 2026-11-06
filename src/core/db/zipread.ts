/**
 * ĐỌC FILE .ZIP MÀ KHÔNG NẠP CẢ FILE VÀO BỘ NHỚ
 * Đọc "mục lục" ở cuối file zip, rồi chỉ cắt (Blob.slice) đúng đoạn của từng file bên trong khi cần.
 * Nhờ vậy file sao lưu vài trăm MB vẫn mở được trên điện thoại.
 * Chỉ hỗ trợ đúng những gì app tự ghi: nén "deflate" hoặc không nén, file < 4 GB.
 */
import { inflateSync, strFromU8 } from 'fflate'

export interface ZipEntry {
  name: string
  method: number // 0 = không nén, 8 = deflate
  compressedSize: number
  size: number
  localOffset: number
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8)
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0

async function bytes(blob: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await blob.slice(start, end).arrayBuffer())
}

/** Có phải file zip không (4 byte đầu là "PK\3\4"). */
export async function isZip(blob: Blob): Promise<boolean> {
  if (blob.size < 22) return false
  const b = await bytes(blob, 0, 4)
  return u32(b, 0) === 0x04034b50
}

/** Đọc danh sách file trong zip. */
export async function listZip(blob: Blob): Promise<ZipEntry[]> {
  // Phần kết thúc (EOCD) nằm trong 64 KB + 22 byte cuối file
  const tailStart = Math.max(0, blob.size - 65_557)
  const tail = await bytes(blob, tailStart, blob.size)
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('File zip bị hỏng hoặc chưa tải xong.')
  const count = u16(tail, eocd + 10)
  const cdSize = u32(tail, eocd + 12)
  const cdOffset = u32(tail, eocd + 16)
  const cd = await bytes(blob, cdOffset, cdOffset + cdSize)
  const out: ZipEntry[] = []
  let p = 0
  for (let n = 0; n < count && p + 46 <= cd.length; n++) {
    if (u32(cd, p) !== 0x02014b50) throw new Error('File zip bị hỏng.')
    const nameLen = u16(cd, p + 28)
    const extraLen = u16(cd, p + 30)
    const commentLen = u16(cd, p + 32)
    out.push({
      name: strFromU8(cd.subarray(p + 46, p + 46 + nameLen)),
      method: u16(cd, p + 10),
      compressedSize: u32(cd, p + 20),
      size: u32(cd, p + 24),
      localOffset: u32(cd, p + 42),
    })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/** Đọc nội dung một file trong zip (đã giải nén). */
export async function readZipEntry(blob: Blob, e: ZipEntry): Promise<Uint8Array> {
  const head = await bytes(blob, e.localOffset, e.localOffset + 30)
  if (u32(head, 0) !== 0x04034b50) throw new Error('File zip bị hỏng.')
  const start = e.localOffset + 30 + u16(head, 26) + u16(head, 28)
  const raw = await bytes(blob, start, start + e.compressedSize)
  if (e.method === 0) return raw
  if (e.method === 8) return inflateSync(raw, { out: new Uint8Array(e.size) })
  throw new Error(`File zip dùng kiểu nén chưa hỗ trợ (${e.method}).`)
}

export async function readZipText(blob: Blob, e: ZipEntry): Promise<string> {
  return strFromU8(await readZipEntry(blob, e))
}
