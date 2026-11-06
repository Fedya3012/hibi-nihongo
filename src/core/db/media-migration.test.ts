// Kiểm tra bước nâng cấp kho: thẻ ôn tập đang chứa ảnh/tiếng (máy đã dùng bản cũ) được chuyển
// sang bảng srsMedia, thẻ chỉ còn cờ media, và có chỉ mục tra theo nguồn / mặt trước.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DB_NAME, DB_VERSION, migrations } from './schema'
import { get, openDb } from './idb'

const IMG = 'data:image/jpeg;base64,/9j/AA=='

function openOld(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION - 1)
    r.onupgradeneeded = (e) => {
      for (let v = e.oldVersion; v < DB_VERSION - 1; v++) migrations[v](r.result, r.transaction!)
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

describe('nâng cấp kho: tách ảnh/tiếng của thẻ', () => {
  it('chuyển ảnh/tiếng sang srsMedia', async () => {
    const old = await openOld()
    await new Promise<void>((resolve, reject) => {
      const tx = old.transaction('srsCards', 'readwrite')
      tx.objectStore('srsCards').put({ id: 'a', front: '猫', image: IMG, audio: '', source: { module: 'dictionary', ref: '1' } })
      tx.objectStore('srsCards').put({ id: 'b', front: '犬' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    old.close()

    const db = await openDb()
    expect(db.version).toBe(DB_VERSION)
    const a = await get<Record<string, unknown>>('srsCards', 'a')
    expect(a).toMatchObject({ id: 'a', front: '猫', media: { image: true } })
    expect(a).not.toHaveProperty('image')
    expect(a).not.toHaveProperty('audio')
    expect(await get('srsMedia', 'a')).toEqual({ id: 'a', image: IMG })
    expect(await get('srsCards', 'b')).toEqual({ id: 'b', front: '犬' })
    expect(await get('srsMedia', 'b')).toBeUndefined()
    const idx = db.transaction('srsCards').objectStore('srsCards').indexNames
    expect(idx.contains('by_source') && idx.contains('by_front')).toBe(true)
  })
})
