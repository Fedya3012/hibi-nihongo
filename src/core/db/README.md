# Kho dữ liệu offline (`src/core/db`)

Nơi lưu **mọi dữ liệu** của Hibi Nihongo ngay trên máy người dùng. Chạy giống hệt nhau trên Website (PWA)
và bản Windows (Tauri, dùng WebView2), vì cả hai đều có sẵn **IndexedDB**. Không cần mạng.

Các module **chỉ import từ `@/core/db`**:

```ts
import { kvGet, kvSet, useDbQuery, findByKey } from '@/core/db'
```

## Có gì bên trong

| File | Vai trò |
| --- | --- |
| `schema.ts` | Danh sách bảng và các bước nâng cấp kho. **Module mới thêm bảng ở đây.** |
| `idb.ts` | Mở kho, giao dịch, đọc/ghi từng bảng (`get`, `put`, `putMany`...). |
| `kv.ts` | Lưu giá trị nhỏ theo khóa (`kvGet`, `kvSet`). |
| `content.ts` | Gói nội dung có phiên bản: cài, tra cứu, cập nhật chỉ phần thay đổi. |
| `backup.ts` | Sao lưu ra file `.json` và khôi phục. |
| `storage.ts` | Dung lượng đã dùng, xin lưu bền vững. |
| `events.ts`, `useDbQuery.ts` | Báo thay đổi và hook React tự cập nhật. |
| `DataPanel.tsx` | Khối "Dữ liệu trên máy" trong trang Cài đặt. |

## 1. Lưu giá trị nhỏ: `kv`

```ts
await kvSet('today:goal', 20)               // khóa có tiền tố là id module
const goal = await kvGet('today:goal', 10)   // 10 là giá trị mặc định nếu chưa có
await kvDelete('today:goal')
```

Chỉ lưu dữ liệu JSON thuần (số, chữ, mảng, object). Ngày giờ lưu bằng số `Date.now()`.
Bảng `kv` **được sao lưu**.

## 2. Hiển thị dữ liệu và tự cập nhật: `useDbQuery`

```tsx
const { data: goal, loading, error } = useDbQuery(() => kvGet('today:goal', 10), [], ['kv'])
```

Tham số thứ ba là các bảng cần theo dõi. Khi bảng đó được ghi (ở bất kỳ màn hình hoặc tab nào),
hàm đọc chạy lại.

## 3. Thêm bảng riêng cho module (ví dụ module Ôn tập)

Bảng riêng cần thiết khi phải tìm theo một trường (ví dụ "thẻ đến hạn trước giờ X").

1. Trong `schema.ts`, khai báo tên bảng trong `STORES`:
   ```ts
   srsCards: { backup: true },   // dữ liệu học → sao lưu
   srsLogs: { backup: true },
   ```
2. Thêm **một bước mới vào cuối** mảng `migrations` (không sửa bước cũ):
   ```ts
   // Phiên bản 2 (module Ôn tập)
   (db) => {
     const cards = db.createObjectStore('srsCards', { keyPath: 'id' })
     cards.createIndex('by_due', 'due')
     cards.createIndex('by_deck', 'deck')
     const logs = db.createObjectStore('srsLogs', { keyPath: 'id', autoIncrement: true })
     logs.createIndex('by_card', 'cardId')
   },
   ```
3. Dùng các hàm chung:
   ```ts
   await put('srsCards', card)
   await putMany('srsCards', cards)
   const due = await getAllByIndex('srsCards', 'by_due', IDBKeyRange.upperBound(Date.now()))
   await remove('srsCards', id)
   ```
4. Nhiều thao tác phải cùng thành công hoặc cùng thất bại (ví dụ chấm thẻ + ghi lịch sử):
   ```ts
   await transaction(['srsCards', 'srsLogs'], 'readwrite', (tx) => {
     tx.objectStore('srsCards').put(updatedCard)
     tx.objectStore('srsLogs').add(log)
   })
   ```
   Bên trong `transaction` chỉ được `await` các request của chính giao dịch đó (dùng `promisify`),
   không `await fetch` hay hẹn giờ, nếu không giao dịch tự đóng giữa chừng.

Hai thread cùng thêm bước nâng cấp thì gộp theo thứ tự merge: bước nào merge trước là phiên bản trước.

## 4. Gói nội dung (từ điển, kanji, câu ví dụ...)

Nội dung lớn đóng thành **gói** có số phiên bản. Mỗi mục trong gói:

```ts
interface PackItem<D> {
  pack: string      // id gói, ví dụ 'jmdict-vi'
  id: string        // id mục, duy nhất trong gói
  kind?: string     // loại: 'word' | 'kanji' | 'sentence'...
  keys?: string[]   // chuỗi để tra cứu: chữ viết, cách đọc...
  data: D           // nội dung, module sở hữu gói tự định nghĩa
}
```

### Tra cứu

