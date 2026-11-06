# Xem anime (`src/modules/immersion/anime`)

Xem anime tiếng Nhật từ **file của chính bạn** để học: phụ đề bấm để tra từ, lưu câu kèm cảnh phim và âm thanh gốc,
luyện nghe / shadowing / chép chính tả, ôn thẻ theo từng tập. App không kèm anime nào.
Mở trong app: **Immersion → Xem anime** (đường dẫn `#/immersion/anime`).

## Dùng thế nào

1. Bấm **+ Thêm anime**, chọn (hoặc kéo thả) cùng lúc file video và file phụ đề:
   - Video: `.mp4`, `.webm` (chạy mọi nơi), `.mkv` (Chrome/Edge/bản Windows, nếu video là H.264/HEVC)
   - Phụ đề: `.srt`, `.ass` / `.ssa`, `.vtt`. Phụ đề Shift_JIS kiểu cũ cũng đọc được.
   - File `.mkv` có **phụ đề nhúng** (dạng chữ: SRT/ASS) được tự đọc ra khi nhập, hoặc bấm **Đọc phụ đề nhúng** trong trình xem.
2. App tự ghép video với phụ đề **cùng tên** hoặc **cùng số tập**, đoán tên series, mùa và số tập
   (`[Nhóm] Frieren - 05 (1080p).mkv`, `S01E05`, `第5話`...). Phụ đề có chữ kana = phụ đề tiếng Nhật,
   còn lại = phụ đề dịch (tiếng Việt/Anh) để xem song ngữ. Sai thì sửa ngay trong hộp thoại.
3. Mở series → bấm ▶. Lần sau mở lại là về đúng chỗ đang xem (Smart Resume).

### Video có bị chép vào app không?

Không (mặc định). Video rất nặng nên app chỉ **nhớ vị trí file** trên máy (Chrome, Edge, bản Windows).
Lần đầu mở lại sau khi khởi động, trình duyệt có thể hỏi "Cho phép mở video" một lần.
Muốn xem offline không cần file gốc (ổ cứng ngoài, máy khác...): bấm **Lưu vào app** ở từng tập, hoặc tick
**Chép video vào app** khi nhập. Phụ đề luôn được lưu trong app.

## Trong trình xem

### Phím tắt

| Phím | Tác dụng |
| --- | --- |
| Space / K | Phát / tạm dừng (khi đang luyện tập: tiếp tục) |
| ← → | Lùi / tới 5 giây |
| Shift + ← → | Lùi / tới 3 giây |
| A / D | Câu trước / câu sau |
| S | Nghe lại câu đang nói |
| L | Lặp câu này |
| B | Lặp đoạn A-B: bấm lần 1 chọn điểm A, lần 2 chọn điểm B, lần 3 tắt |
| P | Tự dừng sau mỗi câu |
| C | **Lưu câu đang nói + tạo thẻ** (chữ, thời điểm, ảnh cảnh phim, âm thanh gốc; chọn từ muốn học) |
| M | Đổi cách xem: Hỗ trợ → Song ngữ → Chỉ phụ đề dịch → Full Immersion → Chỉ nghe |
| H | Phụ đề tiếng Nhật: Hiện → Mờ (di chuột mới rõ) → Ẩn |
| R | Furigana trên phụ đề |
| G | Tô màu từ mới / đang học |
| T | Phụ đề dịch |
| Z / X | Phụ đề sớm / muộn 0,1 giây (lưu riêng cho từng tập) |
| [ ] | Chậm / nhanh (0,5× → 1,5×, **giữ nguyên cao độ giọng**) |
| F | Toàn màn hình (popup tra từ vẫn dùng được) |
| 1 2 3 | Trả lời khi Kiểm tra nghe (hiểu / một phần / không) |

Các phím trên là mặc định và đổi được ở trang **Phím tắt** (`src/modules/shortcuts/keymap.ts`, nhóm "anime").
Riêng M, G, Shift + ← → và phím trong khung luyện tập (Space, 1 2 3, S) là phím cố định của module, chưa có trong trang Phím tắt.

### Phụ đề tương tác

- **Di chuột vào phụ đề** → video tạm dừng, popup tra từ (nghĩa, cách đọc, Kanji, ví dụ) hiện khi di qua từng từ.
  Rời chuột → chạy tiếp. Bấm vào một từ thì video dừng hẳn. Tắt được bằng ô "Di chuột vào phụ đề thì tạm dừng".
