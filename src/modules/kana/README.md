# Module Hiragana & Katakana — `src/modules/kana`

Học bảng chữ Kana từ con số 0, chạy hoàn toàn offline. Đường dẫn: **Học → Hiragana & Katakana** (`/#/learn/kana`).

## Dùng thế nào
| Tab | Làm gì |
| --- | --- |
| **Bảng chữ** | Hiragana / Katakana, 3 nhóm: cơ bản (46), âm đục (25), âm ghép (33). Bấm chữ để nghe, xem thứ tự nét, luyện viết hoặc đưa vào Ôn tập. Nút **+Ôn** cuối hàng đưa cả hàng vào Ôn tập. Viền vàng = đang học, xanh = đã thuộc, chấm • = đã có trong Ôn tập. |
| **Viết** | Viết từng nét bằng chuột, bút hoặc ngón tay. App kiểm tra đúng thứ tự, đúng hướng, đúng vị trí; sai thì nháy nét gợi ý. *Xem cách viết* chạy hoạt ảnh mẫu, *Tắt nét mờ* để tự viết không nhìn mẫu. |
| **Nghe** | Nghe đọc một chữ, chọn đúng chữ trong 4 chữ. 20 câu. **Space** nghe lại, **1–4** chọn. |
| **Nhanh** | Nhìn chữ, chọn (hoặc gõ) romaji trong 60 giây. **1–4** chọn, **Esc** kết thúc. |

Chữ hay sai được hỏi nhiều hơn; đáp án nhiễu ưu tiên chữ dễ nhầm (シ/ツ, ソ/ン, さ/ち...).
Một chữ **đã thuộc** khi đúng ≥ 3 lần và ≥ 80%. Hết buổi luyện, chữ đã thuộc tự vào Ôn tập (tắt được ở màn chọn).

Mở thẳng một tab: `/#/learn/kana?tab=write` (`chart`, `write`, `listen`, `quick`).

## Âm thanh
Dùng giọng đọc tiếng Nhật có sẵn trong máy (Web Speech API), không cần file âm thanh hay mạng.
Windows chưa có giọng Nhật thì cài ở **Settings → Time & language → Speech → Add voices → 日本語**. App tự hiện hướng dẫn này khi không tìm thấy giọng.

## File
| File | Vai trò |
| --- | --- |
| `data.ts` | Bảng chữ (chỉ khai báo Hiragana, Katakana suy ra tự động), romaji, cách gõ khác, cặp chữ dễ nhầm |
| `strokes.ts` | Nét chữ trích từ KanjiVG (150 chữ, tạo tự động, không sửa tay) |
| `StrokeView.tsx` | Hiển thị và hoạt ảnh thứ tự nét |
| `WritePractice.tsx` | Ô luyện viết + chấm từng nét |
| `Drill.tsx` | Nghe nhận diện và Nhận diện nhanh |
| `Chart.tsx` | Bảng chữ và khung chi tiết |
| `progress.ts` | Tiến độ (kv `kana:progress`, `kana:settings`) và đưa chữ vào Ôn tập |
| `speech.ts` | Phát âm |

Không thêm bảng mới vào kho dữ liệu: tiến độ nằm trong `kv` nên tự có trong file sao lưu.
Thẻ Ôn tập: bộ **Hiragana** / **Katakana**, nguồn `{ module: 'kana', ref: <chữ> }` nên không bị thêm trùng.

## Bản quyền
Thứ tự nét: [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, giấy phép CC BY-SA 3.0 (ghi công ở cuối trang module).
