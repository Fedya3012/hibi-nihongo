/**
 * TRA KANJI KHÔNG CẦN BIẾT CÁCH ĐỌC
 *  1. Theo bộ phận (kiểu Jisho): chọn vài bộ nhìn thấy trong chữ → chỉ còn các chữ chứa đủ các bộ đó.
 *     Dữ liệu: data/radk.json, tạo từ RADKFILE (© EDRDG, CC BY-SA 3.0) bằng tools/build-radk.mjs.
 *     File được tải riêng (lazy) khi mở mục Tra chữ, không làm nặng lúc mở app.
 *  2. Vẽ tay: so nét người dùng vẽ với nét mẫu KanjiVG trong gói `kanji-study` (đã có trên máy).
 *     Không cần mạng, không cần mô hình AI: mỗi nét được rút thành vài điểm, rồi tìm chữ có các nét
 *     giống nhất (vị trí + hướng viết). Viết đúng số nét và đúng thứ tự thì chính xác nhất,
 *     nhưng sai thứ tự hoặc thiếu/thừa 1–2 nét vẫn tìm ra.
 */
import { listItems } from '@/core/db'
import { STUDY_PACK, type StudyData } from './data'

// ---------------------------------------------------------------------------
// 1. Tra theo bộ phận
// ---------------------------------------------------------------------------

/** [chữ hiển thị, số nét, chỉ số các chữ chứa bộ này, ghi chú vị trí?] */
export type RadkPart = [char: string, strokes: number, members: number[], hint?: string]
export interface RadkData { k: string; s: number[]; r: RadkPart[] }

export interface RadkIndex {
  chars: string[] // mọi chữ, xếp theo số nét rồi độ thông dụng
  strokes: number[] // số nét của từng chữ
  parts: { char: string; strokes: number; hint?: string; members: Set<number> }[]
}

let radkPromise: Promise<RadkIndex> | null = null
export function loadRadk(): Promise<RadkIndex> {
  if (!radkPromise) {
    radkPromise = import('../data/radk.json').then((m) => {
      const d = (m.default ?? m) as unknown as RadkData
      return {
        chars: [...d.k],
        strokes: d.s,
        parts: d.r.map(([char, strokes, members, hint]) => ({ char, strokes, hint, members: new Set(members) })),
      }
    })
    radkPromise.catch(() => { radkPromise = null })
  }
  return radkPromise
}

/**
 * Các chữ chứa đủ mọi bộ đã chọn (chỉ số trong `chars`), và những bộ còn chọn thêm được
 * (bộ nào chọn thêm mà không còn chữ nào thì làm mờ đi, giống Jisho).
 */
export function radkMatch(ix: RadkIndex, selected: number[]): { hits: number[]; possible: Set<number> } {
  if (!selected.length) return { hits: [], possible: new Set(ix.parts.map((_, i) => i)) }
  const sets = selected.map((i) => ix.parts[i].members).sort((a, b) => a.size - b.size)
  const hits: number[] = []
  for (const k of sets[0]) if (sets.every((s) => s.has(k))) hits.push(k)
  hits.sort((a, b) => a - b)
  const possible = new Set<number>()
  ix.parts.forEach((p, i) => {
    if (selected.includes(i) || hits.some((k) => p.members.has(k))) possible.add(i)
  })
  return { hits, possible }
}

// ---------------------------------------------------------------------------
// 2. Nhận dạng chữ vẽ tay
// ---------------------------------------------------------------------------

export type Pt = [number, number]
const N = 10 // số điểm lấy trên mỗi nét

/** Đọc đường SVG của KanjiVG (chỉ dùng M, C, S, L, viết hoa hoặc thường) thành dãy điểm. */
export function pathToPoints(d: string): Pt[] {
  const pts: Pt[] = []
  let x = 0, y = 0, cx = 0, cy = 0 // điểm hiện tại và điểm điều khiển trước (cho lệnh S)
  const re = /([MmCcSsLl])([^MmCcSsLlZz]*)/g
  let m: RegExpExecArray | null
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let t = 1; t <= 6; t++) {
      const u = t / 6, v = 1 - u
      pts.push([
        v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
        v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3,
      ])
    }
    cx = x2; cy = y2; x = x3; y = y3
  }
  while ((m = re.exec(d))) {
    const cmd = m[1]
    const n = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    const rel = cmd === cmd.toLowerCase()
    const ox = () => (rel ? x : 0), oy = () => (rel ? y : 0)
    switch (cmd.toUpperCase()) {
      case 'M':
        x = n[0] + ox(); y = n[1] + oy(); cx = x; cy = y
        pts.push([x, y])
        for (let i = 2; i + 1 < n.length; i += 2) { x = n[i] + ox(); y = n[i + 1] + oy(); pts.push([x, y]) }
        break
      case 'L':
        for (let i = 0; i + 1 < n.length; i += 2) { x = n[i] + ox(); y = n[i + 1] + oy(); cx = x; cy = y; pts.push([x, y]) }
        break
      case 'C':
        for (let i = 0; i + 5 < n.length; i += 6) {
          const bx = ox(), by = oy()
          cubic(n[i] + bx, n[i + 1] + by, n[i + 2] + bx, n[i + 3] + by, n[i + 4] + bx, n[i + 5] + by)
        }
        break
      case 'S':
        for (let i = 0; i + 3 < n.length; i += 4) {
          const bx = ox(), by = oy()
          cubic(2 * x - cx, 2 * y - cy, n[i] + bx, n[i + 1] + by, n[i + 2] + bx, n[i + 3] + by)
        }
        break
    }
  }
  return pts
}