- **Tô màu**: từ mới gạch chân màu chủ đạo, từ đang học màu vàng, từ đã thuộc để bình thường.
  Furigana theo Cài đặt (ví dụ "chỉ Kanji chưa thuộc").
- Bảng bên phải có 5 tab: **Lời thoại** (bấm dòng để nhảy tới, 辞 tra cả câu, ? giải thích),
  **Từ vựng**, **Câu đã lưu**, **Giải thích**, **Ghi chú**.

### Chế độ xem và luyện tập

| Chế độ | Cách hoạt động |
| --- | --- |
| Hỗ trợ | Phụ đề Nhật, tra từ, phụ đề dịch bật/tắt bằng T |
| Song ngữ | Phụ đề Nhật + phụ đề dịch |
| Chỉ phụ đề dịch | Nghe tiếng Nhật, đọc bản dịch |
| Full Immersion | Không phụ đề, ẩn lời thoại (bấm "Hiện lời thoại" nếu cần) |
| Chỉ nghe | Ẩn cả hình, chỉ còn âm thanh |
| Kiểm tra nghe | Dừng sau mỗi câu: tự đánh giá hiểu / một phần / không → xem câu + bản dịch. Kết quả lưu theo tập |
| Chép chính tả | Nghe từng câu rồi gõ lại (kana, Kanji hoặc romaji). App so theo cách đọc, tô chữ đúng/sai |
| Shadowing | Phát câu → khoảng lặng để bạn nhắc lại → phát lại bản gốc. Tick "Ghi âm giọng tôi" để nghe lại giọng mình và (Chrome/Edge, cần mạng) chấm điểm phát âm bằng nhận dạng giọng nói |
| Học theo đoạn | Cứ mỗi N câu (mặc định 20) dừng lại: liệt kê từ mới vừa nghe để tạo thẻ hoặc đánh dấu đã biết |

Ba cấp luyện nghe gợi ý: **Chỉ nghe** → **Full Immersion** (có hình) → **Hỗ trợ** (phụ đề Nhật) → **Song ngữ**.
"Nghe không phụ đề rồi kiểm tra" = chế độ **Kiểm tra nghe**.

### Giải thích hội thoại tự nhiên

Tab **Giải thích** phân tích câu đang nói (hoặc câu bấm ?) bằng luật viết sẵn:
- Cách nói rút gọn / khẩu ngữ: ちゃう, てる, とく, なきゃ, じゃん, っす, すげえ... kèm **cách nói lịch sự tương đương**.
- Đuôi câu và xưng hô theo nhân vật: ぜ/ぞ, わ/かしら, 俺/僕/あたし/てめえ/お前, hậu tố ～くん/～ちゃん/～様, giọng Kansai.
- Từ cảm thán và từ tượng thanh / tượng hình (theo từ loại và ghi chú JMdict).
- Ghi chú nhân vật của bạn (tab **Ghi chú** hoặc trang series) hiện cạnh câu thoại của nhân vật đó.

## Lưu câu và tạo thẻ ôn tập

- **★ Lưu câu (C)** mở hộp **Lưu câu và tạo thẻ**: app phát lại câu một lần để ghi **âm thanh gốc** và chụp **ảnh cảnh phim**,
  rồi bạn chọn từ muốn học (từ mới được chọn sẵn), tick "Lưu cả câu thành một thẻ" và chọn loại câu.
  Câu luôn được lưu vào **Câu đã lưu** (bản dịch nếu có phụ đề dịch, tên nhân vật nếu phụ đề ASS có, thời điểm), kể cả khi không tạo thẻ nào.
- Trong tab **Câu đã lưu**: đổi **loại câu** (thông thường, tiếng lóng, khẩu ngữ, cách nói nhân vật, cảm thán, tượng thanh),
  sửa bản dịch, thêm ghi chú, bấm **+ Thẻ cả câu**, hoặc chọn từ trong câu → **+ Thêm thẻ từ** (câu làm ví dụ điền chỗ trống).
- Thẻ vào bộ `Anime · <tên series>`, có ảnh cảnh phim và âm thanh gốc (trang Ôn tập tự phát khi lật thẻ), ghi rõ series · tập · thời điểm · nhân vật.
  Từ đã có thẻ thì ảnh + tiếng được gắn vào thẻ cũ.
- Thẻ từ dùng cùng nguồn với nút "Thêm vào ôn tập" của Từ điển (`source: { module: 'dictionary', ref: <id JMdict> }`),
  nên một từ không bị tạo hai thẻ. Thẻ câu có nguồn `{ module: 'anime', ref: 's:<id câu>' }`.

