# Đọc manga (`src/modules/immersion/manga`)

Đọc manga tiếng Nhật từ **file của chính bạn**. App không kèm truyện nào.
Mở trong app: **Immersion → Đọc manga** (đường dẫn `#/immersion/manga`).

## Dùng thế nào

1. Bấm **+ Thêm manga**, chọn file hoặc kéo thả vào:
   - `.cbz` / `.zip`, `.cbr` / `.rar`, `.pdf`: mỗi file là **một chương**
   - Thư mục ảnh (JPG, PNG, WEBP...): mỗi thư mục con là **một chương**
2. App tự đoán tên series và số chương từ tên file (ví dụ `One Piece - Vol.01 Ch.005.cbz`, `第12話`).
   Sai thì sửa ngay trong hộp thoại. Có nút gợi ý nhanh **D.Gray-man** và **One Piece**.
3. Mở series → bấm **Đọc**. Lần sau mở lại là về đúng trang đang đọc (Smart Resume).

### Trong trình đọc

| Thao tác | Tác dụng |
| --- | --- |
| Bấm/chạm mép trái, mép phải | Lật trang (theo chiều đọc) |
| Bấm giữa màn hình | Ẩn/hiện thanh công cụ |
| Vuốt ngang (điện thoại) | Lật trang |
| Chụm 2 ngón, Ctrl + lăn chuột, phím `+` `−` | Zoom (`0` về 100%) |
| Kéo chuột / ngón tay khi đang zoom | Di chuyển trong trang |
| `←` `→`, Space, Home, End | Lật trang, trang đầu/cuối |
| `D` | Đổi 1 trang / 2 trang |
| `R` | Đổi chiều đọc phải→trái / trái→phải |
| `F` | Toàn màn hình · `Esc` thoát |

Cài đặt (nút ⚙): chiều đọc, **Tự động / 1 trang / 2 trang / Cuộn dọc**, vừa khung / vừa ngang / vừa cao,
trang bìa đứng riêng khi xem 2 trang. Cài đặt lưu **riêng cho từng series**; có nút đặt làm mặc định.
Ở chế độ 2 trang, trang đôi (ảnh ngang) tự đứng riêng.

## Học sâu từ manga (chế độ "📖 Học sâu")

Bấm nút **📖 Học sâu / ☕ Đọc chill** (hoặc phím `M`) để đổi chế độ. Đọc chill ẩn mọi khung, chỉ đọc.

| Việc | Cách làm |
| --- | --- |
| Thêm chữ cho bong bóng thoại | **Giữ ngón tay/chuột** trên trang (hoặc nút ＋, phím `N`), kéo khoanh bong bóng, gõ hoặc dán chữ. Khi có OCR, chữ tự điền và bạn chỉ cần sửa lỗi. |
| Tra từ | Bấm khung bong bóng → bấm từng từ (popup Từ điển: nghĩa, cách đọc, JLPT, pitch, thêm vào Ôn tập). Có furigana bật/tắt. |
| Nghe, shadowing | 🔊 Nghe (đổi tốc độ 1× / 0.7× / 0.5×), **Nói theo** để ghi âm giọng mình rồi nghe lại so sánh. Bảng *Bong bóng* có **Nghe liên tục** cả chương. |
| Ngữ pháp, giọng nhân vật, văn hóa | Tự nhận ra ~30 mẫu ngữ pháp (～てしまう, ～そう, ～らしい…), kiểu nói (kính ngữ, giọng nam/nữ, Kansai, cổ trang, yakuza) và hậu tố, từ tượng thanh, tiếng lóng. Dữ liệu tự soạn trong `study/notes-data.ts`. |
| Lưu vào Ôn tập | **☆ Lưu câu** (1 chạm: câu + ảnh khung tranh + nghĩa từng từ + ngữ pháp + nguồn, bộ thẻ "Manga: <series>", gắn JLPT). **Lưu từ…** để chọn nhiều từ cùng lúc. |
| Chép, chia sẻ | ⧉ chép câu; ↗ chia sẻ câu kèm ảnh panel (máy không có bảng chia sẻ thì tải ảnh về). |
| Từ & Kanji của chương | Bảng 📚 → *Từ & Kanji*: Kanji theo JLPT (bấm để sang module Kanji), từ vựng, từ bạn đã tra; **xuất CSV** (Excel/Anki). |
| Luyện tập | Bảng 📚 → *Luyện*: điền khuyết và nghe chép bằng chính các câu trong chương. |
| Đánh dấu trang | 🔖 hoặc phím `B`; ghi chú cho từng trang trong bảng *Đánh dấu*. |
| Tìm kiếm | Ô tìm ở thư viện: tìm câu, bản dịch, ghi chú, tên chương trong mọi manga, bấm để mở đúng trang. |

