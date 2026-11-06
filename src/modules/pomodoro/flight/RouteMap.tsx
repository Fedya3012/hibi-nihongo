/**
 * BẢN ĐỒ ĐƯỜNG BAY (SVG, chạy offline)
 * Đường bờ biển lấy từ Natural Earth (land.json, ~170 KB, chỉ tải khi mở bản đồ), chi tiết hơn ở quanh Nhật Bản.
 * Phép chiếu Mercator, tự phóng to vừa khung theo đường bay. Màu bản đồ cố định kiểu "màn hình máy bay ban đêm"
 * (giống ảnh minh họa, không đổi theo giao diện sáng/tối).
 */
import { useEffect, useMemo, useState } from 'react'
import { JAPAN, airport, type Airport } from './places'
import { routePoints, type LatLon } from './geo'

type Ring = [number, number][]
let landCache: Ring[] | null = null
function useLand() {
  const [land, setLand] = useState<Ring[] | null>(landCache)
  useEffect(() => {
    if (landCache) return
    void import('./land.json').then((m) => { landCache = m.default as unknown as Ring[]; setLand(landCache) })
  }, [])
  return land
}

const C = { sea: '#0b1730', land: '#1d3b4a', coast: '#2c5a6b', route: '#ffffff', done: '#a5b4fc', label: '#e2e8f0', dot: '#94a3b8' }

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-80, Math.min(80, lat)) * Math.PI) / 360)) * (180 / Math.PI)

export interface MapMarker { code: string; strong?: boolean; visited?: boolean }

export function RouteMap({
  from, to, progress = 0, width = 600, height = 400, markers, onPick, className = '', showPlane = true,
}: {
  from: string
  /** Không có → chỉ xem quanh `from` + các điểm `markers`. */
  to?: string
  progress?: number
  width?: number
  height?: number
  markers?: MapMarker[]
  onPick?: (code: string) => void
  className?: string
  showPlane?: boolean
}) {
  const land = useLand()
  const a = airport(from)
  const b = to ? airport(to) : undefined

  const route = useMemo(() => (b ? routePoints(a, b, 96) : []), [a, b])

  // Khung nhìn: bao trọn đường bay (hoặc nơi đi + các điểm đánh dấu), thêm lề
  const view = useMemo(() => {
    const pts: LatLon[] = route.length ? [...route] : [a]
    if (!b) {
      for (const m of markers ?? []) {
        const p = airport(m.code)
        let lon = p.lon
        while (lon - a.lon > 180) lon -= 360
        while (lon - a.lon < -180) lon += 360
        pts.push({ lat: p.lat, lon })
      }
    }
    const lons = pts.map((p) => p.lon), ys = pts.map((p) => mercY(p.lat))
    let x0 = Math.min(...lons), x1 = Math.max(...lons), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const minSpan = 7
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    let w = Math.max(minSpan, (x1 - x0) * 1.45), h = Math.max(minSpan, (y1 - y0) * 1.45)
    // Giữ đúng tỉ lệ khung
    const ar = width / height
    if (w / h > ar) h = w / ar
    else w = h * ar
    x0 = cx - w / 2; x1 = cx + w / 2; y0 = cy - h / 2; y1 = cy + h / 2
    return { x0, x1, y0, y1, w, h }
  }, [route, a, b, markers, width, height])

  const px = (lon: number) => ((lon - view.x0) / view.w) * width
  const py = (lat: number) => ((view.y1 - mercY(lat)) / view.h) * height

  /** Đặt kinh độ của điểm vào gần khung nhìn nhất (xử lý đường đổi ngày). */
  const fitLon = (lon: number) => {
    const mid = (view.x0 + view.x1) / 2
    while (lon - mid > 180) lon -= 360
    while (lon - mid < -180) lon += 360
    return lon
  }

  const landPath = useMemo(() => {
    if (!land) return ''
    const shifts = [-360, 0, 360]
    let d = ''
    for (const s of shifts) {
      if (view.x1 < -180 + s || view.x0 > 180 + s) continue
      for (const ring of land) {
        // bỏ nhanh những vùng nằm ngoài khung
        let inside = false
        for (const [x, y] of ring) {
          const X = x + s
          if (X > view.x0 - 5 && X < view.x1 + 5) { const Y = mercY(y); if (Y > view.y0 - 5 && Y < view.y1 + 5) { inside = true; break } }
        }
        if (!inside) continue
        d += 'M' + ring.map(([x, y]) => `${px(x + s).toFixed(1)},${py(y).toFixed(1)}`).join('L') + 'Z'
      }
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [land, view, width, height])

  const pathOf = (pts: LatLon[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.lon).toFixed(1)},${py(p.lat).toFixed(1)}`).join('')
  const k = Math.round(progress * (route.length - 1))
  const done = route.slice(0, k + 1)
  const plane = route[k]
  const nxt = route[Math.min(route.length - 1, k + 1)]
  const prv = route[Math.max(0, k - 1)]
  const angle = plane ? (Math.atan2(py(nxt.lat) - py(prv.lat), px(nxt.lon) - px(prv.lon)) * 180) / Math.PI : 0

  const label = (ap: Airport, strong: boolean, visited?: boolean) => {
    const x = px(fitLon(ap.lon)), y = py(ap.lat)
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return null
    const clickable = !!onPick && ap.code !== from
    return (
      <g key={ap.code} transform={`translate(${x},${y})`} onClick={clickable ? () => onPick!(ap.code) : undefined}
        className={clickable ? 'cursor-pointer' : undefined}>
        <circle r={strong ? 5 : 3} fill={strong ? C.route : visited ? C.done : C.dot} stroke={C.sea} strokeWidth={1.5} />
        {strong ? (
          <g transform="translate(8,-24)">
            <rect width={44} height={20} rx={6} fill={C.sea} stroke={C.done} strokeWidth={1.5} />
            <text x={22} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.label}>{ap.code}</text>
          </g>
        ) : (
          <text x={6} y={4} fontSize={10} fill={C.dot}>{ap.code}</text>
        )}
      </g>
    )
  }

  const shown = new Set<string>([from, ...(to ? [to] : []), ...(markers ?? []).map((m) => m.code)])
  const minor = to ? JAPAN.filter((x) => !shown.has(x.code)) : []

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`block h-auto w-full select-none ${className}`} role="img"
      aria-label={b ? `Bản đồ đường bay ${a.city} → ${b.city}` : `Bản đồ quanh ${a.city}`}>
      <rect width={width} height={height} fill={C.sea} />
      <path d={landPath} fill={C.land} stroke={C.coast} strokeWidth={0.8} />
      {minor.map((m) => label(m, false))}
      {route.length > 0 && (
        <>
          <path d={pathOf(route)} fill="none" stroke={C.route} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="6 6" />
          <path d={pathOf(done)} fill="none" stroke={C.done} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
      {(markers ?? []).filter((m) => m.code !== from && m.code !== to).map((m) => label(airport(m.code), !!m.strong, m.visited))}
      {label(a, true)}
      {b && label(b, true)}
      {showPlane && plane && (
        <g transform={`translate(${px(plane.lon)},${py(plane.lat)}) rotate(${angle})`}>
          {/* máy bay nhìn từ trên xuống, mũi hướng sang phải */}
          <path d="M14,0 L4,-2 L-2,-12 L-6,-12 L-2,-2 L-10,-2 L-13,-6 L-15,-6 L-13,0 L-15,6 L-13,6 L-10,2 L-2,2 L-6,12 L-2,12 L4,2 Z"
            fill="#fff" stroke={C.sea} strokeWidth={1} />
        </g>
      )}
    </svg>
  )
}
