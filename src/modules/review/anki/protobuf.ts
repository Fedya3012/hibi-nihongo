/**
 * Đọc dữ liệu dạng "protobuf" (kiểu nén dữ liệu của Google) ở mức tối thiểu.
 * Anki bản mới (2.1.50+) lưu danh sách file media và một vài cấu hình bằng protobuf.
 * Chỉ cần đọc vài trường đơn giản nên tự viết, không thêm thư viện.
 */

export interface PbField {
  no: number // số thứ tự trường
  wire: number // 0 = số nguyên, 2 = chuỗi byte, 1/5 = số 8/4 byte
  int?: number
  bytes?: Uint8Array
}

export function readFields(buf: Uint8Array): PbField[] {
  const out: PbField[] = []
  let pos = 0
  const varint = () => {
    let result = 0
    let mul = 1
    for (;;) {
      if (pos >= buf.length) throw new Error('protobuf hỏng')
      const b = buf[pos++]
      result += (b & 0x7f) * mul
      if (b < 0x80) return result
      mul *= 128
    }
  }
  while (pos < buf.length) {
    const key = varint()
    const no = Math.floor(key / 8)
    const wire = key & 7
    if (wire === 0) out.push({ no, wire, int: varint() })
    else if (wire === 2) {
      const len = varint()
      out.push({ no, wire, bytes: buf.subarray(pos, pos + len) })
      pos += len
    } else if (wire === 1) pos += 8
    else if (wire === 5) pos += 4
    else throw new Error('protobuf: kiểu trường lạ')
  }
  return out
}

export const pbString = (b?: Uint8Array) => (b ? new TextDecoder().decode(b) : '')