### Ôn theo cảnh phim

Nút **Ôn theo cảnh phim** (thư viện, trang series, cuối tập): ôn các thẻ tạo từ anime **kèm ảnh và âm thanh gốc**.
- Phạm vi: tất cả / một bộ / một mùa / một tập / **1–2 tập xem gần nhất**.
- Kiểu ôn: **Đầy đủ** (chữ + ảnh + âm thanh), **Nghe hiểu** (che chữ: chỉ ảnh + âm thanh), **Che từ trong câu**.
- Chấm Quên / Khó / Được / Dễ dùng chung lịch FSRS với trang Ôn tập. "Luyện thêm" thẻ chưa đến hạn không đổi lịch của chúng.
- Nút **Xem lại cảnh này** mở trình xem đúng giây đó.

Thẻ đã có âm thanh gốc trong chính thẻ, nên ôn ở trang Ôn tập chung cũng nghe được; ở đây có thêm phạm vi theo tập và kiểu ôn che chữ.

## Điểm hiểu, độ khó và tiến độ

App tách phụ đề thành từ (bộ tách từ của module Từ điển), bỏ trợ từ, đuôi câu, dấu câu, số và tên riêng, rồi so với thẻ Ôn tập:
**Đã biết** (thẻ đã thuộc, hoặc bấm Đã biết) · **Đang học** · **Mới**.
Điểm hiểu = số **lượt** gặp từ đã biết / tổng số lượt từ. 95%+ là xem thoải mái; 80–95% là vừa sức để học.

- **Tốc độ nói**: số chữ tiếng Nhật mỗi phút thoại (nói chậm < 250, vừa < 340, nhanh).
- **Thư viện**: lọc Đang xem / Muốn xem / Đã xem xong, sắp xếp "dễ hiểu nhất trước", mục **Vừa sức với bạn**
  (bộ chưa xem xong mà bạn hiểu 80–95%), thống kê tổng thời gian xem, số tập đã xem, số từ đã thuộc nhờ anime, số câu đã lưu.
- **Trang series**: chia theo mùa, mỗi mùa có % đã học (trung bình giữa tỉ lệ tập "đã học" và tỉ lệ thẻ đã thuộc);
  mỗi tập hiện: đã xem, **đã học**, số từ mới đã tạo thẻ, số câu đã lưu, thẻ đến hạn, kết quả kiểm tra nghe / chính tả, thời gian xem, ghi chú.
- **Trước khi xem tiếp**: gợi ý ôn thẻ đến hạn của tập vừa xem / 2 tập gần nhất, học trước từ mới của tập sắp xem.
- Cuối tập: nút ôn thẻ tập này, học trước từ vựng tập sau, xem tập sau.

## Tìm kiếm và xuất Anki

- **🔍 Tìm câu / từ** (thư viện): tìm trong mọi câu đã lưu (chữ, bản dịch, ghi chú), thẻ từ anime và toàn bộ phụ đề tiếng Nhật.
  Bấm kết quả để mở đúng cảnh (`?watch=<id>&t=<giây>`).
- **Xuất Anki** (thư viện hoặc trang series): tải file `.zip` gồm `anime-cards.txt` (tách bằng Tab, có HTML,
  âm thanh `[sound:...]`, ảnh `<img>`), thư mục `media/` và `HUONG-DAN.txt` (cách chép media vào `collection.media` rồi File → Import).

## Dữ liệu được lưu ở đâu

| Bảng (IndexedDB) | Nội dung | Sao lưu? |
| --- | --- | --- |
| `animeSeries` | Tên series, tập đang xem, trạng thái, ghi chú nhân vật | Có |
| `animeEpisodes` | Số tập/mùa, tên file, **chỗ đang xem**, thời lượng, lệch phụ đề, đã xem/đã học, thời gian xem, kết quả luyện nghe, ghi chú | Có |
| `animeSubs` | Phụ đề đã đọc (chữ + thời gian) và kết quả phân tích từ vựng | Có |
| `animeSentences` | Câu đã lưu (chữ, thời điểm, bản dịch, nhân vật, loại, ghi chú) | Có |
| `animeLinks` | Thẻ ôn tập nào đến từ tập / câu nào (để ôn theo tập, thống kê) | Có |
| `animeClips` | Ảnh cảnh phim và âm thanh gốc của câu đã lưu | **Không** (nặng) |
| `animeMedia` | Vị trí file video trên máy, hoặc bản chép video | **Không** |

