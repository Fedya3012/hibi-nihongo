# Module Kanji — `src/modules/kanji`

Học Kanji theo **cấp JLPT** và theo **bộ thủ**, chạy hoàn toàn offline. Đường dẫn: **Học → Kanji** (`/#/learn/kanji`).

## Dùng thế nào
| Mục | Làm gì |
| --- | --- |
| **JLPT** | Chọn N5 → N1 (hoặc "Khác" = Jōyō ngoài JLPT). Mỗi ô: chữ, âm Hán Việt, nghĩa. Nút **+10 chữ tiếp theo vào Ôn tập** để học dần từng nhóm nhỏ. Chấm ● = đã có trong Ôn tập, viền xanh = đã viết đạt ≥ 75 điểm. |
| **Theo cấp** (kiểu WaniKani) | 119 cấp, mỗi cấp ~20 chữ, đi từ N5 tới N1. Mỗi cấp: **bộ thủ** → **Kanji** → **từ vựng**, mở khóa dần. Kanji mở khi đã thuộc các bộ thủ/chữ thành phần của nó; từ vựng mở khi đã thuộc mọi chữ trong từ; cấp sau mở khi thuộc 90% Kanji cấp trước (hoặc bấm **Tôi đã biết các cấp trước**). Nút **Học bài mới** cho xem 5 mục một lượt rồi đưa vào Ôn tập. "Thuộc" = thẻ ôn ở trạng thái Review và độ bền trí nhớ ≥ 6 ngày. |
| **Bộ thủ** | 214 bộ Khang Hy (tên Hán Việt + nghĩa), xếp theo "hay gặp" hoặc số thứ tự. Bấm một bộ → mọi chữ thuộc bộ đó, chữ dễ (N5) trước. |
| **Luyện viết** | Viết từng nét bằng chuột/bút/ngón tay. Mỗi nét được chấm 0–100 điểm; app báo **sai thứ tự**, **ngược chiều**, **sai vị trí**; sai 3 lần thì tự điền nét đó. Cuối cùng có điểm cả chữ và dải điểm từng nét. |
| **Trang chi tiết** (bấm một chữ) | Hoạt ảnh thứ tự nét (xem **từng nét**, **tô màu bộ thủ**), âm On/Kun, bộ thủ và thành phần (bấm để đi tiếp), câu chuyện ghi nhớ + ô **tự viết câu chuyện của bạn**, từ có chữ đó (bấm để tra từ điển), câu ví dụ có furigana và nghe đọc, nút **+ Ôn tập**. Phím ← → chuyển chữ. |

Mở thẳng: `?lv=4` (danh sách N4), `?tab=levels` (theo cấp), `?k=食` (chi tiết), `?tab=radicals&r=9` (bộ Nhân), `?tab=write&k=食`.

## Dữ liệu
| Nguồn | Ở đâu | Giấy phép |
| --- | --- | --- |
| Âm On/Kun, Hán Việt, nghĩa tiếng Anh, JLPT, số bộ thủ | gói `kanjidic` của module Từ điển (`getKanji`) | KANJIDIC2 © EDRDG, CC BY-SA 4.0 |
| Nét viết, thành phần, từ ví dụ, danh sách JLPT/bộ thủ | gói `kanji-study` (`public/content/kanji-study.v1.pack`, ~2,9 MB) | KanjiVG © Ulrich Apel CC BY-SA 3.0; JMdict © EDRDG CC BY-SA 4.0 |
| Câu chuyện ghi nhớ (N5 + N4, 245 chữ), câu ví dụ tiếng Việt (N5) | `data/stories.ts` | Hibi Nihongo tự soạn |
| Tên 214 bộ thủ | `data/radicals.ts` | tự soạn |

Lần đầu mở module sẽ có nút **Tải dữ liệu Kanji** (cài cả 2 gói, ~3,4 MB). Nếu đã tải từ điển thì chỉ tải thêm gói nét viết.

Tạo lại gói `kanji-study` (ví dụ khi KanjiVG hoặc từ điển có bản mới):
```
node src/modules/kanji/tools/build-pack.mjs --kanjivg <thư mục KanjiVG có thư mục con kanji/>
```
Script tự tăng phiên bản, tạo bản vá và cập nhật `public/content/manifest.json` (chỉ sửa mục `kanji-study`).

## Tiến độ và Ôn tập
- kv `kanji:progress`: điểm viết cao nhất, số lần viết, đã vào Ôn tập chưa. kv `kanji:notes`: câu chuyện bạn tự viết. Cả hai có trong file sao lưu.
- Thẻ Ôn tập tạo qua `addReviewCards` (`@/modules/review/api`): bộ **Kanji N5**, **Kanji N4**…, mặt sau gồm âm Hán Việt + nghĩa, On/Kun, câu ví dụ, câu chuyện (của bạn nếu có). Nguồn `{ module: 'kanji', ref: <chữ> }` nên không bị thêm trùng.
- Theo cấp: trạng thái suy ra từ thẻ Ôn tập, không có bảng riêng. Thẻ bộ thủ: bộ **Kanji theo cấp · Bộ thủ**, nguồn `{ module: 'kanji', ref: 'rad:<chữ>' }`. Thẻ từ vựng: bộ **Kanji theo cấp · Từ vựng**, nguồn `{ module: 'dictionary', ref: <mã JMdict> }` (trùng với Từ điển nên không thêm 2 lần). Kanji dùng thẻ như trên. kv `kanji:levels` lưu cấp được tự mở.
- Không thêm bảng mới vào kho dữ liệu.

## File
| File | Vai trò |
| --- | --- |
| `KanjiPage.tsx` | Trang chính, tab, đường dẫn |
| `KanjiBrowser.tsx` | Danh sách JLPT và bộ thủ |
| `KanjiDetail.tsx` | Trang chi tiết một chữ |
| `WriteTab.tsx`, `components/WritingPad.tsx` | Luyện viết, chấm từng nét |
| `components/StrokeOrder.tsx` | Hoạt ảnh / từng nét / tô bộ thủ |
| `lib/data.ts` | Đọc gói, cài dữ liệu, tiện ích hiển thị |
| `levels/plan.ts` | Chia cấp: thứ tự chữ, bộ thủ cần học trước, từ vựng của từng cấp |
| `levels/progress.ts` | Trạng thái mở khóa / đang ôn / đã thuộc, đưa bài mới vào Ôn tập |
| `levels/LevelsTab.tsx` | Tab Theo cấp: học bài mới, lưới từng cấp |
| `lib/progress.ts` | Tiến độ, ghi chú, đưa vào Ôn tập |
| `tools/build-pack.mjs` | Tạo gói `kanji-study` (chạy trên máy tính) |
