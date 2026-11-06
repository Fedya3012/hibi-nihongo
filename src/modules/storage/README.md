# Dung lượng và dọn dẹp (`/storage`)

Xem từng phần của app (manga, anime, giáo trình, thẻ ôn tập, từ điển...) chiếm bao nhiêu chỗ trên máy,
và dọn những thứ nhập lại được hoặc không còn dùng.
Mở từ **Cài đặt → Dữ liệu trên máy → "Xem từng phần chiếm bao nhiêu, dọn dẹp"**, từ thanh cảnh báo
"bộ nhớ đầy", hoặc gõ "dung lượng" trong Ctrl+K.

## Dọn được gì

| Mục | Xóa | Giữ |
| --- | --- | --- |
| Manga đã đọc xong | Ảnh trang | Ảnh bìa, trang đang đọc, bong bóng thoại, ghi chú (nhập lại file là đọc tiếp được) |
| Anime đã xem xong | Video đã chép vào app | Phụ đề, câu đã lưu, tiến độ (video mở từ file trên máy không nằm trong app) |
| File không còn dùng | Ảnh/tiếng/video còn sót của thẻ, chương, tập, bài đã xóa | Mọi thứ còn dùng |
| Bản an toàn | Bản chụp trước lần khôi phục gần nhất | |

Mỗi nút đều hỏi lại trước khi xóa.

## Cảnh báo bộ nhớ đầy

`Host.tsx` (gắn trong Layout) hiện thanh cảnh báo ở mọi trang khi:
- một thao tác lưu bất kỳ hỏng vì hết chỗ (kho dữ liệu `src/core/db/quota.ts` tự nhận ra và báo), hoặc
- lúc mở app, đã dùng hơn 90% chỗ trình duyệt cho (nhắc tối đa mỗi ngày một lần).

## File

- `lib/usage.ts`: đo từng bảng (đọc lần lượt từng dòng, bảng rất lớn thì đo mẫu) và các hàm dọn.
- `StoragePage.tsx`: trang chính. `Host.tsx`: thanh cảnh báo.
