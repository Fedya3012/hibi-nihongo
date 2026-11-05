# Đọc văn bản (`src/modules/immersion/reader`)

Đọc **bất kỳ chữ tiếng Nhật nào** trong app: bấm từ để tra, bật furigana, xem mình hiểu bao nhiêu % từ,
và lưu từ kèm câu đang đọc vào Ôn tập. Mở trong app: **Immersion → Đọc văn bản** (`#/immersion/reader`).

## Thêm văn bản (nút "+ Thêm văn bản")

| Cách | Dùng khi | Ghi chú |
| --- | --- | --- |
| **Dán chữ** | Có sẵn chữ (bài báo, tin nhắn, lời bài hát…) | Nút "Dán từ clipboard" dán nhanh. |
| **Link bài viết** | Có link một trang web | App tự lấy phần bài chính, bỏ menu/quảng cáo. **Nhiều trang báo chặn** app tải trực tiếp (chính sách CORS của trình duyệt); khi đó app báo rõ và bạn sao chép chữ rồi dùng "Dán chữ". |
| **File TXT / EPUB** | Sách, truyện tải về | TXT kiểu Shift_JIS/EUC-JP đọc được; ký hiệu Aozora Bunko (`｜漢字《かんじ》`, `［＃…］`) tự được bỏ. TXT có dòng `第一章`, `第3話`… được tách chương. EPUB (cả sách dọc) lấy tên chương từ mục lục. |
| **Theo dõi clipboard** | Chơi game / visual novel, đọc web | Mỗi lần bạn sao chép một câu tiếng Nhật rồi quay lại app, câu đó tự được thêm vào cuối. Trình duyệt hỏi quyền đọc clipboard một lần. Nếu trình duyệt không cho (Firefox, Safari): nhấn **Ctrl+V** trong trình đọc. App chỉ đọc clipboard khi cửa sổ app đang được chọn. |

## Trong trình đọc

- **Bấm vào từ** → popup tra từ (của module Từ điển, có chia ngược động từ). Máy tính: di chuột cũng được.
- **Thanh dưới** hiện từ vừa tra:
  - **+ Thẻ kèm câu này**: tạo thẻ từ vựng trong bộ `Đọc · <tên văn bản>`, mặt đáp án có câu bạn đang đọc
    dạng điền chỗ trống. Dùng cùng nguồn với nút "Thêm vào ôn tập" của Từ điển (id JMdict) nên không tạo trùng.
  - **Đã biết**: đánh dấu từ đã biết (không cần tạo thẻ).
- **Hiểu x% từ trên trang**: so các từ trên trang với từ bạn đã biết. Bấm "n từ mới" để xem danh sách, bấm từ để tra.
- **Furigana**, **Chữ dọc** (縦書き), **Cỡ chữ**: nhớ cho lần sau. Có nhiều chương thì có ô chọn chương.
- Văn bản dài được chia trang (~2.500 ký tự). Phím **← →** hoặc **PageUp/PageDown** để đổi trang
  (chữ dọc: ← là trang sau). App nhớ trang đang đọc; trang cuối có nút "Đánh dấu đã đọc xong".

## Từ "đã biết" lấy từ đâu

Từ kho từ dùng chung (module `vocab`, `@/modules/vocab/api`), qua một file duy nhất `known.ts`.
Chữ trong trình đọc tự được gạch chân theo trạng thái (mới / đang học) vì trình đọc dùng `<JapaneseText>`,
và popup tra từ có sẵn nút đánh dấu. Nút "Đã biết" ở thanh dưới ghi vào cùng kho đó (nguồn `reader`).

## Dữ liệu được lưu ở đâu

Không thêm bảng mới. Dùng bảng `kv` (có trong file sao lưu):

| Khóa | Nội dung |
| --- | --- |
| `reader:docs` | Danh sách văn bản: tên, nguồn, số ký tự, trang đang đọc, đã đọc xong chưa |
| `reader:doc:<id>` | Nội dung: các chương, mỗi chương là danh sách đoạn văn |

Tùy chọn hiển thị (furigana, chữ dọc, cỡ chữ) lưu trong localStorage (`hibi-reader`).

## Các file

| File | Vai trò |
| --- | --- |
| `ReaderPage.tsx` | Trang chính: thư viện hoặc trình đọc (`?doc=<id>`) |
| `Library.tsx`, `AddDialog.tsx` | Thư viện, hộp thoại thêm văn bản |
| `ReaderView.tsx` | Trình đọc: trang, công cụ, tỉ lệ hiểu, thanh lưu thẻ, chế độ clipboard |
| `importers.ts` | Đọc chữ dán, trang web, TXT, EPUB (giải nén bằng `fflate`), clipboard |
| `mining.ts` | Cắt câu quanh từ vừa tra, tạo thẻ Ôn tập |
| `known.ts` | Cầu nối với kho từ đã biết |
| `store.ts`, `types.ts`, `prefs.ts`, `strings.ts` | Lưu trữ, kiểu dữ liệu, tùy chọn, chữ giao diện (Việt/Anh/Nhật) |

Dùng lại `ui.tsx` (Modal, ProgressBar) của manga và `decodeText` (nhận bảng mã) của anime.

## Giới hạn hiện tại

- Link: chỉ mở được trang cho phép tải trực tiếp; trang cần đăng nhập hoặc chặn CORS thì sao chép chữ.
- EPUB chỉ có ảnh (manga) không đọc được ở đây: dùng Đọc manga.
- Chưa có tìm kiếm Ctrl+K cho văn bản (bộ tìm kiếm hiện chỉ quét module cấp 1).