Khác: chạm 2 lần ở giữa để zoom; nền sepia và độ sáng trang trong ⚙; thư viện có ★ yêu thích và lọc Đang đọc/Đã đọc;
nhập file đã có sẵn sẽ được cảnh báo trùng. Mọi thứ tự lưu ngay (kể cả khi tắt app đột ngột), xóa bong bóng có **Hoàn tác**.

Dữ liệu: bảng `mangaNotes` (bong bóng, đánh dấu, ghi chú; **có sao lưu**), lịch sử tra từ trong kv `manga:lookups`.

### Chưa làm (cần module/giai đoạn khác)
- OCR tự động (giai đoạn 3; chỗ cắm sẵn ở `integrations.ts`).
- Dịch theo ngữ cảnh panel bằng AI, chấm phát âm/pitch, role-play (giai đoạn 3: Trợ lý, Phát âm).

## Dữ liệu được lưu ở đâu

| Bảng (IndexedDB) | Nội dung | Sao lưu? |
| --- | --- | --- |
| `mangaSeries` | Tên series, tên tiếng Nhật, chương đang đọc, cài đặt đọc | Có |
| `mangaChapters` | Tên/số chương, số trang, kích thước trang, **trang đang đọc**, đã đọc xong chưa | Có |
| `mangaBlobs` | Ảnh trang, file PDF gốc, ảnh bìa nhỏ | **Không** (quá nặng, nhập lại được) |

Khôi phục sao lưu ở máy mới: danh sách chương và tiến độ còn nguyên, chương hiện "thiếu file".
Bấm **Thêm chương** và chọn lại đúng file đó, app gắn ảnh vào chương cũ và giữ trang đang đọc.

## Các file

| File | Vai trò |
| --- | --- |
| `MangaPage.tsx` | Trang chính, chọn màn hình theo đường dẫn (`?series=`, `?read=&page=`) |
| `Library.tsx`, `SeriesView.tsx`, `ImportDialog.tsx` | Thư viện, trang series, hộp thoại nhập |
| `Reader.tsx` | Trình đọc: lật trang, zoom, 2 trang, cuộn dọc, OCR, tra từ |
| `layout.ts` | Tính cách ghép trang đôi và kích thước trang |
| `importer.ts`, `archive.ts`, `pdf.ts`, `unrar-wasm.ts` | Nhập file: giải nén ZIP (fflate), RAR (node-unrar-js), PDF (pdf.js) |
| `pages.ts` | Đưa ảnh trang cho trình đọc (ảnh rời hoặc vẽ trang PDF) |
| `naming.ts` | Đoán tên series, số chương/tập, sắp xếp tự nhiên |
| `store.ts`, `types.ts` | Đọc/ghi kho dữ liệu, kiểu dữ liệu |
| `integrations.ts` | Chỗ nối OCR và Từ điển |
| `api.ts` | API cho module khác (Smart Resume) |

## Cho module khác

```ts
import { useMangaResume } from '@/modules/immersion/manga/api'
const r = useMangaResume() // { seriesTitle, chapterLabel, page, pageCount, path } hoặc undefined
// <Link to={r.path}>Đọc tiếp</Link>
```

**Từ điển:** đã nối sẵn. Trình đọc tự tìm `src/modules/dictionary/api.ts` và gọi `openLookup(text, anchor)`
khi bấm nút **辞 Tra từ** hoặc bấm "Tra" trên chữ OCR.

**OCR (giai đoạn 3):** module OCR chỉ cần đăng ký một lần khi khởi động:

```ts
import { registerMangaOcr } from '@/modules/immersion/manga/integrations'
registerMangaOcr({
  id: 'my-ocr', name: 'Tên bộ OCR',
  recognize: async (image /* Blob vùng người dùng khoanh */, { vertical }) => [{ text: '図書館です' }],
})
```

Khi đã đăng ký, nút **読** trong trình đọc tự bật: người dùng khoanh vùng bong bóng thoại, app cắt đúng
vùng ảnh gốc gửi cho OCR, rồi hiện chữ kèm nút tra từ.

## Giới hạn hiện tại

- Chưa mở được `.cb7`/`.7z` và file RAR có mật khẩu (app báo rõ lỗi).
- File được **chép vào kho của app** (không đọc thẳng từ ổ đĩa), nên chiếm thêm dung lượng bằng file gốc.
  Xóa chương đã đọc để giải phóng.
