/**
 * TÍNH CÁCH XẾP TRANG (thuần tính toán, không có giao diện → dễ kiểm tra).
 */
import { isWide, type FitMode, type PageMeta } from './types'

/**
 * Chia trang thành các "khung nhìn" (spread). Chế độ một trang: mỗi khung một trang.
 * Chế độ hai trang: ghép cặp như sách in; trang đôi (ảnh ngang) luôn đứng riêng;
 * coverAlone = trang bìa đứng riêng để các cặp sau ghép đúng.
 */
export function buildSpreads(pages: PageMeta[], double: boolean, coverAlone: boolean): number[][] {
  if (!double) return pages.map((_, i) => [i])
  const out: number[][] = []
  let i = 0
  if (coverAlone && pages.length) { out.push([0]); i = 1 }
  while (i < pages.length) {
    if (isWide(pages[i]) || i + 1 >= pages.length || isWide(pages[i + 1])) {
      out.push([i])
      i += 1
    } else {
      out.push([i, i + 1])
      i += 2
    }
  }
  return out
}

/** Tỉ lệ rộng/cao của trang; ảnh chưa đo được coi như trang manga dọc chuẩn. */
export const ratioOf = (p: PageMeta | undefined) => (p && p.w > 0 && p.h > 0 ? p.w / p.h : 0.7)

/**
 * Kích thước hiển thị (px) của một khung nhìn: chiều cao chung H và chiều rộng từng trang.
 * zoom = 1 là vừa theo chế độ `fit`.
 */
export function spreadSize(pages: PageMeta[], fit: FitMode, vw: number, vh: number, zoom: number) {
  const ratios = pages.map(ratioOf)
  const sum = ratios.reduce((a, b) => a + b, 0) || 0.7
  let h: number
  if (fit === 'height') h = vh
  else if (fit === 'width') h = vw / sum
  else h = Math.min(vh, vw / sum)
  h = Math.max(1, h * zoom)
  return { height: h, widths: ratios.map((r) => r * h), width: sum * h }
}

export const clampZoom = (z: number) => Math.min(5, Math.max(0.5, Math.round(z * 100) / 100))
