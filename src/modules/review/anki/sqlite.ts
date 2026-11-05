/**
 * Mở / tạo file cơ sở dữ liệu SQLite ngay trong trình duyệt (thư viện sql.js, WebAssembly).
 * File bộ thẻ Anki (.apkg) thực chất là file ZIP chứa một cơ sở dữ liệu SQLite.
 *
 * Bộ chạy WebAssembly (~650 KB) được nhúng vào code dạng base64 ("?inline") giống bộ giải nén RAR
 * của manga: chỉ tải khi bấm nhập/xuất Anki, và vẫn chạy được khi offline.
 */
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import wasmDataUrl from 'sql.js/dist/sql-wasm.wasm?url&inline'

let sqlPromise: Promise<SqlJsStatic> | null = null

function decodeWasm(): ArrayBuffer {
  const base64 = wasmDataUrl.slice(wasmDataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export function getSql(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs({ wasmBinary: decodeWasm() })
  return sqlPromise
}
