# Module Hôm nay & Tiến độ — `src/modules/today` và `src/modules/me`

Màn hình chính của app (**Hôm nay**, đường dẫn `/`) và trang **Tôi → Tiến độ** (`/me`). Chạy offline hoàn toàn.

## Dùng thế nào

**Hôm nay**
- **Tiếp tục**: manga đang đọc dở, anime đang xem dở, thẻ Ôn tập đến hạn. Bấm là về đúng trang / đúng phút.
- **Ôn nhanh 5 phút**: mở thẳng `/review?quick=1`.
- **Mục tiêu hôm nay**: theo *số phút học* hoặc *số thẻ ôn*. Bấm **Đổi** để chỉnh.
- **Streak**: số ngày học liên tiếp, 7 ngày gần nhất, số lần **đóng băng ❄** còn lại trong tháng.
- **7 ngày qua**, **Lịch học (heatmap)**, **Đã học**, **Câu của ngày**.
- Bấm **Tùy chỉnh**: kéo thả khối để đổi chỗ (điện thoại: nút ↑ ↓), **Ẩn** khối không cần, **Về bố cục mặc định**.

**Tiến độ** (tab Tôi)
- Streak, tổng giờ học, số ngày học, số từ vựng / kanji / ngữ pháp / kana đã học.
- Biểu đồ 7 ngày / 30 ngày / 3 tháng / 1 năm: phút học (chia theo hoạt động), thẻ đã ôn, tích lũy đã học.
  Rê chuột (hoặc chạm) vào cột để xem số liệu.
- Heatmap cả năm, **Tóm tắt** ngày/tuần/tháng (**Sao chép Markdown**, **Tải file .md**), **Lịch sử từng ngày** (bấm để xem từng phiên học).

## Giờ học được đếm thế nào?
`lib/tracker.ts` chạy ngầm trong cả app (nạp từ `src/modules/registry.ts`). Cứ 5 giây, nếu bạn đang ở **trang học**
(Ôn tập, Manga, Anime, Kana, Kanji, Ngữ pháp, Từ điển, Giáo trình…), cửa sổ đang hiện, và bạn vừa thao tác trong 90 giây
qua **hoặc** video đang phát, thì 5 giây đó được tính. Trang Hôm nay, Tôi, Cài đặt không tính.
Ghi xuống kho mỗi 30 giây, khi đổi trang và khi đóng/ẩn app.

Ngày học bắt đầu lúc **4 giờ sáng** (theo cài đặt "giờ bắt đầu ngày mới" của Ôn tập).
Ngày cũ trước khi có đồng hồ: thời gian Ôn tập được ước tính từ lịch sử ôn thẻ.

## Streak và đóng băng
- Mặc định một ngày giữ streak khi **có học** (≥ 1 phút hoặc ≥ 1 thẻ). Đổi được thành **đạt mục tiêu**.
- Mỗi tháng có **0, 1 hoặc 2** lần đóng băng (mặc định 2). Khi mở app sau ngày nghỉ, app tự đóng băng những ngày nghỉ
  nếu tháng đó còn đủ lượt. Nghỉ dài hơn số lượt còn lại thì không dùng lượt nào, streak bắt đầu lại.
- Ngày đóng băng giữ streak nhưng không cộng thêm ngày.

## File
| File | Vai trò |
| --- | --- |
| `TodayPage.tsx` | Màn hình Hôm nay, kéo thả khối |
| `components/widgets.tsx` | Các khối. **Thêm khối mới: viết component + thêm một dòng vào `WIDGETS`** |
| `components/GoalSettings.tsx` | Chỉnh mục tiêu, cách tính streak, số lần đóng băng |
| `components/charts.tsx`, `chart.css` | Biểu đồ cột, đường, heatmap (SVG) và màu biểu đồ |
| `lib/tracker.ts` | Đồng hồ đếm giờ học |
| `lib/stats.ts` | Gộp dữ liệu thành số liệu theo ngày, streak, tự đóng băng |
| `lib/store.ts` | Đọc/ghi bảng `studyDays` và cài đặt |
| `lib/categories.ts` | Nhóm hoạt động và đường dẫn tương ứng. **Module mới có trang học: thêm một dòng vào `ROUTES`** |
| `lib/days.ts`, `lib/chartData.ts` | Ngày học, định dạng, dữ liệu biểu đồ |
| `data/sentences.ts` | Câu của ngày |
| `api.ts` | **API cho module khác** |
| `../me/ProgressPage.tsx`, `../me/summary.ts` | Trang Tiến độ, tóm tắt và xuất Markdown |

Dữ liệu: bảng **`studyDays`** (có sao lưu, thêm vào `src/core/db/schema.ts`) và khóa kv `today:settings`,
`today:freezes`, `today:layout`. Đọc thêm (không ghi): `srsLogs`, `srsCards`, `kana:progress`, `kanji:progress`,
và API resume của manga/anime.

## Cho module khác
```ts
import { useStudyStats, logStudyTime } from '@/modules/today/api'

const stats = useStudyStats()
stats?.streak.current                       // streak hiện tại
stats?.days.get(stats.today)?.totalMin      // số phút đã học hôm nay
stats?.learnedTotal                         // { vocab, kanji, grammar, kana }

await logStudyTime('other', 600)            // cộng thêm 10 phút học mà đồng hồ không thấy
```
