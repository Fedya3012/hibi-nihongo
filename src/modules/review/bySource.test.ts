// Kiểm tra thêm thẻ không tạo trùng (#11), và tra thẻ theo nguồn.
// Chạy trên kho thật (giả lập bằng fake-indexeddb). Nếu kho chưa có chỉ mục by_source / by_front thì
// code tự đọc hết thẻ, nên test này đúng cả trước và sau khi có chỉ mục.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clear, getAll } from '@/core/db'
import { addCards, attachMediaBySource, tagCardsBySource } from './store'
import { cardsWithSources, possibleDuplicates } from './bySource'
import type { SrsCard } from './types'

const dict = (ref: string) => ({ module: 'dictionary', ref })

beforeEach(async () => { await clear('srsCards') })

describe('thêm thẻ không trùng', () => {
  it('bỏ thẻ cùng nguồn, hoặc cùng bộ + loại + mặt trước', async () => {
    expect(await addCards([
      { deck: 'A', kind: 'vocab', front: '食べる', meaning: 'ăn', source: dict('1') },
      { deck: 'A', kind: 'vocab', front: '飲む', meaning: 'uống' },
    ])).toBe(2)
    expect(await addCards([
      { deck: 'B', kind: 'vocab', front: '別', meaning: 'x', source: dict('1') }, // trùng nguồn
      { deck: 'A', kind: 'vocab', front: ' 飲む ', meaning: 'uống' }, // trùng bộ + mặt trước
      { deck: 'B', kind: 'vocab', front: '飲む', meaning: 'uống' }, // bộ khác: được thêm
      { deck: 'A', kind: 'kanji', front: '飲む', meaning: 'uống' }, // loại khác: được thêm
      { deck: 'A', kind: 'vocab', front: '', meaning: 'thiếu chữ' }, // thiếu mặt trước: bỏ
    ])).toBe(2)
    expect(await getAll<SrsCard>('srsCards')).toHaveLength(4)
  })

  it('trùng ngay trong cùng một lần thêm', async () => {
    expect(await addCards([
      { deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo', source: dict('9') },
      { deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo' },
      { deck: 'C', kind: 'vocab', front: 'ねこ', meaning: 'mèo', source: dict('9') },
    ])).toBe(1)
  })
})

describe('tra theo nguồn', () => {
  beforeEach(async () => {
    await addCards([
      { deck: 'A', kind: 'vocab', front: '一', meaning: '1', source: dict('1') },
      { deck: 'A', kind: 'vocab', front: '二', meaning: '2', source: dict('2') },
      { deck: 'A', kind: 'vocab', front: '三', meaning: '3', source: { module: 'manga', ref: '1' } },
      { deck: 'A', kind: 'vocab', front: '四', meaning: '4' },
    ])
  })

  it('cardsWithSources chỉ trả đúng nguồn cần', async () => {
    const found = await cardsWithSources([dict('1'), { module: 'manga', ref: '1' }, dict('404')])
    expect(found.map((c) => c.front).sort()).toEqual(['一', '三'])
    expect(await cardsWithSources([])).toEqual([])
  })

  it('possibleDuplicates gồm mọi thẻ có thể trùng', async () => {
    const found = await possibleDuplicates([{ front: '四' }, { front: 'x', source: dict('2') }])
    const fronts = found.map((c) => c.front)
    expect(fronts).toContain('四')
    expect(fronts).toContain('二')
  })

  it('gắn nhãn theo nguồn', async () => {
    const got = await tagCardsBySource([dict('1'), dict('404')], 'minna-1')
    expect([...got]).toEqual(['dictionary:1'])
    const tagged = (await getAll<SrsCard>('srsCards')).filter((c) => c.tags?.includes('minna-1'))
    expect(tagged.map((c) => c.front)).toEqual(['一'])
  })

  it('gắn tiếng theo nguồn', async () => {
    expect(await attachMediaBySource(dict('2'), { audio: 'data:audio/mp3;base64,AAAA' })).toBe(1)
    expect(await attachMediaBySource(dict('404'), { audio: 'data:audio/mp3;base64,AAAA' })).toBe(0)
  })
})
