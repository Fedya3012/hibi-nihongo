/**
 * VẼ PITCH ACCENT (trọng âm cao độ)
 * Số n = vị trí hạ giọng: 0 = bằng (heiban: thấp → cao, không hạ), 1 = cao ở âm đầu rồi hạ (atamadaka),
 * n = cao từ âm 2 tới âm n rồi hạ. Âm cao có gạch trên, chỗ hạ giọng có gạch dọc.
 */
import { splitMora } from '../lib/kana'

const NAMES: Record<string, string> = { '0': 'bằng (heiban)', '1': 'cao đầu (atamadaka)' }

function patternName(n: number, total: number) {
  if (NAMES[n]) return NAMES[n]
  return n === total ? 'cao đuôi (odaka)' : 'cao giữa (nakadaka)'
}

export function PitchAccent({ reading, accent }: { reading: string; accent: number }) {
  const mora = splitMora(reading)
  const high = (i: number) => (accent === 0 ? i > 0 : accent === 1 ? i === 0 : i > 0 && i < accent)
  return (
    <span className="inline-flex items-center gap-2" title={`Pitch accent [${accent}]: ${patternName(accent, mora.length)}`}>
      <span className="jp inline-flex leading-none" aria-label={`Trọng âm ${accent}`}>
        {mora.map((m, i) => (
          <span
            key={i}
            className={`border-t-2 pt-0.5 ${high(i) ? 'border-primary' : 'border-transparent'} ${
              accent > 0 && i === accent - 1 ? 'border-r-2 border-r-primary' : ''
            }`}
          >
            {m}
          </span>
        ))}
        {/* chỗ của trợ từ phía sau (が, は...): cao nếu heiban, thấp nếu đã hạ giọng */}
        <span aria-hidden className={`ml-0.5 w-3 border-t-2 border-dashed pt-0.5 ${accent === 0 ? 'border-primary' : 'border-transparent'}`}>{'\u00a0'}</span>
      </span>
      <span className="text-xs text-muted">[{accent}]</span>
    </span>
  )
}
