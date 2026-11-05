/**
 * MÀU CHỦ ĐẠO TÙY CHỈNH (Cài đặt → Giao diện → Màu chủ đạo)
 * ----------------------------------------------------------
 * Người dùng chọn một bảng màu có sẵn hoặc tự chọn một màu bất kỳ. Từ một màu gốc, file này tự
 * tính ra bản cho giao diện Sáng và bản cho giao diện Tối, rồi chỉnh độ sáng tới khi chữ màu đó
 * vẫn dễ đọc (tương phản tối thiểu 4.5:1 theo WCAG AA, 7:1 khi bật "Tương phản cao").
 * Vì vậy chọn màu nào cũng không làm chữ hay nút bị mờ khó đọc.
 *
 * Kết quả là một đoạn CSS ghi đè các biến --primary, --primary-soft, --on-primary của tokens.css.
 * "Hổ phách" (mặc định) không ghi đè gì: dùng nguyên màu thiết kế sẵn trong tokens.css.
 */

export type AccentId = 'amber' | 'shu' | 'ai' | 'fuji' | 'matcha' | 'sakura' | 'custom'

/** Bảng màu có sẵn: 4 phương án trong bản Đề xuất ban đầu + Hổ phách (mắt Nea, đã chọn) + Hồng sakura. */
export const ACCENTS: { id: Exclude<AccentId, 'custom'>; base: string; jp: string }[] = [
  { id: 'amber', base: '#c98a1a', jp: '琥珀' },
  { id: 'shu', base: '#d0482f', jp: '朱' },
  { id: 'ai', base: '#2f4f8f', jp: '藍' },
  { id: 'fuji', base: '#8467b3', jp: '藤' },
  { id: 'matcha', base: '#6a8d3a', jp: '抹茶' },
  { id: 'sakura', base: '#c95b7f', jp: '桜' },
]

// Nền của hai giao diện (khớp tokens.css)
const LIGHT_BG = ['#faf7f2', '#ffffff', '#f3eee6']
const DARK_BG = ['#1c1a22', '#26232e', '#2f2b38']
const DARK_INK = '#1c1a22'

// ---------- Tính toán màu ----------

type HSL = [h: number, s: number, l: number]

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex([h, s, l]: HSL): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

function luminance(hex: string): number {
  const c = hexToRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Tỉ lệ tương phản giữa hai màu (1 → 21). */
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Đổi độ sáng (bước 1%) tới khi màu đạt tương phản `target` với mọi nền trong `bgs`. */
function fit(h: number, s: number, l: number, bgs: string[], target: number, dir: -1 | 1): string {
  for (let i = 0; i <= 100; i++) {
    const hex = hslToHex([h, s, Math.max(0, Math.min(1, l + dir * i * 0.01))])
    if (bgs.every((bg) => contrast(hex, bg) >= target)) return hex
  }
  return dir < 0 ? '#000000' : '#ffffff'
}

export interface AccentPalette { primary: string; soft: string; onPrimary: string }

/** Màu chủ đạo cho giao diện Sáng / Tối, tính từ một màu gốc. */
export function paletteFor(base: string, mode: 'light' | 'dark', high = false): AccentPalette {
  const [h, s0, l0] = hexToHsl(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(base) ? base : '#c98a1a')
  const s = Math.min(s0, 0.85)
  const target = high ? 7 : 4.5
  if (mode === 'light') {
    const soft = hslToHex([h, Math.min(s, 0.7), 0.9])
    const primary = fit(h, s, Math.min(l0, 0.5), [...LIGHT_BG, soft], target, -1)
    const onPrimary = contrast('#ffffff', primary) >= 4.5 ? '#ffffff' : DARK_INK
    return { primary, soft, onPrimary }
  }
  const soft = hslToHex([h, Math.min(s, 0.35), 0.19])
  const primary = fit(h, s0 < 0.08 ? 0 : Math.max(s, 0.45), Math.max(l0, 0.6), [...DARK_BG, soft], target, 1)
  return { primary, soft, onPrimary: DARK_INK }
}

/** Màu gốc đang chọn (bảng có sẵn hoặc màu tự chọn). */
export function accentBase(id: AccentId, custom: string): string {
  return id === 'custom' ? custom : ACCENTS.find((a) => a.id === id)?.base ?? ACCENTS[0].base
}

const vars = (p: AccentPalette) => `--primary:${p.primary};--primary-soft:${p.soft};--on-primary:${p.onPrimary};`

/** Đoạn CSS ghi đè màu chủ đạo, hoặc '' khi dùng Hổ phách mặc định. */
export function accentCss(id: AccentId, custom: string): string {
  if (id === 'amber') return ''
  const base = accentBase(id, custom)
  return [
    `:root,:root[data-theme='light']{${vars(paletteFor(base, 'light'))}}`,
    `:root[data-theme='dark']{${vars(paletteFor(base, 'dark'))}}`,
    `:root[data-theme='light'][data-contrast='high']{${vars(paletteFor(base, 'light', true))}}`,
    `:root[data-theme='dark'][data-contrast='high']{${vars(paletteFor(base, 'dark', true))}}`,
  ].join('\n')
}

/** Gắn đoạn CSS vào trang và nhớ lại (index.html đọc lại lúc mở app để không bị nháy màu cũ). */
export function applyAccent(id: AccentId, custom: string) {
  const css = accentCss(id, custom)
  let el = document.getElementById('hibi-accent') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'hibi-accent'
    document.head.appendChild(el)
  }
  el.textContent = css
  try { localStorage.setItem('hibi-accent-css', css) } catch { /* chế độ riêng tư */ }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', id === 'amber' ? '#8f5e08' : paletteFor(accentBase(id, custom), 'light').primary)
}
