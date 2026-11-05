# Module Từ điển & tách từ (`src/modules/dictionary`)

Từ điển **offline** cho Hibi Nihongo: tra từ, tra Kanji (kèm **âm Hán Việt**), pitch accent, cấp JLPT,
độ thông dụng, **tách câu thành từ** và **popup tra từ** dùng chung cho mọi module.

## Người dùng thấy gì

- **Từ điển** (mục Học → Từ điển, đường dẫn `#/dictionary`):
  - *Tra từ*: gõ Kanji, kana, romaji (`taberu`), tiếng Anh (`eat`) hoặc dạng đã chia (`食べさせられた` → `食べる`).
  - *Phân tích câu*: dán câu, xem từng từ có furigana, thể từ điển, từ loại tiếng Việt, nghĩa; bấm từ để tra.
  - *Dữ liệu*: tải/cập nhật dữ liệu, bật/tắt "di chuột để tra", số nghĩa trong popup, ghi công nguồn dữ liệu.
- Lần đầu mở cần bấm **Tải từ điển** (~10 MB, cài khoảng 30 giây). Sau đó chạy không cần mạng.
- Bộ tách từ (~17 MB) tự tải ở lần đầu phân tích câu, rồi được lưu lại trên máy.

## Dùng trong module khác

```tsx
import { JapaneseText } from '@/modules/dictionary'

// Câu bấm được từng từ, có popup tra từ (máy tính: di chuột cũng hiện)
<JapaneseText text="昨日ケーキを食べさせられた" />
<JapaneseText text={subtitleLine} furigana />
```

Mở popup từ bất kỳ đâu (ví dụ trình đọc manga sau khi OCR), không cần đặt component:

```ts
import { openLookup, closeLookup } from '@/modules/dictionary/api'
openLookup('先生に褒められて嬉しかった', { x: e.clientX, y: e.clientY }) // tọa độ màn hình, px
```

Hàm và component khác (đều import từ `@/modules/dictionary`):

| Tên | Tác dụng |
| --- | --- |
| `searchWords(q)` | Tìm như ô tra từ (romaji, kana, Kanji, tiếng Anh, dạng đã chia) |
| `lookupAt(text, i)` | Từ dài nhất bắt đầu ở vị trí `i` trong câu, tự chia ngược |
| `tokenize(text)` | Tách câu thành "từ" cho người học (động từ gộp với đuôi chia) |
| `getKanji('食')`, `getKanjiList('食べ物')` | Thông tin Kanji: Hán Việt, On/Kun, nghĩa, số nét, JLPT |
| `deinflect('食べました')` | Liệt kê các thể từ điển có thể có |
| `romajiToHiragana`, `furiganaParts`... | Tiện ích chữ kana |
| `<WordEntry>`, `<KanjiInfo>`, `<Furigana>`, `<PitchAccent>` | Các khối giao diện để tự ghép |
| `useDictPacks()` | Biết từ điển đã được tải về máy chưa |
| `addWordToReview`, `addKanjiToReview` | Tạo thẻ Ôn tập (qua `@/modules/review/api`) |

## Cấu trúc thư mục

| File | Vai trò |
| --- | --- |
| `DictionaryPage.tsx` | Trang Từ điển (3 tab) |
| `api.ts` | `openLookup` / `closeLookup` |
| `index.ts` | API công khai |
| `types.ts` | Kiểu dữ liệu từ, Kanji (tên trường rút gọn, có chú thích) |
| `labels.ts` | Nhãn tiếng Việt cho từ loại, ghi chú cách dùng |
| `lib/search.ts` | Tra cứu trong IndexedDB, xếp hạng kết quả |
| `lib/deinflect.ts` | Luật chia động từ ngược (tự viết) |
| `lib/kana.ts` | Kana, romaji, furigana, tách mora |
| `lib/packs.ts` | Tải/cập nhật gói dữ liệu |
| `tokenizer/` | Kuromoji chạy trong Web Worker + luật gộp từ |
| `components/` | Popup, khối hiển thị từ, Kanji, pitch accent... |
| `tools/build-packs.mjs` | Script tạo gói dữ liệu (chạy trên máy tính, không nằm trong app) |

## Dữ liệu và cập nhật

Gói nằm ở `public/content/` (`jmdict-en.v<N>.pack`, `kanjidic.v<N>.pack`), khai báo trong `manifest.json`.
File `.pack` là JSON nén gzip; **không** đặt đuôi `.json.gz` vì nhiều máy chủ sẽ tự giải nén file `.gz`
khi gửi, làm sai mã kiểm tra và app báo "file hỏng".

Tạo lại dữ liệu mới nhất (cần Node.js 22.5+ và mạng):

```
node src/modules/dictionary/tools/build-packs.mjs --download
```

Script tải JMdict/KANJIDIC2 gốc từ EDRDG và các nguồn bổ sung, tăng số phiên bản gói, và tự tạo **bản vá**
từ bản cũ, nên người dùng chỉ phải tải phần thay đổi.

Bản đi kèm hiện tại được tạo từ gói PyPI `jamdict-data` 1.5 (bản sao JMdict/KANJIDIC2 của EDRDG, tháng 4/2021),
vì máy dựng không tải được trực tiếp từ EDRDG. Chạy lệnh trên ở máy có mạng để có dữ liệu mới nhất.

| Nguồn | Giấy phép | Dùng cho |
| --- | --- | --- |
| JMdict, KANJIDIC2 (EDRDG) | CC BY-SA 4.0 | Từ, nghĩa tiếng Anh, Kanji, âm Hán Việt |
| Kanjium (Uros O.) | CC BY-SA 4.0 | Pitch accent, tần suất (Wikipedia) |
| Jonathan Waller, tanos.co.uk (qua open-anki-jlpt-decks, kanji-data) | CC BY | Cấp JLPT |
| Kuromoji + IPADIC | Apache-2.0 / giấy phép IPADIC | Tách từ |

Nghĩa hiện là **tiếng Anh**: chưa có từ điển Nhật–Việt nào vừa lớn vừa có giấy phép mở.
Nếu sau này có, chỉ cần thêm một nguồn trong `build-packs.mjs` (trường `g` của mỗi nghĩa).
