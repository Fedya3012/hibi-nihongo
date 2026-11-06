# Module Bản Windows (`src/modules/desktop`)

Những tính năng chỉ app cài trên Windows mới làm được. Trang cài đặt: **Cài đặt → Bản Windows** (đường dẫn `#/desktop`).
Trên web, trang này chỉ giới thiệu và có nút tải bản Windows.

## Người dùng thấy gì

| Tính năng | Cách dùng |
| --- | --- |
| **Tự cập nhật** | Mở app 20 giây và mỗi 6 giờ, Hibi hỏi GitHub có bản mới không. Có thì hiện thanh nhắc "Cập nhật và mở lại app". Tắt được trong trang Bản Windows. |
| **Tra từ ở mọi app** | Bôi đen chữ tiếng Nhật ở bất kỳ đâu → Ctrl+C → bấm **Ctrl+Alt+D** (đổi được). Cửa sổ tra nhỏ hiện cạnh chuột, có **+ Thêm vào Ôn tập**. Cửa sổ đang mở thì cứ Ctrl+C chữ khác là tự tra. Esc để ẩn. |
| **Khay hệ thống** | Bấm X thì app thu xuống khay cạnh đồng hồ (để phím tắt vẫn dùng được). Chuột phải biểu tượng → *Thoát hẳn*. Tắt được. |
| **Chạy cùng Windows** | Bật thì mở máy là Hibi chạy sẵn dưới khay, không bật cửa sổ. |
| **Nhớ cửa sổ** | Vị trí, kích thước, phóng to được giữ lại giữa các lần mở. |
| **Chỉ một app** | Mở Hibi lần nữa khi đang chạy: đưa cửa sổ cũ lên, không mở thêm. |
| **CSP** | App chỉ chạy code của chính nó (chặn script lạ), xem `app.security.csp` trong `src-tauri/tauri.conf.json`. |

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `src-tauri/src/desktop.rs` | Phần Windows: khay, phím tắt toàn hệ thống, cửa sổ tra nhanh, các lệnh `desktop_*` |
| `src-tauri/src/lib.rs` | Bật các plugin (updater, global-shortcut, autostart, window-state, single-instance…) |
| `lib/native.ts` | Gọi các lệnh `desktop_*`, `isDesktopApp()`, `isLookupWindow()` |
| `lib/prefs.ts` | Cài đặt (localStorage `hibi-desktop`) |
| `lib/updater.ts` | Kiểm tra / tải / cài bản mới |
| `Host.tsx` | Chạy ngầm trong cửa sổ chính: gửi cài đặt cho Windows, tự kiểm tra bản mới, thanh nhắc |
| `QuickLookup.tsx` | Giao diện cửa sổ tra nhanh. `src/main.tsx` dùng nó thay cho `<App />` khi cửa sổ tên `lookup` |
| `DesktopPage.tsx`, `SettingsLink.tsx` | Trang cài đặt và thẻ trong trang Cài đặt |

Xem thử giao diện cửa sổ tra nhanh trên web: mở `#/quick-lookup`.

## Tự cập nhật hoạt động thế nào

1. Workflow **Release** (`.github/workflows/release.yml`) đặt số phiên bản `0.1.<số lần chạy>` cho mỗi lần build
   (đẩy tag `v1.2.3` thì dùng đúng `1.2.3`), nên bản sau luôn lớn hơn bản trước.
2. Nếu repo có secret **`TAURI_SIGNING_PRIVATE_KEY`**, workflow ký số file cài đặt và đăng thêm `latest.json` lên Releases.
3. App đã cài đọc `https://github.com/Fedya3012/hibi-nihongo/releases/latest/download/latest.json`, kiểm tra chữ ký
   bằng khóa công khai trong `tauri.conf.json` (`plugins.updater.pubkey`), rồi tải và cài.

Khóa riêng (secret) và khóa công khai (`pubkey`) phải là một cặp. Tạo cặp mới: `npx tauri signer generate -w hibi.key`,
dán nội dung `hibi.key.pub` vào `pubkey`, nội dung `hibi.key` vào secret `TAURI_SIGNING_PRIVATE_KEY`
(GitHub → *Settings* → *Secrets and variables* → *Actions*). Có đặt mật khẩu thì thêm secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
Đổi cặp khóa thì các bản đã cài trước đó không tự cập nhật được nữa, phải cài tay một lần.

Chưa có secret thì workflow vẫn build `.exe` như cũ, chỉ là chưa có `latest.json` nên app chưa tự cập nhật được.
