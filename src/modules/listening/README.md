# Luyện nghe (`src/modules/listening`)

Nghe rồi gõ lại. Mở trong app: **Học → Luyện nghe** (đường dẫn `#/learn/listening`). Chạy offline.

## Dùng thế nào

| Tab | Nghe gì | Gõ gì |
| --- | --- | --- |
| **Chép câu** | Câu mẫu của Ngữ pháp (N5 → N1, giọng máy) hoặc câu phụ đề anime (tiếng nhân vật thật) | Cả câu, hoặc chỉ **phần còn thiếu** (chế độ Điền chỗ trống) |
| **Số đếm** | 0–99, 100–9.999, số lớn (万, 億), giá tiền (円), đơn vị đếm (本, 匹, 人, つ…) | Chữ số, ví dụ `3600`; đơn vị đếm thì chọn thêm đơn vị |
| **Giờ** | 7時15分, 9時半, có thể kèm 午前 / 午後 | `7:15` (có 午後 thì gõ giờ 24: `19:15`) |
| **Ngày tháng** | 5月20日, ngày đặc biệt (ついたち, はつか…), có thể kèm thứ | `tháng/ngày` theo kiểu Nhật: `5/20`; thứ thì bấm chọn |

- **Nghe** / **Nghe chậm**, phím **Ctrl+Space** nghe lại khi đang gõ, **Enter** kiểm tra / sang câu tiếp.
- **Xem nghĩa (gợi ý)** hiện nghĩa câu trước khi chấm.
- Mỗi tab có **Mẹo nghe** (các cách đọc hay sai) và dòng thống kê "Đã làm … · đúng …%". Nút **Xóa thống kê** ở cuối trang.

### Chấm câu thế nào?
App so **cách đọc** (hiragana), không so chữ: gõ kana, Kanji hay romaji đều được.
`は/わ`, `へ/え`, `を/お`, `ず/づ`, trường âm `ー` (こーひー = こうひい) được coi là giống nhau.
Kết quả tô màu từng âm: xanh = đúng, đỏ gạch chân = thiếu hoặc sai, gạch ngang = gõ thừa. Đúng 100% mới tính là đúng.
Câu có Kanji (của phụ đề, hoặc bạn gõ Kanji) cần bộ tách từ của Từ điển (~17 MB, tải một lần).

### Phụ đề anime
Chọn tập (những tập đã nhập trong **Xem anime** có phụ đề tiếng Nhật). App bỏ câu quá ngắn (えっ, あ…) hoặc quá dài.
Nếu mở được file video (Chrome/Edge/bản Windows nhớ vị trí file), app phát đúng đoạn câu đó từ video (video ẩn, chỉ nghe tiếng).
Trình duyệt hỏi quyền thì bấm **Cho phép mở video**; mất file thì **Chọn file video**. Không có video thì giọng máy đọc câu phụ đề.

## Giọng đọc
Dùng giọng tiếng Nhật có sẵn trong máy (Web Speech API). Windows chưa có: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → 日本語.
Số, giờ, ngày được app **tự viết cách đọc bằng hiragana** (`lib/numbers.ts`) rồi mới đưa cho giọng máy, nên luôn đúng biến âm
(さんびゃく, ろっぽん, よじ, いっぷん, ついたち, はつか…).

## Dữ liệu
Chỉ một khóa kv `listening:stats` (số câu đúng / đã làm của từng tab, có trong sao lưu). Câu mẫu đọc từ module Ngữ pháp,
phụ đề đọc từ bảng `animeSubs` của module anime (chỉ đọc, không ghi; chỉ ghi `animeMedia` khi bạn chọn lại file video).

## Các file
| File | Vai trò |
| --- | --- |
| `ListeningPage.tsx` | Trang, 4 tab (`?tab=number|time|date`) |
| `Dictation.tsx` | Chép câu: chọn nguồn, phát tiếng, chấm, hiện kết quả |
| `Drill.tsx` | Số đếm, giờ, ngày tháng |
| `components.tsx`, `strings.ts` | Mảnh giao diện chung, chữ giao diện 3 ngôn ngữ |
| `lib/numbers.ts` | Cách đọc số / đơn vị đếm / giờ / ngày, tạo câu hỏi, chấm |
| `lib/compare.ts` | Đổi câu ra cách đọc, so sánh từng âm |
| `lib/sources.ts` | Lấy câu mẫu (Ngữ pháp) và câu phụ đề (anime) |
| `lib/speech.ts` | Giọng máy, phát một đoạn video |
| `lib/stats.ts` | Thống kê |