/** Lấy đều n điểm dọc theo nét (theo độ dài), để so hai nét vẽ nhanh/chậm khác nhau. */
export function resample(pts: Pt[], n = N): Pt[] {
  if (pts.length < 2) return Array.from({ length: n }, () => pts[0] ?? [0, 0])
  const seg: number[] = [0]
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = seg[seg.length - 1] || 1
  const out: Pt[] = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * total
    while (j < pts.length - 1 && seg[j] < t) j++
    const span = seg[j] - seg[j - 1] || 1
    const r = (t - seg[j - 1]) / span
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * r, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * r])
  }
  return out
}

/**
 * Đưa cả chữ về khung chuẩn: dời vào giữa, phóng to/thu nhỏ theo cạnh dài nhất (giữ tỉ lệ).
 * Nhờ vậy viết chữ nhỏ ở góc hay to cả ô đều so được với nét mẫu.
 * Trả về các nét đã lấy mẫu, mỗi nét là mảng [x0, y0, x1, y1, …] (Float32Array cho nhanh).
 */
export function normalize(strokes: Pt[][]): Float32Array[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of strokes) for (const [x, y] of s) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const size = Math.max(maxX - minX, maxY - minY, 1)
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2
  return strokes.map((s) => {
    const r = resample(s)
    const a = new Float32Array(N * 2)
    r.forEach(([x, y], i) => { a[i * 2] = (x - mx) / size; a[i * 2 + 1] = (y - my) / size })
    return a
  })
}

/** Độ khác nhau giữa hai nét: khoảng cách trung bình giữa các điểm tương ứng (có tính hướng viết). */
function strokeDist(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < N * 2; i += 2) s += Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1])
  return s / N
}

const MISS = 0.35 // phạt cho mỗi nét thiếu hoặc thừa so với chữ mẫu
const ORDER = 0.02 // phạt nhẹ cho mỗi nét viết sai thứ tự

/** Điểm khác biệt giữa chữ người dùng vẽ (u) và chữ mẫu (t). Càng nhỏ càng giống. */
export function charDistance(u: Float32Array[], t: Float32Array[]): number {
  const n = u.length, m = t.length
  // a) Viết đúng thứ tự: so nét thứ i với nét thứ i
  let inOrder = Infinity
  if (n === m) {
    inOrder = 0
    for (let i = 0; i < n; i++) inOrder += strokeDist(u[i], t[i])
    inOrder /= n
  }
  // b) Không đúng thứ tự / thiếu thừa nét: mỗi nét vẽ ghép với nét mẫu giống nhất chưa dùng
  // ghép theo cặp giống nhau nhất trước (tham lam), đủ tốt cho vài chục nét
  const k = Math.min(n, m)
  const dist = new Float32Array(n * m)
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) dist[i * m + j] = strokeDist(u[i], t[j])
  let sum = 0, swaps = 0
  for (let step = 0; step < k; step++) {
    let best = Infinity, bi = 0, bj = 0
    for (let x = 0; x < dist.length; x++) if (dist[x] < best) { best = dist[x]; bi = (x / m) | 0; bj = x % m }
    sum += best
    if (bi !== bj) swaps++
    // bỏ hàng bi và cột bj khỏi lần chọn sau
    for (let j = 0; j < m; j++) dist[bi * m + j] = Infinity
    for (let i = 0; i < n; i++) dist[i * m + bj] = Infinity
  }
  const greedy = sum / Math.max(k, 1) + (swaps * ORDER) / Math.max(k, 1) + Math.abs(n - m) * MISS / Math.max(n, m) * 1.5
  return Math.min(inOrder, greedy)
}

export interface Template { char: string; strokes: Float32Array[] }

let templatesPromise: Promise<Map<number, Template[]>> | null = null
/**
 * Nét mẫu của mọi chữ trong gói `kanji-study`, nhóm theo số nét.
 * Đọc một lần (~6.400 chữ, khoảng nửa giây), sau đó giữ trong bộ nhớ.
 */
export function loadTemplates(): Promise<Map<number, Template[]>> {
  if (!templatesPromise) {
    templatesPromise = listItems<StudyData>(STUDY_PACK, { kind: 'kanji' }).then((items) => {
      const byCount = new Map<number, Template[]>()
      for (const it of items) {
        const p = it.data?.p
        if (!p?.length) continue
        const t = { char: it.id, strokes: normalize(p.map(pathToPoints)) }
        const list = byCount.get(p.length)
        if (list) list.push(t)
        else byCount.set(p.length, [t])
      }
      return byCount
    })
    templatesPromise.then((m) => { if (!m.size) templatesPromise = null }, () => { templatesPromise = null })
  }
  return templatesPromise
}

/**
 * Tìm các chữ giống nét vẽ nhất. `bonus(c)` (không bắt buộc) trả về số nhỏ để ưu tiên chữ hay gặp
 * khi hai chữ giống nhau gần bằng nhau.
 */
export function recognize(
  templates: Map<number, Template[]>, drawn: Pt[][], limit = 15, bonus?: (c: string) => number,
): string[] {
  const strokes = drawn.filter((s) => s.length > 0)
  if (!strokes.length) return []
  const u = normalize(strokes)
  const n = u.length
  const scored: [number, string][] = []
  for (let m = Math.max(1, n - 2); m <= n + 2; m++) {
    for (const t of templates.get(m) ?? []) {
      scored.push([charDistance(u, t.strokes) - (bonus?.(t.char) ?? 0), t.char])
    }
  }
  scored.sort((a, b) => a[0] - b[0])
  return scored.slice(0, limit).map((s) => s[1])
}