Kv: `anime:prefs` (cài đặt trình xem). Từ "Đã biết" nằm trong Kho từ dùng chung (module vocab).
Khôi phục sao lưu ở máy mới: tập, phụ đề, tiến độ, câu đã lưu còn nguyên (ảnh trên thẻ ôn tập cũng còn vì nằm trong thẻ);
âm thanh gốc của câu thì không, và khi xem cần chọn lại file video.

## Các file

| File | Vai trò |
| --- | --- |
| `AnimePage.tsx` | Trang chính, chọn màn hình theo đường dẫn (`?series=`, `?watch=&t=`, `?review=1`) |
| `Library.tsx` | Thư viện: lọc, độ khó, gợi ý, thống kê, tìm kiếm |
| `SeriesView.tsx` | Trang series: mùa, tiến độ từng tập, gợi ý trước khi xem, xuất Anki |
| `ImportDialog.tsx`, `importer.ts` | Nhập file, ghép video ↔ phụ đề, đọc phụ đề nhúng |
| `Player.tsx` | Trình xem: các chế độ, phím tắt, lặp câu/A-B, lưu câu, bảng bên |
| `SubtitleLine.tsx` | Một dòng phụ đề tra từ được, tô màu theo trạng thái từ |
| `MineDialog.tsx` | Hộp Lưu câu và tạo thẻ (phím C): ghi tiếng + ảnh, chọn từ, loại câu |
| `Panels.tsx` | Tab Câu đã lưu, Giải thích, Ghi chú / ghi chú nhân vật |
| `Practice.tsx` | Khung Kiểm tra nghe, Chép chính tả, Shadowing, Học theo đoạn |
| `AnimeReview.tsx` | Ôn theo cảnh phim |
| `VocabPanel.tsx` | Điểm hiểu, danh sách từ/Kanji, tạo thẻ |
| `cards.ts` | Tạo thẻ câu / thẻ từ, liên kết thẻ ↔ tập |
| `progress.ts` | Ghép thẻ với tập: ôn theo phạm vi, tiến độ mùa/tập, thống kê |
| `anki.ts` | Xuất .zip cho Anki |
| `capture.ts` | Chụp cảnh, ghi âm thanh câu (captureStream hoặc Web Audio), ghi âm micro, nhận dạng giọng nói |
| `colloquial.ts`, `dict.ts` | Luật giải thích khẩu ngữ / xưng hô; tra từ và đoán loại từ |
| `textmatch.ts` | So câu trả lời chép chính tả / shadowing theo cách đọc |
| `mkv.ts` | Đọc phụ đề dạng chữ trong file Matroska (.mkv/.webm) |
| `subtitles.ts` | Đọc SRT/VTT/ASS, nhận bảng mã, tìm dòng đang hiện |
| `media.ts` | Chọn file, nhớ file trên máy (File System Access API), mở lại video |
| `analysis.ts` | Tách từ phụ đề, so với thẻ ôn tập, điểm hiểu, tốc độ nói |
| `store.ts`, `types.ts` | Đọc/ghi kho dữ liệu, kiểu dữ liệu |
| `api.ts` | API cho module khác (Smart Resume) |

Module dùng lại `naming.ts` và `ui.tsx` (Modal, ProgressBar) của module manga, `review/store` (chấm thẻ FSRS) của module Ôn tập.

## Cho module khác

```ts
import { useAnimeResume } from '@/modules/immersion/anime/api'
const r = useAnimeResume() // { seriesTitle, episodeLabel, position, duration, path } hoặc undefined
// <Link to={r.path}>Xem tiếp</Link>
```

## Giới hạn hiện tại

- Phụ đề nhúng dạng **hình** (PGS/VobSub của Blu-ray) không đọc được, chỉ đọc phụ đề dạng chữ.
- `.avi` và một số codec (ví dụ AV1 trên máy cũ) trình duyệt không phát được: app báo lỗi rõ, nên đổi sang `.mp4`.
- Phụ đề ASS hiện như chữ thường (không giữ vị trí, màu, hiệu ứng karaoke).
- Chấm điểm phát âm dùng nhận dạng giọng nói của trình duyệt (Chrome/Edge, cần mạng), chỉ để tham khảo.
- Giải thích khẩu ngữ dựa trên luật viết sẵn, không phải AI: có thể bỏ sót hoặc nhận nhầm.
- Chưa có ảnh bìa: ô bìa dùng chữ đầu của tên series.
