/**
 * PHONG CẢNH NGOÀI CỬA SỔ MÁY BAY (vẽ bằng SVG, không cần ảnh, chạy offline)
 * Mỗi vùng của Nhật một cảnh đặc trưng; bầu trời đổi theo giờ thật (bình minh, ban ngày, hoàng hôn, ban đêm);
 * mây trôi chậm qua cửa sổ.
 */
import type { ReactNode } from 'react'
import type { SceneId } from './places'

type Sky = 'night' | 'dawn' | 'day' | 'dusk'
export function skyAt(hour: number): Sky {
  if (hour >= 20 || hour < 5) return 'night'
  if (hour < 7) return 'dawn'
  if (hour < 17) return 'day'
  return 'dusk'
}

const SKY: Record<Sky, [string, string, string]> = {
  night: ['#070b1c', '#141e3d', '#24315a'],
  dawn: ['#27325e', '#b5708a', '#f7b27a'],
  day: ['#3d84d6', '#7fb6ec', '#cfe8ff'],
  dusk: ['#2c2350', '#c25a5a', '#f6a35b'],
}

const W = 300, H = 380

/** Dãy núi đơn giản từ danh sách đỉnh [x, y]. */
const ridge = (pts: [number, number][], base = H) =>
  `M0,${base} L${pts.map(([x, y]) => `${x},${y}`).join(' L')} L${W},${base} Z`

