/**
 * NHỚ THƯ MỤC ĐÃ CHỌN (bản web, Chrome/Edge).
 * "Tay cầm" thư mục (FileSystemDirectoryHandle) chỉ cất được trong IndexedDB, không đưa được vào
 * file .json. Vì vậy nó nằm trong một kho nhỏ riêng "hibi-autobackup", tách khỏi kho dữ liệu học:
 * file sao lưu không chứa nó, và khôi phục cũng không xóa nó.
 */
const DB = 'hibi-autobackup'
const STORE = 'handles'
const KEY = 'dir'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/** Giữ sẵn trong bộ nhớ, để mỗi lần kiểm tra không phải đọc lại kho. undefined = chưa đọc. */
let mem: FileSystemDirectoryHandle | null | undefined

export async function getDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (mem !== undefined) return mem
  try { mem = (await run<FileSystemDirectoryHandle | undefined>('readonly', (s) => s.get(KEY))) ?? null } catch { mem = null }
  return mem
}

export async function setDirHandle(h: FileSystemDirectoryHandle | null): Promise<void> {
  mem = h
  await run<unknown>('readwrite', (s) => (h ? s.put(h, KEY) : s.delete(KEY)) as IDBRequest<unknown>)
}
