# Sao lưu tự động (`/autobackup`)

Tự lưu dữ liệu học ra file `.zip` định kỳ, giữ nhiều bản, khôi phục một chạm.
Mở từ **Cài đặt → Sao lưu tự động**, hoặc gõ "sao lưu" trong Ctrl+K.

## Cách hoạt động

| Nơi chạy | Lưu vào đâu | Mức tự động |
| --- | --- | --- |
| Bản Windows | Mặc định `Tài liệu\Hibi Nihongo\Sao lưu`, đổi được (chọn thư mục Google Drive / OneDrive để có bản trên mạng) | Hoàn toàn tự động, mặc định mỗi ngày |
| Chrome / Edge | Thư mục bạn chọn một lần | Tự động; sau khi mở lại trình duyệt có thể phải bấm "Cho phép" một lần (hiện thanh nhắc) |
| Firefox / Safari / điện thoại | Tải file về | Tới hạn thì hiện thanh nhắc, bấm một cái là tải |

- File dùng đúng định dạng của nút "Tạo file sao lưu", nên "Khôi phục từ file" trong Cài đặt cũng đọc được.
- Tên file: `hibi-nihongo-tu-dong-YYYY-MM-DD_HHMMSS-<mã máy>.zip`. Chỉ file có tên này (và file `.json` kiểu cũ) bị dọn khi quá số bản cần giữ.
- Dữ liệu không đổi từ lần trước thì không ghi file mới.
- Khôi phục từ danh sách: app chụp bản an toàn trước (hoàn tác trong Cài đặt → Dữ liệu trên máy). Máy không đủ chỗ
  chụp bản an toàn thì lưu dữ liệu hiện tại thành một file mới trong thư mục thay thế.

## Dùng chung một thư mục giữa hai máy

Cho hai máy (vd máy tính bàn và laptop) cùng lưu vào một thư mục trong Google Drive / OneDrive / Dropbox.
Mã máy ở cuối tên file cho biết file đến từ máy nào. Khi mở app, nếu có file của **máy khác** mới hơn lần cuối
máy này sao lưu hoặc lấy về, thanh nhỏ hiện "Có bản sao lưu mới hơn từ máy khác. Lấy về máy này?"
(`lib/remote.ts`, thanh trong `Host.tsx`). App không bao giờ tự thay dữ liệu mà không hỏi.

## File

- `lib/scheduler.ts`: hẹn giờ chạy ngầm (20 giây sau khi mở app, rồi 15 phút một lần).
- `lib/run.ts`: một lần sao lưu, và khôi phục.
- `lib/targets.ts`: ghi / liệt kê / dọn file trên Windows (lệnh trong `src-tauri/src/backup.rs`, file `.zip` gửi thẳng dạng byte) và trên web.
- `lib/remote.ts`: tìm bản sao lưu mới hơn từ máy khác trong thư mục.
- `lib/settings.ts`: cài đặt (kho kv, có trong file sao lưu) và tình trạng (localStorage, không có trong file sao lưu).
- `lib/handles.ts`: nhớ thư mục đã chọn trên web (kho IndexedDB riêng).
- `Host.tsx`: thanh nhắc nhỏ ở cuối màn hình. `SettingsLink.tsx`: thẻ trong trang Cài đặt.