```ts
await findByKey('たべる')                       // khớp chính xác một phần tử trong keys
await findByKey('食べる', { pack: 'jmdict-vi' })
await findByKeyPrefix('たべ', { limit: 20 })     // gợi ý khi đang gõ
await getItem('kanjidic', '食')
await listItems('kanjidic', { kind: 'kanji', limit: 100 })
await listPacks()                               // gói đã cài, phiên bản, số mục
```

Để tra cứu nhanh, module từ điển nên đưa vào `keys` mọi dạng cần tìm (kanji, kana, có thể cả romaji).
Tra theo nghĩa tiếng Việt (tìm kiếm toàn văn) không nằm ở đây: module từ điển tự làm chỉ mục riêng.

### Định dạng file

Danh mục `manifest.json` (mặc định là `public/content/manifest.json`, đi kèm app; đổi được bằng biến
môi trường `VITE_CONTENT_MANIFEST_URL`):

```json
{
  "format": 1,
  "packs": [
    {
      "id": "jmdict-vi",
      "title": "Từ điển JMdict",
      "license": "CC BY-SA 4.0 (EDRDG)",
      "version": 3,
      "full": { "url": "jmdict-vi.v3.json.gz", "size": 18400000, "sha256": "…" },
      "patches": [
        { "from": 1, "to": 2, "url": "jmdict-vi.1-2.json.gz", "size": 52000 },
        { "from": 2, "to": 3, "url": "jmdict-vi.2-3.json.gz", "size": 31000 }
      ]
    }
  ]
}
```

Link `url` có thể tương đối so với vị trí manifest. `size` và `sha256` không bắt buộc nhưng nên có
(để hiện dung lượng và kiểm tra file không bị hỏng). File đuôi `.gz` được tự giải nén.

Gói đầy đủ:
```json
{ "format": 1, "type": "full", "pack": "jmdict-vi", "version": 3, "title": "Từ điển JMdict",
  "items": [ { "id": "1358280", "kind": "word", "keys": ["食べる", "たべる"], "data": { } } ] }
```

Bản vá:
```json
{ "format": 1, "type": "patch", "pack": "jmdict-vi", "from": 2, "to": 3,
  "upsert": [ { "id": "1358280", "kind": "word", "keys": ["食べる", "たべる"], "data": { } } ],
  "delete": ["1000220"] }
```

### Cập nhật hoạt động thế nào

1. `fetchManifest()` tải danh mục.
2. `planUpdates(manifest)` so với máy: gói nào cũ hơn thì tìm chuỗi bản vá từ phiên bản trên máy
   tới bản mới nhất (ưu tiên bản vá nhảy xa). Thiếu mắt xích, hoặc tổng bản vá nặng hơn bản đầy đủ,
   thì tải bản đầy đủ. `{ includeNew: true }` để liệt kê cả gói chưa cài.
3. `runUpdates(plan, onProgress)` tải và cài. Gói lỗi được báo trong `failed`, gói khác vẫn cập nhật.

`updateInstalledPacks()` làm cả ba bước cho các gói đã cài.

An toàn khi mất điện hoặc tắt app giữa chừng:
- **Bản vá** chạy trong một giao dịch: lỗi thì gói giữ nguyên phiên bản cũ.
- **Bản đầy đủ** ghi từng đợt 5.000 mục, gói ở trạng thái `installing` cho tới khi ghi xong.
  Lần cập nhật sau thấy `installing` sẽ cài lại bản đầy đủ. Trong lúc đang cài, gói đó tạm trống.

Cài từ file (khi không có mạng): `installPackFile(file)`. Cài từ dữ liệu có sẵn: `installPackData(obj)`.
Gỡ: `removePack(id)`.

## 5. Sao lưu và khôi phục

```ts
await downloadBackup()            // tải file hibi-nihongo-sao-luu-YYYY-MM-DD.json về máy
const backup = await createBackup() // hoặc lấy object để tự xử lý (đồng bộ sau này)
await restoreBackup(file)          // THAY THẾ dữ liệu học hiện tại
```

File sao lưu gồm mọi bảng có `backup: true` và cài đặt giao diện. Gói nội dung không nằm trong file.
File từ bản app mới hơn sẽ bị từ chối (tránh mất dữ liệu); file từ bản cũ hơn khôi phục được bình thường.

## 6. Dung lượng

```ts
const { usage, quota, persisted } = await getStorageInfo()
formatBytes(usage) // "1,2 MB"
```

Khi mở kho lần đầu, app xin trình duyệt **lưu bền vững** để dữ liệu không bị tự xóa khi máy đầy ổ.
Chrome/Edge thường chấp nhận ngay khi app đã được cài dạng PWA. Bản Windows lưu trong thư mục dữ liệu
của app nên không bị ảnh hưởng.

## Vì sao dùng IndexedDB mà không dùng SQLite?

Giai đoạn 1 chỉ có Website và Windows. IndexedDB có sẵn ở cả hai, nên chỉ cần một bộ code và không phải
đóng gói thêm thư viện. Mọi module đi qua API ở trên, nên sau này nếu bản Android cần SQLite thì chỉ thay
phần bên trong `src/core/db`, các module khác không phải sửa.
