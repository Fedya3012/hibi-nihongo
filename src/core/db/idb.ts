/**
 * LỚP CƠ BẢN: mở kho và đọc/ghi từng bảng.
 * IndexedDB gốc dùng callback khá rườm rà, ở đây gói lại thành hàm async/await cho dễ dùng.
 */
import { DB_NAME, DB_VERSION, migrations, type StoreName } from './schema'
import { emitChange } from './events'
import { requestPersistentStorage } from './storage'
import { isQuotaError, reportQuotaError, QUOTA_MESSAGE } from './quota'

let dbPromise: Promise<IDBDatabase> | null = null

/** Mở kho (chỉ mở một lần, các lần sau dùng lại). Tự chạy các bước nâng cấp còn thiếu. */
export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const current: Promise<IDBDatabase> = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt này không hỗ trợ lưu dữ liệu offline (IndexedDB).'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = request.result
      const tx = request.transaction!
      for (let v = e.oldVersion; v < DB_VERSION; v++) migrations[v](db, tx)
    }
    request.onsuccess = () => {
      const db = request.result
      // Một tab khác mở bản app mới hơn và cần nâng cấp kho: đóng kết nối cũ để không chặn nó.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      // Trình duyệt tự đóng kết nối (máy thiếu RAM, tab ngủ lâu, xóa dữ liệu trang web...):
      // quên kết nối cũ, lần đọc/ghi sau tự mở lại thay vì báo lỗi tới khi tải lại trang.
      db.onclose = () => {
        if (dbPromise === current) dbPromise = null
      }
      // Xin trình duyệt đừng tự xóa dữ liệu khi máy đầy ổ (không chặn việc mở kho)
      void requestPersistentStorage()
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error('Không mở được kho dữ liệu'))
    }
    request.onblocked = () => {
      console.warn('[db] Đang chờ các tab cũ của app đóng lại để nâng cấp kho dữ liệu.')
    }
  })
  dbPromise = current
  return current
}

/** Kết nối đã bị đóng (InvalidStateError khi mở giao dịch): bỏ kết nối cũ để mở lại. */
async function startTransaction(list: StoreName[], mode: IDBTransactionMode): Promise<IDBTransaction> {
  const db = await openDb()
  try {
    return db.transaction(list, mode)
  } catch (err) {
    if ((err as DOMException)?.name !== 'InvalidStateError') throw err
    if (dbPromise) { try { (await dbPromise).close() } catch { /* đã đóng */ } }
    dbPromise = null
    return (await openDb()).transaction(list, mode)
  }
}

/** Đổi lỗi "hết chỗ" thành câu dễ hiểu và báo cho thanh cảnh báo chung (src/modules/storage). */
function friendly(err: unknown): unknown {
  if (!isQuotaError(err)) return err
  reportQuotaError()
  const e = new Error(QUOTA_MESSAGE)
  e.name = 'QuotaExceededError'
  return e
}

/** Biến một IDBRequest thành Promise. */
export function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Chạy nhiều thao tác trong MỘT giao dịch: hoặc tất cả thành công, hoặc không có gì thay đổi.
 * Lưu ý: bên trong `fn` chỉ được await các request của chính giao dịch này
 * (không await fetch, setTimeout...), nếu không giao dịch sẽ tự đóng giữa chừng.
 */
export async function transaction<T>(
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => T | Promise<T>,
): Promise<T> {
  const list = Array.isArray(stores) ? stores : [stores]
  const tx = await startTransaction(list, mode)
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('Giao dịch bị hủy'))
    tx.onerror = () => reject(tx.error)
  })
  let result: T
  try {
    result = await fn(tx)
  } catch (err) {
    try { tx.abort() } catch { /* đã đóng */ }
    const txErr = await done.then(() => null, (e) => e)
    // Lỗi thật thường là lỗi của giao dịch (vd hết chỗ) chứ không phải lỗi "đã hủy" của request
    throw friendly(isQuotaError(txErr) ? txErr : err)
  }
  try {
    await done
  } catch (err) {
    throw friendly(err)
  }
  if (mode === 'readwrite') emitChange(list)
  return result
}

// ----- Các hàm tiện dụng cho từng bảng -----

export function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return transaction(store, 'readonly', (tx) => promisify<T | undefined>(tx.objectStore(store).get(key)))
}

export function getAll<T>(store: StoreName, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<T[]> {
  return transaction(store, 'readonly', (tx) => promisify<T[]>(tx.objectStore(store).getAll(query, count)))
}

/** Lấy theo chỉ mục (index), ví dụ getAllByIndex('packItems', 'by_key', '食べる'). */
export function getAllByIndex<T>(
  store: StoreName, index: string, query?: IDBValidKey | IDBKeyRange | null, count?: number,
): Promise<T[]> {
  return transaction(store, 'readonly', (tx) =>
    promisify<T[]>(tx.objectStore(store).index(index).getAll(query, count)))
}

export function count(store: StoreName, query?: IDBValidKey | IDBKeyRange): Promise<number> {
  return transaction(store, 'readonly', (tx) => promisify(tx.objectStore(store).count(query)))
}

/** Thêm hoặc ghi đè một dòng. `key` chỉ cần cho bảng có khóa nằm ngoài (như kv). */
export function put<T>(store: StoreName, value: T, key?: IDBValidKey): Promise<void> {
  return transaction(store, 'readwrite', (tx) => {
    tx.objectStore(store).put(value, key)
  })
}

/** Ghi nhiều dòng cùng lúc trong một giao dịch (nhanh hơn nhiều so với put từng dòng). */
export function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  return transaction(store, 'readwrite', (tx) => {
    const os = tx.objectStore(store)
    for (const v of values) os.put(v)
  })
}

export function remove(store: StoreName, key: IDBValidKey | IDBKeyRange): Promise<void> {
  return transaction(store, 'readwrite', (tx) => {
    tx.objectStore(store).delete(key)
  })
}

export function clear(store: StoreName): Promise<void> {
  return transaction(store, 'readwrite', (tx) => {
    tx.objectStore(store).clear()
  })
}
