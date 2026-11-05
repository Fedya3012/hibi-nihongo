# Hibi Nihongo 日々日本語

Ứng dụng học tiếng Nhật mỗi ngày, kết hợp **immersion qua manga/anime**, **giáo trình** và **lộ trình JLPT**.
Chạy được dưới dạng **Website (cài như app nhờ PWA)** và **ứng dụng Windows (.exe)**. Bản Android sẽ làm sau.

> Tài liệu này viết cho người **không biết lập trình**. Cứ làm lần lượt từng bước, không cần hiểu hết.

---

## 1. Thư mục này có gì?

| Thư mục / file | Là gì |
| --- | --- |
| `src/` | Toàn bộ code giao diện của app |
| `src/design/` | **Hệ màu, font, các nút/thẻ dùng chung.** Muốn đổi màu cả app: sửa `src/design/tokens.css` |
| `src/modules/` | Mỗi tính năng là **một thư mục riêng** (ôn tập, kanji, manga…) |
| `src/modules/registry.ts` | Danh sách tất cả tính năng, hiện trên thanh điều hướng |
| `src/core/` | Phần lõi dùng chung: cài đặt, lưu dữ liệu |
| `src-tauri/` | "Vỏ" để đóng gói thành file .exe cho Windows |
| `public/` | Biểu tượng app |
| `.github/workflows/` | Kịch bản để GitHub **tự build** .exe và website cho bạn |
| `docs/MODULES.md` | Danh sách các module và quy ước khi làm từng module |

---

## 2. Cách dễ nhất: để GitHub build giúp (không cần cài gì)

1. Code này nằm trên GitHub (trong kho của bạn).
2. Vào trang kho → tab **Actions** → chọn **Release** → bấm **Run workflow**.
   *(Hoặc tạo một "tag" tên `v0.1.0` ở mục Releases.)*
3. Đợi khoảng 10–15 phút. Khi có dấu ✓ xanh:
   - **Bản Windows:** vào mục **Releases**, tải file `Hibi Nihongo_..._x64-setup.exe`, mở và bấm Next để cài.
   - **Bản Website:** vào **Settings → Pages** để xem đường link website.
     Lần đầu cần chọn *Source: GitHub Actions* trong trang đó.

### Cài website như một app (PWA)
- **Chrome / Edge trên máy tính:** mở website → bấm biểu tượng ⊕ ở cuối thanh địa chỉ → **Cài đặt**.
- **Điện thoại Android (Chrome):** menu ⋮ → **Thêm vào màn hình chính**.
- **iPhone (Safari):** nút Chia sẻ → **Thêm vào MH chính**.

Sau khi mở website một lần có mạng, app sẽ chạy được cả khi **không có mạng**.

---

## 3. Chạy thử trên máy của bạn (tùy chọn)

### Bước 1: Cài Node.js (một lần duy nhất)
1. Vào https://nodejs.org, tải bản **LTS** và cài (bấm Next đến hết).
2. Mở **Terminal** (Windows: bấm phím Windows, gõ `PowerShell`, Enter).
3. Gõ `node -v` rồi Enter. Thấy hiện `v22...` hoặc mới hơn là được.

### Bước 2: Mở thư mục project trong Terminal
Ví dụ project nằm ở `C:\Users\Ban\hibi-nihongo`:
```
cd C:\Users\Ban\hibi-nihongo
```

### Bước 3: Cài thư viện (một lần, hoặc khi được dặn)
```
npm install
```

### Bước 4: Chạy thử
```
npm run dev
```
Mở trình duyệt vào địa chỉ **http://localhost:5173**. Sửa code → trang tự cập nhật.
Muốn tắt: quay lại Terminal, bấm `Ctrl + C`.

### (Nâng cao) Build file .exe ngay trên máy Windows
Cần cài thêm **Rust** (https://rustup.rs, chọn mặc định) và **Microsoft C++ Build Tools**
(https://visualstudio.microsoft.com/visual-cpp-build-tools/, tích "Desktop development with C++"). Sau đó:
```
npm run tauri build
```
File cài nằm ở `src-tauri\target\release\bundle\nsis\`.

---

## 4. Các lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Chạy thử website trên máy |
| `npm run build` | Đóng gói website (kết quả ở thư mục `dist/`) và kiểm tra lỗi |
| `npm run preview` | Xem thử bản đã đóng gói |
| `npm run tauri dev` | Chạy thử bản Windows |
| `npm run tauri build` | Tạo file cài .exe |

---

## 5. Đổi màu, font, giao diện

- **Màu:** mở `src/design/tokens.css`. Phần `[data-theme='light']` là Light Mode, `[data-theme='dark']` là Dark Mode.
  Màu chủ đạo hiện tại: vàng hổ phách theo mắt Nea D. Campbell (`#A86F0C` sáng, `#E3B04B` tối).
- **Font:** Be Vietnam Pro (tiếng Việt), Noto Sans JP / Noto Serif JP (tiếng Nhật), đã đóng gói sẵn để dùng offline.
- **Trong app:** vào **Cài đặt** để đổi Sáng/Tối/Theo hệ thống, cỡ chữ, furigana, tương phản cao, **ngôn ngữ giao diện** (Việt/Anh/Nhật).
- **Tìm mọi thứ:** bấm **Ctrl+K** (Mac: ⌘K) để tìm từ, Kanji, thẻ ôn tập, ghi chú manga, tên chương/tập.

---

## 6. Bản quyền nội dung

- App **không chứa** manga, anime hay nội dung sách Minna no Nihongo / Genki. Bạn tự nhập file của mình; file chỉ nằm trên máy bạn.
- Dữ liệu từ điển dùng nguồn mở: JMdict, KANJIDIC (EDRDG, CC BY-SA), KanjiVG (CC BY-SA), Tatoeba (CC BY).
  Trang "Giới thiệu" trong app sẽ ghi công các nguồn này.
- Trợ lý chú cáo là nhân vật tự thiết kế.
