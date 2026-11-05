/**
 * WEB WORKER TÁCH TỪ (chạy ngầm, không làm đứng giao diện)
 * Dùng Kuromoji (Apache-2.0) với từ điển IPADIC đi kèm thư viện (~17 MB nén).
 * Lần đầu: tải 12 file từ điển và lưu vào bộ nhớ đệm của trình duyệt (Cache Storage),
 * các lần sau đọc từ máy nên chạy được khi không có mạng.
 */
import DynamicDictionaries from 'kuromoji/src/dict/DynamicDictionaries'
import Tokenizer, { type IpadicToken } from 'kuromoji/src/Tokenizer'
import base from 'kuromoji/dict/base.dat.gz?url'
import check from 'kuromoji/dict/check.dat.gz?url'
import tid from 'kuromoji/dict/tid.dat.gz?url'
import tidPos from 'kuromoji/dict/tid_pos.dat.gz?url'
import tidMap from 'kuromoji/dict/tid_map.dat.gz?url'
import cc from 'kuromoji/dict/cc.dat.gz?url'
import unk from 'kuromoji/dict/unk.dat.gz?url'
import unkPos from 'kuromoji/dict/unk_pos.dat.gz?url'
import unkMap from 'kuromoji/dict/unk_map.dat.gz?url'
import unkChar from 'kuromoji/dict/unk_char.dat.gz?url'
import unkCompat from 'kuromoji/dict/unk_compat.dat.gz?url'
import unkInvoke from 'kuromoji/dict/unk_invoke.dat.gz?url'

export type WorkerRequest = { id: number; text: string }
export type WorkerResponse =
  | { id: number; tokens: IpadicToken[] }
  | { id: number; error: string }
  | { id: -1; status: 'ready' }

const CACHE = 'hibi-kuromoji-v1'
const FILES = [base, check, tid, tidPos, tidMap, cc, unk, unkPos, unkMap, unkChar, unkCompat, unkInvoke]

/** Tải một file (ưu tiên bản đã lưu trên máy) và giải nén gzip. */
async function load(url: string, store: Cache | null): Promise<ArrayBuffer> {
  const abs = new URL(url, self.location.href).href
  const cacheable = store && abs.startsWith('http')
  let res = cacheable ? await store.match(abs) : undefined
  if (!res) {
    res = await fetch(abs)
    if (!res.ok) throw new Error(`Không tải được từ điển tách từ (mã ${res.status}).`)
    if (cacheable) await store.put(abs, res.clone())
  }
  const bytes = new Uint8Array(await res.arrayBuffer())
  // Có máy chủ tự giải nén file .gz giùm, có máy chủ không: nhìn 2 byte đầu để biết
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

async function build(): Promise<Tokenizer> {
  let store: Cache | null = null
  try {
    if (typeof caches !== 'undefined') {
      store = await caches.open(CACHE)
      // Dọn file của phiên bản cũ (tên file có mã băm, đổi khi cập nhật app)
      const keep = new Set(FILES.map((f) => new URL(f, self.location.href).href))
      for (const req of await store.keys()) if (!keep.has(req.url)) await store.delete(req)
    }
  } catch {
    store = null // trình duyệt chặn bộ nhớ đệm: vẫn chạy, chỉ là lần sau phải tải lại
  }
  const b = await Promise.all(FILES.map((f) => load(f, store)))
  const dic = new DynamicDictionaries()
  dic.loadTrie(new Int32Array(b[0]), new Int32Array(b[1]))
  dic.loadTokenInfoDictionaries(new Uint8Array(b[2]), new Uint8Array(b[3]), new Uint8Array(b[4]))
  dic.loadConnectionCosts(new Int16Array(b[5]))
  dic.loadUnknownDictionaries(
    new Uint8Array(b[6]), new Uint8Array(b[7]), new Uint8Array(b[8]),
    new Uint8Array(b[9]), new Uint32Array(b[10]), new Uint8Array(b[11]),
  )
  return new Tokenizer(dic)
}

const ready = build()
ready.then(
  () => postMessage({ id: -1, status: 'ready' } satisfies WorkerResponse),
  () => {},
)

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, text } = e.data
  try {
    const tokenizer = await ready
    postMessage({ id, tokens: tokenizer.tokenize(text) } satisfies WorkerResponse)
  } catch (err) {
    postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}
