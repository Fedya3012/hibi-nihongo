/**
 * TÍNH TOÁN ĐƯỜNG BAY: quãng đường, thời gian bay, vị trí máy bay trên đường bay vòng cung (great circle),
 * hướng mũi máy bay, và máy bay đang ở trên vùng nào của Nhật.
 */
import { JAPAN, REGIONS, type Airport, type Region } from './places'

const R = 6371 // bán kính Trái Đất (km)
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export type LatLon = { lat: number; lon: number }

/** Quãng đường theo mặt cầu (km). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Thời gian bay thật ước lượng (phút): 30 phút cất/hạ cánh + bay ~800 km/h. */
export const realMinutes = (km: number) => Math.round(30 + (km / 800) * 60)

/** Thời gian tập trung của chuyến bay, theo tốc độ đã chọn (1×, 2×, 4×...). Tối thiểu 10 phút. */
export const focusMinutes = (a: Airport, b: Airport, speed: number) =>
  Math.max(10, Math.round(realMinutes(distanceKm(a, b)) / speed))

/** Điểm nằm ở tỉ lệ t (0 → 1) trên đường bay vòng cung từ a tới b. */
export function along(a: LatLon, b: LatLon, t: number): LatLon {
  const φ1 = rad(a.lat), λ1 = rad(a.lon), φ2 = rad(b.lat), λ2 = rad(b.lon)
  const d = distanceKm(a, b) / R
  if (d < 1e-9) return a
  const A = Math.sin((1 - t) * d) / Math.sin(d)
  const B = Math.sin(t * d) / Math.sin(d)
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) }
}

/**
 * Các điểm trên đường bay, kinh độ được "nối liền" (không nhảy từ +180 sang -180),
 * để đường bay qua Thái Bình Dương (vd Los Angeles → Tokyo) vẽ liền một nét.
 */
export function routePoints(a: LatLon, b: LatLon, n = 64): LatLon[] {
  const pts: LatLon[] = []
  let prev: number | null = null
  for (let i = 0; i <= n; i++) {
    const p = along(a, b, i / n)
    let lon = p.lon
    if (prev != null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360 }
    prev = lon
    pts.push({ lat: p.lat, lon })
  }
  return pts
}

/** Vùng của Nhật mà điểm p đang ở trên (sân bay Nhật gần nhất trong vòng 220 km), hoặc null nếu đang trên biển. */
export function regionAt(p: LatLon): Region | null {
  let best: Airport | null = null
  let bestD = Infinity
  for (const a of JAPAN) {
    const d = distanceKm(p, a)
    if (d < bestD) { bestD = d; best = a }
  }
  return best && bestD < 220 ? REGIONS[best.region!] : null
}
