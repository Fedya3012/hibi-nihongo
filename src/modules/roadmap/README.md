# Lộ trình & Kiểm tra xếp lớp (`src/modules/roadmap`)

Đường dẫn: **Học → Lộ trình** (`/#/learn/roadmap`). Bài xếp lớp: `/#/learn/roadmap?tab=test`.

## Dùng thế nào

1. **Lần đầu mở**: chọn giáo trình (Minna / Genki / không dùng sách), mục tiêu (N5 → N1), rồi chọn một trong ba:
   - *Mới bắt đầu*: lộ trình bắt đầu từ bảng chữ cái (Kana).
   - *Làm bài kiểm tra xếp lớp*: app tự chọn chặng bắt đầu.
   - *Tự chọn chặng bắt đầu*.
2. **Trang lộ trình**: các chặng Kana → N5 → N4 → … → mục tiêu. Mỗi chặng có các bước, mỗi bước có % và nút mở đúng trang để học.
   Ô **"Việc nên làm tiếp"** ở trên cùng luôn chỉ bước đầu tiên chưa xong của chặng đang học.
3. **Tùy chỉnh**: đổi giáo trình, chặng bắt đầu, mục tiêu; làm lại bài xếp lớp; làm lại từ đầu
   (chỉ xóa lựa chọn của lộ trình, **không** xóa tiến độ học ở các module khác).

## Mỗi chặng gồm gì

| Chặng | Các bước |
| --- | --- |
| Kana | Hiragana, Katakana |
| N5, N4 | Giáo trình (Minna I/II hoặc Genki I/II, nếu có chọn), Ngữ pháp của cấp, Từ vựng (cộng dồn), Kanji của cấp, gợi ý đọc manga/xem anime (từ N4) |
| N3, N2, N1 | Ngữ pháp (hiện "sắp có" cho tới khi module Ngữ pháp có nội dung cấp đó), Từ vựng, Kanji, gợi ý đọc/xem |

Một bước **xong** khi đạt 90%; một chặng xong khi mọi bước có tính tiến độ đều xong. Bước "sắp có" và bước "gợi ý" không tính.
Số từ vựng mục tiêu (cộng dồn): N5 800, N4 1.500, N3 3.700, N2 6.000, N1 10.000. Đây là ước lượng phổ biến,
không phải số chính thức (JLPT không công bố danh sách). Sửa ở `data/levels.ts`.

## Tiến độ lấy từ đâu

Lộ trình **không lưu tiến độ riêng**, mọi con số đọc lại từ module gốc (`lib/progress.ts`), nên học ở đâu lộ trình cũng tự cập nhật:

| Bước | Nguồn | "Đã xong" nghĩa là |
| --- | --- | --- |
| Hiragana / Katakana | `kana:progress` (module kana) | chữ đúng ≥ 3 lần và ≥ 80% |
| Kanji | thẻ Ôn tập loại kanji, qua Kho từ (`kanjiStatus`) | thẻ đã qua giai đoạn học |
| Ngữ pháp | `grammar:progress` + thẻ Ôn tập ngữ pháp | bấm "Đã hiểu" hoặc mẫu đã có trong Ôn tập |
| Từ vựng | Kho từ (module vocab) | tự đánh dấu "Đã biết" hoặc thẻ Ôn tập đã thuộc |
| Giáo trình | bảng `textbooks`, `textbookLessons` | bài đánh dấu xong, hoặc đủ % để mở bài sau |

Nút **"+ Thêm sách vào kệ"** thêm đúng khung sách (vd Minna II) vào Giáo trình bằng một lần bấm.

## Bài kiểm tra xếp lớp

- Câu hỏi **tự soạn** (`data/placement.ts`), không lấy từ đề JLPT hay sách. Mỗi câu có đúng một đáp án; đáp án đúng viết đầu tiên, lúc làm bài tự xáo.
- Làm lần lượt Kana → N5 → N4 → N3 → N2, mỗi phần 6 câu ngẫu nhiên. Đúng ≥ 4/6 thì sang phần khó hơn, chưa đạt thì dừng:
  chặng bắt đầu = phần đó. Qua cả N2 → bắt đầu từ N1.
- Có nút "Tôi không biết" để khỏi đoán. Màn hình kết quả có điểm từng phần và xem lại câu sai kèm giải thích.
- Thêm câu: thêm một dòng vào đúng phần trong `data/placement.ts` (mỗi phần nên có ≥ 6 câu).

## Dữ liệu lưu

Chỉ một khóa trong kv: `roadmap:state` = `{ start, goal, series, placement?, createdAt }` (có trong file sao lưu).
Không thêm bảng mới.

## File

- `RoadmapPage.tsx`: làm quen, tổng quan, tùy chỉnh
- `Placement.tsx`: bài xếp lớp
- `lib/progress.ts`: tính tiến độ từ các module khác; `lib/state.ts`: đọc/ghi lựa chọn
- `data/levels.ts`: khung chặng (số từ mục tiêu, sách ứng với chặng); `data/placement.ts`: câu hỏi
- `strings.ts`: chữ giao diện Việt / Anh / Nhật
