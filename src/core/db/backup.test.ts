// Kiểm tra sao lưu .zip và khôi phục an toàn (#2, #3), cùng việc tách ảnh/tiếng khỏi thẻ (#1).
// Chạy trên kho giả lập (fake-indexeddb).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clear, get, getAll, kvGet, kvSet, put } from '@/core/db'
import {
  createBackupZip, getRestoreSnapshot, inspectBackup, restoreBackup, undoLastRestore, type BackupFile,
} from './backup'
import { DB_VERSION, backupStores } from './schema'
import { addCards } from '@/modules/review/store'
import { withMedia } from '@/modules/review/media'
import type { SrsCard } from '@/modules/review/types'

// Ảnh PNG 1×1 và một "tiếng" kiểu lạ (giữ nguyên chuỗi)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const ODD = 'data:audio/x-strange;base64,AAECAwQ='

beforeEach(async () => {
  for (const s of [...backupStores, 'backupSnapshots'] as const) await clear(s)
})

describe('ảnh, tiếng tách khỏi thẻ', () => {
  it('thẻ trong srsCards chỉ giữ cờ, ảnh/tiếng nằm ở srsMedia', async () => {
    await addCards([{ deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo', image: PNG, audio: ODD }])
    const [card] = await getAll<SrsCard>('srsCards')
    expect(card.image).toBeUndefined()
    expect(card.audio).toBeUndefined()
    expect(card.media).toEqual({ image: true, audio: true })
    const full = await withMedia(card)
    expect(full.image).toBe(PNG)
    expect(full.audio).toBe(ODD)
  })
})

describe('sao lưu .zip rồi khôi phục', () => {
  it('trả lại đủ thẻ, ảnh, tiếng và kv', async () => {
    await addCards([
      { deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo', image: PNG, audio: ODD },
      { deck: 'A', kind: 'vocab', front: '犬', meaning: 'chó' },
    ])
    await kvSet('today:goal', 25)
    const b = await createBackupZip()
    expect(b.rows).toBe(4) // 2 thẻ + 1 kv + 1 media
    expect(b.media).toBe(2)

    const sum = await inspectBackup(b.blob)
    expect(sum.format).toBe(2)
    expect(sum.counts.srsCards).toBe(2)
    expect(sum.media).toBe(2)

    await clear('srsCards'); await clear('srsMedia'); await clear('kv')
    const r = await restoreBackup(b.blob, { safety: false })
    expect(r.media).toBe(2)
    const cards = await getAll<SrsCard>('srsCards')
    expect(cards).toHaveLength(2)
    const cat = await withMedia(cards.find((c) => c.front === '猫')!)
    expect(cat.image).toBe(PNG)
    expect(cat.audio).toBe(ODD)
    expect(await kvGet('today:goal', 0)).toBe(25)
  })

  it('dữ liệu không đổi thì dấu vân tay giống nhau', async () => {
    await addCards([{ deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo', image: PNG }])
    const a = await createBackupZip()
    const b = await createBackupZip()
    expect(a.hash).toBe(b.hash)
    await kvSet('x', 1)
    expect((await createBackupZip()).hash).not.toBe(a.hash)
  })
})

describe('khôi phục an toàn', () => {
  const oldFile = (): BackupFile => ({
    app: 'hibi-nihongo', format: 1, dbVersion: 3, createdAt: 1,
    // File cũ: thẻ còn chứa ảnh, và chưa có bảng Kho từ
    stores: { srsCards: [['c1', { id: 'c1', deck: 'Cũ', kind: 'vocab', front: '本', meaning: 'sách', image: PNG, due: 0, state: 0 }]], kv: [] },
  })

  it('bảng file không có thì giữ nguyên; thẻ cũ có ảnh được tách', async () => {
    await put('knownWords', { w: '水', status: 'known' })
    await addCards([{ deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo' }])
    const sum = await inspectBackup(new Blob([JSON.stringify(oldFile())]))
    expect(sum.missing).toContain('knownWords')

    await restoreBackup(oldFile())
    expect(await getAll('knownWords')).toHaveLength(1) // giữ nguyên
    const cards = await getAll<SrsCard>('srsCards')
    expect(cards.map((c) => c.front)).toEqual(['本']) // thẻ được thay
    expect(cards[0].image).toBeUndefined()
    expect(cards[0].media?.image).toBe(true)
    expect((await get<{ image: string }>('srsMedia', 'c1'))?.image).toBe(PNG)
  })

  it('hoàn tác khôi phục trả dữ liệu về như trước', async () => {
    await addCards([{ deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo', image: PNG }])
    const r = await restoreBackup(oldFile())
    expect(r.snapshot).toBe(true)
    expect(await getRestoreSnapshot()).not.toBeNull()

    await undoLastRestore()
    const cards = await getAll<SrsCard>('srsCards')
    expect(cards.map((c) => c.front)).toEqual(['猫'])
    expect((await withMedia(cards[0])).image).toBe(PNG)
    expect(await getRestoreSnapshot()).toBeNull()
  })

  it('từ chối file của bản app mới hơn và file lạ, không đụng dữ liệu', async () => {
    await addCards([{ deck: 'A', kind: 'vocab', front: '猫', meaning: 'mèo' }])
    await expect(restoreBackup({ ...oldFile(), dbVersion: DB_VERSION + 1 })).rejects.toThrow(/phiên bản app mới hơn/)
    await expect(restoreBackup(new Blob(['xin chào']))).rejects.toThrow(/không phải file sao lưu/)
    expect(await getAll('srsCards')).toHaveLength(1)
    expect(await getRestoreSnapshot()).toBeNull()
  })
})
