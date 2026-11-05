# Thi thử JLPT (`src/modules/exam`)

Đề thi thử N5–N1 theo cấu trúc JLPT. Mỗi lần bấm "Bắt đầu thi" là **một đề mới**, app tự tạo từ nội dung có sẵn,
không soạn câu hỏi riêng.

## Người dùng làm gì

1. Mục **Học → Thi thử JLPT**. Lần đầu cần tải dữ liệu từ điển và dữ liệu Kanji (nút hiện ngay trên trang).
2. Chọn cấp (N5…N1) và loại đề: **Đề đầy đủ** (đủ câu, đủ giờ như thi thật) hoặc **Đề rút gọn** (khoảng 1/3).
3. Làm từng buổi thi. Mỗi buổi có đồng hồ riêng, hết giờ tự nộp. Đổi đáp án tự do, đánh dấu câu để xem lại,
   phím tắt 1–4 / ← → / F. Giữa hai buổi có màn hình nghỉ (đồng hồ dừng). Đóng app giữa chừng: mở lại bấm "Làm tiếp".
4. Kết quả: tổng điểm theo thang JLPT, ĐỖ / CHƯA ĐỖ (xét cả điểm liệt từng phần), tỉ lệ đúng theo dạng câu,
   xem lại từng câu có giải thích, thêm từ / mẫu ngữ pháp làm sai vào Ôn tập.

## Cấu trúc đề (`data/format.ts`)

Thời gian từng buổi, thang điểm, điểm đỗ và điểm liệt lấy theo JLPT thật:

| Cấp | Buổi thi (phút) | Nhóm điểm | Đỗ |
| --- | --- | --- | --- |
| N5 | 文字・語彙 20 · 文法・読解 40 · 聴解 30 | Ngôn ngữ+Đọc 0–120 (liệt 38), Nghe 0–60 (liệt 19) | 80/180 |
| N4 | 25 · 55 · 35 | như N5 | 90/180 |
| N3 | 30 · 70 · 40 | Ngôn ngữ, Đọc, Nghe: mỗi phần 0–60 (liệt 19) | 95/180 |
| N2 | 言語知識・読解 105 · 聴解 50 | như N3 | 90/180 |
| N1 | 110 · 55 | như N3 | 100/180 |

Điểm quy đổi **tuyến tính** từ tỉ lệ câu đúng (JLPT thật dùng cách quy đổi riêng), nên chỉ để ước lượng.

## Các dạng câu và nguồn nội dung

| Dạng | Giống đề thật | Lấy từ |
| --- | --- | --- |
| Đọc chữ Kanji | 漢字読み | Từ đúng cấp (từ ví dụ trong gói `kanji-study`), câu Tatoeba có từ đó. Đáp án nhiễu: biến thể trường âm, っ, dấu kêu, ょ/よ (`lib/distract.ts`) |
| Viết bằng Kanji | 表記 (N5–N2) | Như trên. Đáp án nhiễu: thay một chữ bằng chữ đồng âm On (会議 / 会義) |
| Chọn từ điền vào câu | 文脈規定 | Câu Tatoeba, đáp án nhiễu cùng từ loại |
| Nghĩa của từ | thay cho 言い換え | Nghĩa tiếng Việt (gói `jmdict-vi`), thiếu thì tiếng Anh |
| Ngữ pháp điền chỗ trống | 文法形式の判断 | Câu ví dụ module Ngữ pháp (dùng lại `buildQuiz`), thêm câu ngữ pháp của bài xếp lớp (Lộ trình) |
| Sắp xếp câu ★ | 文の組み立て | Câu ví dụ Ngữ pháp; bỏ những ô có thể xếp nhiều cách (弟に野菜を = 野菜を弟に) |
| Đọc hiểu câu | (rút gọn) 読解 | Câu ví dụ Ngữ pháp có bản dịch, câu Tatoeba có bản dịch |
| Nghe từ / Nghe câu | (rút gọn) 聴解 | Giọng tiếng Nhật có sẵn trong máy (như module Kana). Máy không có giọng Nhật thì hiện chữ |

**Chưa có:** bài đọc dài và bài nghe hội thoại (app chưa có dữ liệu). Dạng nào thiếu nội dung thì đề có ít câu hơn và
app ghi rõ "Đề này ít câu hơn đề chuẩn ở dạng…". Hiện N3–N1 thiếu ngữ pháp, sắp xếp câu và đọc hiểu tiếng Việt;
khi module Ngữ pháp có N3–N1, đề các cấp này **tự đủ** (không cần sửa module này).

## Lưu trên máy

kv `exam:current` (bài đang làm) và `exam:history` (100 lần gần nhất; bài làm chi tiết giữ cho 5 lần). Có trong file sao lưu.
