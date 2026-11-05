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
| **Một cuốn sách** | Lưới các bài: trạng thái, số từ đã thuộc, 🔒 bài đang khóa, "Nên ôn lại" khi quên nhiều. Bật **Học tuần tự** để khóa bài sau tới khi bài trước xong hoặc đạt ≥ 80% (kéo để đổi). **Ôn các bài đã học** mở Ôn tập chỉ với thẻ của các bài đó. |
| **Một bài** | Tên bài, trạng thái Chưa học / Đang học / Xong, tiến độ, **Học bài này** (đưa từ vào Ôn tập), **Ôn riêng bài này**, **Học tiếp bài sau**, ghi chú của bài, và 7 mục: Từ vựng · Ngữ pháp · Hội thoại · Luyện nghe · Bài tập · Kanji · Đọc hiểu/Viết. |

**Từ vựng:** bấm *Thêm từ*, dán danh sách (mỗi dòng một từ). Nhận được `食べます たべます ăn`, `先生（せんせい）- giáo viên`,
`わたし 私 tôi`, cột copy từ Excel / Google Sheets, có hoặc không có số thứ tự. *Xem trước* tự tra Từ điển để điền cách đọc
(kể cả thể ます), loại từ và gợi ý nghĩa tiếng Anh khi bạn chưa có nghĩa tiếng Việt. Mỗi từ: bấm để tra, lọc theo Đã thuộc /
Đang học / Chưa học và loại từ, sửa, xóa, đổi thứ tự, ghi chú riêng, bấm nhãn trạng thái để tự đánh dấu thuộc / chưa thuộc.

**Kanji:** tự rút từ từ vựng của bài (+ chữ thêm tay): Hán Việt, nghĩa, On/Kun, từ trong bài có chữ đó, bấm chữ để xem
nét viết, nút **Luyện viết**, **Đưa Kanji của bài vào Ôn tập**.

**Sách gốc (file PDF / ảnh scan):** ở trang của cuốn sách, mục *Sách gốc của bạn* → **+ Thêm file sách** (hoặc kéo thả).
Mỗi PDF là một file; nhiều ảnh chọn cùng lúc gộp thành một file (mỗi ảnh một trang, xếp theo tên). Trình đọc:
lật trang (nút, phím ← →), phóng to, nhớ trang đang đọc; **Chọn chữ** (PDF có chữ) → *Tra từ / Tô sáng / Ghi chú / Sao chép*;
**Tô sáng** (kéo một vùng, dùng được với ảnh scan); **Ghim ghi chú**; 4 màu; **Đánh dấu trang**; **Trang này là đầu bài…**
để nút **📕 Mở sách** trong màn hình bài mở đúng trang. Danh sách ghi chú: lọc cả sách / trang này, tìm kiếm,
**Tải ghi chú (.md)** (Markdown, nhóm theo bài). File không vào file sao lưu (nặng); ghi chú thì có. Xóa file rồi nhập lại
đúng file đó (cùng tên) thì ghi chú cũ hiện lại.

**Ngữ pháp:** các mẫu của bài lấy từ module Ngữ pháp (Minna/Genki: tự gợi ý theo số bài; sách tự tạo: bạn chọn).
**Sửa danh sách** để thêm / bỏ mẫu, **Về danh sách gợi ý** để quay lại. Mỗi mẫu: cấu trúc, giải thích, lưu ý, ví dụ bổ sung
(bấm từ để tra, nút nghe), **ví dụ bạn chép từ sách** (mỗi dòng `câu | nghĩa`), ghi chú riêng, **Đánh dấu đã hiểu**, **+ Ôn tập**
(thẻ ngữ pháp có nhãn của bài). Cuối mục là **bài luyện** (điền chỗ trống, sắp xếp câu, chọn nghĩa) chỉ với các mẫu của bài;
kết quả ghi chung với trang Ngữ pháp. **Học bài này** cũng đưa luôn ngữ pháp của bài vào Ôn tập.

Các mục Hội thoại, Luyện nghe, Bài tập, Đọc hiểu hiện "Sẽ có ở bước N" cho tới khi làm xong.

## Ôn tập theo bài

- Mỗi bài có **nhãn** `<tiền tố>-<số bài>`, ví dụ `minna-5`, `genki-12`. Thẻ mới vào bộ thẻ `Minna I · Bài 5`.
- Từ đã có thẻ (thêm từ manga, từ điển…) **không bị tạo thẻ trùng**: thẻ cũ chỉ được gắn thêm nhãn của bài.
- Ôn một hoặc nhiều bài: `/review?tags=minna-5,minna-6` (module Ôn tập có thêm lọc theo nhãn).
- **Đã thuộc** = bạn tự đánh dấu, hoặc thẻ Ôn tập đã nhớ được ít nhất 7 ngày (độ bền FSRS ≥ 7).
- **% của bài** = (từ đã thuộc + mẫu ngữ pháp đã hiểu hoặc đã vào Ôn tập) / (số từ + số mẫu).

## Đường dẫn mở thẳng

`?b=minna-1` (một sách) · `?b=minna-1&l=5` (bài 5) · `?b=minna-1&l=5&s=kanji` (mục Kanji: `vocab`, `grammar`, `dialogue`,
`listening`, `exercise`, `kanji`, `reading`) · `?b=minna-1&read=<mã file>&p=12` (đọc file sách ở trang 13).

## Dữ liệu

| Bảng | Nội dung | Sao lưu |
| --- | --- | --- |
| `textbooks` | Sách: tên, khung gốc, tiền tố nhãn, học tuần tự, bài mở gần nhất | Có |
| `textbookLessons` | Bài (khóa `<sách>:<số bài>`): từ vựng, ghi chú, trạng thái, Kanji thêm tay, mã mẫu ngữ pháp (`grammarIds`, khi bạn sửa danh sách), ví dụ + ghi chú riêng cho từng mẫu (`grammarExtra`) | Có |
| `textbookMedia` | File sách gốc (PDF / ảnh, khóa `by_lesson` = `<sách>:book`), file audio của bài (bước 3) | Không (nặng, nhập lại được) |
| `textbookNotes` | Tô sáng, ghi chú, đánh dấu trang trên file sách | Có |

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
| `lib/progress.ts` | Đã thuộc, % mỗi bài (từ + ngữ pháp), khóa bài, bài tiếp theo |
| `lib/grammar.ts` | Mẫu ngữ pháp của bài (gợi ý theo số bài hoặc danh sách bạn sửa) |
| `sections/GrammarSection.tsx` | Mục Ngữ pháp của bài |
| `BookFiles.tsx` | Thêm / xóa file sách gốc |
| `reader/BookReader.tsx` | Trình đọc file sách: trang, chọn chữ, tô sáng, ghi chú, danh sách ghi chú |
| `lib/files.ts`, `lib/pdf.ts` | Lưu file + ghi chú, xuất Markdown; vẽ trang PDF và lớp chữ (pdf.js) |
| `strings.ts`, `ui.tsx` | Chữ giao diện (Việt/Anh/Nhật), mảnh giao diện dùng chung |