function Clouds({ y, opacity = 0.9, dur = 60, light }: { y: number; opacity?: number; dur?: number; light: string }) {
  const puff = (x: number, s: number) => (
    <g transform={`translate(${x},0) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={38} ry={11} />
      <ellipse cx={-18} cy={-6} rx={18} ry={11} />
      <ellipse cx={12} cy={-9} rx={22} ry={13} />
    </g>
  )
  return (
    // Hai lớp <g>: lớp ngoài đặt độ cao, lớp trong trôi ngang (animation CSS sẽ ghi đè transform của chính nó)
    <g transform={`translate(0,${y})`}>
      <g fill={light} opacity={opacity} style={{ animation: `hibi-cloud ${dur}s linear infinite` }}>
        {puff(40, 1)}{puff(170, 0.8)}{puff(260, 1.1)}{puff(340, 0.9)}{puff(470, 1)}{puff(560, 0.8)}
      </g>
    </g>
  )
}

/** Phần cảnh đất / biển của từng vùng (vẽ trên nền trời). */
function Land({ scene, night }: { scene: SceneId; night: boolean }) {
  const dim = (c: string, n: string) => (night ? n : c)
  const sea = <rect x={0} y={250} width={W} height={H - 250} fill={dim('#2f7fb3', '#0d2238')} />
  const lights = (xs: number[], y: number) => night && xs.map((x, i) => <circle key={i} cx={x} cy={y + (i % 3) * 6} r={1.4} fill="#ffd27a" />)
  const parts: Record<SceneId, ReactNode> = {
    ocean: (
      <>
        <rect x={0} y={235} width={W} height={H - 235} fill={dim('#2b6fa8', '#0b1d33')} />
        {[260, 290, 320, 350].map((y) => <path key={y} d={`M0,${y} Q75,${y - 4} 150,${y} T300,${y}`} stroke={dim('#9cc9ec', '#1d3a5c')} strokeWidth={1} fill="none" opacity={0.6} />)}
      </>
    ),
    hokkaido: (
      <>
        <path d={ridge([[0, 230], [50, 190], [95, 225], [150, 175], [205, 222], [255, 195], [300, 228]])} fill={dim('#e8eef6', '#55617a')} />
        <path d={ridge([[0, 260], [70, 245], [140, 262], [220, 240], [300, 258]])} fill={dim('#f7fbff', '#6b7690')} />
        {[30, 60, 95, 130, 180, 210, 250, 275].map((x, i) => <path key={x} d={`M${x},${300 + (i % 2) * 18} l6,-16 l6,16 Z`} fill={dim('#2f5d46', '#1c2c26')} />)}
        {lights([60, 120, 200, 240], 330)}
      </>
    ),
    tohoku: (
      <>
        <path d={ridge([[0, 225], [60, 200], [120, 222], [180, 195], [240, 218], [300, 205]])} fill={dim('#5b8a5a', '#1f3328')} />
        {Array.from({ length: 6 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
          <path key={`${r}-${c}`} d={`M${c * 64 - r * 6},${245 + r * 23} l60,0 l-6,21 l-60,0 Z`}
            fill={dim((r + c) % 3 ? '#8cbf5a' : '#d9c35a', (r + c) % 3 ? '#22381f' : '#3a3520')} stroke={dim('#6e9e45', '#1a2a18')} strokeWidth={1} />
        )))}
        {lights([40, 150, 260], 300)}
      </>
    ),
    kanto: (
      <>
        <path d="M200,232 L222,205 L244,232 Z" fill={dim('#8d9fc0', '#2b3550')} />
        <path d="M216,212 L222,205 L228,212 Z" fill={dim('#fff', '#9aa5bf')} />
        <rect x={0} y={250} width={W} height={H - 250} fill={dim('#7d8ea6', '#141b2c')} />
        {[[10, 40, 60], [55, 25, 85], [85, 35, 50], [125, 30, 95], [160, 22, 70], [185, 40, 55], [230, 28, 80], [262, 34, 60]].map(([x, w, h], i) => (
          <g key={i}>
            <rect x={x} y={250 - h} width={w} height={h} fill={dim('#a9b6c9', '#1b2438')} />
            {night && Array.from({ length: Math.floor(h / 12) }, (_, j) => <rect key={j} x={x + 4} y={256 - h + j * 12} width={w - 8} height={3} fill="#ffd27a" opacity={0.7} />)}
          </g>
        ))}
        {/* Tokyo Skytree */}
        <path d="M147,250 L150,120 L153,250 Z" fill={dim('#dfe6f0', '#3a4560')} />
        <rect x={145} y={170} width={10} height={6} rx={2} fill={dim('#c8d2e2', '#ffd27a')} />
        <rect x={146} y={145} width={8} height={4} rx={2} fill={dim('#c8d2e2', '#ffd27a')} />
        {lights([20, 70, 110, 200, 250, 280, 30, 140, 230], 290)}
      </>
    ),
    chubu: (
      <>
        <path d="M40,250 L130,150 Q150,138 170,150 L260,250 Z" fill={dim('#5a6f9a', '#1d2640')} />
        <path d="M112,170 L130,150 Q150,138 170,150 L188,170 L170,166 L158,176 L146,164 L132,174 Z" fill={dim('#fbfdff', '#aab3c8')} />
        <rect x={0} y={250} width={W} height={H - 250} fill={dim('#3d8fb8', '#0c1f33')} />
        <path d="M60,252 L130,330 Q150,342 170,330 L240,252 Z" fill={dim('#5a6f9a', '#1d2640')} opacity={0.35} />
        <path d={ridge([[0, 255], [40, 240], [70, 258]], 260)} fill={dim('#4f7d4a', '#1a2a1d')} />
        <path d={ridge([[230, 258], [265, 238], [300, 250]], 260)} fill={dim('#4f7d4a', '#1a2a1d')} />
      </>
    ),
    kansai: (
      <>
        <path d={ridge([[0, 225], [70, 200], [150, 215], [230, 195], [300, 215]])} fill={dim('#6c9a6a', '#1d3024')} />
        <rect x={0} y={265} width={W} height={H - 265} fill={dim('#86b06b', '#1a2b1c')} />
        {/* chùa 5 tầng */}
        <g fill={dim('#5b3a2e', '#2a1c18')}>
          <rect x={196} y={170} width={4} height={100} />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${172 + i * 3},${265 - i * 20} L${224 - i * 3},${265 - i * 20} L${214 - i * 3},${255 - i * 20} L${182 + i * 3},${255 - i * 20} Z`} />)}
        </g>
        {[[40, 270], [80, 285], [120, 268], [255, 280], [280, 300], [60, 320], [150, 310]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={14 + (i % 3) * 3} fill={dim('#f6b8cc', '#5a3a4a')} />
        ))}
        {lights([100, 160, 230], 340)}
      </>
    ),
    chugoku: (
      <>
        <path d={ridge([[0, 230], [60, 205], [110, 228], [170, 210], [220, 228], [300, 212]], 250)} fill={dim('#4f7d55', '#1b2c20')} />
        {sea}
        {/* cổng torii giữa biển (Miyajima) */}
        <g fill={dim('#d6402f', '#6a2420')}>
          <rect x={128} y={262} width={6} height={58} />
          <rect x={166} y={262} width={6} height={58} />
          <path d="M112,258 Q150,248 188,258 L188,264 Q150,256 112,264 Z" />
          <rect x={118} y={272} width={64} height={5} />
        </g>
        <path d="M128,322 L134,322 L131,340 Z M166,322 L172,322 L169,340 Z" fill={dim('#d6402f', '#6a2420')} opacity={0.35} />
      </>
    ),
    shikoku: (
      <>
        {sea}
        <path d="M-20,300 Q40,250 110,285 Q80,320 -20,330 Z" fill={dim('#5c8c55', '#1c2d1f')} />
        <path d="M200,280 Q260,240 330,270 L330,330 Q260,320 200,280 Z" fill={dim('#5c8c55', '#1c2d1f')} />
        <path d="M150,290 Q170,280 185,292 Q168,300 150,290 Z" fill={dim('#6f9d61', '#203322')} />
        {/* cầu dài vượt biển */}
        <path d="M70,286 L240,272" stroke={dim('#f0f3f7', '#ffd27a')} strokeWidth={3} />
        {[100, 150, 200].map((x) => <path key={x} d={`M${x},${284 - (x - 70) * 0.08} l0,-30`} stroke={dim('#f0f3f7', '#ffd27a')} strokeWidth={2} />)}
        <path d="M100,256 Q125,272 150,252 Q175,272 200,248" stroke={dim('#f0f3f7', '#ffd27a')} strokeWidth={1} fill="none" />
      </>
    ),
    kyushu: (
      <>
        <rect x={0} y={260} width={W} height={H - 260} fill={dim('#3a86b0', '#0c1f33')} />
        <path d="M50,262 L135,180 L165,180 L250,262 Z" fill={dim('#5f5a52', '#231f1c')} />
        <path d="M135,180 L165,180 L158,192 L142,192 Z" fill={dim('#3d3833', '#140f0c')} />
        {/* khói núi lửa */}
        <g fill={dim('#d9d4cc', '#4a4a55')} opacity={0.85}>
          <circle cx={150} cy={165} r={12} /><circle cx={162} cy={146} r={15} /><circle cx={178} cy={126} r={18} /><circle cx={198} cy={108} r={20} />
        </g>
        <path d={ridge([[0, 268], [40, 255], [90, 272]], 280)} fill={dim('#4f8a4f', '#1a2d1d')} />
        {[30, 230, 260].map((x) => <path key={x} d={`M${x},300 q4,-14 0,-26 M${x + 8},300 q4,-14 0,-26`} stroke={dim('#ffffff', '#8892a8')} strokeWidth={2} fill="none" opacity={0.6} />)}
      </>
    ),
    okinawa: (
      <>
        <rect x={0} y={235} width={W} height={H - 235} fill={dim('#1fb5c9', '#0b2733')} />
        <rect x={0} y={235} width={W} height={20} fill={dim('#1a8fb8', '#0a1f2c')} />
        <path d="M-10,330 Q120,290 310,320 L310,390 L-10,390 Z" fill={dim('#f6e7c1', '#4a4334')} />
        <path d="M-10,330 Q120,290 310,320" stroke={dim('#ffffff', '#7d8aa0')} strokeWidth={3} fill="none" opacity={0.8} />
        {[[60, 318], [230, 312]].map(([x, y], i) => (
          <g key={i} stroke={dim('#2f6b3a', '#1a2d1d')} strokeWidth={3} fill="none" strokeLinecap="round">
            <path d={`M${x},${y} Q${x + 4},${y - 30} ${x + 2},${y - 50}`} stroke={dim('#8a6a45', '#3a2d22')} />
            <path d={`M${x + 2},${y - 50} q-18,-4 -26,8 M${x + 2},${y - 50} q18,-4 26,8 M${x + 2},${y - 50} q-8,-14 -20,-14 M${x + 2},${y - 50} q8,-14 20,-14`} />
          </g>
        ))}
      </>
    ),
  }
  return <>{parts[scene]}</>
}

