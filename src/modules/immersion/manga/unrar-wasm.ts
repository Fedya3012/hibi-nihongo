/**
 * Bộ giải nén RAR (WebAssembly, ~200 KB) được nhúng vào code dưới dạng base64 ("?inline"),
 * để chỉ tải khi nhập file CBR và vẫn chạy được khi offline (bản PWA không lưu sẵn file .wasm).
 */
import wasmDataUrl from 'node-unrar-js/esm/js/unrar.wasm?url&inline'

export async function loadUnrarWasm(): Promise<ArrayBuffer> {
  const base64 = wasmDataUrl.slice(wasmDataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}
