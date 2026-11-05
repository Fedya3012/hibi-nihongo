# Module Ôn tập (SRS) — `src/modules/review`

Flashcard ôn tập ngắt quãng bằng thuật toán **FSRS-5**, chạy hoàn toàn offline.

## Dùng thế nào
- **Ôn tập** (tab đầu): xem số thẻ đến hạn, bấm *Bắt đầu ôn* hoặc *Ôn nhanh 5 phút*. Chọn dạng câu hỏi ở ô "Dạng câu hỏi".
- **Thẻ**: thêm từng thẻ, dán cả danh sách (copy từ Excel/Google Sheets), tìm, sửa, tạm ẩn, học lại, xóa.
- **Cài đặt**: tỉ lệ nhớ mong muốn (mặc định 90%), số thẻ mới mỗi ngày, giờ bắt đầu ngày mới.
- Chưa có thẻ: bấm *Thêm bộ thẻ mẫu N5* (40 từ vựng, 20 Kanji, 12 ngữ pháp, tự soạn).

Trong lúc ôn: **Space** lật thẻ, **1–4** chấm Quên/Khó/Được/Dễ, **Z** hoàn tác, **B** chôn đến mai,
**S** tạm ẩn, **R** nghe đọc, **Esc** thoát.
Trên màn cảm ứng: chạm để lật, vuốt ← Quên · → Được · ↑ Dễ · ↓ Khó, **nhấn giữ** thẻ để Chôn / Tạm ẩn.

## Trạng thái thẻ
- **Tạm ẩn (suspend)**: không xuất hiện khi ôn cho tới khi bỏ ẩn.
- **Chôn (bury)**: cất tới đầu ngày học kế tiếp rồi tự quay lại.
- **Khó nhớ (leech)**: quên từ 8 lần (đổi trong Cài đặt) thì gắn nhãn `leech`, có thể tự tạm ẩn. Lọc trong tab Thẻ để sửa lại.
- Mọi thao tác chấm, chôn, ẩn, sửa, xóa, học lại đều **hoàn tác** được (Z trong buổi ôn, Ctrl+Z hoặc thanh "Hoàn tác" ở tab Thẻ).

## Ảnh và âm thanh
- Thẻ có thể kèm **ảnh** (vd panel manga): chọn file hoặc dán ảnh (Ctrl+V) khi thêm/sửa thẻ. Ảnh được nén JPEG ≤ 900px,
  lưu ngay trong thẻ nên đi kèm file sao lưu. Ảnh hiện ở mặt đáp án.
- Nút 🔊 đọc từ / câu ví dụ bằng giọng tiếng Nhật có sẵn của máy.

## Dạng câu hỏi
| Dạng | Cách hỏi | Dùng cho |
| --- | --- | --- |
| Nhìn chữ → nhớ nghĩa | tự chấm | mọi thẻ |
| Nhìn nghĩa → nhớ chữ | tự chấm | mọi thẻ |
| Trắc nghiệm 4 đáp án | máy chấm, gợi ý nút | khi có ≥ 3 thẻ cùng loại khác nghĩa |
| Gõ cách đọc | gõ romaji tự đổi kana, máy chấm | từ vựng có Kanji và có cách đọc |
| Điền vào chỗ trống | gõ phần thiếu, hoặc để trống để tự chấm | thẻ có câu ví dụ chứa `{{ }}` |

Chế độ "Trộn" (mặc định): thẻ mới hỏi kiểu dễ nhất, thẻ càng thuộc càng hay gặp kiểu khó.

## File
| File | Vai trò |
| --- | --- |
| `fsrs.ts` | Thuật toán FSRS (hàm thuần, không đọc/ghi dữ liệu) |
| `store.ts` | Đọc/ghi thẻ, lịch sử, cài đặt; chấm thẻ + hoàn tác trong một giao dịch |
| `queue.ts` | Xếp hàng đợi buổi ôn, chọn dạng câu hỏi |
| `kana.ts` | Romaji → hiragana, so cách đọc |
| `Session.tsx` | Màn hình ôn (nút, phím tắt, vuốt, hoàn tác, đồng hồ 5 phút) |
| `ReviewPage.tsx`, `CardsTab.tsx`, `SettingsTab.tsx`, `CardFace.tsx` | Giao diện |
| `starter.ts` | Bộ thẻ mẫu N5 |
| `api.ts` | **API cho module khác** |

Dữ liệu: bảng `srsCards`, `srsLogs` (đã thêm vào `src/core/db/schema.ts`, có sao lưu) và khóa kv `review:settings`.

## Cho module khác (từ điển, kanji, kana, anime, Hôm nay)
```ts
import { addReviewCards, useReviewOverview } from '@/modules/review/api'

await addReviewCards([{ deck: 'Từ vựng của tôi', kind: 'vocab', front: '食べる', reading: 'たべる',
  meaning: 'ăn', example: 'パンを{{食べ}}ます。', source: { module: 'dictionary', ref: '1358280' } }])

const ov = useReviewOverview() // ov?.dueNow, ov?.newAvailable, ov?.reviewedToday
```
Thẻ có cùng `source` (hoặc cùng bộ + cùng chữ + cùng loại) không bị thêm trùng.
`image` nhận Blob/File (vd kết quả `cropPanel`) hoặc data URL.
Mở thẳng ôn nhanh 5 phút: `/review?quick=1`. Mở tab Thẻ và tìm sẵn: `/review?tab=cards&q=<chữ>`.
