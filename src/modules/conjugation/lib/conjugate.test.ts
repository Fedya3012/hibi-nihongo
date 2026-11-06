// Kiểm tra bảng chia động từ/tính từ, và chia NGƯỢC (tra từ đã chia về thể từ điển) cho mọi từ luyện tập.
import { describe, expect, it } from 'vitest'
import { WORDS } from '../data/words'
import { FORMS } from './forms'
import { conjugate, isCorrect } from './conjugate'
import { deinflect, posMatches } from '@/modules/dictionary/lib/deinflect'
import type { ConjWord } from '../types'

const word = (w: string) => WORDS.find((x) => x.w === w)!

describe('conjugate', () => {
  it('chia đúng các thể quen thuộc', () => {
    expect(conjugate(word('書く'), 'te')?.w).toBe('書いて')
    expect(conjugate(word('書く'), 'masu')?.w).toBe('書きます')
    expect(conjugate(word('書く'), 'nai')?.r).toBe('かかない')
    expect(conjugate(word('会う'), 'nai')?.w).toBe('会わない')
  })

  it('nhận cả kanji lẫn hiragana, katakana khi chấm', () => {
    const res = conjugate(word('書く'), 'te')!
    expect(isCorrect('書いて', res)).toBe(true)
    expect(isCorrect('かいて', res)).toBe(true)
    expect(isCorrect('カイテ', res)).toBe(true)
    expect(isCorrect('かって', res)).toBe(false)
    expect(isCorrect('', res)).toBe(false)
  })
})

const POS: Record<ConjWord['c'], string> = { v5: 'v5k', v1: 'v1', vs: 'vs-i', vk: 'vk', i: 'adj-i', na: 'adj-na' }

// Trường hợp bất quy tắc mà trình chia ngược chưa hiểu (ghi rõ để biết, không phải lỗi mới):
// ある → ない / なかった (phủ định của ある không có ある trong chữ).
const KNOWN_MISSES = new Set(['ある:nai', 'ある:nakatta'])

describe('chia ngược (deinflect) tìm lại được thể từ điển', () => {
  // Tính từ -な không "chia" theo đuôi (静かじゃない là 静か + じゃない), nên không xét ở đây
  const words = WORDS.filter((w) => w.c !== 'na')
  it.each(words.map((w) => [w.w, w] as const))('%s', (_, w) => {
    const forms = FORMS.filter((f) => (w.c === 'i' ? f.adj : f.verb))
    const missed: string[] = []
    for (const f of forms) {
      const res = conjugate(w, f.id)
      if (!res || KNOWN_MISSES.has(`${w.w}:${f.id}`)) continue
      // 高くないです: です là từ riêng đứng sau (khi tra, bộ tách từ đã tách nó ra)
      const text = w.c === 'i' ? res.w.replace(/です$/, '') : res.w
      // いい chia từ よい (よくない, よかった): trong từ điển いい và よい là cùng một mục
      const base = new Set([w.w, w.w.replace(/いい$/, 'よい')])
      const found = deinflect(text).some((c) => base.has(c.word) && posMatches(c.type, [POS[w.c]]))
      if (!found) missed.push(`${f.id}: ${text}`)
    }
    expect(missed).toEqual([])
  })
})
