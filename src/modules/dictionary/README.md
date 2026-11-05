# Module Từ điển & tách từ (`src/modules/dictionary`)

Từ điển **offline** cho Hibi Nihongo: tra từ, tra Kanji (kèm **âm Hán Việt**), pitch accent, cấp JLPT,
độ thông dụng, **tách câu thành từ** và **popup tra từ** dùng chung cho mọi module.

## Người dùng thấy gì

- **Từ điển** (mục Học → Từ điển, đường dẫn `#/dictionary`):
  - *Tra từ*: gõ Kanji, kana, romaji (`taberu`), tiếng Việt (`ăn`, gõ không dấu cũng được), tiếng Anh (`eat`)
    hoặc dạng đã chia (`食べさせられた` → `食べる`).
  - **Nghĩa tiếng Việt** hiện trên nghĩa tiếng Anh (cho các từ đã dịch, hiện là JLPT N5–N4). Tab *Dữ liệu* có nút
    chọn "Việt + Anh / Tiếng Việt / Tiếng Anh".
  - *Phân tích câu*: dán câu, xem từng từ có furigana, thể từ điển, từ loại tiếng Việt, nghĩa; bấm từ để tra.
  - *Câu ví dụ* dưới mỗi từ (tối đa 5 câu; popup hiện 2 câu): furigana, từ đang tra được tô đậm, bản dịch,
    nút **+ Ôn tập với câu này** (tạo thẻ từ vựng kèm câu đó để luyện điền chỗ trống), liên kết về câu gốc trên Tatoeba.
    Trang Từ điển: bấm vào câu để tra các từ khác trong câu.
  - *Dữ liệu*: tải/cập nhật dữ liệu, bật/tắt "di chuột để tra", số nghĩa trong popup, ghi công nguồn dữ liệu.
- Lần đầu mở cần bấm **Tải từ điển** (~14 MB gồm cả câu ví dụ, cài khoảng 30–60 giây). Máy đã cài từ điển trước đây sẽ thấy
  "Có bản cập nhật từ điển" để tải thêm gói câu ví dụ (3,7 MB). Sau đó chạy không cần mạng.
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
| `shortMeaning(id, data)` | Nghĩa ngắn (tiếng Việt nếu có, không thì tiếng Anh), dùng cho thẻ ôn tập, danh sách từ |
| `getVi(id)`, `useVi(id)` | Nghĩa tiếng Việt theo từng nghĩa của từ (gói `jmdict-vi`) |
| `addWordToReview(id, d, ví_dụ?)`, `addKanjiToReview` | Tạo thẻ Ôn tập (qua `@/modules/review/api`); có câu ví dụ thì thẻ có câu điền chỗ trống |
| `getExamples(idTừ)`, `<ExampleSentences wordId d />` | Câu ví dụ của một từ (id JMdict), câu tốt nhất trước |
| `exampleParts`, `exampleCloze`, `tatoebaUrl` | Chia câu ví dụ để hiện furigana/tô đậm, tạo câu điền chỗ trống, link câu gốc |

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
| `lib/examples.ts` | Tra câu ví dụ (gói `tatoeba-ja`) |
| `components/ExampleSentences.tsx` | Khối câu ví dụ dưới mỗi từ |
| `tokenizer/` | Kuromoji chạy trong Web Worker + luật gộp từ |
| `components/` | Popup, khối hiển thị từ, Kanji, pitch accent... |
| `lib/vi.ts` | Đọc nghĩa tiếng Việt (gói `jmdict-vi`) |
| `tools/build-packs.mjs` | Script tạo gói dữ liệu (chạy trên máy tính, không nằm trong app) |
| `tools/build-vi-pack.mjs` | Script tạo gói nghĩa tiếng Việt từ `tools/vi/*.tsv` |
| `tools/vi/jlpt-n*.tsv` | Bản dịch nghĩa tiếng Việt (mỗi dòng một nghĩa, kèm nghĩa tiếng Anh gốc) |
| `tools/build-examples.mjs` | Script tạo gói câu ví dụ từ Tatoeba |

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
| Tatoeba (tatoeba.org) | CC BY 2.0 FR | Câu ví dụ và bản dịch |

## Nghĩa tiếng Việt (gói `jmdict-vi`)

Chưa có từ điển Nhật–Việt nào vừa lớn vừa có giấy phép mở (Mazii, Dũng Mori, JaViDic... đều không dùng được:
có bản quyền hoặc không rõ nguồn). Các nguồn đã xem:

| Nguồn | Giấy phép | Kết quả |
| --- | --- | --- |
| Dịch nghĩa tiếng Anh của JMdict sang tiếng Việt | CC BY-SA 4.0 (bản phái sinh của JMdict) | **Đang dùng.** Đã có JLPT N5–N4 (1.138 từ, 3.160 nghĩa) |
| Wiktionary tiếng Việt (bản trích kaikki.org) | CC BY-SA 4.0 | ~11.200 mục tiếng Nhật nhưng phần lớn là romaji/số/ký hiệu; chỉ ~2.000 nghĩa danh/động từ dùng được. Script đã hỗ trợ (`--wiktionary`), chưa đưa vào vì máy dựng không tải được |
| Tatoeba (câu Nhật–Việt) | CC BY 2.0 FR | Chỉ vài nghìn câu, hợp làm câu ví dụ hơn |
| JaViDic, KanjiDictVN (nghĩa Hán Việt từ thivien.net) | không rõ / có bản quyền | Không dùng |

Nghĩa tiếng Việt là **dịch máy**, chưa có người duyệt; app ghi rõ điều đó và luôn giữ nghĩa tiếng Anh gốc.

**Sửa hoặc thêm bản dịch**: sửa cột cuối của `tools/vi/*.tsv` (các nghĩa cách nhau bằng `; `), rồi chạy

```
node src/modules/dictionary/tools/build-vi-pack.mjs
```

Script tự tăng phiên bản gói và tạo bản vá. Khi JMdict cập nhật làm nghĩa tiếng Anh thay đổi, dòng dịch cũ tự bị bỏ;
xuất danh sách cần dịch lại bằng `--export-todo can-dich.tsv --jlpt 1`.

## Câu ví dụ (gói `tatoeba-ja`)

Câu lấy từ [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR: được dùng tự do nhưng phải ghi nguồn). App ghi nguồn ở tab
*Dữ liệu*, và mỗi câu có liên kết "Tatoeba #id" về câu gốc (trang đó ghi tên người đóng góp).

Cách tạo gói: script tách từng câu bằng Kuromoji, nối mỗi từ với mục JMdict (dựa vào thể từ điển và cách đọc),
rồi chọn tối đa 5 câu cho mỗi từ: dài khoảng 16 chữ, ít từ hiếm, có bản dịch tiếng Việt thì ưu tiên.
Furigana của câu được tạo tự động nên thỉnh thoảng sai (ví dụ IPADIC đọc 日本 là にっぽん).

```
node src/modules/dictionary/tools/build-examples.mjs --download     # tải bản mới nhất từ Tatoeba (cần mạng, lệnh bunzip2)
```

Bản đi kèm hiện tại được tạo từ file `SENTENCES` trong gói PyPI `jiten` 1.1.0 (bản sao Tatoeba tháng 7/2021, chỉ có
bản dịch tiếng Anh), vì máy dựng không tải được trực tiếp từ tatoeba.org. Chạy lệnh trên ở máy có mạng để có câu mới
hơn **và bản dịch tiếng Việt** (Tatoeba có vài nghìn câu Nhật–Việt; câu có tiếng Việt tự được ưu tiên và hiện tiếng Việt).
