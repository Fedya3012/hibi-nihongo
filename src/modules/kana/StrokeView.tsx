/**
 * HIỂN THỊ THỨ TỰ NÉT của một chữ kana (dữ liệu KanjiVG, giấy phép CC BY-SA 3.0).
 * Mỗi nét là một đường SVG trong khung 109×109. Hoạt ảnh vẽ lần lượt từng nét,
 * số thứ tự đặt ở điểm bắt đầu nét.
 */
import { STROKES } from './strokes'

/** Danh sách nét (đường SVG) của một chữ, hoặc undefined nếu chưa có dữ liệu. */
export const strokesOf = (char: string): string[] | undefined => STROKES[char]
export const hasStrokes = (char: string) => char in STROKES

/** Điểm bắt đầu của nét: lấy từ lệnh "M x,y" đầu tiên. */
export function startPoint(d: string): [number, number] {
  const m = /M\s*([-\d.]+)[ ,]*([-\d.]+)/i.exec(d)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/** Lưới chữ thập mờ giúp canh vị trí, giống vở tập viết. */
export function GuideGrid() {
  return (
    <g className="text-border" stroke="currentColor" strokeWidth={0.6} strokeDasharray="2 2" fill="none">
      <line x1="54.5" y1="0" x2="54.5" y2="109" />
      <line x1="0" y1="54.5" x2="109" y2="54.5" />
    </g>
  )
}

export function StrokeView({
  char, animate = true, numbers = true, speed = 1, className = '', playKey = 0,
}: {
  char: string
  animate?: boolean
  numbers?: boolean
  /** Hệ số tốc độ (1 = mỗi nét ~0,6 giây). */
  speed?: number
  className?: string
  /** Đổi số này để phát lại hoạt ảnh. */
  playKey?: number
}) {
  const strokes = strokesOf(char)
  if (!strokes) return <div className={`jp grid place-items-center ${className}`}>{char}</div>
  const dur = 0.6 / speed
  return (
    <svg viewBox="0 0 109 109" className={className} role="img" aria-label={`Thứ tự nét chữ ${char}`} key={`${char}-${playKey}`}>
      <style>{'@keyframes kana-draw{to{stroke-dashoffset:0}}'}</style>
      <GuideGrid />
      {/* Nét mờ phía sau để thấy hình chữ trong lúc hoạt ảnh chạy */}
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-border">
        {strokes.map((d, i) => <path key={i} d={d} />)}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="text-text">
        {strokes.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            style={animate ? {
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: `kana-draw ${dur}s ease-in-out ${i * (dur + 0.15)}s forwards`,
            } : undefined}
          />
        ))}
      </g>
      {numbers && (
        <g className="text-primary" fill="currentColor" fontSize={8} fontWeight={700} fontFamily="sans-serif">
          {strokes.map((d, i) => {
            const [x, y] = startPoint(d)
            return <text key={i} x={x - 7} y={y - 2}>{i + 1}</text>
          })}
        </g>
      )}
    </svg>
  )
}
