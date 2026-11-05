# Xem anime (`src/modules/immersion/anime`)

Xem anime tiếng Nhật từ **file của chính bạn**, kèm phụ đề tiếng Nhật bấm để tra từ. App không kèm anime nào.
Mở trong app: **Immersion → Xem anime** (đường dẫn `#/immersion/anime`).

## Dùng thế nào

1. Bấm **+ Thêm anime**, chọn (hoặc kéo thả) cùng lúc file video và file phụ đề:
   - Video: `.mp4`, `.webm` (chạy mọi nơi), `.mkv` (Chrome/Edge/bản Windows, nếu video là H.264/HEVC)
   - Phụ đề: `.srt`, `.ass` / `.ssa`, `.vtt`. Phụ đề Shift_JIS kiểu cũ cũng đọc được.
2. App tự ghép video với phụ đề **cùng tên** hoặc **cùng số tập**, đoán tên series và số tập
   (`[Nhóm] Frieren - 05 (1080p).mkv`, `S01E05`, `第5話`...). Phụ đề có chữ kana = phụ đề tiếng Nhật,
   còn lại = phụ đề dịch (tiếng Việt/Anh) để đối chiếu. Sai thì sửa ngay trong hộp thoại.
3. Mở series → bấm ▶. Lần sau mở lại là về đúng chỗ đang xem (Smart Resume).

### Video có bị chép vào app không?

Không (mặc định). Video rất nặng nên app chỉ **nhớ vị trí file** trên máy (Chrome, Edge, bản Windows).
Lần đầu mở lại sau khi khởi động, trình duyệt có thể hỏi "Cho phép mở video" một lần.
Firefox/Safari không nhớ được file: mỗi lần xem app nhờ bạn chọn lại file, hoặc tick **Chép video vào app** khi nhập.
Nếu đổi chỗ/đổi tên file, bấm **Chọn file video** trong trình xem; chỗ đang xem vẫn giữ nguyên.

### Trong trình xem

| Phím | Tác dụng |
| --- | --- |
| Space / K | Phát / tạm dừng |
| ← → | Tua 5 giây |
| A / D | Câu trước / câu sau |
| S | Nghe lại câu đang nói |
| L | Lặp câu này (shadowing) |
| B | Lặp đoạn A-B: bấm lần 1 chọn điểm A, lần 2 chọn điểm B, lần 3 tắt |
| P | Tự dừng sau mỗi câu (để bạn nhắc lại) |
| H | Phụ đề tiếng Nhật: Hiện → Mờ (di chuột mới rõ, luyện nghe) → Ẩn |
| R | Furigana trên phụ đề |
| T | Phụ đề dịch |
| Z / X | Phụ đề sớm / muộn 0,1 giây (lưu riêng cho từng tập) |
| [ ] | Chậm / nhanh (0,5× → 1,5×) |
| F | Toàn màn hình |
| C | Tạo thẻ ôn tập từ câu đang nói, kèm ảnh cảnh phim và tiếng nhân vật |

- **Di chuột vào phụ đề** → video tạm dừng, popup tra từ hiện khi di qua từng từ. Rời chuột → chạy tiếp.
  Bấm vào một từ thì video dừng hẳn để bạn đọc kỹ. Tắt được bằng ô "Di chuột vào phụ đề thì tạm dừng".
- Bảng **Lời thoại**: dòng đang nói được tô sáng, bấm dòng để nhảy tới, nút 辞 để tra cả câu.
- Bảng **Từ vựng**: xem bên dưới.

## Điểm hiểu (Comprehension Score) và tạo thẻ

App tách phụ đề thành từ (bộ tách từ của module Từ điển), bỏ trợ từ, đuôi câu, dấu câu, số và tên riêng,
rồi so với **thẻ Ôn tập** của bạn:

- **Đã biết**: thẻ đã thuộc (trạng thái Review trong FSRS), hoặc từ bạn bấm **Đã biết**.
- **Đang học**: đã có thẻ nhưng chưa thuộc.
- **Mới**: chưa có thẻ.

Điểm hiểu = số **lượt** gặp từ đã biết / tổng số lượt từ (từ hay gặp quan trọng hơn từ gặp một lần).
Khoảng 95% trở lên là xem thoải mái; 85–95% là vừa sức để học.

Trong bảng **Từ vựng** (ở trình xem hoặc nút "Từ vựng" của từng tập):
- Danh sách từ / Kanji của tập, xếp theo số lần xuất hiện, kèm nghĩa từ điển.
- **Chọn 20 từ hay gặp nhất** → **+ Thêm thẻ ôn tập**: thẻ vào bộ `Anime · <tên series>`, có câu ví dụ
  lấy từ phụ đề (dạng điền vào chỗ trống). Thẻ Kanji vào bộ `Kanji của tôi`.
- Thẻ dùng cùng nguồn với nút "Thêm vào ôn tập" của Từ điển (`source: { module: 'dictionary', ref: <id JMdict> }`),
  nên một từ không bị tạo hai thẻ dù thêm từ popup hay từ danh sách.

