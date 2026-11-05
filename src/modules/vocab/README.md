# Kho từ của tôi (`src/modules/vocab`)

**Một danh sách từ dùng chung cho cả app**: từ nào bạn đã biết, đang học, hay muốn bỏ qua.
Mọi nơi có chữ Nhật (manga, anime, giáo trình, ngữ pháp, trình đọc văn bản sau này) đều hỏi cùng một chỗ,
nên đánh dấu một lần là đúng ở mọi nơi.

## Người dùng thấy gì

- **Chữ được gạch chân khi đọc**: gạch liền = từ mới, gạch chấm = đang học, không gạch = đã biết.
  Có ở phụ đề anime, bong bóng thoại manga, hội thoại/bài đọc giáo trình, câu ví dụ ngữ pháp, trang Từ điển.
  Trợ từ (は, が...), dấu câu, số, tên riêng không bị gạch.
- **Popup tra từ** có thêm 3 nút: *Đang học · Đã biết · Bỏ qua*. Bấm lại nút đang chọn để bỏ đánh dấu.
  Nếu từ đã có thẻ Ôn tập, nút tương ứng hiện viền kèm chữ "theo Ôn tập".
- **Trang Kho từ của tôi** (Học → Kho từ của tôi, `#/learn/words`): số từ mỗi loại, chọn cách tô màu
  (từ mới + đang học / chỉ từ mới / tắt), danh sách để lọc, đổi trạng thái, xóa; tab *Thêm nhiều từ* để dán
  cả danh sách (mỗi dòng một từ, hoặc cột đầu khi chép từ Anki/Excel) và tải danh sách về máy.
- Cách tô màu cũng chỉnh được trong Từ điển → Dữ liệu.

## Một từ ở mức nào?

1. Bạn **tự đánh dấu** (popup, trang Kho từ, nút "Đã biết" trong danh sách từ của anime, nút đã thuộc ở giáo trình): luôn được ưu tiên.
   "Bỏ qua" được tính như đã biết.
2. Nếu chưa đánh dấu: theo **thẻ Ôn tập**. Thẻ đã qua giai đoạn học (trạng thái Review) = đã biết, còn lại = đang học.
   Ôn thẻ xong là màu chữ tự đổi.
3. Còn lại là **mới**.

Khớp từ theo: mã Từ điển (JMdict, chắc chắn nhất) → chữ viết → các cách viết khác (vd `わかる` cho `分かる`).
Từ chỉ có kana thì katakana/hiragana coi như nhau. Với chữ trong câu, app thử thể từ điển (`食べた` → `食べる`),
chữ đúng như trong câu, rồi phần đầu (`勉強しています` → `勉強`).

## Dùng trong module khác

Cách dễ nhất: hiện chữ bằng `<JapaneseText>` của module Từ điển. Tô màu và nút đánh dấu trong popup **tự có**.

Khi cần nhiều hơn, import từ `@/modules/vocab/api`:

| Tên | Tác dụng |
| --- | --- |
| `useKnowledge()` / `loadKnowledge()` | Bảng tra (hook tự cập nhật / hàm async). Đọc một lần, dùng chung cả app |
| `wordStatus(k, '食べる')`, `wordStatus(k, { w, r, id, alt })` | `'known' \| 'learning' \| 'new'` |
| `segmentStatus(k, seg)` | Như trên, cho "từ" do `tokenize()` trả về |
| `manualStatus(k, w)`, `srsStatus(k, w)` | Riêng phần tự đánh dấu / riêng phần thẻ Ôn tập |
| `isStudyWord(seg)` | Có phải từ vựng cần tính không (bỏ trợ từ, dấu câu, tên riêng...) |
| `coverageOf(segments, k)`, `textCoverage(text)` | Tỉ lệ hiểu một đoạn: `known`, `learning`, `new` (0..1), `newWords` |
| `setWordStatus(words, 'known' \| 'learning' \| 'ignored' \| null, src)` | Đánh dấu / bỏ đánh dấu (một hoặc nhiều từ, một giao dịch) |
| `importWords(list, status, src)`, `parseWordList(text)` | Nhập cả danh sách (dùng cho nhập từ Anki sau này) |
| `listKnownWords()`, `exportWordsText()`, `clearKnownWords()` | Đọc / xuất / xóa toàn bộ |
| `useVocabPrefs((s) => s.highlight)`, `statusUnderline(status, mode)` | Tùy chọn tô màu + lớp CSS gạch chân |
| `useCharStatus(text)`, `worstStatus(list, from, to)` | Trạng thái từng ký tự, khi tự vẽ câu (vd câu ví dụ Ngữ pháp) |
| `<WordStatusPicker word={{ w, r, id }} src="..." />` | 3 nút Đang học / Đã biết / Bỏ qua |
| `<HighlightSetting />` | Ô chọn cách tô màu kèm chú thích |

```tsx
import { useKnowledge, segmentStatus, isStudyWord, statusUnderline, useVocabPrefs } from '@/modules/vocab/api'

const k = useKnowledge()
const mode = useVocabPrefs((s) => s.highlight)
const cls = k && isStudyWord(seg) ? statusUnderline(segmentStatus(k, seg), mode) : ''
```

`src` là nơi đánh dấu (`'popup'`, `'anime'`, `'textbook'`, `'import'`...), hiện trong danh sách để biết từ đâu ra.

## Dữ liệu

- Bảng `knownWords` (có sao lưu), khóa là chữ viết của từ. Mỗi dòng: `w`, `status`, `r` (cách đọc), `id` (mã JMdict),
  `alt` (cách viết khác), `src`, `at` (thời điểm).
- Danh sách "Đã biết" cũ của Anime (kv `anime:known`) được **tự chuyển** sang bảng này ở lần mở đầu tiên
  (kể cả khi khôi phục bản sao lưu cũ), rồi khóa cũ bị xóa.
- Tùy chọn tô màu lưu ở localStorage (`hibi-vocab`).

## Cấu trúc thư mục

| File | Vai trò |
| --- | --- |
| `api.ts` | API công khai |
| `knowledge.ts` | Bảng tra gộp tự đánh dấu + thẻ Ôn tập, bộ nhớ đệm, `isStudyWord`, tỉ lệ hiểu |
| `store.ts` | Đọc/ghi bảng `knownWords`, chuyển dữ liệu cũ của Anime |
| `actions.ts` | Đánh dấu, nhập/xuất danh sách |
| `prefs.ts` | Tùy chọn tô màu, lớp CSS gạch chân |
| `components/` | Nút đánh dấu, ô chọn cách tô màu |
| `VocabPage.tsx` | Trang Kho từ của tôi |
