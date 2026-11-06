// Kiểm tra đổi romaji/katakana sang hiragana (dùng khi gõ tìm từ điển).
import { describe, expect, it } from 'vitest'
import { furiganaParts, hiraToKata, kataToHira, romajiToHiragana, splitMora } from './kana'

describe('kana', () => {
  it('romaji → hiragana', () => {
    expect(romajiToHiragana('taberu')).toBe('たべる')
    expect(romajiToHiragana('kitte')).toBe('きって')
    expect(romajiToHiragana('konnichiha')).toBe('こんにちは')
    expect(romajiToHiragana('shimbun')).toBe('しんぶん')
    expect(romajiToHiragana('matcha')).toBe('まっちゃ')
    expect(romajiToHiragana('hello world!')).toBeNull()
  })

  it('katakana ↔ hiragana', () => {
    expect(kataToHira('カタカナ')).toBe('かたかな')
    expect(hiraToKata('ひらがな')).toBe('ヒラガナ')
  })

  it('tách âm tiết', () => {
    expect(splitMora('きょう')).toEqual(['きょ', 'う'])
    expect(splitMora('がっこう')).toEqual(['が', 'っ', 'こ', 'う'])
  })

  it('furigana chỉ gắn trên phần kanji', () => {
    const parts = furiganaParts('食べる', 'たべる')
    expect(parts.map((p) => p.text).join('')).toBe('食べる')
    expect(parts.find((p) => p.text === '食')?.rt).toBe('た')
  })
})
