# Phím tắt tùy chỉnh (`src/modules/shortcuts`) và Pomodoro (`src/modules/pomodoro`)

## Phím tắt
- Trang **/shortcuts** (Cài đặt → Phím tắt & Pomodoro, hoặc bấm `?` → Đổi phím tắt).
- Mỗi việc có thể có nhiều phím. Bấm phím để đổi, `×` để gỡ, `+` để thêm, "Về mặc định" để trả lại.
- Phím trùng nhau (cùng nhóm, hoặc trùng với nhóm Toàn app) có cảnh báo màu vàng.
- Bấm `?` ở bất kỳ trang nào: bảng xem nhanh (nhóm Toàn app + nhóm của trang đang mở).
- Lưu ở localStorage `hibi-shortcuts` (chỉ lưu phím đã đổi).

| Nhóm | Mặc định |
| --- | --- |
| Toàn app | Ctrl+K hoặc `/` tìm kiếm · `?` bảng phím tắt · Alt+P Pomodoro · Alt+1…7 mở Hôm nay / Học / Ôn tập / Immersion / Tiến độ / Từ điển / Pomodoro · Alt+0 Cài đặt |
| Ôn tập | Space/Enter lật · 1–4 chấm · Z, Ctrl+Z hoàn tác · B chôn · S ẩn · R nghe · Esc thoát |
| Anime, Manga | Như trước đây (xem trong trình phát / trình đọc) |

Module khác muốn dùng: thêm hành động vào `ACTIONS` trong `keymap.ts`, rồi trong hàm nghe phím gọi
`actionFor(e, 'nhóm')` hoặc `matches(e, 'id')`.

## Pomodoro
- Trang **/pomodoro**, nút `集` trên thanh trên cùng (hiện giờ còn lại khi đang chạy), phím Alt+P bắt đầu/tạm dừng ở mọi trang.
- Tập trung 25′ → nghỉ ngắn 5′, sau 4 phiên thì nghỉ dài 15′ (đổi được). Có tự chạy phiên tiếp, chuông, thông báo trên máy.
- Đồng hồ lưu thời điểm kết thúc (localStorage `hibi-pomodoro`), nên tải lại trang vẫn chạy đúng. Nhiều tab chỉ kêu một lần.
- Thống kê phiên tập trung theo ngày học ở kv `pomodoro:log` (có trong file sao lưu).

## Chuyến bay tập trung (`src/modules/pomodoro/flight`)
Trang /pomodoro giờ là "chuyến bay tập trung" tới Nhật Bản (tab Hẹn giờ vẫn giữ Pomodoro cổ điển).
- Chỉ bay trong Nhật (30 sân bay, 9 vùng) hoặc từ nước ngoài (21 sân bay, có Hà Nội, Đà Nẵng, TP.HCM) tới Nhật.
- Đặt vé theo thời gian muốn tập trung (tốc độ 1×/2×/4×) → làm thủ tục, chọn ghế = chế độ học → cửa an ninh (câu tiếng Nhật)
  → cửa ra máy bay → bay (bản đồ hoặc cửa sổ ngắm cảnh theo vùng, từ vựng của vùng, tiếng cabin) → hạ cánh
  → nhập cảnh + hải quan bằng tiếng Nhật (nếu bay từ nước ngoài) → dấu hộ chiếu → vé lưu niệm + ghi chú.
- Dữ liệu: kv `pomodoro:flights` (sổ vé), `pomodoro:passport` (tên trên hộ chiếu), localStorage `hibi-flight` (chuyến đang bay).
- Bản đồ: đường bờ biển Natural Earth (public domain) trong `land.json`, tải riêng khi mở bản đồ.
