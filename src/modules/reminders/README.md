# Nhắc học hằng ngày (`src/modules/reminders`)

Hiện thông báo vào giờ bạn chọn để nhắc học tiếng Nhật. Mở ở **Cài đặt → Nhắc học hằng ngày**
(đường dẫn `/reminders`, hoặc gõ "nhắc học" trong ô tìm kiếm Ctrl+K).

## Cài đặt

| Mục | Ý nghĩa |
| --- | --- |
| Bật nhắc học | Lần đầu bật, máy hỏi có cho phép thông báo không. Chọn "Cho phép". |
| Giờ nhắc | Tối đa 5 giờ mỗi ngày (mặc định 20:00). |
| Nhắc vào các ngày | Chọn thứ trong tuần. |
| Số thẻ đến hạn | Thông báo ghi "23 thẻ đang chờ ôn, 10 thẻ mới" (lấy từ module Ôn tập). |
| Nhắc giữ chuỗi ngày học | Đang có chuỗi mà hôm nay chưa học thì tiêu đề thành "Giữ chuỗi 12 ngày học nhé! 🔥". |
| Không nhắc nếu đã đạt mục tiêu | Đạt mục tiêu ngày (module Hôm nay) rồi thì các giờ nhắc sau tự im. |

Có khung **Xem trước** (dùng số liệu thật lúc đó) và nút **Gửi thử ngay**.
Cài đặt lưu ở kv `reminders:settings`, có trong file sao lưu.

## Cách hoạt động

- `lib/scheduler.ts`: chạy ngầm trong cả app, mỗi 30 giây xem đã tới giờ nhắc chưa. Mỗi giờ nhắc chỉ hiện
  một lần mỗi ngày (ghi ở kv `reminders:sent`). Nhiều tab mở cùng lúc không nhắc trùng (dùng Web Locks).
- Mở app trễ hơn giờ nhắc **không quá 3 tiếng** thì nhắc bù một lần; trễ hơn thì bỏ qua.
- Thêm một giờ đã qua trong hôm nay thì không nhắc ngay, đợi tới ngày mai.
- `lib/notify.ts`: bản Windows dùng plugin thông báo của Tauri (`tauri-plugin-notification`);
  website dùng Notification API của trình duyệt. Bấm thông báo trên website mở thẳng trang Ôn tập.
- `lib/message.ts`: ghép tiêu đề + nội dung theo ngôn ngữ giao diện (Việt / Anh / Nhật).

## Giới hạn

- Thông báo chỉ hiện khi **app đang mở** (thu nhỏ cửa sổ hoặc để tab phía sau vẫn được).
  Website không tự bật thông báo khi đã đóng hết tab (cần máy chủ gửi push, app chạy offline nên không dùng).
- Bản Windows: muốn nhắc cả khi đã bấm đóng, cần thêm tính năng "thu nhỏ xuống khay hệ thống" (chưa làm).

## File dùng chung đã sửa (ít dòng nhất)

- `src/modules/settings/SettingsPage.tsx`: thêm `<ReminderSettingsLink />` (1 import + 1 dòng).
- `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`: bật plugin thông báo.
- `package.json`: thêm `@tauri-apps/plugin-notification`.
