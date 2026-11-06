# Truyện theo cấp độ (`src/modules/stories`)

Truyện ngắn có sẵn để đọc ngay, không cần tự nhập gì (giống Satori Reader / Tadoku).
Mở trong app: **Immersion → Truyện theo cấp độ** (`#/immersion/stories`), hoặc gõ tên truyện vào Ctrl+K.

## Có gì

- **12 truyện tự soạn**: 5 truyện N5, 4 truyện N4, 3 truyện N3. Lọc theo cấp ở đầu trang.
- **Giọng đọc**: "Nghe cả truyện" đọc lần lượt từng câu, câu đang đọc được tô sáng và tự cuộn tới.
  Nút 🔊 đầu mỗi câu để nghe riêng câu đó. Chọn tốc độ 0.7× / 0.85× / 1×.
  Dùng giọng máy có sẵn (Web Speech API, chạy offline trên Chrome/Edge/Windows). Máy chưa có giọng
  tiếng Nhật thì app hiện hướng dẫn cài.
- **Furigana** (mặc định bật), **Bản dịch tiếng Việt** dưới từng câu, **cỡ chữ**: nhớ cho lần sau.
- **Bấm vào từ để tra** (popup của Từ điển). Từ vừa tra hiện ở thanh dưới:
  **+ Thẻ kèm câu này** (thẻ vào bộ `Truyện · <tên truyện>`, câu làm ví dụ dạng điền chỗ trống) hoặc **Đã biết**.
- **Bạn biết x% từ trong truyện** (theo Kho từ của tôi) và nút **Học trước từ** để học các từ mới trước khi đọc.
- **Câu hỏi đọc hiểu** cuối truyện (trắc nghiệm, tiếng Việt). Bấm Kiểm tra: lưu điểm và đánh dấu đã đọc.
- Thời gian đọc được cộng vào Hôm nay (nhóm "Khác").

## Thêm truyện

Sửa `data.ts`, thêm một mục vào `STORIES`. Mỗi đoạn văn là `p([câu Nhật, bản dịch], ...)`.
Giữ `id` cố định vì tiến độ lưu theo id. Câu thoại viết dạng `Tên：「…」`: giọng máy tự bỏ phần tên.
**Chỉ dùng nội dung tự viết hoặc có giấy phép mở**, không chép từ sách/trang web.

## Dữ liệu được lưu ở đâu

| Nơi | Nội dung |
| --- | --- |
| kv `stories:progress` | Mỗi truyện: lần mở gần nhất, lúc đọc xong, điểm câu hỏi (có trong file sao lưu) |
| localStorage `hibi-stories` | Furigana, bản dịch, tốc độ đọc, cỡ chữ |

## Các file

| File | Vai trò |
| --- | --- |
| `StoriesPage.tsx` | Danh sách truyện (`?level=5`) hoặc mở một truyện (`?s=<id>`) |
| `StoryView.tsx` | Đọc truyện: giọng đọc, tra từ, thanh lưu thẻ, câu hỏi |
| `data.ts`, `types.ts` | Nội dung truyện và kiểu dữ liệu |
| `speech.ts` | Giọng đọc tiếng Nhật |
| `store.ts`, `prefs.ts`, `strings.ts` | Tiến độ, tùy chọn, chữ giao diện (Việt/Anh/Nhật) |
| `search.ts` | Nguồn tìm kiếm Ctrl+K |

## Giới hạn hiện tại

- Giọng đọc là giọng máy, chưa có file ghi âm người thật.
- Bản dịch và câu hỏi chỉ có tiếng Việt.
- Chưa có truyện N2–N1.
