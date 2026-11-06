# Module Thành tích — `src/modules/achievements`

Cấp độ, điểm kinh nghiệm (XP), huy hiệu và **chú cáo lên cấp**. Đường dẫn `/achievements` (không nằm trên thanh bên):
mở từ khối **Cấp độ** ở Hôm nay, nút **🦊 Thành tích** ở trang Tôi, hoặc gõ "thành tích" / tên huy hiệu trong Ctrl+K.

## Dùng thế nào
- **Chú cáo + cấp**: vòng tròn quanh chú cáo là tiến độ lên cấp tiếp theo. Cáo đổi hạng và mọc thêm đuôi:
  Cáo con 子狐 (cấp 1, 1 đuôi) → Cáo nhỏ 若狐 (5) → Cáo lữ hành 旅狐 (10) → Cáo học giả 学狐 (15) → Cáo bạc 銀狐 (20)
  → Cáo vàng 金狐 (30) → Thiên hồ 天狐 (40) → Tiên hồ 仙狐 (50) → Cửu vĩ hồ 九尾 (60, 9 đuôi).
- **Huy hiệu**: 21 huy hiệu trong 4 nhóm (Thói quen, Học, Đọc/xem/thi thử, Thử thách). Đa số có 2–4 bậc
  (★ Đồng, Bạc, Vàng, Kim cương), huy hiệu "Thử thách" làm một lần là có. Lọc **Đã đạt** / **Sắp đạt** (đã qua nửa đường).
- **Thông báo**: đạt huy hiệu mới hoặc lên cấp → góc dưới màn hình hiện thông báo nhỏ, bấm để mở trang này.
  Huy hiệu mới có nhãn **Mới** cho tới lần mở trang sau.

## XP tính thế nào
| Nguồn | XP |
| --- | ---: |
| Mỗi phút học (đồng hồ của Hôm nay) | 1 |
| Mỗi lượt ôn thẻ | 1 |
| Mỗi chữ kana đã thuộc | 2 |
| Mỗi từ vựng học mới | 5 |
| Mỗi chữ Kanji | 8 |
| Mỗi mẫu ngữ pháp | 15 |
| Mỗi ngày đạt mục tiêu | 20 |
| Mỗi chương manga đọc xong / tập anime xem xong | 30 |
| Mỗi bài giáo trình xong | 50 |
| Mỗi lần làm đề thi thử / thêm khi đỗ | 30 / 100 |
| Thưởng huy hiệu: Đồng / Bạc / Vàng / Kim cương / Đặc biệt | 20 / 50 / 100 / 200 / 30 |

Lên cấp L+1 cần `100 + 50×(L−1)` XP (cấp 10 ≈ 2.700 XP, cấp 60 ≈ 91.000 XP).

**Mọi thứ được tính lại từ dữ liệu học thật** (`lib/snapshot.ts`), không cộng dồn riêng. Nên:
học từ trước khi có tính năng này vẫn được tính; khôi phục file sao lưu là đúng ngay; xóa thẻ thì XP giảm theo.
Lần đầu mở app sau khi cập nhật, các huy hiệu đã đủ điều kiện được ghi nhận lặng lẽ (không hiện hàng loạt thông báo).

## File
| File | Vai trò |
| --- | --- |
| `AchievementsPage.tsx` | Trang Thành tích |
| `TodayWidget.tsx` | Khối "Cấp độ" ở màn Hôm nay (đăng ký bằng một dòng trong `today/components/widgets.tsx`) |
| `components.tsx` | Chú cáo trong vòng XP, đuôi, huy chương, sao bậc |
| `lib/snapshot.ts` | Gom số liệu từ các module khác (chỉ đọc) |
| `lib/badges.ts` | **Danh sách huy hiệu. Thêm huy hiệu: một dòng ở đây + tên/mô tả `b_<id>`, `d_<id>` trong `strings.ts`** |
| `lib/level.ts` | Bảng XP, công thức cấp, hạng của chú cáo |
| `lib/store.ts` | Ghi ngày đạt từng bậc (kv `achievements:state`, có trong sao lưu) |
| `lib/watcher.ts`, `lib/notify.ts` | Chạy ngầm: thấy dữ liệu đổi thì tính lại (tối đa 45 giây/lần), hiện thông báo |
| `search.ts` | Tìm huy hiệu bằng Ctrl+K |
| `strings.ts` | Chữ giao diện Việt / Anh / Nhật |

Dữ liệu đọc (không ghi): thống kê của Hôm nay (`studyDays`, `srsLogs`, `srsCards`, `kana:progress`, `kanji:progress`),
`knownWords`, `mangaChapters`, `animeEpisodes`, `textbookLessons`, kv `exam:history`.
