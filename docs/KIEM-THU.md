# Kiểm tra tự động (test)

Mỗi lần có PR hoặc push, GitHub chạy `npm test` trước khi build (xem `.github/workflows/check.yml`).
Nếu một thay đổi làm hỏng tính năng cũ, PR sẽ báo đỏ ngay, trước khi gộp vào `main`.

## Đang kiểm tra những gì

| File test | Bảo vệ cho |
| --- | --- |
| `src/modules/review/fsrs.test.ts` | Lịch ôn FSRS: thẻ mới, bước học, quên, thứ tự Khó ≤ Được < Dễ, khoảng cách tối đa |
| `src/modules/conjugation/lib/conjugate.test.ts` | Chia động từ/tính từ, và **chia ngược** (tra từ đã chia về thể từ điển) cho mọi từ luyện tập |
| `src/modules/dictionary/lib/kana.test.ts` | Gõ romaji ra hiragana, katakana ↔ hiragana, furigana |
| `src/modules/review/anki/convert.test.ts` | Đổi dữ liệu Anki → thẻ (HTML, furigana, cloze, ảnh, tiếng) |
| `src/modules/review/bySource.test.ts` | Thêm thẻ không tạo trùng, tra thẻ theo nguồn |
| `src/modules/today/lib/logDays.test.ts` | Tổng lịch sử ôn theo ngày (trang Hôm nay) giống hệt cách tính lại từ đầu |
| `src/core/db/coalesce.test.ts` | Gộp các lần tải lại màn hình |

## Cách chạy trên máy

```
npm test
```

## Viết thêm test

- Đặt file `*.test.ts` ngay cạnh file được kiểm tra.
- Test cần kho dữ liệu: thêm dòng `import 'fake-indexeddb/auto'` ở đầu file, rồi dùng `@/core/db` như trong app.
- Mô tả test bằng tiếng Việt, để đọc kết quả là hiểu cái gì hỏng.
