# Danh sách module Hibi Nihongo

Mỗi module được làm trong **một thread riêng**. Phần nền chung (khung app, hệ màu, điều hướng, cài đặt,
cấu hình PWA và Windows) đã có sẵn. Mỗi module chỉ thêm code vào thư mục của mình.

## Quy ước cho mọi module

1. Code nằm trong `src/modules/<id>/`. Trang chính export default một component React.
2. Đăng ký trong `src/modules/registry.ts`: sửa dòng có sẵn, đổi `page` từ placeholder sang trang thật, `status` → `'building'`/`'ready'`.
3. **Chỉ dùng màu từ token** (class `bg-surface`, `text-primary`, `text-muted`, `border-border`...). Không viết mã màu trực tiếp, để Dark Mode và đổi màu luôn đúng.
4. Dùng component chung trong `src/design/components/` (Card, Button, Segmented). Cần component mới dùng chung được thì thêm vào đó.
5. Chữ tiếng Nhật đặt trong class `jp`; furigana dùng `<ruby>漢字<rt>かんじ</rt></ruby>` (tự ẩn/hiện theo Cài đặt).
6. Dữ liệu lưu trên máy (offline-first). Cài đặt giao diện đọc từ `useSettings` trong `src/core/settings.ts`.
7. Chữ trên giao diện đặt trong bảng `defineStrings` (xem `src/core/i18n/README.md`) để dịch được sang Anh/Nhật; thiếu bản dịch thì tự hiện tiếng Việt.
8. Ghi chú code bằng tiếng Việt, dễ hiểu. Chạy `npm run build` không lỗi trước khi giao.
9. Chỉ làm cho **Website và Windows**. Không thêm gì riêng cho Android ở giai đoạn này.

## Thứ tự đề xuất

Module có dấu ★ là nền cho các module khác, nên làm trước.

### Giai đoạn 1: MVP

| # | Module | Thư mục | Nội dung chính | Cần có trước |
| --- | --- | --- | --- | --- |
| 1 | ★ Kho dữ liệu offline | `src/core/db` | IndexedDB, sao lưu/khôi phục, gói nội dung có phiên bản (chỉ tải phần thay đổi). **Đã xong, cách dùng: `src/core/db/README.md`** | (không) |
| 2 | ★ Từ điển & tách từ | `dictionary` | JMdict/KANJIDIC offline, tách từ (Kuromoji), chia động từ ngược, popup tra từ dùng chung. **Đã xong, cách dùng: `src/modules/dictionary/README.md`** | 1 |
| 3 | ★ SRS / Ôn tập | `review` | FSRS, deck, Again/Hard/Good/Easy, nhiều dạng câu hỏi, Undo, ôn nhanh 5 phút | 1 |
| 4 | Hiragana & Katakana | `kana` | Bảng chữ, luyện viết, nghe nhận diện, nhận diện nhanh | 3 |
| 5 | Kanji | `kanji` | Bộ thủ, mnemonic tiếng Việt, thứ tự nét KanjiVG, on/kun, ví dụ | 2, 3 |
| 6 | Đọc manga | `immersion/manga` | CBZ/CBR/PDF/thư mục ảnh, zoom, 2 trang, phải→trái, nhớ trang đang đọc | 2 |
| 7 | Xem anime | `immersion/anime` | Video + phụ đề .srt/.ass/.vtt, bấm tra từ, Comprehension Score, tạo thẻ từ phụ đề | 2, 3 |
| 8 | Hôm nay & Tiến độ | `today`, `me` | Streak + đóng băng, mục tiêu ngày, heatmap, biểu đồ, lịch sử | 3 |

### Giai đoạn 2: Học sâu

| # | Module | Nội dung chính |
| --- | --- | --- |
| 9 | Ngữ pháp | **Đã xong (N5, N4), cách dùng: `src/modules/grammar/README.md`.** Giải thích tiếng Việt, ví dụ tra từ được, luyện điền chỗ trống / sắp xếp câu / chọn nghĩa, vào SRS, API cho Giáo trình (`grammarForLesson`). Còn lại: nội dung N3–N1 |
| 10 | Giáo trình | Khung bài Minna / Genki / sách tự tạo, 7 mục mỗi bài, từ vựng vào Ôn tập theo bài, Kanji của bài, học tuần tự. **Bước 1 đã xong, cách dùng: `src/modules/textbook/README.md`** |
| 11 | Lộ trình & Onboarding | Bộ câu hỏi đầu tiên, lộ trình N5→N1, theo series, tùy chỉnh (bản chưa có AI) |
| 12 | Tiện ích chung | Smart Resume, tìm kiếm toàn cục (Ctrl+K, **đã xong**: `src/modules/search/README.md`), ngôn ngữ giao diện Việt/Anh/Nhật (**đã xong**: `src/core/i18n/README.md`), hệ thống phím tắt tùy chỉnh, Pomodoro, clipboard |
| 13 | Tóm tắt | Tóm tắt ngày/tuần/tháng, sao chép, xuất Markdown |

### Giai đoạn 3: AI và luyện nói

| # | Module | Nội dung chính |
| --- | --- | --- |
| 14 | Trợ lý chú cáo (AI) | Chat, giải thích, sửa câu, role-play, tạo lại lộ trình, có chế độ khi offline |
| 15 | OCR manga | Đọc chữ trong bong bóng thoại (dọc + ngang) |
| 16 | Phát âm | Shadowing, pitch accent |
| 17 | Học thích ứng | Phân tích điểm yếu, độ khó tự điều chỉnh |

### Giai đoạn 4: Mở rộng

| # | Module | Nội dung chính |
| --- | --- | --- |
| 18 | Ứng dụng Android | APK qua Capacitor, cập nhật bằng Obtainium, widget, share sheet |
| 19 | Đồng bộ & cộng đồng | Đồng bộ nhiều thiết bị, nhóm học, challenge, bảng xếp hạng |
| 20 | Keigo & viết tay | Module kính ngữ/công sở, chấm viết tay từng nét |
