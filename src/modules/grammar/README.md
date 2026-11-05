# Module Ngữ pháp — `src/modules/grammar`

Học ngữ pháp theo **cấp JLPT** (hiện có **N5: 72 mẫu**, **N4: 42 mẫu**, **N3: 61 mẫu**, **N2: 57 mẫu**, **N1: 50 mẫu**), giải thích tiếng Việt, chạy hoàn toàn offline.
Đường dẫn: **Học → Ngữ pháp** (`/#/learn/grammar`).

## Dùng thế nào
| Mục | Làm gì |
| --- | --- |
| **Danh sách** | Chọn N5 / N4 / N3 / N2 / N1. Lọc theo nhóm (trợ từ, thể động từ, tính từ, nối câu…) hoặc gõ chữ để lọc. Thanh tiến độ "Đã học x/y". Nút **+5 mẫu tiếp theo vào Ôn tập** để học dần. Dấu ✓ = đã hiểu hoặc đã có trong Ôn tập. |
| **Trang một mẫu** | Cách ghép, giải thích, lưu ý, ví dụ có furigana (ẩn/hiện theo Cài đặt) và nút nghe đọc. **Bấm vào một cụm chữ trong ví dụ để tra từ điển.** Nút *Đánh dấu đã hiểu*, *+ Ôn tập*, *Luyện mẫu này*. Mẫu liên quan, bài giáo trình (Minna, Genki). Phím ← → chuyển mẫu. |
| **Luyện tập** | Chọn cấp, phạm vi (tất cả / đã học / hay sai), số câu, dạng câu hỏi: **Điền chỗ trống** (4 đáp án), **Sắp xếp câu**, **Chọn nghĩa**. Phím 1–4 chọn, Enter câu tiếp. Cuối bài có danh sách mẫu nên xem lại. |
| **Tìm kiếm (Ctrl+K)** | Gõ mẫu (cả romaji: `temoii`), nghĩa tiếng Việt hoặc chữ trong câu ví dụ → nhóm "Bài ngữ pháp". |

Mở thẳng: `?lv=4` (danh sách N4), `?p=te-mo-ii` (một mẫu), `?tab=practice`, `?tab=practice&ids=te-mo-ii,te-wa-ikemasen` (luyện riêng vài mẫu).

## Nội dung
- `data/n5.ts` … `data/n1.ts`: mỗi mẫu là một object `GrammarPoint` (xem `types.ts`). Thứ tự trong mảng = thứ tự học đề xuất.
- Câu ví dụ viết theo quy ước để app tự làm furigana, tô màu và tạo bài luyện:
  `'私[わたし]{{は}} 学生[がくせい]{{です}}。'` → `漢字[かんじ]` = furigana, `{{ }}` = phần ngữ pháp, dấu cách = ranh giới cụm (cho bài Sắp xếp câu).
  Phần tử thứ 3 (tùy chọn) là các đáp án khác cũng đúng, để bài luyện không lấy làm đáp án sai (vd `['に']` cho câu dùng へ).
- **Mã mẫu (`id`) cố định**, đừng đổi sau khi phát hành: tiến độ, thẻ Ôn tập và Giáo trình đều trỏ tới mã này.
- Thêm mẫu mới: thêm object vào file của cấp đó. Mỗi mẫu nên có ít nhất một câu ví dụ chỉ có **một** chỗ `{{ }}` (để làm bài Điền chỗ trống) và một câu có 3–7 cụm (bài Sắp xếp câu).
- Mẫu N3–N1 không có số bài giáo trình (`lessons`), vì Minna/Genki chỉ dạy đến N4. Các mẫu gần nghĩa hay điền thay nhau được (わけがない／はずがない, や否や／が早いか…) nằm trong `EQUIV` ở `lib/quiz.ts` để bài luyện không lấy làm đáp án sai.
- Giải thích và câu ví dụ do Hibi Nihongo tự soạn. Số bài giáo trình (`lessons`) là bài đầu tiên dạy mẫu đó, soạn theo hiểu biết chung, **nên đối chiếu lại với sách** khi làm module Giáo trình.

## Tiến độ và Ôn tập
- kv `grammar:progress`: `{ [mã]: { learned, right, wrong, last } }` (có trong file sao lưu). Không thêm bảng mới vào kho dữ liệu.
- Thẻ Ôn tập tạo qua `addReviewCards`: bộ **Ngữ pháp N5** … **Ngữ pháp N1**, loại `grammar`, câu ví dụ giữ `{{ }}` nên có dạng câu hỏi "Điền vào chỗ trống". Nguồn `{ module: 'grammar', ref: <mã> }` nên không thêm trùng; trang Ngữ pháp đọc thẳng bảng thẻ để biết mẫu nào đã vào Ôn tập.
- Thời gian ở trang này được tính vào nhóm "Ngữ pháp" của Hôm nay & Tiến độ (đã có sẵn trong `today/lib/categories.ts`).

## Cho module khác (Giáo trình, Lộ trình, trợ lý AI…)
```tsx
import { grammarForLesson, getGrammarPoints, GrammarChips, grammarPath, grammarPracticePath } from '@/modules/grammar/api'

const pts = await grammarForLesson('minna', 15)   // các mẫu được dạy ở bài 15 Minna
<GrammarChips ids={pts.map((p) => p.id)} />        // dãy nút mở bài ngữ pháp
navigate(grammarPracticePath(pts.map((p) => p.id))) // luyện riêng các mẫu của bài
```
Sách mới (vd Marugoto): chỉ cần thêm mã sách vào `lessons` của các mẫu và một dòng trong `BOOK_NAME` (`strings.ts`).
Module Giáo trình cũng có thể tự giữ danh sách mã mẫu cho từng bài rồi gọi `getGrammarPoints(ids)`.

## File
| File | Vai trò |
| --- | --- |
| `GrammarPage.tsx` | Trang chính, tab, đường dẫn |
| `GrammarList.tsx` | Danh sách theo cấp, lọc, tiến độ |
| `GrammarDetail.tsx` | Trang một mẫu |
| `Practice.tsx` | Bài luyện |
| `components/Example.tsx` | Câu ví dụ: furigana, tô màu, bấm tra từ, ô trống |
| `components/GrammarChips.tsx` | Dãy nút mẫu ngữ pháp cho module khác |
| `lib/parse.ts` | Đọc quy ước viết câu ví dụ |
| `lib/quiz.ts` | Tạo câu hỏi, chọn đáp án sai |
| `lib/progress.ts` | Tiến độ, đưa vào Ôn tập |
| `lib/content.ts`, `lib/paths.ts` | Tải nội dung, đường dẫn |
| `search.ts` | Nguồn tìm kiếm Ctrl+K |
| `api.ts` | **API cho module khác** |
| `strings.ts` | Chữ giao diện Việt / Anh / Nhật |
