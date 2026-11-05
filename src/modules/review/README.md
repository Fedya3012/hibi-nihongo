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

## Thống kê
Tab **Thống kê** (hoặc mở thẳng `/review?tab=stats`). Chọn một bộ thẻ hoặc xem tất cả.
- **Dự báo số thẻ đến hạn** 7 ngày / 30 ngày / 3 tháng tới (biểu đồ cột, chia thẻ đã thuộc và thẻ đang học),
  tổng, trung bình mỗi ngày, ngày nặng nhất, thời gian ôn dự kiến mỗi ngày (theo tốc độ ôn 30 ngày qua).
  Thẻ quá hạn tính vào hôm nay; chưa tính thẻ mới sẽ học thêm. Có nút đi tới chỗ đổi số thẻ mới mỗi ngày.
- **Tỉ lệ nhớ thật**: trong các lần ôn thẻ đã thuộc, bao nhiêu phần trăm không bấm Quên. Chia thẻ non
  (khoảng cách < 21 ngày) và thẻ chắc (≥ 21 ngày), theo hôm nay / 7 ngày / 30 ngày / 1 năm, so với tỉ lệ nhớ mong muốn
  trong Cài đặt, kèm nhận xét nên giảm hay có thể tăng thẻ mới.
- **Các nút đã bấm** (30 ngày) và **độ thuộc** của các thẻ (chưa học, đang học, còn non, thuộc chắc, tạm ẩn).
- **10 thẻ khó nhất** (quên nhiều nhất, rồi đến độ khó FSRS). Bấm một thẻ để mở tab Thẻ và sửa nó.

Tính toán nằm trong `stats.ts` (hàm thuần, chỉ đọc), giao diện trong `StatsTab.tsx`.

## Nhập / xuất Anki (.apkg)
Tab **Thẻ → Anki**.
- **Nhập**: chọn file `.apkg` (xuất từ Anki máy tính, AnkiDroid, hoặc tải trên AnkiWeb). Đọc được cả kiểu mới nhất
  (Anki 2.1.50+, `collection.anki21b`), kiểu 2.1 và kiểu cũ 2.0. Với mỗi loại ghi chú, app tự đoán trường nào là
  chữ Nhật / cách đọc / nghĩa / câu ví dụ…, hiện bản xem trước, và cho chọn lại nếu đoán sai.
  - Giữ tiến độ: hạn ôn, độ thuộc (nếu Anki bật FSRS thì lấy đúng số của FSRS), số lần quên, thẻ tạm ẩn.
  - Furigana kiểu `日本[にほん]` tách thành chữ + cách đọc. Từ tô đậm trong câu ví dụ thành chỗ trống `{{ }}`.
    Thẻ cloze `{{c1::…}}` thành câu điền chỗ trống.
  - Ảnh được nhập kèm (nén lại). Âm thanh chưa nhập (app đọc bằng giọng máy).
  - Ghi chú có nhiều thẻ (vd Nhận diện + Viết lại) thành một thẻ (app tự đổi dạng câu hỏi), lấy lịch của thẻ ôn nhiều nhất.
  - Nhập lại cùng file không tạo trùng (theo mã ghi chú của Anki, hoặc cùng bộ + cùng chữ).
- **Xuất**: tạo `.apkg` (kiểu 2.0, mọi bản Anki đều mở được), loại ghi chú "Hibi Nihongo", kèm tiến độ, lịch sử ôn,
  ảnh nếu chọn. Nhập ngược file này vào app thì khớp đủ mọi ô.
- Code: `anki/read.ts` (đọc gói), `anki/convert.ts` (đoán trường, làm sạch HTML, đổi lịch), `anki/import.ts`,
  `anki/export.ts`, `anki/AnkiPanel.tsx`. Đọc SQLite bằng `sql.js`, giải nén zstd bằng `fzstd`; phần này chỉ tải khi dùng.

## Trạng thái thẻ
- **Tạm ẩn (suspend)**: không xuất hiện khi ôn cho tới khi bỏ ẩn.
- **Chôn (bury)**: cất tới đầu ngày học kế tiếp rồi tự quay lại.
- **Khó nhớ (leech)**: quên từ 8 lần (đổi trong Cài đặt) thì gắn nhãn `leech`, có thể tự tạm ẩn. Lọc trong tab Thẻ để sửa lại.
- Mọi thao tác chấm, chôn, ẩn, sửa, xóa, học lại đều **hoàn tác** được (Z trong buổi ôn, Ctrl+Z hoặc thanh "Hoàn tác" ở tab Thẻ).

## Ảnh và âm thanh
- Thẻ có thể kèm **ảnh** (vd panel manga): chọn file hoặc dán ảnh (Ctrl+V) khi thêm/sửa thẻ. Ảnh được nén JPEG ≤ 900px,
  lưu ngay trong thẻ nên đi kèm file sao lưu. Ảnh hiện ở mặt đáp án.
- Thẻ có thể kèm **tiếng nói gốc** (vd giọng nhân vật cắt từ anime, phím C trong trình xem anime). Lật thẻ là tự phát,
  nút "▶ Nghe câu gốc" hoặc phím R để nghe lại. Tiếng lưu dạng data URL trong thẻ (có trong sao lưu).
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
| `stats.ts` | Tính thống kê: dự báo, tỉ lệ nhớ thật, thẻ khó nhất |
| `ReviewPage.tsx`, `CardsTab.tsx`, `StatsTab.tsx`, `SettingsTab.tsx`, `CardFace.tsx` | Giao diện |
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
`image` nhận Blob/File (vd kết quả `cropPanel`) hoặc data URL. `audio` nhận Blob (vd đoạn thoại ghi bằng MediaRecorder) hoặc data URL.
Gắn ảnh/tiếng vào thẻ đã có: `attachReviewMedia({ module: 'dictionary', ref: '1358280' }, { image, audio })`.
Mở thẳng ôn nhanh 5 phút: `/review?quick=1`. Mở tab Thẻ và tìm sẵn: `/review?tab=cards&q=<chữ>`. Mở tab Thống kê: `/review?tab=stats`.
