# Module Luyện chia động từ — `src/modules/conjugation`

Luyện chia **động từ** và **tính từ** sang các thể hay sai nhất ở N5–N4, chạy hoàn toàn offline.
Đường dẫn: **Học → Luyện chia động từ** (`/#/learn/conjugation`).

## Dùng thế nào
| Mục | Làm gì |
| --- | --- |
| **Luyện tập** | Chọn cấp (N5 hoặc N5 + N4), loại từ (Nhóm 1, 2, 3, tính từ -い, -な), các thể cần luyện, cách trả lời (**Gõ đáp án** hoặc **Chọn đáp án**), số câu. Có thể bật **Ưu tiên chỗ hay sai** và **Hiện nhóm của từ**. Lựa chọn được nhớ cho lần sau. |
| **Khi trả lời** | Gõ kana bằng bộ gõ tiếng Nhật, hoặc gõ romaji (`kaite` tự thành かいて). Viết Kanji hay hiragana đều được chấm đúng. Sau khi kiểm tra: đáp án có furigana, nút nghe, cách khác cũng đúng (vd ではない), **cách chia** bằng tiếng Việt, và **chia ngược lại** bằng bộ chia ngược của Từ điển. Gõ sai nhưng là một thể khác của cùng từ thì app nói bạn đã viết thể gì (hỏi thể ます mà gõ 書いた → "Quá khứ (thể た)"). |
| **Kết quả** | Điểm, số câu đúng theo từng thể, danh sách câu sai kèm chữ đã gõ, nút **Luyện lại câu sai**. Thống kê tỉ lệ đúng theo thể hiện dưới màn hình chuẩn bị. |
| **Bảng chia** | Tìm một từ (Kanji, kana, romaji, nghĩa tiếng Việt) → bảng đủ mọi thể kèm cách chia. Từ không có trong danh sách: bấm **Tra trong từ điển** (cần đã tải Từ điển) để chia bất kỳ động từ/tính từ nào. Nút **Luyện từ này**. |
| **Tìm kiếm (Ctrl+K)** | Gõ một động từ/tính từ trong danh sách → nhóm "Bảng chia". |

Phím tắt: **Enter** kiểm tra / câu tiếp, **1–4** chọn đáp án.
Mở thẳng: `?tab=table`, `?tab=table&w=書く` (bảng chia của 書く), `?w=書く` (luyện riêng 書く).

## Các thể
N5: ます, ません, ました, ませんでした, ましょう, ない, た, なかった, て, たい, trạng từ (tính từ).
N4: khả năng, ý chí, điều kiện ば, điều kiện たら, mệnh lệnh, bị động, sai khiến.
Tính từ dùng các thể phủ định, quá khứ, て, trạng từ, lịch sự, ば, たら. Danh sách ở `lib/forms.ts`.

## Nội dung và cách chia
- `data/words.ts`: 141 từ N5–N4 (động từ 3 nhóm, tính từ -い, -な), nghĩa tiếng Việt. Có cố ý các "bẫy":
  động từ nhóm 1 đuôi -iru/-eru (帰る, 入る, 走る, 知る, 切る, 喋る...), 行く (行って), ある (ない), いい (よくない),
  tính từ -な đuôi い (きれい, 嫌い). Từ nào không dùng một thể thì ghi trong `no` (vd ある không có thể khả năng).
- `lib/conjugate.ts`: chia xuôi, tự viết. Mỗi thể kèm câu giải thích tiếng Việt.
- `lib/quiz.ts`: tạo bài, đáp án nhiễu ưu tiên lỗi hay gặp (chia nhóm 1 như nhóm 2, biến âm て sai, きれくない...).
- `lib/explain.ts`: dùng lại `deinflect` của module Từ điển để hiện "chia ngược lại" và đoán thể người học đã gõ;
  đổi kết quả tra Từ điển thành từ để chia (Bảng chia).
- **Kiểm tra**: `node src/modules/conjugation/tools/check.mjs` chia mọi từ × mọi thể (hơn 2000 dạng), rồi đưa từng đáp án
  qua bộ chia ngược của Từ điển, phải quay về đúng thể từ điển, đúng loại từ. `node .../check.mjs 書く` in bảng chia một từ.
  Chạy lại sau khi thêm từ hoặc sửa luật. Cần Node 22.18 trở lên.

## Lưu trữ
- kv `conjugation:stats`: số câu đúng/sai theo thể và theo từ (có trong file sao lưu). Nút **Xóa thống kê** (bấm 2 lần).
- kv `conjugation:prefs`: lựa chọn ở màn hình chuẩn bị.
- Không thêm bảng mới vào kho dữ liệu, không sửa file dùng chung.

## Có thể làm thêm
- Đưa cặp (từ, thể) hay sai vào Ôn tập (SRS).
- Thể sai khiến bị động, kính ngữ; lấy động từ từ "Kho từ của tôi".
- Tính giờ ở trang này vào nhóm "Ngữ pháp" của Hôm nay & Tiến độ (cần thêm một dòng ở `today/lib/categories.ts`).
