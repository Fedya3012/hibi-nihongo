# Sao lưu tự động (`/autobackup`)

Tự lưu dữ liệu học ra file `.json` định kỳ, giữ nhiều bản, khôi phục một chạm.
Mở từ **Cài đặt → Sao lưu tự động**, hoặc gõ "sao lưu" trong Ctrl+K.

## Cách hoạt động

| Nơi chạy | Lưu vào đâu | Mức tự động |
| --- | --- | --- |
| Bản Windows | Mặc định `Tài liệu\Hibi Nihongo\Sao lưu`, đổi được (chọn thư mục Google Drive / OneDrive để có bản trên mạng) | Hoàn toàn tự động, mặc định mỗi ngày |
| Chrome / Edge | Thư mục bạn chọn một lần | Tự động; sau khi mở lại trình duyệt có thể phải bấm "Cho phép" một lần (hiện thanh nhắc) |
| Firefox / Safari / điện thoại | Tải file về | Tới hạn thì hiện thanh nhắc, bấm một cái là tải |

- File dùng đúng định dạng của nút "Tạo file sao lưu", nên "Khôi phục từ file" trong Cài đặt cũng đọc được.
- Tên file: `hibi-nihongo-tu-dong-YYYY-MM-DD_HHMMSS.json`. Chỉ file có tên này bị dọn khi quá số bản cần giữ.
- Dữ liệu không đổi từ lần trước thì không ghi file mới.
- Khôi phục từ danh sách: app lưu dữ liệu hiện tại thành một bản mới trước, để lỡ chọn nhầm vẫn quay lại được.

## File

- `lib/scheduler.ts`: hẹn giờ chạy ngầm (20 giây sau khi mở app, rồi 15 phút một lần).
- `lib/run.ts`: một lần sao lưu, và khôi phục.
- `lib/targets.ts`: ghi / liệt kê / dọn file trên Windows (lệnh trong `src-tauri/src/backup.rs`) và trên web.
- `lib/settings.ts`: cài đặt (kho kv, có trong file sao lưu) và tình trạng (localStorage, không có trong file sao lưu).
- `lib/handles.ts`: nhớ thư mục đã chọn trên web (kho IndexedDB riêng).
- `Host.tsx`: thanh nhắc nhỏ ở cuối màn hình. `SettingsLink.tsx`: thẻ trong trang Cài đặt.