### Thẻ kèm ảnh cảnh phim và tiếng nhân vật

Bấm **C** (hoặc nút 📸 trên thanh điều khiển, hay 📸 cạnh mỗi dòng trong bảng Lời thoại):

1. App tự **phát lại câu đó một lần** ở tốc độ 1× để ghi tiếng nói gốc, và chụp ảnh cảnh phim ở giữa câu.
   Nghe thử ngay trong hộp; chưa ưng thì bấm **Ghi lại**.
2. Chọn từ muốn học trong câu (từ chưa có thẻ được chọn sẵn), và/hoặc tick **Lưu cả câu thành một thẻ**.
3. **Lưu**: thẻ vào bộ `Anime · <tên series>`, có câu ví dụ điền chỗ trống, nghĩa câu (từ phụ đề dịch nếu có),
   ghi chú "series · tập · thời điểm", ảnh và tiếng. Khi ôn, **lật thẻ là tự phát giọng nhân vật**; phím R nghe lại.
   Từ đã có thẻ (thêm từ Từ điển, manga...) thì app **gắn ảnh và tiếng vào thẻ cũ**, không tạo thẻ trùng.

Ảnh (JPEG ≤ 900px) và tiếng (Opus/AAC ~48 kbps, câu 3 giây ~20 KB) được lưu ngay trong thẻ nên có trong file sao lưu,
không cần giữ file video. Chrome/Edge/bản Windows lấy tiếng thẳng từ video; Firefox/Safari đi qua Web Audio.
Mã: `capture.ts` (chụp ảnh, ghi tiếng), `MineDialog.tsx` (hộp tạo thẻ).

Lần đầu phân tích cần tải bộ tách từ (~17 MB), sau đó chạy offline. Kết quả phân tích được lưu lại.

## Dữ liệu được lưu ở đâu

| Bảng (IndexedDB) | Nội dung | Sao lưu? |
| --- | --- | --- |
| `animeSeries` | Tên series, tập đang xem | Có |
| `animeEpisodes` | Số tập, tên file, **chỗ đang xem**, thời lượng, lệch phụ đề, đã xem xong chưa | Có |
| `animeSubs` | Phụ đề đã đọc (chữ + thời gian) và kết quả phân tích từ vựng | Có |
| `animeMedia` | Vị trí file video trên máy, hoặc bản chép video | **Không** |

Kv: `anime:prefs` (cài đặt trình xem). Từ đánh dấu "Đã biết" nằm trong Kho từ dùng chung (`src/modules/vocab`); danh sách cũ `anime:known` được tự chuyển sang.
Khôi phục sao lưu ở máy mới: danh sách tập, phụ đề, tiến độ còn nguyên; khi xem, chọn lại file video.

## Các file

| File | Vai trò |
| --- | --- |
| `AnimePage.tsx` | Trang chính, chọn màn hình theo đường dẫn (`?series=`, `?watch=`) |
| `Library.tsx`, `SeriesView.tsx`, `ImportDialog.tsx` | Thư viện, trang series, hộp thoại nhập |
| `Player.tsx` | Trình xem: phụ đề tra từ, lời thoại, phím tắt, lặp câu, A-B, tự dừng, Smart Resume |
| `VocabPanel.tsx` | Điểm hiểu, danh sách từ/Kanji, tạo thẻ ôn tập |
| `MineDialog.tsx`, `capture.ts` | Tạo thẻ từ một câu thoại, kèm ảnh cảnh phim + tiếng nhân vật |
| `subtitles.ts` | Đọc SRT/VTT/ASS, nhận bảng mã, tìm dòng đang hiện |
| `importer.ts` | Ghép video ↔ phụ đề, đoán số tập, lưu |
| `media.ts` | Chọn file, nhớ file trên máy (File System Access API), mở lại video |
| `analysis.ts` | Tách từ phụ đề, so với thẻ ôn tập, tính điểm hiểu |
| `store.ts`, `types.ts` | Đọc/ghi kho dữ liệu, kiểu dữ liệu |
| `api.ts` | API cho module khác (Smart Resume) |

Module dùng lại `naming.ts` (đoán số tập, sắp xếp tự nhiên) và `ui.tsx` (Modal, ProgressBar) của module manga.

## Cho module khác

```ts
import { useAnimeResume } from '@/modules/immersion/anime/api'
const r = useAnimeResume() // { seriesTitle, episodeLabel, position, duration, path } hoặc undefined
// <Link to={r.path}>Xem tiếp</Link>
```

## Giới hạn hiện tại

- Phụ đề nằm **bên trong** file `.mkv` chưa đọc được: dùng file phụ đề rời (.srt/.ass/.vtt).
- `.avi` và một số codec (ví dụ AV1 trên máy cũ) trình duyệt không phát được: app báo lỗi rõ, nên đổi sang `.mp4`.
- Phụ đề ASS hiện như chữ thường (không giữ vị trí, màu, hiệu ứng karaoke).
- Chưa có ảnh bìa: ô bìa dùng chữ đầu của tên series.
