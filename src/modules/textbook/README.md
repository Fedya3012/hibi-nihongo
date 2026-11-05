# Module Giáo trình — `src/modules/textbook`

Học theo **bài** của giáo trình bạn đang dùng: Minna no Nihongo, Genki, hoặc bất kỳ sách nào bạn tự tạo.
Đường dẫn: **Học → Giáo trình** (`/#/learn/textbook`). Kế hoạch đầy đủ (6 bước) nằm trong tài liệu kế hoạch của dự án.

## Bản quyền: app chỉ có khung sách

App **chỉ** có tên sách, phiên bản và số bài (`templates.ts`). Từ vựng, hội thoại, audio, bài đọc của từng bài
do bạn tự nhập từ sách của mình và chỉ nằm trên máy bạn. Giải thích ngữ pháp lấy từ module Ngữ pháp (tự soạn).
Hibi Nihongo không liên quan tới nhà xuất bản các sách này.

## Dùng thế nào (bước 1 đã làm)

| Màn hình | Làm gì |
| --- | --- |
| **Kệ sách** | Thêm sách: chọn khung có sẵn (Minna I/II bản 2, Genki I/II bản 3) hoặc tạo "Giáo trình khác" (tên, bài đầu, số bài). Mỗi sách có thanh tiến độ và nút **Học tiếp bài N**. |
| **Một cuốn sách** | Lưới các bài: trạng thái, số từ đã thuộc, 🔒 bài đang khóa, "Nên ôn lại" khi quên nhiều. Bật **Học tuần tự** để khóa bài sau tới khi bài trước xong hoặc thuộc ≥ 80% từ (kéo để đổi). **Ôn các bài đã học** mở Ôn tập chỉ với thẻ của các bài đó. |
| **Một bài** | Tên bài, trạng thái Chưa học / Đang học / Xong, tiến độ, **Học bài này** (đưa từ vào Ôn tập), **Ôn riêng bài này**, **Học tiếp bài sau**, ghi chú của bài, và 7 mục: Từ vựng · Ngữ pháp · Hội thoại · Luyện nghe · Bài tập · Kanji · Đọc hiểu/Viết. |

**Từ vựng:** bấm *Thêm từ*, dán danh sách (mỗi dòng một từ). Nhận được `食べます たべます ăn`, `先生（せんせい）- giáo viên`,
`わたし 私 tôi`, cột copy từ Excel / Google Sheets, có hoặc không có số thứ tự. *Xem trước* tự tra Từ điển để điền cách đọc
(kể cả thể ます), loại từ và gợi ý nghĩa tiếng Anh khi bạn chưa có nghĩa tiếng Việt. Mỗi từ: bấm để tra, lọc theo Đã thuộc /
Đang học / Chưa học và loại từ, sửa, xóa, đổi thứ tự, ghi chú riêng, bấm nhãn trạng thái để tự đánh dấu thuộc / chưa thuộc.

**Kanji:** tự rút từ từ vựng của bài (+ chữ thêm tay): Hán Việt, nghĩa, On/Kun, từ trong bài có chữ đó, bấm chữ để xem
nét viết, nút **Luyện viết**, **Đưa Kanji của bài vào Ôn tập**.

Các mục Ngữ pháp, Hội thoại, Luyện nghe, Bài tập, Đọc hiểu hiện "Sẽ có ở bước N" cho tới khi làm xong.

## Ôn tập theo bài

- Mỗi bài có **nhãn** `<tiền tố>-<số bài>`, ví dụ `minna-5`, `genki-12`. Thẻ mới vào bộ thẻ `Minna I · Bài 5`.
- Từ đã có thẻ (thêm từ manga, từ điển…) **không bị tạo thẻ trùng**: thẻ cũ chỉ được gắn thêm nhãn của bài.
- Ôn một hoặc nhiều bài: `/review?tags=minna-5,minna-6` (module Ôn tập có thêm lọc theo nhãn).
- **Đã thuộc** = bạn tự đánh dấu, hoặc thẻ Ôn tập đã nhớ được ít nhất 7 ngày (độ bền FSRS ≥ 7).

## Đường dẫn mở thẳng

`?b=minna-1` (một sách) · `?b=minna-1&l=5` (bài 5) · `?b=minna-1&l=5&s=kanji` (mục Kanji: `vocab`, `grammar`, `dialogue`,
`listening`, `exercise`, `kanji`, `reading`).

## Dữ liệu

| Bảng | Nội dung | Sao lưu |
| --- | --- | --- |
| `textbooks` | Sách: tên, khung gốc, tiền tố nhãn, học tuần tự, bài mở gần nhất | Có |
| `textbookLessons` | Bài (khóa `<sách>:<số bài>`): từ vựng, ghi chú, trạng thái, Kanji thêm tay, mã mẫu ngữ pháp | Có |
| `textbookMedia` | File audio của bài (dùng từ bước 3) | Không (nặng, nhập lại được) |

## File

| File | Vai trò |
| --- | --- |
| `TextbookPage.tsx` | Trang chính, đọc đường dẫn |
| `Shelf.tsx`, `BookView.tsx`, `LessonView.tsx` | Kệ sách, một sách, một bài |
| `sections/` | Các mục của bài (Từ vựng, Kanji, mục sắp có) |
| `templates.ts` | Khung sách có sẵn. **Thêm sách mới: thêm một dòng ở đây** |
| `store.ts` | Đọc/ghi sách, bài, từ |
| `lib/parse.ts` | Đọc danh sách từ được dán vào |
| `lib/match.ts` | Tra Từ điển: cách đọc, loại từ, mã từ |
| `lib/learn.ts` | Đưa bài vào Ôn tập (nhãn, bộ thẻ, không trùng) |
| `lib/progress.ts` | Đã thuộc, % mỗi bài, khóa bài, bài tiếp theo |
| `strings.ts`, `ui.tsx` | Chữ giao diện (Việt/Anh/Nhật), mảnh giao diện dùng chung |
