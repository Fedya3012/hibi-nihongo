# Tìm kiếm toàn cục (`src/modules/search`)

Bấm **Ctrl+K** (Mac: **⌘K**), phím **/**, hoặc bấm ô tìm kiếm trên cùng. Gõ là thấy kết quả ngay,
tìm cùng lúc trong mọi dữ liệu trên máy, không cần mạng.

## Tìm được gì

| Nhóm | Gõ gì cũng được | Bấm vào thì |
| --- | --- | --- |
| Trang & bài học | tên tính năng ở cả 3 ngôn ngữ ("settings" ra "Cài đặt"), "Kanji N3", "ôn nhanh" | mở trang |
| Từ vựng | 食べる, たべる, taberu, eat, dạng đã chia 食べました | mở popup tra từ ngay tại chỗ (dòng cuối: mở Từ điển) |
| Kanji | chữ Kanji, **âm Hán Việt** có hoặc không dấu (thực / thuc), nghĩa tiếng Anh | mở trang chi tiết chữ |
| Bài ngữ pháp | mẫu (cả romaji `temoii`), nghĩa tiếng Việt, chữ trong câu ví dụ | mở bài ngữ pháp |
| Ngữ pháp | thẻ ngữ pháp trong Ôn tập | mở thẻ trong Ôn tập |
| Thẻ ôn tập | mặt trước, cách đọc, nghĩa, tag, câu ví dụ, ghi chú, tên bộ thẻ | mở tab Thẻ, ô tìm điền sẵn |
| Manga & anime | tên series (cả tên tiếng Nhật), tên chương, tên tập, tên file | mở series / mở thẳng chương, tập |
| Ghi chú & đánh dấu | bong bóng thoại, bản dịch của bạn, ghi chú, tên nhân vật, ghi chú đánh dấu trang | mở trình đọc **đúng trang** |
| Câu trong phụ đề | dòng phụ đề Nhật và phụ đề dịch đã nhập | mở tập đó |

Không phân biệt hoa/thường, dấu tiếng Việt, hiragana/katakana. Phím **↑ ↓** chọn, **Enter** mở, **Esc** đóng.
Đang bôi đen chữ trên trang rồi bấm Ctrl+K thì chữ đó được điền sẵn. Ô trống hiện các lần tìm gần đây.

## Thêm nguồn tìm kiếm cho module mới (ví dụ Ngữ pháp, Giáo trình)

1. Tạo `src/modules/<module>/search.ts`:
   ```ts
   import type { SearchSource } from '@/modules/search/api'
   const source: SearchSource = {
     id: 'grammar-points',
     label: { vi: 'Bài ngữ pháp', en: 'Grammar points', ja: '文法項目' },
     order: 35, // vị trí nhóm (Từ vựng 20, Kanji 30, Ngữ pháp 40, Thẻ 50...)
     async search(q, { limit }) {
       // q.raw (chữ gõ), q.norm (đã bỏ dấu, katakana → hiragana), q.kana (romaji → kana)
       return [{ id: 'te-mo-ii', title: '〜てもいい', jp: true, subtitle: 'được phép', to: '/learn/grammar?p=te-mo-ii', score: 90 }]
     },
   }
   export default source
   ```
2. Xong, không cần sửa file nào khác: `api.ts` tự tìm mọi `src/modules/*/search.ts`. File chỉ tải khi mở ô tìm kiếm.

Mỗi nguồn chạy riêng: nguồn nào lỗi thì bị bỏ qua (có dòng báo nhỏ), các nguồn khác vẫn hiện.

## File

| File | Vai trò |
| --- | --- |
| `api.ts` | `openSearch()`, `MODULE_SOURCES`, kiểu dữ liệu. Nhẹ, import được ở mọi nơi |
| `SearchBar.tsx` | Nút trên thanh trên cùng, phím tắt, tải hộp tìm kiếm khi cần |
| `SearchPalette.tsx` | Hộp tìm kiếm: gõ, hiện kết quả theo nhóm, bàn phím |
| `sources.ts` | Các nguồn có sẵn (chỉ đọc dữ liệu, không sửa gì) |
| `normalize.ts` | Chuẩn hóa chữ và chấm điểm khớp |
| `cache.ts` | Đọc dữ liệu một lần, tự đọc lại khi dữ liệu thay đổi |
| `strings.ts` | Chữ giao diện 3 ngôn ngữ |

Không thêm bảng nào vào kho dữ liệu. Lần tìm gần đây lưu trong `localStorage` (`hibi-search-recent`), chỉ trên máy này.