export function WindowScene({ scene, hour }: { scene: SceneId; hour: number }) {
  const sky = skyAt(hour)
  const [c0, c1, c2] = SKY[sky]
  const night = sky === 'night'
  const sunY = sky === 'day' ? 70 : sky === 'night' ? 60 : 200
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="block size-full" aria-hidden>
      <style>{'@keyframes hibi-cloud { from { transform: translateX(0) } to { transform: translateX(-300px) } }'}</style>
      <defs>
        <linearGradient id={`sky-${sky}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c0} /><stop offset="0.55" stopColor={c1} /><stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${sky})`} />
      {night && Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 97) % W} cy={(i * 53) % 180} r={i % 4 ? 0.8 : 1.4} fill="#fff" opacity={0.8} />)}
      {night ? <circle cx={230} cy={sunY} r={14} fill="#f4f1de" /> : <circle cx={210} cy={sunY} r={sky === 'day' ? 18 : 24} fill={sky === 'day' ? '#fff7d6' : '#ffd28a'} opacity={0.95} />}
      <Land scene={scene} night={night} />
      <g>
        <Clouds y={130} dur={70} opacity={night ? 0.25 : 0.75} light={night ? '#8b93b8' : '#ffffff'} />
        <Clouds y={205} dur={45} opacity={night ? 0.2 : 0.55} light={night ? '#8b93b8' : '#ffffff'} />
      </g>
    </svg>
  )
}

/** Khung cửa sổ máy bay bao quanh cảnh. */
export function AirplaneWindow({ scene, hour, className = '' }: { scene: SceneId; hour: number; className?: string }) {
  return (
    <div className={`relative mx-auto aspect-[3/4] w-full max-w-[280px] rounded-[42%/32%] bg-gradient-to-b from-[#d9dde3] to-[#aab1bb] p-[7%] shadow-[0_20px_60px_rgba(0,0,0,0.45)] ${className}`}>
      <div className="relative size-full overflow-hidden rounded-[40%/30%] shadow-[inset_0_6px_18px_rgba(0,0,0,0.55)] ring-4 ring-[#eef0f3]">
        <WindowScene scene={scene} hour={hour} />
        {/* tấm che cửa sổ kéo lên một chút */}
        <div className="absolute inset-x-0 top-0 h-[9%] bg-gradient-to-b from-[#e7eaee] to-[#c9ced6] shadow-md" />
        <div className="pointer-events-none absolute inset-0 rounded-[40%/30%] bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      </div>
    </div>
  )
}
